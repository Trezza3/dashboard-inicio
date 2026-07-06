"use client";

import { useEffect, useState } from "react";
import { IconCloud, IconCloudRain, IconSun } from "@tabler/icons-react";

const LOCATION = { name: "Buenos Aires", lat: -34.61, lon: -58.38 };

type Weather = {
  temp: number;
  feels: number;
  rain: number;
  code: number;
  hours: { time: string; temp: number; rain: number }[];
};

function iconFor(code: number | null, size = 16) {
  const props = { size, stroke: 2.2, color: "var(--ink)" };
  if (code === 0) return <IconSun {...props} />;
  if (code != null && code >= 51) return <IconCloudRain {...props} />;
  return <IconCloud {...props} />;
}

export default function WeatherCompact() {
  const [weather, setWeather] = useState<Weather | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${LOCATION.lat}&longitude=${LOCATION.lon}` +
        "&current=temperature_2m,apparent_temperature,weather_code,precipitation_probability" +
        "&hourly=temperature_2m,precipitation_probability&forecast_hours=6&timezone=auto";

      fetch(url)
        .then((response) => response.json())
        .then((data) => {
          const current = data?.current;
          const hourly = data?.hourly;
          if (!current) return;

          setWeather({
            temp: Math.round(current.temperature_2m),
            feels: Math.round(current.apparent_temperature),
            rain: Math.round(current.precipitation_probability ?? 0),
            code: current.weather_code,
            hours: (hourly?.time ?? []).slice(0, 4).map((time: string, index: number) => ({
              time: new Intl.DateTimeFormat("es-AR", { hour: "2-digit" }).format(new Date(time)),
              temp: Math.round(hourly.temperature_2m[index]),
              rain: Math.round(hourly.precipitation_probability[index] ?? 0),
            })),
          });
        })
        .catch(() => {});
    }, 0);

    return () => window.clearTimeout(t);
  }, []);

  return (
    <section
      aria-label="Clima compacto"
      className="p-3"
      style={{
        background: "var(--surface)",
        border: "2px solid var(--ink)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--sh-sm)",
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase" style={{ fontFamily: "var(--font-head)", letterSpacing: "0.04em" }}>
          Clima
        </p>
        <span className="text-[9px]" style={{ color: "var(--muted)" }}>{LOCATION.name}</span>
      </div>

      {weather ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {iconFor(weather.code, 22)}
              <span className="text-2xl tabular-nums" style={{ fontFamily: "var(--font-head)" }}>
                {weather.temp}°
              </span>
            </div>
            <div className="text-right text-[10px] leading-tight" style={{ color: "var(--muted)" }}>
              <p>Sens. {weather.feels}°</p>
              <p>Lluvia {weather.rain}%</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {weather.hours.map((hour) => (
              <div
                key={hour.time}
                className="px-1 py-1 text-center"
                style={{ border: "1.5px solid var(--ink)", borderRadius: "var(--radius)", background: "var(--paper)" }}
              >
                <p className="text-[8px] uppercase" style={{ fontFamily: "var(--font-head)", color: "var(--muted)" }}>{hour.time}</p>
                <p className="text-[10px] tabular-nums" style={{ fontFamily: "var(--font-head)" }}>{hour.temp}°</p>
                <p className="text-[8px] tabular-nums" style={{ color: "var(--muted)" }}>{hour.rain}%</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs" style={{ color: "var(--muted)" }}>Cargando...</p>
      )}
    </section>
  );
}
