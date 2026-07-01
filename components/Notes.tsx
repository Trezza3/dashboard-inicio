"use client";

import { useEffect, useState } from "react";
import { IconCheck, IconPencil, IconPin, IconTrash } from "@tabler/icons-react";

type Priority = "normal" | "alta";
type Note = {
  id: string;
  text: string;
  done: boolean;
  urgent?: boolean;
  priority?: Priority;
  pinned?: boolean;
};

const STORAGE_KEY = "dash-notes";

function normalizeNote(note: Note): Note {
  return {
    ...note,
    priority: note.priority ?? (note.urgent ? "alta" : "normal"),
    pinned: Boolean(note.pinned),
  };
}

function sortedNotes(notes: Note[]) {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.priority !== b.priority) return a.priority === "alta" ? -1 : 1;
    return 0;
  });
}

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadNotes = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) setNotes(JSON.parse(raw).map(normalizeNote));
      } catch {
        /* ignore */
      }
      setLoaded(true);
    }, 0);

    return () => window.clearTimeout(loadNotes);
  }, []);

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
    const urgent = /^!/.test(text) || priority === "alta";
    setNotes((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        text: urgent ? text.replace(/^!\s*/, "") : text,
        done: false,
        urgent,
        priority: urgent ? "alta" : "normal",
        pinned: false,
      },
    ]);
    setDraft("");
    setPriority("normal");
  }

  function toggle(id: string) {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, done: !n.done } : n))
    );
  }

  function togglePin(id: string) {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n))
    );
  }

  function remove(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  function startEdit(note: Note) {
    setEditing(note.id);
    setEditText(note.text);
  }

  function saveEdit() {
    const text = editText.trim();
    if (!editing || !text) return;
    setNotes((prev) =>
      prev.map((note) => note.id === editing ? { ...note, text } : note)
    );
    setEditing(null);
    setEditText("");
  }

  const doneCount = notes.filter((n) => n.done).length;

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
      <div className="mb-2 flex items-center justify-between gap-2">
        <p
          className="text-[10px] uppercase"
          style={{ fontFamily: "var(--font-head)", letterSpacing: "0.04em" }}
        >
          Notas
        </p>
        {notes.length > 0 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setNotes((prev) => prev.filter((n) => !n.done))}
              className="badge px-1.5 py-0.5 text-[8px] uppercase"
              style={{
                fontFamily: "var(--font-head)",
                border: "1.5px solid var(--ink)",
                borderRadius: "var(--radius)",
              }}
            >
              Limpiar
            </button>
            <span
              className="text-[9px] px-1.5 py-0.5 tabular-nums"
              style={{
                fontFamily: "var(--font-head)",
                background: doneCount === notes.length ? "var(--lime)" : "var(--ink)",
                color: doneCount === notes.length ? "var(--ink)" : "var(--paper)",
                border: "1.5px solid var(--ink)",
                borderRadius: "var(--radius)",
              }}
            >
              {doneCount}/{notes.length}
            </span>
          </div>
        )}
      </div>

      <ul className="flex flex-col gap-1.5">
        {sortedNotes(notes).map((n) => (
          <li key={n.id} className="flex items-start gap-1.5">
            <button
              type="button"
              onClick={() => toggle(n.id)}
              className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center"
              style={{
                background: n.done ? "var(--lime)" : "transparent",
                border: "1.5px solid var(--ink)",
                borderRadius: "var(--radius)",
              }}
            >
              {n.done && <IconCheck size={10} stroke={3} color="var(--ink)" />}
            </button>

            <div className="min-w-0 flex-1">
              {editing === n.id ? (
                <input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit();
                    if (e.key === "Escape") setEditing(null);
                  }}
                  className="w-full px-1.5 py-1 text-xs outline-none"
                  style={{
                    background: "var(--surface)",
                    border: "1.5px solid var(--ink)",
                    borderRadius: "var(--radius)",
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => toggle(n.id)}
                  className="w-full text-left text-xs leading-tight"
                  style={{
                    textDecoration: n.done ? "line-through" : "none",
                    color: n.done ? "var(--faint)" : "var(--ink)",
                  }}
                >
                  {n.text}
                </button>
              )}
              <div className="mt-1 flex flex-wrap gap-1">
                {n.pinned && (
                  <span className="text-[8px] uppercase" style={{ fontFamily: "var(--font-head)", color: "var(--muted)" }}>
                    Pin
                  </span>
                )}
                {normalizeNote(n).priority === "alta" && (
                  <span className="text-[8px] uppercase" style={{ fontFamily: "var(--font-head)", color: "var(--coral)" }}>
                    Alta
                  </span>
                )}
              </div>
            </div>

            <div className="flex shrink-0 gap-1">
              <button type="button" aria-label="Fijar nota" onClick={() => togglePin(n.id)}>
                <IconPin size={12} stroke={2.3} color={n.pinned ? "var(--coral)" : "var(--muted)"} />
              </button>
              <button type="button" aria-label="Editar nota" onClick={() => editing === n.id ? saveEdit() : startEdit(n)}>
                <IconPencil size={12} stroke={2.3} color="var(--muted)" />
              </button>
              <button type="button" aria-label="Borrar nota" onClick={() => remove(n.id)}>
                <IconTrash size={12} stroke={2.3} color="var(--muted)" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex gap-1.5">
        <button
          type="button"
          onClick={() => setPriority((value) => value === "alta" ? "normal" : "alta")}
          className="px-1.5 py-1 text-[9px] uppercase"
          style={{
            background: priority === "alta" ? "var(--coral)" : "var(--surface)",
            color: priority === "alta" ? "var(--paper)" : "var(--ink)",
            border: "2px solid var(--ink)",
            borderRadius: "var(--radius)",
            fontFamily: "var(--font-head)",
          }}
        >
          !
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addNote();
          }}
          placeholder="Nueva nota"
          className="min-w-0 flex-1 px-2 py-1.5 text-xs outline-none"
          style={{
            background: "var(--surface)",
            border: "2px solid var(--ink)",
            borderRadius: "var(--radius)",
            fontFamily: "var(--font-sans)",
          }}
        />
      </div>
    </section>
  );
}
