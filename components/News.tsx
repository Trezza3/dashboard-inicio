"use client";

import { useEffect, useState } from "react";
import type { NewsItem } from "@/app/api/news/route";
import { categories, type Category } from "@/lib/feeds";

function horasAtras(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "<1h";
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function News() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [active, setActive] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((data: NewsItem[]) => setItems(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = active ? items.filter((i) => i.category === active) : items;

  return (
    <section
      aria-label="Noticias"
      className="p-3 flex flex-col gap-2"
      style={{
        background: "var(--surface)",
        border: "2px solid var(--ink)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--sh-sm)",
        /* altura máxima = viewport menos el header sticky (~90px) */
        maxHeight: "min(520px, calc(100vh - 360px))",
        overflow: "hidden",
      }}
    >
      {/* Eyebrow — fijo, no scrollea */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span
          className="text-[10px] uppercase"
          style={{ fontFamily: "var(--font-head)", letterSpacing: "0.04em" }}
        >
          Noticias
        </span>
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--coral)" }} />
      </div>

      {/* Badges — fijos */}
      <nav aria-label="Filtro de categorías" className="flex flex-wrap gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setActive(null)}
          className="badge px-2 py-0.5 text-[9px] uppercase"
          style={{
            fontFamily: "var(--font-head)",
            border: "1.5px solid var(--ink)",
            borderRadius: "var(--radius)",
            background: active === null ? "var(--coral)" : "transparent",
            color: active === null ? "#fff" : "var(--ink)",
          }}
        >
          Todo
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActive(cat === active ? null : cat)}
            className="badge px-2 py-0.5 text-[9px] uppercase"
            style={{
              fontFamily: "var(--font-head)",
              border: "1.5px solid var(--ink)",
              borderRadius: "var(--radius)",
              background: active === cat ? "var(--coral)" : "transparent",
              color: active === cat ? "#fff" : "var(--ink)",
            }}
          >
            {cat}
          </button>
        ))}
      </nav>

      {/* Lista — scrollea */}
      {loading ? (
        <p className="text-xs" style={{ color: "var(--muted)" }}>Cargando…</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--muted)" }}>Sin resultados.</p>
      ) : (
        <ul className="news-scroll flex flex-col flex-1 overflow-y-auto min-h-0">
          {filtered.slice(0, 40).map((item, i) => (
            <li
              key={`${item.link}-${i}`}
              style={{ borderTop: i > 0 ? "1.5px solid var(--ink)" : "none" }}
            >
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="news-link flex flex-col gap-0.5 py-2 text-xs"
              >
                <span style={{ color: "var(--ink)", lineHeight: 1.35 }}>{item.title}</span>
                <span
                  className="text-[9px] uppercase"
                  style={{ fontFamily: "var(--font-head)", color: "var(--muted)" }}
                >
                  {item.source} · {horasAtras(item.date)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
