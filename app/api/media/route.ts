import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const exec = promisify(execFile);
const MPRIS_PATH = "/org/mpris/MediaPlayer2";
const PLAYER_IFACE = "org.mpris.MediaPlayer2.Player";

export type MediaPlayerRef = {
  service: string;
  app: string;
};

export type MediaStatus = {
  available: boolean;
  service?: string;
  app?: string;
  title?: string;
  artist?: string;
  album?: string;
  artUrl?: string;
  status?: "Playing" | "Paused" | "Stopped";
  /** Posición actual en milisegundos. */
  position?: number;
  /** Duración total en milisegundos. */
  length?: number;
  canSeek?: boolean;
  /** Todos los reproductores MPRIS activos, para poder cambiar de fuente. */
  players?: MediaPlayerRef[];
};

async function qdbus(args: string[]) {
  const { stdout } = await exec("qdbus", args, { timeout: 1500 });
  return stdout.trim();
}

function parseMetadata(output: string) {
  const title = /xesam:title:\s*(.+)/i.exec(output)?.[1]?.trim();
  const artist = /xesam:artist:\s*(.+)/i.exec(output)?.[1]?.trim();
  const album = /xesam:album:\s*(.+)/i.exec(output)?.[1]?.trim();
  const artUrl = /mpris:artUrl:\s*(.+)/i.exec(output)?.[1]?.trim();
  const lengthUs = /mpris:length:\s*(\d+)/i.exec(output)?.[1];

  return {
    title,
    artist: artist?.replace(/^\[|\]$/g, ""),
    album,
    artUrl,
    length: lengthUs ? Math.round(Number(lengthUs) / 1000) : undefined,
  };
}

function appName(service: string) {
  return service
    .replace("org.mpris.MediaPlayer2.", "")
    .replace(/\.instance\d+$/i, "")
    .replace(/^[a-z]/, (char) => char.toUpperCase());
}

async function listServices() {
  return (await qdbus([]))
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("org.mpris.MediaPlayer2."));
}

export async function GET(request: Request) {
  try {
    const services = await listServices();
    const players: MediaPlayerRef[] = services.map((service) => ({ service, app: appName(service) }));

    // Permite fijar un reproductor concreto (?service=...); si no, el primero activo.
    const requested = new URL(request.url).searchParams.get("service");
    const service = (requested && services.includes(requested) ? requested : services[0]) ?? undefined;

    if (!service) {
      return NextResponse.json<MediaStatus>({ available: false, players }, { headers: { "Cache-Control": "no-store" } });
    }

    const [metadata, status, positionRaw, canSeekRaw] = await Promise.all([
      qdbus([service, MPRIS_PATH, `${PLAYER_IFACE}.Metadata`]).catch(() => ""),
      qdbus([service, MPRIS_PATH, `${PLAYER_IFACE}.PlaybackStatus`]).catch(() => "Stopped"),
      qdbus([service, MPRIS_PATH, `${PLAYER_IFACE}.Position`]).catch(() => ""),
      qdbus([service, MPRIS_PATH, `${PLAYER_IFACE}.CanSeek`]).catch(() => "false"),
    ]);

    const parsed = parseMetadata(metadata);
    const playbackStatus = status === "Playing" || status === "Paused" ? status : "Stopped";
    if (playbackStatus === "Stopped" && !parsed.title) {
      return NextResponse.json<MediaStatus>({ available: false, players }, { headers: { "Cache-Control": "no-store" } });
    }

    const position = /^\d+$/.test(positionRaw) ? Math.round(Number(positionRaw) / 1000) : undefined;

    return NextResponse.json<MediaStatus>(
      {
        available: true,
        service,
        app: appName(service),
        status: playbackStatus,
        position,
        canSeek: canSeekRaw === "true",
        players,
        ...parsed,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json<MediaStatus>({ available: false }, { headers: { "Cache-Control": "no-store" } });
  }
}
