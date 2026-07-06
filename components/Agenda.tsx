"use client";

import { type DragEvent, useEffect, useMemo, useState } from "react";
import { IconCalendarWeek, IconChevronLeft, IconChevronRight, IconPlus, IconTrash } from "@tabler/icons-react";

type AgendaItem = {
  id: string;
  date: string;
  time: string;
  title: string;
  kind: "trabajo" | "personal" | "pago";
  done: boolean;
};

const STORAGE_KEY = "dash-agenda-v2";
const LEGACY_KEY = "dash-agenda-v1";
const NOTE_MIME = "application/x-dashboard-note";
const KINDS = [
  { id: "trabajo", label: "Trabajo", color: "var(--sky)" },
  { id: "personal", label: "Personal", color: "var(--lime)" },
  { id: "pago", label: "Pago", color: "var(--gold)" },
] as const;

type DraggedNote = {
  storageKey: string;
  noteId: string;
  text: string;
};

type ViewMode = "week" | "month";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(base.getDate() + days);
  return next;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date: Date) {
  const dayIndex = (date.getDay() + 6) % 7;
  return addDays(date, -dayIndex);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function daysBetween(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

function monthName(date: Date) {
  return new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" })
    .format(date)
    .toUpperCase();
}

function weekPeriodName(start: Date, end: Date) {
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const startDay = new Intl.DateTimeFormat("es-AR", { day: "numeric" }).format(start);
  const endDay = new Intl.DateTimeFormat("es-AR", { day: "numeric" }).format(end);
  const endMonth = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(end).toUpperCase();

  if (sameMonth) return `${startDay} - ${endDay} ${endMonth}`;

  const startMonth = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long" }).format(start).toUpperCase();
  return `${startMonth} - ${endDay} ${endMonth}`;
}

function dayName(date: Date) {
  return new Intl.DateTimeFormat("es-AR", { weekday: "short" })
    .format(date)
    .replace(".", "")
    .toUpperCase();
}

function dayNumber(date: Date) {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit" }).format(date);
}

function sortedItems(items: AgendaItem[]) {
  return [...items].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

function kindColor(kind: AgendaItem["kind"]) {
  return KINDS.find((item) => item.id === kind)?.color ?? "var(--sky)";
}

function normalizeStoredItems(raw: string | null): AgendaItem[] | null {
  if (!raw) return null;
  const parsed = JSON.parse(raw) as Partial<AgendaItem>[];

  return parsed.map((item) => ({
    id: item.id ?? crypto.randomUUID(),
    date: item.date ?? todayIso(),
    time: item.time ?? "10:00",
    title: item.title ?? "Sin titulo",
    kind: item.kind ?? "trabajo",
    done: Boolean(item.done),
  }));
}

export default function Agenda() {
  const [items, setItems] = useState<AgendaItem[]>([
    { id: "start", date: todayIso(), time: "09:30", title: "Revisar proyectos activos", kind: "trabajo", done: false },
    { id: "pay", date: todayIso(), time: "18:00", title: "Mirar pendientes y pagos", kind: "pago", done: false },
  ]);
  const [loaded, setLoaded] = useState(false);
  const [date, setDate] = useState(todayIso());
  const [time, setTime] = useState("10:00");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<AgendaItem["kind"]>("trabajo");
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [activeDate, setActiveDate] = useState(todayIso());

  useEffect(() => {
    const loadAgenda = window.setTimeout(() => {
      try {
        const current = normalizeStoredItems(localStorage.getItem(STORAGE_KEY));
        const legacy = normalizeStoredItems(localStorage.getItem(LEGACY_KEY));
        if (current ?? legacy) setItems((current ?? legacy)!);
      } catch {
        /* keep defaults */
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
      { id: crypto.randomUUID(), date, time, title: cleanTitle, kind, done: false },
    ]);
    setActiveDate(date);
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

  function canDropNote(event: DragEvent) {
    return Array.from(event.dataTransfer.types).includes(NOTE_MIME);
  }

  function scheduleDraggedNote(dayIso: string, note: DraggedNote) {
    const cleanTitle = note.text.trim();
    if (!cleanTitle) return;

    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        date: dayIso,
        time,
        title: cleanTitle,
        kind: "personal",
        done: false,
      },
    ]);
    setDate(dayIso);
    setActiveDate(dayIso);
    window.dispatchEvent(new CustomEvent("dashboard-note-scheduled", {
      detail: { storageKey: note.storageKey, noteId: note.noteId },
    }));
  }

  function onDayDragOver(event: DragEvent<HTMLDivElement>) {
    if (!canDropNote(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function onDayDrop(event: DragEvent<HTMLDivElement>, dayIso: string) {
    if (!canDropNote(event)) return;
    event.preventDefault();

    try {
      const note = JSON.parse(event.dataTransfer.getData(NOTE_MIME)) as DraggedNote;
      scheduleDraggedNote(dayIso, note);
    } catch {
      const text = event.dataTransfer.getData("text/plain");
      if (text) scheduleDraggedNote(dayIso, { storageKey: "", noteId: crypto.randomUUID(), text });
    }
  }

  const today = todayIso();
  const active = useMemo(() => new Date(`${activeDate}T00:00:00`), [activeDate]);
  const visibleDays = useMemo(() => {
    const base = viewMode === "month"
      ? startOfWeek(startOfMonth(active))
      : startOfWeek(active);
    const totalDays = viewMode === "month"
      ? daysBetween(base, addDays(startOfWeek(endOfMonth(active)), 6)) + 1
      : 7;
    const activeMonth = active.getMonth();

    return Array.from({ length: totalDays }, (_, index) => {
      const day = addDays(base, index);
      const dayIso = isoDate(day);
      return {
        iso: dayIso,
        label: dayIso === today ? "HOY" : dayName(day),
        number: dayNumber(day),
        inMonth: day.getMonth() === activeMonth,
        items: sortedItems(items).filter((item) => item.date === dayIso),
      };
    });
  }, [active, items, today, viewMode]);

  const pendingToday = items.filter((item) => item.date === today && !item.done);
  const nextItem = sortedItems(items).find((item) => !item.done && `${item.date} ${item.time}` >= `${today} 00:00`);
  const weekStart = startOfWeek(active);
  const weekEnd = addDays(weekStart, 6);
  const periodTitle = viewMode === "month"
    ? monthName(active)
    : weekPeriodName(weekStart, weekEnd);
  const dayLimit = viewMode === "month" ? 2 : 4;

  function movePeriod(direction: -1 | 1) {
    const base = new Date(`${activeDate}T00:00:00`);
    const next = viewMode === "month"
      ? new Date(base.getFullYear(), base.getMonth() + direction, 1)
      : addDays(base, direction * 7);
    const nextIso = isoDate(next);
    setActiveDate(nextIso);
    setDate(nextIso);
  }

  function goToday() {
    setActiveDate(today);
    setDate(today);
  }

  return (
    <section
      aria-label="Calendario"
      className="p-3 sm:p-4"
      style={{
        background: "var(--surface)",
        border: "2px solid var(--ink)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--sh-sm)",
      }}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <IconCalendarWeek size={16} stroke={2.5} color="var(--ink)" />
          <div>
            <p
              className="text-[11px] uppercase"
              style={{ fontFamily: "var(--font-head)", letterSpacing: "0.04em" }}
            >
              Calendario
            </p>
            <p className="text-[10px]" style={{ color: "var(--muted)" }}>
              {periodTitle}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => movePeriod(-1)}
            aria-label="Periodo anterior"
            className="tile inline-flex h-7 w-7 items-center justify-center"
            style={{ background: "var(--surface)", border: "1.5px solid var(--ink)", borderRadius: "var(--radius)" }}
          >
            <IconChevronLeft size={14} stroke={2.6} color="var(--ink)" />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="px-2 py-1 text-[9px] uppercase"
            style={{
              fontFamily: "var(--font-head)",
              background: pendingToday.length > 0 ? "var(--gold)" : "var(--lime)",
              color: "#14130F",
              border: "1.5px solid var(--ink)",
              borderRadius: "var(--radius)",
            }}
          >
            {pendingToday.length} hoy
          </button>
          <button
            type="button"
            onClick={() => movePeriod(1)}
            aria-label="Periodo siguiente"
            className="tile inline-flex h-7 w-7 items-center justify-center"
            style={{ background: "var(--surface)", border: "1.5px solid var(--ink)", borderRadius: "var(--radius)" }}
          >
            <IconChevronRight size={14} stroke={2.6} color="var(--ink)" />
          </button>
          <div
            className="ml-1 flex"
            style={{ border: "1.5px solid var(--ink)", borderRadius: "var(--radius)", overflow: "hidden" }}
          >
            {(["week", "month"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className="px-2 py-1 text-[9px] uppercase"
                style={{
                  background: viewMode === mode ? "var(--ink)" : "var(--surface)",
                  color: viewMode === mode ? "var(--paper)" : "var(--ink)",
                  fontFamily: "var(--font-head)",
                }}
              >
                {mode === "week" ? "Semana" : "Mes"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-2 lg:grid-cols-[1fr_190px]">
        <div className={viewMode === "month" ? "grid grid-cols-7 gap-1.5" : "grid grid-cols-2 gap-2 sm:grid-cols-4"}>
          {visibleDays.map((day) => (
            <div
              key={day.iso}
              onDragOver={onDayDragOver}
              onDrop={(event) => onDayDrop(event, day.iso)}
              className={viewMode === "month" ? "min-h-[92px] p-1.5" : "min-h-[150px] p-2"}
              style={{
                background: day.iso === today ? "var(--paper)" : "var(--surface)",
                border: "1.5px solid var(--ink)",
                borderRadius: "var(--radius)",
                opacity: viewMode === "month" && !day.inMonth ? 0.5 : 1,
              }}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className={viewMode === "month" ? "text-[8px] uppercase" : "text-[9px] uppercase"} style={{ fontFamily: "var(--font-head)", color: "var(--muted)" }}>
                  {day.label}
                </span>
                <span className={viewMode === "month" ? "text-xs tabular-nums" : "text-sm tabular-nums"} style={{ fontFamily: "var(--font-head)" }}>
                  {day.number}
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                {day.items.slice(0, dayLimit).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    className="group text-left"
                    style={{
                      opacity: item.done ? 0.55 : 1,
                    }}
                  >
                      <span
                      className={viewMode === "month" ? "block px-1 py-0.5 text-[8px] leading-tight" : "block px-1.5 py-1 text-[10px] leading-tight"}
                      style={{
                        background: kindColor(item.kind),
                        color: item.kind === "personal" || item.kind === "pago" ? "#14130F" : "#fff",
                        border: "1.5px solid var(--ink)",
                        borderRadius: "var(--radius)",
                        textDecoration: item.done ? "line-through" : "none",
                      }}
                    >
                      <b className="tabular-nums">{item.time}</b> {viewMode === "month" ? item.title.slice(0, 24) : item.title}
                    </span>
                  </button>
                ))}
                {day.items.length > dayLimit && (
                  <span className="text-[9px]" style={{ color: "var(--muted)" }}>
                    +{day.items.length - dayLimit} mas
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <aside className="flex flex-col gap-2">
          <div
            className="p-2"
            style={{ border: "1.5px solid var(--ink)", borderRadius: "var(--radius)", background: "var(--paper)" }}
          >
            <p className="mb-1 text-[9px] uppercase" style={{ fontFamily: "var(--font-head)", color: "var(--muted)" }}>
              Proximo
            </p>
            {nextItem ? (
              <div>
                <p className="text-xs leading-tight" style={{ fontFamily: "var(--font-head)" }}>{nextItem.title}</p>
                <p className="mt-1 text-[10px] tabular-nums" style={{ color: "var(--muted)" }}>
                  {nextItem.date === today ? "Hoy" : nextItem.date} · {nextItem.time}
                </p>
              </div>
            ) : (
              <p className="text-xs" style={{ color: "var(--muted)" }}>Nada pendiente.</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex gap-1.5">
              <input
                aria-label="Fecha"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="min-w-0 flex-1 px-1.5 py-1 text-[10px] outline-none"
                style={{ background: "var(--surface)", border: "1.5px solid var(--ink)", borderRadius: "var(--radius)" }}
              />
              <input
                aria-label="Hora"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-[74px] px-1 py-1 text-[10px] outline-none"
                style={{ background: "var(--surface)", border: "1.5px solid var(--ink)", borderRadius: "var(--radius)" }}
              />
            </div>
            <input
              aria-label="Nuevo evento"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addItem();
              }}
              placeholder="Nuevo evento"
              className="px-2 py-1.5 text-xs outline-none"
              style={{
                background: "var(--surface)",
                border: "1.5px solid var(--ink)",
                borderRadius: "var(--radius)",
                fontFamily: "var(--font-sans)",
              }}
            />
            <div className="flex gap-1.5">
              {KINDS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setKind(option.id)}
                  className="flex-1 px-1 py-1 text-[8px] uppercase"
                  style={{
                    background: kind === option.id ? option.color : "transparent",
                    color: kind === option.id && option.id === "trabajo" ? "#fff" : "var(--ink)",
                    border: "1.5px solid var(--ink)",
                    borderRadius: "var(--radius)",
                    fontFamily: "var(--font-head)",
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={addItem}
              className="tile flex items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] uppercase"
              style={{
                background: "var(--ink)",
                color: "var(--paper)",
                border: "2px solid var(--ink)",
                borderRadius: "var(--radius)",
                boxShadow: "var(--sh-sm)",
                fontFamily: "var(--font-head)",
              }}
            >
              <IconPlus size={14} stroke={2.5} />
              Agregar
            </button>
          </div>
        </aside>
      </div>

      {items.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-[9px] uppercase" style={{ fontFamily: "var(--font-head)", color: "var(--muted)" }}>
            Lista completa
          </summary>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {sortedItems(items).map((item) => (
              <li key={item.id} className="flex items-center gap-1.5">
                <button type="button" onClick={() => toggleItem(item.id)} className="min-w-0 flex-1 text-left text-xs">
                  <span className="tabular-nums" style={{ color: "var(--muted)" }}>{item.date} {item.time}</span>{" "}
                  <span style={{ textDecoration: item.done ? "line-through" : "none" }}>{item.title}</span>
                </button>
                <button type="button" aria-label={`Borrar ${item.title}`} onClick={() => removeItem(item.id)}>
                  <IconTrash size={12} stroke={2.2} color="var(--muted)" />
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
