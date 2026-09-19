"use client";

import { IconCloud, IconCloudRain, IconSun } from "@tabler/icons-react";
import { useWeather } from "@/lib/weather";

const hourFormat = new Intl.DateTimeFormat("es-AR", { hour: "2-digit" });

function iconFor(code: number | null, size = 16) {
  const props = { size, stroke: 2.2, color: "var(--ink)" };
  if (code === 0) return <IconSun {...props} />;
  if (code != null && code >= 51) return <IconCloudRain {...props} />;
  return <IconCloud {...props} />;
}

export default function WeatherCompact() {
  const { location, data } = useWeather();
  // Con datos de cache puede haber horas que ya pasaron.
  const hourStart = new Date();
  hourStart.setMinutes(0, 0, 0);
  const weather = data && {
    ...data.current,
    hours: data.hours
      .filter((hour) => new Date(hour.time) >= hourStart)
      .slice(0, 4)
      .map((hour) => ({ ...hour, label: hourFormat.format(new Date(hour.time)) })),
  };

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
        <span className="text-[9px]" style={{ color: "var(--muted)" }}>{location.name}</span>
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
                <p className="text-[8px] uppercase" style={{ fontFamily: "var(--font-head)", color: "var(--muted)" }}>{hour.label}</p>
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
