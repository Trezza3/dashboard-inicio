import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const exec = promisify(execFile);
const MPRIS_PATH = "/org/mpris/MediaPlayer2";
const PLAYER_IFACE = "org.mpris.MediaPlayer2.Player";
const ACTIONS = {
  playpause: "PlayPause",
  next: "Next",
  previous: "Previous",
} as const;

async function qdbus(args: string[]) {
  const { stdout } = await exec("qdbus", args, { timeout: 1500 });
  return stdout.trim();
}

async function firstService() {
  return (await qdbus([]))
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("org.mpris.MediaPlayer2."));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: keyof typeof ACTIONS | "seek";
      service?: string;
      /** Posición absoluta en milisegundos (solo para action "seek"). */
      position?: number;
    };

    const service = body.service ?? (await firstService());
    if (!service) return NextResponse.json({ ok: false }, { status: 404 });

    if (body.action === "seek") {
      if (typeof body.position !== "number" || body.position < 0) {
        return NextResponse.json({ ok: false }, { status: 400 });
      }
      // SetPosition necesita el trackid actual; lo leemos del servidor para no confiar en el cliente.
      const metadata = await qdbus([service, MPRIS_PATH, `${PLAYER_IFACE}.Metadata`]).catch(() => "");
      const trackId = /mpris:trackid:\s*(.+)/i.exec(metadata)?.[1]?.trim();
      if (!trackId) return NextResponse.json({ ok: false }, { status: 409 });
      const positionUs = Math.round(body.position * 1000).toString();
      await qdbus([service, MPRIS_PATH, `${PLAYER_IFACE}.SetPosition`, trackId, positionUs]);
      return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    }

    if (!body.action || !ACTIONS[body.action]) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    await qdbus([service, MPRIS_PATH, `${PLAYER_IFACE}.${ACTIONS[body.action]}`]);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
