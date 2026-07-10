"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconPlus, IconRefresh, IconSearch, IconSettings, IconTrash, IconX } from "@tabler/icons-react";
import type { NewsItem, NewsResponse } from "@/app/api/news/route";
import { DEFAULT_FEEDS, FEED_CATALOG, type Feed } from "@/lib/feeds";

const FEEDS_KEY = "dash-feeds-v1";

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

function normalizeUrl(raw: string) {
  const value = raw.trim();
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
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
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [feedsLoaded, setFeedsLoaded] = useState(false);
  const [items, setItems] = useState<NewsItem[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [prevVisit, setPrevVisit] = useState(0);
  const [fetchedAt, setFetchedAt] = useState("");
  const [failedFeeds, setFailedFeeds] = useState(0);
  const [error, setError] = useState("");
  const [showSources, setShowSources] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftUrl, setDraftUrl] = useState("");
  const [draftCategory, setDraftCategory] = useState("");
  const feedsRef = useRef<Feed[]>([]);

  // Carga de fuentes propias (semilla: DEFAULT_FEEDS).
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(FEEDS_KEY);
        setFeeds(raw ? (JSON.parse(raw) as Feed[]) : DEFAULT_FEEDS);
      } catch {
        setFeeds(DEFAULT_FEEDS);
      }
      setFeedsLoaded(true);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    feedsRef.current = feeds;
    if (!feedsLoaded) return;
    try {
      localStorage.setItem(FEEDS_KEY, JSON.stringify(feeds));
    } catch {
      /* ignore */
    }
  }, [feeds, feedsLoaded]);

  const loadNews = useCallback(async (manual = false) => {
    if (manual) {
      setRefreshing(true);
      setError("");
    }

    try {
      const response = await fetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feeds: feedsRef.current.map(({ name, category, url }) => ({ name, category, url })),
        }),
      });
      if (!response.ok) throw new Error("news-request-failed");

      const data = (await response.json()) as NewsResponse;
      setItems(data.items);
      setFetchedAt(data.fetchedAt);
      setFailedFeeds(data.failedFeeds.length);
    } catch {
      setError("No pude actualizar las noticias.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Primera carga + recarga cuando cambian las fuentes.
  const feedsKey = useMemo(() => feeds.map((f) => f.url).join("|"), [feeds]);
  useEffect(() => {
    if (!feedsLoaded) return;
    const t = window.setTimeout(() => void loadNews(), 0);
    return () => window.clearTimeout(t);
  }, [feedsKey, feedsLoaded, loadNews]);

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

  // Categorías derivadas de las fuentes del usuario.
  const categories = useMemo(
    () => [...new Set(feeds.map((f) => f.category))],
    [feeds],
  );

  // Si la categoría activa ya no existe (se borró la fuente), cae a "Todo".
  const activeCat = active && categories.includes(active) ? active : null;

  function addFeed(name: string, category: string, url: string) {
    const cleanUrl = normalizeUrl(url);
    if (!cleanUrl || feeds.some((f) => f.url === cleanUrl)) return;
    setFeeds((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: name.trim() || "Fuente", category: category.trim() || "Otros", url: cleanUrl },
    ]);
  }

  function submitDraft() {
    if (!draftUrl.trim()) return;
    addFeed(draftName, draftCategory, draftUrl);
    setDraftName("");
    setDraftUrl("");
    setDraftCategory("");
  }

  function removeFeed(id: string) {
    setFeeds((prev) => prev.filter((f) => f.id !== id));
  }

  const catalogAvailable = FEED_CATALOG.filter(
    (entry) => !feeds.some((f) => f.url === entry.url),
  );

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => items
    .filter((i) => (activeCat ? i.category === activeCat : true))
    .filter((i) => (
      q
        ? `${i.title} ${i.source} ${i.category}`.toLowerCase().includes(q)
        : true
    )), [activeCat, items, q]);

  const countsByCategory = useMemo(() => {
    return categories.reduce<Record<string, number>>((acc, cat) => {
      acc[cat] = items.filter((item) => item.category === cat).length;
      return acc;
    }, {});
  }, [items, categories]);

  const newCount = filtered.filter(isNew).length;
  const featured = filtered[0];
  const listItems = (featured ? filtered.slice(1) : filtered).slice(0, 39);
  const updatedText = fetchedAt ? `Actualizado ${formatUpdatedAt(fetchedAt)}` : "RSS en vivo";

  const inputStyle: React.CSSProperties = {
    background: "var(--surface)",
    border: "1.5px solid var(--ink)",
    borderRadius: "var(--radius)",
    color: "var(--ink)",
    fontFamily: "var(--font-sans)",
  };

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
            onClick={() => setShowSources((v) => !v)}
            aria-label="Configurar fuentes"
            aria-expanded={showSources}
            title="Fuentes"
            className="grid h-7 w-7 place-items-center"
            style={{
              border: "1.5px solid var(--ink)",
              borderRadius: "var(--radius)",
              background: showSources ? "var(--ink)" : "var(--surface)",
            }}
          >
            <IconSettings size={14} stroke={2.3} color={showSources ? "var(--surface)" : "var(--ink)"} />
          </button>
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

      {/* Panel de fuentes — se abre con el engranaje */}
      {showSources && (
        <div
          className="flex shrink-0 flex-col gap-2 p-2"
          style={{ border: "1.5px solid var(--ink)", borderRadius: "var(--radius)", background: "var(--paper)" }}
        >
          <p className="text-[9px] uppercase" style={{ fontFamily: "var(--font-head)", color: "var(--muted)" }}>
            Tus fuentes ({feeds.length})
          </p>
          <ul className="flex max-h-[120px] flex-col gap-1 overflow-y-auto news-scroll">
            {feeds.map((feed) => (
              <li key={feed.id} className="flex items-center gap-1.5 text-[10px]">
                <span className="truncate" style={{ color: "var(--ink)" }}>{feed.name}</span>
                <span
                  className="shrink-0 px-1 text-[8px] uppercase"
                  style={{ fontFamily: "var(--font-head)", border: "1px solid var(--ink)", borderRadius: "var(--radius)", color: "var(--muted)" }}
                >
                  {feed.category}
                </span>
                <button
                  type="button"
                  onClick={() => removeFeed(feed.id)}
                  aria-label={`Quitar ${feed.name}`}
                  className="ml-auto shrink-0"
                >
                  <IconTrash size={11} stroke={2.4} color="var(--muted)" />
                </button>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-1">
            <div className="flex gap-1">
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Nombre"
                className="w-[80px] shrink-0 px-1.5 py-1 text-[10px] outline-none"
                style={inputStyle}
              />
              <input
                value={draftCategory}
                onChange={(e) => setDraftCategory(e.target.value)}
                placeholder="Categoría"
                list="news-categories"
                className="min-w-0 flex-1 px-1.5 py-1 text-[10px] outline-none"
                style={inputStyle}
              />
              <datalist id="news-categories">
                {categories.map((cat) => <option key={cat} value={cat} />)}
              </datalist>
            </div>
            <div className="flex gap-1">
              <input
                value={draftUrl}
                onChange={(e) => setDraftUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submitDraft(); }}
                placeholder="URL del feed RSS"
                className="min-w-0 flex-1 px-1.5 py-1 text-[10px] outline-none"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={submitDraft}
                aria-label="Agregar fuente"
                className="grid h-6 w-6 shrink-0 place-items-center"
                style={{ border: "1.5px solid var(--ink)", borderRadius: "var(--radius)", background: "var(--lime)", color: "#14130F" }}
              >
                <IconPlus size={12} stroke={2.6} />
              </button>
            </div>
          </div>

          {catalogAvailable.length > 0 && (
            <>
              <p className="text-[9px] uppercase" style={{ fontFamily: "var(--font-head)", color: "var(--muted)" }}>
                Catálogo
              </p>
              <div className="flex flex-wrap gap-1">
                {catalogAvailable.map((entry) => (
                  <button
                    key={entry.url}
                    type="button"
                    onClick={() => addFeed(entry.name, entry.category, entry.url)}
                    className="badge inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] uppercase"
                    style={{
                      fontFamily: "var(--font-head)",
                      border: "1.5px solid var(--ink)",
                      borderRadius: "var(--radius)",
                      background: "var(--surface)",
                      color: "var(--ink)",
                    }}
                  >
                    <IconPlus size={9} stroke={2.6} />
                    {entry.name}
                    <span style={{ color: "var(--muted)" }}>· {entry.category}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

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
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="Limpiar búsqueda">
            <IconX size={12} stroke={2.4} color="var(--muted)" />
          </button>
        )}
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
            background: activeCat === null ? "var(--coral)" : "transparent",
            color: activeCat === null ? "#fff" : "var(--ink)",
          }}
        >
          Todo {items.length}
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActive(cat === activeCat ? null : cat)}
            className="badge px-2 py-0.5 text-[9px] uppercase"
            style={{
              fontFamily: "var(--font-head)",
              border: "1.5px solid var(--ink)",
              borderRadius: "var(--radius)",
              background: activeCat === cat ? "var(--coral)" : "transparent",
              color: activeCat === cat ? "#fff" : "var(--ink)",
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
