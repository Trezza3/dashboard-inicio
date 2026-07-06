"use client";

import { useEffect, useRef, useState } from "react";
import {
  IconSun,
  IconCloud,
  IconCloudRain,
  IconSnowflake,
  IconBolt,
  IconMoon,
  IconHeartFilled,
} from "@tabler/icons-react";
import DashboardSettings from "@/components/DashboardSettings";

// Ubicación del clima. A futuro (multiusuario) esto sale de la config del usuario.
const LOCATION = { name: "Buenos Aires", lat: -34.61, lon: -58.38 };

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

// Código WMO → descripción corta en español
function weatherText(code: number | null): string {
  if (code == null) return "";
  if (code === 0) return "Despejado";
  if (code <= 2) return "Parcial nublado";
  if (code === 3) return "Nublado";
  if (code <= 48) return "Niebla";
  if (code <= 57) return "Llovizna";
  if (code <= 65) return "Lluvia";
  if (code <= 67) return "Lluvia helada";
  if (code <= 77) return "Nieve";
  if (code <= 82) return "Chaparrones";
  if (code <= 86) return "Nevadas";
  return "Tormenta";
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

type Theme = "light" | "dark" | "rose";

function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const t = document.documentElement.getAttribute("data-theme");
      setTheme(t === "dark" || t === "rose" ? t : "light");
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  function apply(next: Theme) {
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("dash-theme", next); } catch { /* ignore */ }
    setTheme(next);
  }

  // Sol/luna: alterna claro/oscuro (y sale de rosa si estaba activo)
  function toggleDark() { apply(theme === "dark" ? "light" : "dark"); }

  // Corazón de Lola: entra/sale del modo rosa con destello
  function toggleRose() {
    if (theme === "rose") {
      apply("light");
    } else {
      apply("rose");
      setPulse((p) => p + 1);
    }
  }

  return { theme, toggleDark, toggleRose, pulse };
}

type Weather = { temp: number; feels: number; humidity: number; code: number };
type ForecastDay = { label: string; code: number; max: number; min: number };

export default function Header() {
  const now = useClock();
  const { theme, toggleDark, toggleRose, pulse } = useTheme();
  const [wx, setWx] = useState<Weather | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [openWx, setOpenWx] = useState(false);
  const wxRef = useRef<HTMLDivElement>(null);

  // Clima: carga inicial + auto-actualización cada 15 min
  useEffect(() => {
    let ctrl: AbortController | null = null;
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${LOCATION.lat}&longitude=${LOCATION.lon}` +
      "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=3";

    const load = () => {
      ctrl?.abort();
      ctrl = new AbortController();
      fetch(url, { signal: ctrl.signal })
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
    };

    load();
    const id = window.setInterval(load, 15 * 60 * 1000);
    return () => { ctrl?.abort(); window.clearInterval(id); };
  }, []);

  // Cerrar el pronóstico al clickear afuera o con Escape
  useEffect(() => {
    if (!openWx) return;
    function onClick(e: MouseEvent) {
      if (wxRef.current && !wxRef.current.contains(e.target as Node)) setOpenWx(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenWx(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [openWx]);

  const hour = now?.getHours() ?? 12;

  return (
    <header className="flex flex-wrap items-center justify-between gap-[14px]">
      {/* Destello rosa al activar el modo de Lola */}
      {pulse > 0 && <div key={pulse} className="rose-pulse" aria-hidden="true" />}

      {/* Fecha + saludo dinámico */}
      <div
        className="px-4 py-3"
        style={{
          background: "var(--ink)",
          color: "var(--paper)",
          border: "2px solid var(--ink)",
          borderRadius: "var(--radius)",
          boxShadow: "3px 3px 0 0 var(--accent2)",
          fontFamily: "var(--font-head)",
        }}
      >
        <span className="text-sm sm:text-base tracking-tight">
          {now ? formatFecha(now) : "—"} · {greeting(hour)}, VALEN
        </span>
      </div>

      {/* Toggle tema + clima + reloj */}
      <div className="flex flex-wrap items-center gap-[14px]">
        {/* Botón de Lola — corazón con inicial, late en hover */}
        <button
          type="button"
          onClick={toggleRose}
          aria-label={theme === "rose" ? "Salir del modo rosa" : "Activar el modo rosa de Lola"}
          aria-pressed={theme === "rose"}
          className="heart-btn tile relative flex items-center justify-center"
          style={{
            width: 42, height: 42,
            background: theme === "rose" ? "var(--ink)" : "var(--surface)",
            border: "2px solid var(--ink)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--sh-sm)",
          }}
        >
          <span className="heart-ico relative flex items-center justify-center">
            <IconHeartFilled size={26} color={theme === "rose" ? "var(--paper)" : "#E8578F"} />
            <span
              className="absolute inset-0 flex items-center justify-center text-[10px] font-bold"
              style={{
                fontFamily: "var(--font-head)",
                color: theme === "rose" ? "#E8578F" : "var(--paper)",
                paddingBottom: 1,
              }}
            >
              L
            </span>
          </span>
        </button>

        {/* Modo claro/oscuro */}
        <button
          type="button"
          onClick={toggleDark}
          aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          className="tile flex items-center justify-center"
          style={{
            width: 42, height: 42,
            background: "var(--surface)",
            border: "2px solid var(--ink)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--sh-sm)",
          }}
        >
          {theme === "dark"
            ? <IconSun size={18} stroke={2} color="var(--gold)" />
            : <IconMoon size={18} stroke={2} color="var(--ink)" />
          }
        </button>

        <DashboardSettings />

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
                <span className="text-[9px] mt-0.5 capitalize" style={{ color: "var(--muted)", fontFamily: "var(--font-sans)" }}>
                  {weatherText(wx.code).toLowerCase()}
                </span>
              </div>
            ) : (
              <span className="text-sm" style={{ fontFamily: "var(--font-head)" }}>—</span>
            )}
          </button>

          {/* Popover pronóstico */}
          {openWx && wx && (
            <div
              className="absolute right-0 top-full mt-2 z-30 flex flex-col gap-2 p-3"
              style={{
                background: "var(--surface)",
                border: "2px solid var(--ink)",
                borderRadius: "var(--radius)",
                boxShadow: "var(--sh-md)",
              }}
            >
              {/* Encabezado: ciudad + sensación / humedad */}
              <div className="flex flex-col gap-0.5 pb-1" style={{ borderBottom: "1.5px solid var(--ink)" }}>
                <span className="text-[10px] uppercase" style={{ fontFamily: "var(--font-head)", letterSpacing: "0.03em" }}>
                  {LOCATION.name}
                </span>
                <span className="text-[9px]" style={{ color: "var(--muted)", fontFamily: "var(--font-sans)" }}>
                  Sensación {wx.feels}° · Humedad {wx.humidity}%
                </span>
              </div>

              <div className="flex gap-2">
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
