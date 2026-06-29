"use client";

import { useEffect, useState } from "react";

type Note = { id: string; text: string; done: boolean; urgent?: boolean };

const STORAGE_KEY = "dash-notes";

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState("");
  const [loaded, setLoaded] = useState(false);

  // Leer en el cliente, nunca en SSR
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setNotes(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  // Persistir
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch {
      /* ignore */
    }
  }, [notes, loaded]);

  function addNote() {
    const text = draft.trim();
    if (!text) return;
    const urgent = /^!/.test(text);
    setNotes((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        text: urgent ? text.replace(/^!\s*/, "") : text,
        done: false,
        urgent,
      },
    ]);
    setDraft("");
  }

  function toggle(id: string) {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, done: !n.done } : n))
    );
  }

  return (
    <section
      aria-label="Notas"
      className="p-3"
      style={{
        background: "var(--surface)",
        border: "2px solid var(--ink)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--sh-sm)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <p
          className="text-[10px] uppercase"
          style={{ fontFamily: "var(--font-head)", letterSpacing: "0.04em" }}
        >
          Notas
        </p>
        {notes.length > 0 && (
          <span
            className="text-[9px] px-1.5 py-0.5 tabular-nums"
            style={{
              fontFamily: "var(--font-head)",
              background: notes.every((n) => n.done) ? "var(--lime)" : "var(--ink)",
              color:      notes.every((n) => n.done) ? "var(--ink)"  : "var(--paper)",
              border: "1.5px solid var(--ink)",
              borderRadius: "var(--radius)",
            }}
          >
            {notes.filter((n) => n.done).length}/{notes.length}
          </span>
        )}
      </div>

      <ul className="flex flex-col gap-1.5">
        {notes.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => toggle(n.id)}
              className="flex w-full items-start gap-2 text-left text-xs"
            >
              <span
                className="mt-0.5 inline-block h-3 w-3 shrink-0"
                style={{
                  background: n.done
                    ? "transparent"
                    : n.urgent
                    ? "var(--coral)"
                    : "var(--sky)",
                  border: "1.5px solid var(--ink)",
                  borderRadius: "var(--radius)",
                }}
              />
              <span
                style={{
                  textDecoration: n.done ? "line-through" : "none",
                  color: n.done ? "var(--faint)" : "var(--ink)",
                }}
              >
                {n.text}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") addNote();
        }}
        placeholder="Nueva nota…"
        className="mt-2 w-full px-2 py-1.5 text-xs outline-none"
        style={{
          background: "var(--surface)",
          border: "2px solid var(--ink)",
          borderRadius: "var(--radius)",
          fontFamily: "var(--font-sans)",
        }}
      />
    </section>
  );
}
