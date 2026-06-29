"use client";

import { useEffect, useState } from "react";
import {
  IconSun,
  IconCloud,
  IconCloudRain,
  IconSnowflake,
  IconBolt,
  type IconProps,
} from "@tabler/icons-react";
import type { ComponentType } from "react";

function weatherIcon(code: number): ComponentType<IconProps> {
  if (code === 0) return IconSun;
  if (code <= 3) return IconCloud;
  if (code <= 48) return IconCloud;
  if (code <= 67) return IconCloudRain;
  if (code <= 77) return IconSnowflake;
  if (code <= 82) return IconCloudRain;
  if (code <= 86) return IconSnowflake;
  return IconBolt;
}

function greeting(hour: number) {
  if (hour >= 6 && hour < 12) return "BUENOS DÍAS";
  if (hour >= 12 && hour < 20) return "BUENAS TARDES";
  return "BUENAS NOCHES";
}

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
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d).replace(/\./g, "").toUpperCase();
}

function formatHora(d: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

type Weather = { temp: number; feels: number; humidity: number; code: number };

export default function Header() {
  const now = useClock();
  const [wx, setWx] = useState<Weather | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=-34.61&longitude=-58.38" +
      "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code",
      { signal: ctrl.signal }
    )
      .then((r) => r.json())
      .then((d) => {
        const c = d?.current;
        if (c) setWx({
          temp:     Math.round(c.temperature_2m),
          feels:    Math.round(c.apparent_temperature),
          humidity: Math.round(c.relative_humidity_2m),
          code:     c.weather_code,
        });
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  const hour = now?.getHours() ?? 12;
  const WxIcon = wx ? weatherIcon(wx.code) : IconCloud;

  return (
    <header className="flex items-center justify-between gap-[14px]">
      {/* Fecha + saludo dinámico */}
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
          {now ? formatFecha(now) : "—"} · {greeting(hour)}, VALEN
        </span>
      </div>

      {/* Clima + reloj */}
      <div className="flex items-center gap-[14px]">
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{
            background: "var(--surface)",
            border: "2px solid var(--ink)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--sh-sm)",
          }}
        >
          <WxIcon size={18} stroke={2} color="var(--ink)" />
          {wx ? (
            <div className="flex flex-col leading-none">
              <span className="text-sm font-bold" style={{ fontFamily: "var(--font-head)" }}>
                {wx.temp}°
              </span>
              <span className="text-[9px] mt-0.5" style={{ color: "var(--muted)", fontFamily: "var(--font-sans)" }}>
                ST {wx.feels}° · {wx.humidity}%
              </span>
            </div>
          ) : (
            <span className="text-sm" style={{ fontFamily: "var(--font-head)" }}>—</span>
          )}
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
