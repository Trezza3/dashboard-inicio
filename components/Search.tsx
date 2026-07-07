"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconSearch } from "@tabler/icons-react";

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

export default function Search() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Autofoco al abrir la pestaña, para escribir directo tras Ctrl+T.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Trae sugerencias de Google (con debounce) mientras se escribe.
  useEffect(() => {
    const q = query.trim();
    const controller = new AbortController();
    const id = window.setTimeout(async () => {
      if (!q) {
        setSuggestions([]);
        setActive(-1);
        return;
      }
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

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(suggestions.length - 1, i + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(-1, i - 1));
    } else if (event.key === "Enter") {
      go(active >= 0 && suggestions[active] ? suggestions[active] : query);
    } else if (event.key === "Escape") {
      setOpen(false);
      setSuggestions([]);
      setActive(-1);
    }
  }

  const showList = open && query.trim().length > 0 && suggestions.length > 0;

  return (
    <div className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(active >= 0 && suggestions[active] ? suggestions[active] : query);
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
          {suggestions.map((suggestion, index) => (
            <li key={suggestion}>
              <button
                type="button"
                // onMouseDown para que dispare antes del blur del input
                onMouseDown={(e) => {
                  e.preventDefault();
                  go(suggestion);
                }}
                onMouseEnter={() => setActive(index)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
                style={{
                  fontFamily: "var(--font-sans)",
                  background: index === active ? "var(--paper)" : "transparent",
                }}
              >
                <IconSearch size={14} stroke={2.2} color="var(--faint)" />
                <span className="truncate">{suggestion}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
