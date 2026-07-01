"use client";

import { useEffect, useState } from "react";
import { IconPlus, IconTrash, IconClock } from "@tabler/icons-react";

type AgendaItem = {
  id: string;
  time: string;
  title: string;
  done: boolean;
};

const STORAGE_KEY = "dash-agenda-v1";
const DEFAULT_ITEMS: AgendaItem[] = [
  { id: "start", time: "09:30", title: "Revisar proyectos activos", done: false },
  { id: "focus", time: "11:00", title: "Bloque de foco", done: false },
];

function sortedItems(items: AgendaItem[]) {
  return [...items].sort((a, b) => a.time.localeCompare(b.time));
}

export default function Agenda() {
  const [items, setItems] = useState<AgendaItem[]>(DEFAULT_ITEMS);
  const [loaded, setLoaded] = useState(false);
  const [time, setTime] = useState("10:00");
  const [title, setTitle] = useState("");

  useEffect(() => {
    const loadAgenda = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) setItems(JSON.parse(raw));
      } catch {
        setItems(DEFAULT_ITEMS);
      }
      setLoaded(true);
    }, 0);

    return () => window.clearTimeout(loadAgenda);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, loaded]);

  function addItem() {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), time, title: cleanTitle, done: false },
    ]);
    setTitle("");
  }

  function toggleItem(id: string) {
    setItems((prev) =>
      prev.map((item) => item.id === id ? { ...item, done: !item.done } : item)
    );
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  const pending = items.filter((item) => !item.done).length;

  return (
    <section
      aria-label="Agenda del día"
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
          <IconClock size={13} stroke={2.5} color="var(--ink)" />
          <p
            className="text-[10px] uppercase"
            style={{ fontFamily: "var(--font-head)", letterSpacing: "0.04em" }}
          >
            Agenda
          </p>
        </div>
        <span
          className="text-[9px] px-1.5 py-0.5 tabular-nums"
          style={{
            fontFamily: "var(--font-head)",
            background: pending > 0 ? "var(--gold)" : "var(--lime)",
            color: "#14130F",
            border: "1.5px solid var(--ink)",
            borderRadius: "var(--radius)",
          }}
        >
          {pending}
        </span>
      </div>

      <ul className="flex flex-col gap-1.5">
        {sortedItems(items).map((item) => (
          <li key={item.id} className="flex items-start gap-1.5">
            <button
              type="button"
              onClick={() => toggleItem(item.id)}
              className="flex min-w-0 flex-1 items-start gap-2 text-left"
            >
              <span
                className="mt-0.5 px-1 py-0.5 text-[9px] tabular-nums"
                style={{
                  fontFamily: "var(--font-head)",
                  background: item.done ? "transparent" : "var(--lime)",
                  border: "1.5px solid var(--ink)",
                  borderRadius: "var(--radius)",
                  color: item.done ? "var(--faint)" : "#14130F",
                }}
              >
                {item.time}
              </span>
              <span
                className="min-w-0 text-xs leading-tight"
                style={{
                  color: item.done ? "var(--faint)" : "var(--ink)",
                  textDecoration: item.done ? "line-through" : "none",
                }}
              >
                {item.title}
              </span>
            </button>
            <button
              type="button"
              aria-label={`Borrar ${item.title}`}
              onClick={() => removeItem(item.id)}
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center"
              style={{
                border: "1.5px solid var(--ink)",
                borderRadius: "var(--radius)",
                background: "var(--surface)",
              }}
            >
              <IconTrash size={11} stroke={2.2} color="var(--muted)" />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex gap-1.5">
        <input
          aria-label="Hora"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-[76px] px-1 py-1.5 text-[10px] outline-none"
          style={{
            background: "var(--surface)",
            border: "2px solid var(--ink)",
            borderRadius: "var(--radius)",
            fontFamily: "var(--font-head)",
          }}
        />
        <input
          aria-label="Nuevo evento"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addItem();
          }}
          placeholder="Nuevo bloque"
          className="min-w-0 flex-1 px-2 py-1.5 text-xs outline-none"
          style={{
            background: "var(--surface)",
            border: "2px solid var(--ink)",
            borderRadius: "var(--radius)",
            fontFamily: "var(--font-sans)",
          }}
        />
        <button
          type="button"
          aria-label="Agregar evento"
          onClick={addItem}
          className="tile flex h-[31px] w-[31px] items-center justify-center"
          style={{
            background: "var(--sky)",
            border: "2px solid var(--ink)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--sh-sm)",
          }}
        >
          <IconPlus size={15} stroke={2.5} color="#fff" />
        </button>
      </div>
    </section>
  );
}
