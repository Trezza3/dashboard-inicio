"use client";

import { useEffect, useState } from "react";
import { IconCloud } from "@tabler/icons-react";

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function formatFecha(d: Date) {
  // "DOM 28 JUN"
  const txt = new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
  return txt.replace(/\./g, "").toUpperCase();
}

function formatHora(d: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export default function Header() {
  const now = useClock();
  const [temp, setTemp] = useState<string>("—");

  useEffect(() => {
    const controller = new AbortController();
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=-34.61&longitude=-58.38&current=temperature_2m",
      { signal: controller.signal }
    )
      .then((r) => r.json())
      .then((d) => {
        const t = d?.current?.temperature_2m;
        if (typeof t === "number") setTemp(`${Math.round(t)}°`);
      })
      .catch(() => setTemp("—"));
    return () => controller.abort();
  }, []);

  return (
    <header className="flex items-center justify-between gap-[14px]">
      {/* Fecha + saludo */}
      <div
        className="px-4 py-3"
        style={{
          background: "var(--ink)",
          color: "var(--paper)",
          border: "2px solid var(--ink)",
          borderRadius: "var(--radius)",
          boxShadow: "3px 3px 0 0 var(--violet)",
          fontFamily: "var(--font-head)",
        }}
      >
        <span className="text-sm sm:text-base tracking-tight">
          {now ? formatFecha(now) : "—"} · BUENAS, VALEN
        </span>
      </div>

      {/* Clima + reloj */}
      <div className="flex items-center gap-[14px]">
        <div
          className="flex items-center gap-2 px-3 py-3"
          style={{
            background: "var(--surface)",
            border: "2px solid var(--ink)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--sh-sm)",
            fontFamily: "var(--font-head)",
          }}
        >
          <IconCloud size={18} stroke={2} color="var(--ink)" />
          <span className="text-sm sm:text-base">{temp}</span>
        </div>
        <div
          className="px-3 py-3"
          style={{
            background: "var(--lime)",
            border: "2px solid var(--ink)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--sh-sm)",
            fontFamily: "var(--font-head)",
          }}
        >
          <span className="text-sm sm:text-base tabular-nums">
            {now ? formatHora(now) : "--:--"}
          </span>
        </div>
      </div>
    </header>
  );
}
