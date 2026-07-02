"use client";

import { useEffect, useState } from "react";
import { IconSearch } from "@tabler/icons-react";
import type { NewsItem } from "@/app/api/news/route";
import { categories, type Category } from "@/lib/feeds";

function horasAtras(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "<1h";
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function faviconUrl(link: string): string | null {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(link).hostname}&sz=64`;
  } catch {
    return null;
  }
}

/* Miniatura: imagen del feed y, si falla o no hay, el logo de la fuente */
function Thumb({ image, link }: { image?: string; link: string }) {
  const fav = faviconUrl(link);
  const [imgOk, setImgOk] = useState(!!image);

  const box: React.CSSProperties = {
    width: 52, height: 52,
    borderRadius: "var(--radius)",
    border: "1.5px solid var(--ink)",
    flexShrink: 0,
    overflow: "hidden",
  };

  if (image && imgOk) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        loading="lazy"
        onError={() => setImgOk(false)}
        style={{ ...box, objectFit: "cover", display: "block", background: "#fff" }}
      />
    );
  }
  return (
    <div style={{ ...box, background: "#fff" }} className="flex items-center justify-center">
      {fav && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fav} alt="" width={22} height={22} loading="lazy" />
      )}
    </div>
  );
}

export default function News() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [active, setActive] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [prevVisit, setPrevVisit] = useState(0);

  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((data: NewsItem[]) => setItems(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Marca de última visita: lo nuevo es lo posterior a la vez anterior
  useEffect(() => {
    const t = window.setTimeout(() => {
      const raw = localStorage.getItem("news-last-visit");
      setPrevVisit(raw ? Number(raw) : 0);
      try { localStorage.setItem("news-last-visit", String(Date.now())); } catch { /* ignore */ }
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const isNew = (item: NewsItem) =>
    prevVisit > 0 && new Date(item.date).getTime() > prevVisit;

  const q = query.trim().toLowerCase();
  const filtered = items
    .filter((i) => (active ? i.category === active : true))
    .filter((i) => (q ? i.title.toLowerCase().includes(q) : true));

  const newCount = filtered.filter(isNew).length;

  return (
    <section
      aria-label="Noticias"
      className="p-3 flex flex-col gap-2"
      style={{
        background: "var(--surface)",
        border: "2px solid var(--ink)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--sh-sm)",
        maxHeight: "min(560px, calc(100vh - 360px))",
        overflow: "hidden",
      }}
    >
      {/* Eyebrow — fijo */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span
          className="text-[10px] uppercase"
          style={{ fontFamily: "var(--font-head)", letterSpacing: "0.04em" }}
        >
          Noticias
        </span>
        {newCount > 0 ? (
          <span
            className="px-1.5 py-0.5 text-[8px] uppercase"
            style={{
              fontFamily: "var(--font-head)",
              background: "var(--coral)",
              color: "#fff",
              borderRadius: "var(--radius)",
            }}
          >
            {newCount} {newCount === 1 ? "nueva" : "nuevas"}
          </span>
        ) : (
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--coral)" }} />
        )}
      </div>

      {/* Buscador — fijo */}
      <div
        className="flex items-center gap-1.5 px-2 shrink-0"
        style={{ border: "1.5px solid var(--ink)", borderRadius: "var(--radius)", background: "var(--surface)" }}
      >
        <IconSearch size={13} stroke={2} color="var(--muted)" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar…"
          aria-label="Buscar noticias"
          className="w-full py-1 text-xs outline-none"
          style={{ background: "transparent", color: "var(--ink)", fontFamily: "var(--font-sans)" }}
        />
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
          {filtered.slice(0, 40).map((item, i) => {
            const nuevo = isNew(item);
            return (
              <li
                key={`${item.link}-${i}`}
                style={{ borderTop: i > 0 ? "1.5px solid var(--ink)" : "none" }}
              >
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="news-link flex gap-2 py-2"
                >
                  <Thumb image={item.image} link={item.link} />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-start gap-1 text-xs" style={{ lineHeight: 1.35 }}>
                      {nuevo && (
                        <span
                          className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: "var(--coral)" }}
                          aria-label="nueva"
                        />
                      )}
                      <span style={{ color: "var(--ink)" }}>{item.title}</span>
                    </span>
                    <span
                      className="text-[9px] uppercase"
                      style={{ fontFamily: "var(--font-head)", color: "var(--muted)" }}
                    >
                      {item.source} · {horasAtras(item.date)}
                    </span>
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
