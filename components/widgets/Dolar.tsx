"use client";

import { useEffect, useState } from "react";

type Rate = { casa: string; venta: number };

const ITEMS = [
  { casa: "blue",    label: "BLUE", bg: "var(--sky)",    color: "#fff"       },
  { casa: "oficial", label: "OF.",  bg: "var(--lime)",   color: "var(--ink)" },
  { casa: "mep",     label: "MEP",  bg: "var(--violet)", color: "#fff"       },
];

export default function Dolar() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://dolarapi.com/v1/dolares")
      .then((r) => r.json())
      .then((data: Rate[]) =>
        setRates(data.filter((d) => ["blue", "oficial", "mep"].includes(d.casa)))
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const rateMap = Object.fromEntries(rates.map((r) => [r.casa, r.venta]));

  return (
    <section
      aria-label="Dólar"
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
        Dólar
      </p>

      {loading ? (
        <p className="text-xs" style={{ color: "var(--muted)" }}>...</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {ITEMS.map(({ casa, label, bg, color }) => (
            <div key={casa} className="flex items-center justify-between gap-1">
              <span
                className="text-[9px] px-1 py-0.5 shrink-0"
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
