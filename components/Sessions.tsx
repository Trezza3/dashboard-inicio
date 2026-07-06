"use client";

import { useEffect, useState } from "react";
import { IconExternalLink, IconPlus, IconTrash } from "@tabler/icons-react";

type SavedSession = {
  id: string;
  name: string;
  links: string[];
  createdAt: string;
};

const STORAGE_KEY = "dash-sessions-v1";

function normalizeUrl(raw: string) {
  const value = raw.trim();
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function hostLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function Sessions() {
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [links, setLinks] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) setSessions(JSON.parse(raw));
      } catch {
        /* ignore */
      }
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch {
      /* ignore */
    }
  }, [loaded, sessions]);

  function addSession() {
    const cleanLinks = links
      .split(/\s+/)
      .map(normalizeUrl)
      .filter(Boolean);
    if (cleanLinks.length === 0) return;

    setSessions((prev) => [
      {
        id: crypto.randomUUID(),
        name: name.trim() || `Sesion ${prev.length + 1}`,
        links: cleanLinks,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setName("");
    setLinks("");
  }

  function removeSession(id: string) {
    setSessions((prev) => prev.filter((session) => session.id !== id));
  }

  function openSession(session: SavedSession) {
    session.links.forEach((url, index) => {
      window.setTimeout(() => window.open(url, "_blank", "noopener,noreferrer"), index * 80);
    });
  }

  return (
    <section
      aria-label="Sesiones guardadas"
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
            Continuar
          </p>
          <p className="text-[9px]" style={{ color: "var(--muted)" }}>Grupos de pestanas</p>
        </div>
        <span
          className="px-1.5 py-0.5 text-[9px] tabular-nums"
          style={{ fontFamily: "var(--font-head)", border: "1.5px solid var(--ink)", borderRadius: "var(--radius)" }}
        >
          {sessions.length}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de sesion"
          className="px-2 py-1.5 text-xs outline-none"
          style={{ background: "var(--surface)", border: "1.5px solid var(--ink)", borderRadius: "var(--radius)" }}
        />
        <textarea
          value={links}
          onChange={(e) => setLinks(e.target.value)}
          placeholder="Pega links separados por espacio o enter"
          rows={3}
          className="resize-none px-2 py-1.5 text-xs outline-none"
          style={{ background: "var(--surface)", border: "1.5px solid var(--ink)", borderRadius: "var(--radius)" }}
        />
        <button
          type="button"
          onClick={addSession}
          className="tile flex items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] uppercase"
          style={{
            background: "var(--sky)",
            color: "#fff",
            border: "2px solid var(--ink)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--sh-sm)",
            fontFamily: "var(--font-head)",
          }}
        >
          <IconPlus size={14} stroke={2.6} />
          Guardar sesion
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {sessions.slice(0, 4).map((session) => (
          <div
            key={session.id}
            className="p-2"
            style={{ border: "1.5px solid var(--ink)", borderRadius: "var(--radius)", background: "var(--paper)" }}
          >
            <div className="mb-1 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs" style={{ fontFamily: "var(--font-head)" }}>{session.name}</p>
                <p className="text-[9px]" style={{ color: "var(--muted)" }}>{session.links.length} links</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button type="button" aria-label={`Abrir ${session.name}`} onClick={() => openSession(session)}>
                  <IconExternalLink size={13} stroke={2.4} color="var(--ink)" />
                </button>
                <button type="button" aria-label={`Borrar ${session.name}`} onClick={() => removeSession(session.id)}>
                  <IconTrash size={13} stroke={2.4} color="var(--muted)" />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {session.links.slice(0, 3).map((url) => (
                <span key={url} className="max-w-[110px] truncate text-[8px]" style={{ color: "var(--muted)" }}>
                  {hostLabel(url)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
