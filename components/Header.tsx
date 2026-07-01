"use client";

import { useEffect, useRef, useState } from "react";
import {
  IconSun,
  IconCloud,
  IconCloudRain,
  IconSnowflake,
  IconBolt,
  IconMoon,
} from "@tabler/icons-react";

function WeatherIcon({ code, size = 18 }: { code: number | null; size?: number }) {
  const props = { size, stroke: 2, color: "var(--ink)" };
  if (code === 0) return <IconSun {...props} />;
  if (code == null || code <= 48) return <IconCloud {...props} />;
  if (code <= 67) return <IconCloudRain {...props} />;
  if (code <= 77) return <IconSnowflake {...props} />;
  if (code <= 82) return <IconCloudRain {...props} />;
  if (code <= 86) return <IconSnowflake {...props} />;
  return <IconBolt {...props} />;
}

function greeting(hour: number) {
  if (hour >= 6 && hour < 12) return "BUENOS DÍAS";
  if (hour >= 12 && hour < 20) return "BUENAS TARDES";
  return "BUENAS NOCHES";
}

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const firstTick = window.setTimeout(() => setNow(new Date()), 0);
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => {
      window.clearTimeout(firstTick);
      clearInterval(id);
    };
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

function dayLabel(iso: string, index: number) {
  if (index === 0) return "HOY";
  if (index === 1) return "MAÑ";
  return new Intl.DateTimeFormat("es-AR", { weekday: "short" })
    .format(new Date(iso + "T00:00"))
    .replace(/\./g, "")
    .toUpperCase();
}

function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => {
      setDark(document.documentElement.getAttribute("data-theme") === "dark");
    }, 0);
    return () => window.clearTimeout(id);
  }, []);
  function toggle() {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
      try { localStorage.setItem("dash-theme", next ? "dark" : "light"); } catch { /* ignore */ }
      return next;
    });
  }
  return { dark, toggle };
}

type Weather = { temp: number; feels: number; humidity: number; code: number };
type ForecastDay = { label: string; code: number; max: number; min: number };

export default function Header() {
  const now = useClock();
  const { dark, toggle } = useTheme();
  const [wx, setWx] = useState<Weather | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [openWx, setOpenWx] = useState(false);
  const wxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=-34.61&longitude=-58.38" +
      "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=3",
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
        const dl = d?.daily;
        if (dl?.time) {
          setForecast(dl.time.map((iso: string, i: number) => ({
            label: dayLabel(iso, i),
            code:  dl.weather_code[i],
            max:   Math.round(dl.temperature_2m_max[i]),
            min:   Math.round(dl.temperature_2m_min[i]),
          })));
        }
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  // Cerrar el pronóstico al clickear afuera
  useEffect(() => {
    if (!openWx) return;
    function onClick(e: MouseEvent) {
      if (wxRef.current && !wxRef.current.contains(e.target as Node)) setOpenWx(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [openWx]);

  const hour = now?.getHours() ?? 12;

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

      {/* Toggle tema + clima + reloj */}
      <div className="flex items-center gap-[14px]">
        {/* Modo claro/oscuro */}
        <button
          type="button"
          onClick={toggle}
          aria-label={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          className="tile flex items-center justify-center"
          style={{
            width: 42, height: 42,
            background: "var(--surface)",
            border: "2px solid var(--ink)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--sh-sm)",
          }}
        >
          {dark
            ? <IconSun size={18} stroke={2} color="var(--gold)" />
            : <IconMoon size={18} stroke={2} color="var(--ink)" />
          }
        </button>

        {/* Clima — click para ver pronóstico 3 días */}
        <div ref={wxRef} className="relative">
          <button
            type="button"
            onClick={() => setOpenWx((v) => !v)}
            aria-expanded={openWx}
            aria-label="Ver pronóstico de 3 días"
            className="tile flex items-center gap-2 px-3 py-2"
            style={{
              background: "var(--surface)",
              border: "2px solid var(--ink)",
              borderRadius: "var(--radius)",
              boxShadow: "var(--sh-sm)",
            }}
          >
            <WeatherIcon code={wx?.code ?? null} />
            {wx ? (
              <div className="flex flex-col leading-none text-left">
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
          </button>

          {/* Popover pronóstico */}
          {openWx && forecast.length > 0 && (
            <div
              className="absolute right-0 top-full mt-2 z-30 flex gap-2 p-2"
              style={{
                background: "var(--surface)",
                border: "2px solid var(--ink)",
                borderRadius: "var(--radius)",
                boxShadow: "var(--sh-md)",
              }}
            >
              {forecast.map((f) => (
                <div
                  key={f.label}
                  className="flex flex-col items-center gap-1 px-2 py-1"
                  style={{ minWidth: 52 }}
                >
                  <span className="text-[9px] uppercase" style={{ fontFamily: "var(--font-head)", color: "var(--muted)" }}>
                    {f.label}
                  </span>
                  <WeatherIcon code={f.code} size={20} />
                  <span className="text-xs font-bold tabular-nums" style={{ fontFamily: "var(--font-head)" }}>
                    {f.max}°
                  </span>
                  <span className="text-[10px] tabular-nums" style={{ color: "var(--faint)" }}>
                    {f.min}°
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className="px-3 py-3"
          style={{
            background: "var(--lime)",
            color: "#14130F",
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
