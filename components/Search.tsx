"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconHistory, IconSearch } from "@tabler/icons-react";

type HistoryItem = { url: string; title: string };
type Option =
  | { kind: "history"; url: string; title: string }
  | { kind: "suggest"; text: string };

function looksLikeUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return true;
  return !/\s/.test(value) && /^[^\s]+\.[^\s]{2,}$/.test(value);
}

function toDestination(raw: string) {
  const value = raw.trim();
  if (looksLikeUrl(value)) {
    return /^https?:\/\//i.test(value) ? value : `https://${value}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(value)}`;
}

function hostLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function favicon(url: string) {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`;
  } catch {
    return "";
  }
}

export default function Search() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryRef = useRef("");

  // Autofoco al abrir la pestaña, para escribir directo tras Ctrl+T.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Respuestas de la extension con el historial del navegador.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const data = event.data as { source?: string; type?: string; query?: string; results?: HistoryItem[] };
      if (data?.source !== "dash-extension" || data.type !== "historyResults") return;
      if (data.query !== queryRef.current) return; // respuesta vieja
      setHistory(Array.isArray(data.results) ? data.results : []);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Trae sugerencias de Google + historial (con debounce) mientras se escribe.
  useEffect(() => {
    const q = query.trim();
    queryRef.current = q;
    const controller = new AbortController();
    const id = window.setTimeout(async () => {
      if (!q) {
        setSuggestions([]);
        setHistory([]);
        setActive(-1);
        return;
      }
      window.postMessage({ source: "dash-page", type: "searchHistory", query: q }, window.location.origin);
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const data = (await res.json()) as { suggestions?: string[] };
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
        setActive(-1);
      } catch {
        /* abortado o error de red */
      }
    }, 120);
    return () => {
      window.clearTimeout(id);
      controller.abort();
    };
  }, [query]);

  const go = useCallback((raw: string) => {
    const value = raw.trim();
    if (!value) return;
    window.location.href = toDestination(value);
  }, []);

  // Historial primero (como el omnibox del navegador), despues las sugerencias.
  const options: Option[] = [
    ...history.slice(0, 4).map((item): Option => ({ kind: "history", url: item.url, title: item.title })),
    ...suggestions.slice(0, 6).map((text): Option => ({ kind: "suggest", text })),
  ];

  function choose(option: Option | undefined) {
    if (!option) {
      go(query);
    } else if (option.kind === "history") {
      window.location.href = option.url;
    } else {
      go(option.text);
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(-1, i - 1));
    } else if (event.key === "Enter") {
      choose(active >= 0 ? options[active] : undefined);
    } else if (event.key === "Escape") {
      setOpen(false);
      setSuggestions([]);
      setHistory([]);
      setActive(-1);
    }
  }

  const showList = open && query.trim().length > 0 && options.length > 0;

  return (
    <div className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          choose(active >= 0 ? options[active] : undefined);
        }}
        className="flex items-center gap-2 px-3"
        style={{
          background: "var(--surface)",
          border: "2px solid var(--ink)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--sh-sm)",
          height: "44px",
        }}
      >
        <IconSearch size={18} stroke={2.4} color="var(--muted)" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          placeholder="Buscar en Google o escribir una direccion"
          aria-label="Buscar"
          className="w-full bg-transparent text-sm outline-none"
          style={{ fontFamily: "var(--font-sans)" }}
          autoComplete="off"
          autoFocus
          spellCheck={false}
        />
      </form>

      {showList && (
        <ul
          className="absolute left-0 right-0 z-30 mt-1 overflow-hidden"
          style={{
            background: "var(--surface)",
            border: "2px solid var(--ink)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--sh-md)",
          }}
        >
          {options.map((option, index) => (
            <li key={option.kind === "history" ? `h-${option.url}` : `s-${option.text}`}>
              <button
                type="button"
                // onMouseDown para que dispare antes del blur del input
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(option);
                }}
                onMouseEnter={() => setActive(index)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
                style={{
                  fontFamily: "var(--font-sans)",
                  background: index === active ? "var(--paper)" : "transparent",
                }}
              >
                {option.kind === "history" ? (
                  <>
                    {favicon(option.url) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={favicon(option.url)} alt="" width={14} height={14} className="shrink-0" />
                    ) : (
                      <IconHistory size={14} stroke={2.2} color="var(--faint)" />
                    )}
                    <span className="truncate">{option.title}</span>
                    <span className="ml-auto shrink-0 text-[10px]" style={{ color: "var(--faint)" }}>
                      {hostLabel(option.url)}
                    </span>
                  </>
                ) : (
                  <>
                    <IconSearch size={14} stroke={2.2} color="var(--faint)" />
                    <span className="truncate">{option.text}</span>
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
