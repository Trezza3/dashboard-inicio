"use client";

import { type DragEvent, useEffect, useState } from "react";
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

type PostItBoardProps = {
  storageKey: string;
  defaultTitle: string;
  defaultColor: string;
  rotation: number;
};

const NOTE_MIME = "application/x-dashboard-note";

function normalizeNote(note: Note): Note {
  return {
    ...note,
    priority: note.priority ?? "normal",
    pinned: Boolean(note.pinned),
  };
}

function sortedNotes(notes: Note[]) {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.done !== b.done) return a.done ? 1 : -1;
    return 0;
  });
}

function PostItBoard({ storageKey, defaultTitle, defaultColor, rotation }: PostItBoardProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [paperTitle, setPaperTitle] = useState(defaultTitle);
  const [paperColor, setPaperColor] = useState(defaultColor);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadNotes = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) setNotes(JSON.parse(raw).map(normalizeNote));
        setPaperTitle(localStorage.getItem(`${storageKey}-title`) ?? defaultTitle);
        setPaperColor(localStorage.getItem(`${storageKey}-color`) ?? defaultColor);
      } catch {
        /* ignore */
      }
      setLoaded(true);
    }, 0);

    return () => window.clearTimeout(loadNotes);
  }, [defaultColor, defaultTitle, storageKey]);

  useEffect(() => {
    function refreshSettings() {
      setPaperTitle(localStorage.getItem(`${storageKey}-title`) ?? defaultTitle);
      setPaperColor(localStorage.getItem(`${storageKey}-color`) ?? defaultColor);
    }

    window.addEventListener("dashboard-settings-updated", refreshSettings);
    window.addEventListener("storage", refreshSettings);
    return () => {
      window.removeEventListener("dashboard-settings-updated", refreshSettings);
      window.removeEventListener("storage", refreshSettings);
    };
  }, [defaultColor, defaultTitle, storageKey]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(notes));
    } catch {
      /* ignore */
    }
  }, [notes, loaded, storageKey]);

  useEffect(() => {
    function onScheduled(event: Event) {
      const detail = (event as CustomEvent<{ storageKey: string; noteId: string }>).detail;
      if (detail?.storageKey !== storageKey) return;
      setNotes((prev) =>
        prev.map((note) => note.id === detail.noteId ? { ...note, done: true } : note)
      );
    }

    window.addEventListener("dashboard-note-scheduled", onScheduled);
    return () => window.removeEventListener("dashboard-note-scheduled", onScheduled);
  }, [storageKey]);

  function addNote() {
    const text = draft.trim();
    if (!text) return;
    setNotes((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        text,
        done: false,
        priority: "normal",
        pinned: false,
      },
    ]);
    setDraft("");
  }

  function toggle(id: string) {
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, done: !note.done } : note))
    );
  }

  function togglePin(id: string) {
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, pinned: !note.pinned } : note))
    );
  }

  function remove(id: string) {
    setNotes((prev) => prev.filter((note) => note.id !== id));
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

  function startDrag(event: DragEvent<HTMLLIElement>, note: Note) {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(
      NOTE_MIME,
      JSON.stringify({ storageKey, noteId: note.id, text: note.text }),
    );
    event.dataTransfer.setData("text/plain", note.text);
  }

  const doneCount = notes.filter((note) => note.done).length;

  return (
    <section
      aria-label={paperTitle}
      className="postit-paper px-1 py-2"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <div
        className="relative p-3 pt-5"
        style={{
          minHeight: 320,
          background: paperColor,
          border: "2px solid var(--ink)",
          borderRadius: "2px",
          boxShadow: "5px 6px 0 rgba(20, 19, 15, 0.28)",
          color: "#14130F",
        }}
      >
        <div
          className="absolute left-1/2 top-[-10px] h-5 w-20 -translate-x-1/2"
          style={{
            background: "rgba(255,255,255,0.52)",
            border: "1.5px solid rgba(20,19,15,0.35)",
            boxShadow: "1px 2px 0 rgba(20,19,15,0.18)",
          }}
          aria-hidden="true"
        />

        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <p
              className="text-[11px] uppercase"
              style={{ fontFamily: "var(--font-head)", letterSpacing: "0.04em" }}
            >
              {paperTitle}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {notes.length > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setNotes((prev) => prev.filter((note) => !note.done))}
                  className="px-1.5 py-0.5 text-[8px] uppercase"
                  style={{
                    fontFamily: "var(--font-head)",
                    border: "1.5px solid #14130F",
                    borderRadius: "2px",
                    background: "rgba(255,255,255,0.35)",
                  }}
                >
                  Limpiar
                </button>
                <span
                  className="px-1.5 py-0.5 text-[9px] tabular-nums"
                  style={{
                    fontFamily: "var(--font-head)",
                    border: "1.5px solid #14130F",
                    borderRadius: "2px",
                    background: doneCount === notes.length ? "var(--lime)" : "#14130F",
                    color: doneCount === notes.length ? "#14130F" : paperColor,
                  }}
                >
                  {doneCount}/{notes.length}
                </span>
              </div>
            )}
          </div>
        </div>

        <ul
          className="mb-3 flex max-h-[330px] flex-col gap-1.5 overflow-y-auto pr-1"
          style={{
            minHeight: 190,
            backgroundImage: "linear-gradient(rgba(20,19,15,0.18) 1px, transparent 1px)",
            backgroundSize: "100% 26px",
          }}
        >
          {sortedNotes(notes).map((note) => (
            <li
              key={note.id}
              draggable
              onDragStart={(event) => startDrag(event, note)}
              className="flex cursor-grab items-start gap-1.5 active:cursor-grabbing"
              title="Arrastrar al calendario"
            >
              <button
                type="button"
                onClick={() => toggle(note.id)}
                className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center"
                style={{
                  background: note.done ? "var(--lime)" : "rgba(255,255,255,0.3)",
                  border: "1.5px solid #14130F",
                  borderRadius: "2px",
                }}
              >
                {note.done && <IconCheck size={10} stroke={3} color="#14130F" />}
              </button>

              <div className="min-w-0 flex-1">
                {editing === note.id ? (
                  <input
                    value={editText}
                    onChange={(event) => setEditText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") saveEdit();
                      if (event.key === "Escape") setEditing(null);
                    }}
                    className="w-full px-1 py-0.5 text-xs outline-none"
                    style={{
                      background: "rgba(255,255,255,0.42)",
                      border: "1.5px solid #14130F",
                      borderRadius: "2px",
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => toggle(note.id)}
                    className="w-full text-left text-xs leading-tight"
                    style={{
                      textDecoration: note.done ? "line-through" : "none",
                      color: note.done ? "rgba(20,19,15,0.5)" : "#14130F",
                    }}
                  >
                    {note.text}
                  </button>
                )}
                {note.pinned && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className="text-[8px] uppercase" style={{ fontFamily: "var(--font-head)" }}>
                      Fijo
                    </span>
                  </div>
                )}
              </div>

              <div className="flex shrink-0 gap-1">
                <button type="button" aria-label={`Fijar ${note.text}`} onClick={() => togglePin(note.id)}>
                  <IconPin size={12} stroke={2.4} color={note.pinned ? "var(--coral)" : "#14130F"} />
                </button>
                <button type="button" aria-label={`Editar ${note.text}`} onClick={() => editing === note.id ? saveEdit() : startEdit(note)}>
                  <IconPencil size={12} stroke={2.4} color="#14130F" />
                </button>
                <button type="button" aria-label={`Borrar ${note.text}`} onClick={() => remove(note.id)}>
                  <IconTrash size={12} stroke={2.4} color="#14130F" />
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex gap-1.5">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addNote();
            }}
            placeholder="Escribir y enter"
            className="min-w-0 flex-1 px-2 py-1.5 text-xs outline-none"
            style={{
              background: "rgba(255,255,255,0.32)",
              border: "1.5px solid #14130F",
              borderRadius: "2px",
              fontFamily: "var(--font-sans)",
            }}
          />
        </div>
      </div>
    </section>
  );
}

export default function Notes() {
  return (
    <div className="postit-wall flex flex-col gap-3">
      <PostItBoard
        storageKey="dash-notes"
        defaultTitle="Post-it"
        defaultColor="#FBF1C7"
        rotation={-1}
      />
      <PostItBoard
        storageKey="dash-notes-left-v1"
        defaultTitle="Ideas"
        defaultColor="#A7F3D0"
        rotation={1}
      />
    </div>
  );
}
