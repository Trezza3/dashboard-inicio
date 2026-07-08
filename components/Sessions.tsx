"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconExternalLink, IconRefresh, IconWindowMaximize, IconWorld } from "@tabler/icons-react";

type ClosedTab = { url: string; title: string };
type ClosedWindow = { kind: "window"; sessionId?: string; count: number; links: ClosedTab[]; lastModified: number };
type ClosedSingleTab = { kind: "tab"; sessionId?: string; url: string; title: string; lastModified: number };
type ClosedItem = ClosedWindow | ClosedSingleTab;

function hostLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function timeAgo(seconds: number) {
  const diff = Math.max(0, Math.floor(Date.now() / 1000 - seconds));
  if (diff < 60) return "recién";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}

export default function Sessions() {
  const [items, setItems] = useState<ClosedItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "no-extension">("loading");
  const gotResponse = useRef(false);

  const request = useCallback(() => {
    window.postMessage({ source: "dash-page", type: "getRecentlyClosed" }, window.location.origin);
  }, []);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { source?: string; type?: string; items?: ClosedItem[] };
      if (data?.source !== "dash-extension") return;

      if (data.type === "ready") {
        request();
      } else if (data.type === "recentlyClosed") {
        gotResponse.current = true;
        setItems(Array.isArray(data.items) ? data.items : []);
        setStatus("ready");
      } else if (data.type === "restored") {
        request(); // la sesion restaurada ya no esta "cerrada"
      }
    }
    window.addEventListener("message", onMessage);
    request();

    // refresca al volver a la pestaña
    const onFocus = () => request();
    window.addEventListener("focus", onFocus);

    // si en ~1.5s nadie respondio, no hay extension corriendo
    const t = window.setTimeout(() => {
      if (!gotResponse.current) setStatus("no-extension");
    }, 1500);

    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("focus", onFocus);
      window.clearTimeout(t);
    };
  }, [request]);

  // Solo ventanas que se cerraron con mas de 5 pestañas.
  const closedWindows = items.filter((item) => item.kind === "window" && item.count > 5);

  function reopen(item: ClosedItem) {
    if (item.sessionId) {
      window.postMessage({ source: "dash-page", type: "restore", sessionId: item.sessionId }, window.location.origin);
      return;
    }
    const urls = item.kind === "window" ? item.links.map((l) => l.url) : [item.url];
    for (const url of urls) window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <section
      aria-label="Cerradas recientemente"
      className="p-3"
      style={{
        background: "var(--surface)",
        border: "2px solid var(--ink)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--sh-sm)",
      }}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase" style={{ fontFamily: "var(--font-head)", letterSpacing: "0.04em" }}>
            Pestañas cerradas
          </p>
          <p className="text-[9px]" style={{ color: "var(--muted)" }}>Ventanas con más de 5 pestañas</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="px-1.5 py-0.5 text-[9px] tabular-nums"
            style={{ fontFamily: "var(--font-head)", border: "1.5px solid var(--ink)", borderRadius: "var(--radius)" }}
          >
            {closedWindows.length}
          </span>
          <button type="button" aria-label="Actualizar" onClick={request}>
            <IconRefresh size={14} stroke={2.4} color="var(--muted)" />
          </button>
        </div>
      </div>

      {status === "no-extension" && (
        <p className="py-3 text-center text-[10px]" style={{ color: "var(--muted)" }}>
          Necesitás la extensión activa para ver tus pestañas cerradas.
        </p>
      )}

      {status === "ready" && closedWindows.length === 0 && (
        <p className="py-3 text-center text-[10px]" style={{ color: "var(--muted)" }}>
          No cerraste ventanas con más de 5 pestañas.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {closedWindows.slice(0, 8).map((item, index) => (
          <button
            key={(item.sessionId ?? "") + index}
            type="button"
            onClick={() => reopen(item)}
            className="group flex items-center gap-2 p-2 text-left"
            style={{ border: "1.5px solid var(--ink)", borderRadius: "var(--radius)", background: "var(--paper)" }}
          >
            <span
              className="grid h-7 w-7 shrink-0 place-items-center"
              style={{ border: "1.5px solid var(--ink)", borderRadius: "var(--radius)", background: "var(--surface)" }}
            >
              {item.kind === "window" ? (
                <IconWindowMaximize size={14} stroke={2.2} color="var(--ink)" />
              ) : (
                <IconWorld size={14} stroke={2.2} color="var(--ink)" />
              )}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs" style={{ fontFamily: "var(--font-head)" }}>
                {item.kind === "window" ? `Ventana · ${item.count} pestañas` : item.title}
              </span>
              <span className="block truncate text-[9px]" style={{ color: "var(--muted)" }}>
                {item.kind === "window"
                  ? item.links.slice(0, 3).map((l) => hostLabel(l.url)).join(" · ")
                  : hostLabel(item.url)}
                {" — "}
                {timeAgo(item.lastModified)}
              </span>
            </span>

            <IconExternalLink
              size={14}
              stroke={2.2}
              color="var(--muted)"
              className="shrink-0 opacity-60 group-hover:opacity-100"
            />
          </button>
        ))}
      </div>
    </section>
  );
}
