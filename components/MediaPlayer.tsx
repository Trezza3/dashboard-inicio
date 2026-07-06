"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconRefresh,
} from "@tabler/icons-react";
import type { MediaStatus } from "@/app/api/media/route";

function formatTime(ms?: number) {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "--:--";
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function MediaPlayer() {
  const [media, setMedia] = useState<MediaStatus>({ available: false });
  const [loading, setLoading] = useState(true);
  const [preferred, setPreferred] = useState<string | null>(null);
  const [displayPos, setDisplayPos] = useState(0);

  // Base para interpolar la posición entre polls (más fluido que esperar 5s).
  const baseRef = useRef({ pos: 0, at: 0, playing: false, length: 0 });

  const load = useCallback(async () => {
    try {
      const url = preferred ? `/api/media?service=${encodeURIComponent(preferred)}` : "/api/media";
      const response = await fetch(url, { cache: "no-store" });
      const data: MediaStatus = await response.json();
      setMedia(data);
      baseRef.current = {
        pos: data.position ?? 0,
        at: Date.now(),
        playing: data.status === "Playing",
        length: data.length ?? 0,
      };
      setDisplayPos(data.position ?? 0);
    } catch {
      setMedia({ available: false });
    } finally {
      setLoading(false);
    }
  }, [preferred]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    const id = window.setInterval(load, 5000);
    return () => {
      window.clearTimeout(t);
      window.clearInterval(id);
    };
  }, [load]);

  // Avanza la barra localmente mientras algo se reproduce.
  useEffect(() => {
    const id = window.setInterval(() => {
      const b = baseRef.current;
      if (!b.playing) return;
      const next = b.pos + (Date.now() - b.at);
      setDisplayPos(b.length ? Math.min(next, b.length) : next);
    }, 500);
    return () => window.clearInterval(id);
  }, []);

  async function control(action: "playpause" | "next" | "previous") {
    await fetch("/api/media/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, service: media.service }),
    }).catch(() => {});
    await load();
  }

  async function seekTo(event: React.MouseEvent<HTMLDivElement>) {
    if (!media.available || !media.canSeek || !media.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const position = Math.round(fraction * media.length);
    baseRef.current = { ...baseRef.current, pos: position, at: Date.now() };
    setDisplayPos(position);
    await fetch("/api/media/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "seek", service: media.service, position }),
    }).catch(() => {});
    await load();
  }

  const isPlaying = media.status === "Playing";
  const title = media.title || (media.available ? media.app : "Nada sonando");
  const length = media.length ?? 0;
  const progress = length ? Math.min(100, (displayPos / length) * 100) : 0;
  const players = media.players ?? [];

  return (
    <section
      aria-label="Multimedia"
      className="p-3"
      style={{
        background: "var(--surface)",
        border: "2px solid var(--ink)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--sh-sm)",
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <p className="text-[10px] uppercase" style={{ fontFamily: "var(--font-head)", letterSpacing: "0.04em" }}>
            Multimedia
          </p>
          {isPlaying && (
            <span aria-hidden className="flex h-3 items-end gap-[2px]">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="eq-bar block w-[2px]" style={{ height: "100%", background: "var(--lime)" }} />
              ))}
            </span>
          )}
        </div>
        <button type="button" aria-label="Actualizar multimedia" onClick={load}>
          <IconRefresh size={14} stroke={2.4} color="var(--muted)" />
        </button>
      </div>

      <div className="flex gap-2.5">
        <div
          className="grid h-[72px] w-[72px] shrink-0 place-items-center overflow-hidden"
          style={{
            background: media.available ? "var(--violet)" : "var(--paper)",
            border: "1.5px solid var(--ink)",
            borderRadius: "var(--radius)",
          }}
        >
          {media.artUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.artUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span
              className="text-2xl"
              style={{ fontFamily: "var(--font-head)", color: media.available ? "#fff" : "var(--muted)" }}
            >
              {media.available ? "♪" : "--"}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm leading-tight" style={{ fontFamily: "var(--font-head)" }}>
            {loading ? "Buscando..." : title}
          </p>
          <p className="mt-0.5 truncate text-[10px]" style={{ color: "var(--muted)" }}>
            {media.artist || media.album || (media.available ? media.app : "Abrir Spotify, YouTube o VLC")}
          </p>

          {/* Barra de progreso — clickeable para saltar */}
          <div className="mt-2">
            <div
              role={media.canSeek ? "slider" : undefined}
              aria-label={media.canSeek ? "Progreso" : undefined}
              aria-valuemin={media.canSeek ? 0 : undefined}
              aria-valuemax={media.canSeek ? length : undefined}
              aria-valuenow={media.canSeek ? Math.round(displayPos) : undefined}
              onClick={seekTo}
              className="h-[6px] w-full overflow-hidden"
              style={{
                background: "var(--paper)",
                border: "1.5px solid var(--ink)",
                borderRadius: "999px",
                cursor: media.available && media.canSeek && length ? "pointer" : "default",
              }}
            >
              <div
                className="h-full"
                style={{
                  width: `${progress}%`,
                  background: "var(--lime)",
                  transition: isPlaying ? "width 0.5s linear" : "none",
                }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[9px] tabular-nums" style={{ color: "var(--faint)" }}>
              <span>{media.available ? formatTime(displayPos) : "--:--"}</span>
              <span>{media.available ? formatTime(length) : "--:--"}</span>
            </div>
          </div>

          <div className="mt-1.5 flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Anterior"
              disabled={!media.available}
              onClick={() => control("previous")}
              className="grid h-7 w-7 place-items-center disabled:opacity-45"
              style={{ border: "1.5px solid var(--ink)", borderRadius: "var(--radius)", background: "var(--surface)" }}
            >
              <IconPlayerSkipBack size={14} stroke={2.5} />
            </button>
            <button
              type="button"
              aria-label={isPlaying ? "Pausar" : "Reproducir"}
              disabled={!media.available}
              onClick={() => control("playpause")}
              className="grid h-8 w-8 place-items-center disabled:opacity-45"
              style={{ border: "2px solid var(--ink)", borderRadius: "var(--radius)", background: "var(--lime)", color: "#14130F" }}
            >
              {isPlaying ? <IconPlayerPause size={15} stroke={2.7} /> : <IconPlayerPlay size={15} stroke={2.7} />}
            </button>
            <button
              type="button"
              aria-label="Siguiente"
              disabled={!media.available}
              onClick={() => control("next")}
              className="grid h-7 w-7 place-items-center disabled:opacity-45"
              style={{ border: "1.5px solid var(--ink)", borderRadius: "var(--radius)", background: "var(--surface)" }}
            >
              <IconPlayerSkipForward size={14} stroke={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Selector de reproductor cuando hay más de uno activo */}
      {players.length > 1 && (
        <div className="mt-2.5 flex flex-wrap gap-1 border-t pt-2" style={{ borderColor: "var(--paper)" }}>
          {players.map((p) => {
            const active = p.service === media.service;
            return (
              <button
                key={p.service}
                type="button"
                onClick={() => setPreferred(p.service)}
                className="px-1.5 py-0.5 text-[9px] uppercase"
                style={{
                  fontFamily: "var(--font-head)",
                  letterSpacing: "0.03em",
                  border: "1.5px solid var(--ink)",
                  borderRadius: "var(--radius)",
                  background: active ? "var(--ink)" : "var(--surface)",
                  color: active ? "var(--surface)" : "var(--muted)",
                }}
              >
                {p.app}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
