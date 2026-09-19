"use client";

import { useCallback, useState } from "react";
import { useVisibleInterval } from "@/lib/use-visible-interval";

type Rate = { casa: string; venta: number; fechaActualizacion?: string };

const ITEMS = [
  { casa: "oficial", label: "Oficial", bg: "var(--lime)",   color: "#14130F" },
  { casa: "mep",     label: "MEP",     bg: "var(--violet)", color: "#fff"    },
];

export default function Dolar() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Cotización al abrir y cada 30 min mientras la pestaña está visible.
  const load = useCallback(() => {
    fetch("https://dolarapi.com/v1/dolares")
      .then((r) => {
        if (!r.ok) throw new Error(`dolar-http-${r.status}`);
        return r.json();
      })
      .then((data: Rate[]) => {
        if (!Array.isArray(data)) return;
        const filtered = data.filter((d) => d.casa === "blue" || ITEMS.some((item) => item.casa === d.casa));
        setRates(filtered);
        setUpdatedAt(filtered.find((d) => d.fechaActualizacion)?.fechaActualizacion ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useVisibleInterval(load, 30 * 60 * 1000);

  const rateMap = Object.fromEntries(rates.map((r) => [r.casa, r.venta]));
  const updatedTime = updatedAt
    ? new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(updatedAt))
    : null;

  return (
    <section
      aria-label="Dolar"
      className="p-3"
      style={{
        background: "var(--surface)",
        border: "2px solid var(--ink)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--sh-sm)",
      }}
    >
      <p
        className="mb-2 text-[10px] uppercase"
        style={{ fontFamily: "var(--font-head)", letterSpacing: "0.04em" }}
      >
        Dolar
      </p>

      {loading ? (
        <p className="text-xs" style={{ color: "var(--muted)" }}>...</p>
      ) : (
        <div className="flex flex-col gap-2">
          <div
            className="p-2"
            style={{ background: "var(--paper)", border: "1.5px solid var(--ink)", borderRadius: "var(--radius)" }}
          >
            <p className="text-[9px] uppercase" style={{ fontFamily: "var(--font-head)", color: "var(--muted)" }}>
              Blue
            </p>
            <p className="mt-1 text-2xl tabular-nums" style={{ fontFamily: "var(--font-head)" }}>
              {rateMap.blue != null ? `$${Math.round(rateMap.blue).toLocaleString("es-AR")}` : "—"}
            </p>
            {updatedTime && (
              <p className="mt-1 text-[9px]" style={{ color: "var(--muted)" }}>
                Actualizado {updatedTime}
              </p>
            )}
          </div>
          {ITEMS.map(({ casa, label, bg, color }) => (
            <div key={casa} className="flex items-center justify-between gap-1">
              <span
                className="text-[9px] px-1.5 py-0.5 shrink-0"
                style={{
                  fontFamily: "var(--font-head)",
                  background: bg,
                  border: "1.5px solid var(--ink)",
                  borderRadius: "var(--radius)",
                  color,
                }}
              >
                {label}
              </span>
              <span
                className="text-[10px] tabular-nums font-bold"
                style={{ fontFamily: "var(--font-head)" }}
              >
                {rateMap[casa] != null
                  ? `$${Math.round(rateMap[casa]).toLocaleString("es-AR")}`
                  : "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
