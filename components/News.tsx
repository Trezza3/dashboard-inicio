"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IconRefresh, IconSearch } from "@tabler/icons-react";
import type { NewsItem, NewsResponse } from "@/app/api/news/route";
import { categories, type Category } from "@/lib/feeds";

function horasAtras(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "<1h";
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function formatUpdatedAt(dateStr: string) {
  if (!dateStr) return "";
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
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
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [prevVisit, setPrevVisit] = useState(0);
  const [fetchedAt, setFetchedAt] = useState("");
  const [failedFeeds, setFailedFeeds] = useState(0);
  const [error, setError] = useState("");

  const loadNews = useCallback(async (manual = false) => {
    if (manual) {
      setRefreshing(true);
      setError("");
    }

    try {
      const response = await fetch("/api/news", {
        cache: manual ? "no-store" : "default",
      });
      if (!response.ok) throw new Error("news-request-failed");

      const data = (await response.json()) as NewsResponse | NewsItem[];
      if (Array.isArray(data)) {
        setItems(data);
        setFetchedAt(new Date().toISOString());
        setFailedFeeds(0);
      } else {
        setItems(data.items);
        setFetchedAt(data.fetchedAt);
        setFailedFeeds(data.failedFeeds.length);
      }
    } catch {
      setError("No pude actualizar las noticias.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadNews();
    }, 0);
    return () => window.clearTimeout(t);
  }, [loadNews]);

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
  const filtered = useMemo(() => items
    .filter((i) => (active ? i.category === active : true))
    .filter((i) => (
      q
        ? `${i.title} ${i.source} ${i.category}`.toLowerCase().includes(q)
        : true
    )), [active, items, q]);

  const countsByCategory = useMemo(() => {
    return categories.reduce<Record<Category, number>>((acc, cat) => {
      acc[cat] = items.filter((item) => item.category === cat).length;
      return acc;
    }, {} as Record<Category, number>);
  }, [items]);

  const newCount = filtered.filter(isNew).length;
  const featured = filtered[0];
  const listItems = (featured ? filtered.slice(1) : filtered).slice(0, 39);
  const updatedText = fetchedAt ? `Actualizado ${formatUpdatedAt(fetchedAt)}` : "RSS en vivo";

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
      <div className="flex items-start justify-between gap-2 shrink-0">
        <div className="min-w-0">
          <span
            className="block text-[10px] uppercase"
            style={{ fontFamily: "var(--font-head)", letterSpacing: "0.04em" }}
          >
            Noticias
          </span>
          <span className="block truncate text-[9px]" style={{ color: "var(--muted)" }}>
            {updatedText}{failedFeeds > 0 ? ` · ${failedFeeds} fuente${failedFeeds === 1 ? "" : "s"} sin respuesta` : ""}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
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
          <button
            type="button"
            onClick={() => loadNews(true)}
            disabled={refreshing}
            aria-label="Actualizar noticias"
            title="Actualizar"
            className="grid h-7 w-7 place-items-center disabled:opacity-60"
            style={{
              border: "1.5px solid var(--ink)",
              borderRadius: "var(--radius)",
              background: "var(--surface)",
            }}
          >
            <IconRefresh
              size={14}
              stroke={2.3}
              color="var(--ink)"
              style={{ transform: refreshing ? "rotate(180deg)" : "none", transition: "transform 0.16s ease" }}
            />
          </button>
        </div>
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
          Todo {items.length}
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
            {cat} {countsByCategory[cat] ?? 0}
          </button>
        ))}
      </nav>

      {/* Lista — scrollea */}
      {loading ? (
        <p className="text-xs" style={{ color: "var(--muted)" }}>Cargando…</p>
      ) : error && items.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--muted)" }}>{error}</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--muted)" }}>Sin resultados.</p>
      ) : (
        <ul className="news-scroll flex flex-col flex-1 overflow-y-auto min-h-0">
          {featured && (
            <li>
              <a
                href={featured.link}
                target="_blank"
                rel="noopener noreferrer"
                className="news-link block pb-2"
              >
                <div
                  className="grid gap-2 p-2"
                  style={{
                    border: "1.5px solid var(--ink)",
                    borderRadius: "var(--radius)",
                    background: "var(--paper)",
                  }}
                >
                  <div className="flex gap-2">
                    <Thumb image={featured.image} link={featured.link} />
                    <div className="min-w-0 flex-1">
                      <span
                        className="line-clamp-3 text-sm"
                        style={{ color: "var(--ink)", lineHeight: 1.25, fontFamily: "var(--font-head)" }}
                      >
                        {featured.title}
                      </span>
                    </div>
                  </div>
                  <span
                    className="text-[9px] uppercase"
                    style={{ fontFamily: "var(--font-head)", color: "var(--muted)" }}
                  >
                    {featured.source} · {featured.category} · {horasAtras(featured.date)}
                  </span>
                </div>
              </a>
            </li>
          )}

          {listItems.map((item, i) => {
            const nuevo = isNew(item);
            return (
              <li
                key={`${item.link}-${i}`}
                style={{ borderTop: i > 0 || featured ? "1.5px solid var(--ink)" : "none" }}
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
                      {item.source} · {item.category} · {horasAtras(item.date)}
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
