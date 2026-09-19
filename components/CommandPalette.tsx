"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IconAppWindow,
  IconBriefcase,
  IconCopy,
  IconHistory,
  IconLayoutGrid,
  IconSearch,
  IconStack2,
  IconWorld,
} from "@tabler/icons-react";
import { type DuplicateTabGroup, callExtension } from "@/lib/extension-bridge";
import { score } from "@/lib/fuzzy";
import { parseProjects, type Project } from "@/lib/projects";
import { SHORTCUTS_KEY, parseGridItems, readLegacyShortcuts, seedItems, type GridItem } from "@/lib/shortcuts";
import { colorCss } from "@/lib/tab-groups";
import { usePersistentState } from "@/lib/use-persistent-state";
import { openWorkspace, useWorkspaces } from "@/lib/workspace-actions";

/** Evento para abrir el buscador desde otros componentes (p. ej. el header). */
export const OPEN_PALETTE_EVENT = "dash-open-palette";

type OpenTab = { id: number; windowId: number; url: string; title: string; active: boolean; group: string; lastAccessed: number };

type Kind = "tab" | "workspace" | "shortcut" | "project" | "history" | "action" | "web";

type Item = {
  key: string;
  kind: Kind;
  title: string;
  subtitle: string;
  url?: string;
  accent?: string;
  rank: number;
  run: () => void | Promise<void>;
};

const KIND_LABEL: Record<Kind, string> = {
  tab: "Pestaña",
  workspace: "Espacio",
  shortcut: "Acceso",
  project: "Proyecto",
  history: "Historial",
  action: "Acción",
  web: "Web",
};

// A igual coincidencia, qué tipo aparece primero.
const KIND_BOOST: Record<Kind, number> = {
  workspace: 6,
  tab: 5,
  shortcut: 4,
  project: 3,
  action: 2,
  history: 0,
  web: 0,
};

const MAX_RESULTS = 12;

function hostLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function looksLikeUrl(value: string) {
  return /^https?:\/\//i.test(value) || (!/\s/.test(value) && /^[^\s]+\.[^\s]{2,}$/.test(value));
}

function go(url: string) {
  window.location.assign(url);
}

function KindIcon({ item }: { item: Item }) {
  const box = "grid h-7 w-7 shrink-0 place-items-center";
  const style = { border: "1.5px solid var(--ink)", borderRadius: "var(--radius)", background: item.accent ?? "var(--surface)" };
  let icon: ReactNode;
  if (item.url && item.kind !== "workspace") {
    icon = (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={`https://www.google.com/s2/favicons?domain=${hostLabel(item.url)}&sz=32`} alt="" width={16} height={16} />
    );
  } else if (item.kind === "workspace") icon = <IconBriefcase size={14} stroke={2.2} color="#14130F" />;
  else if (item.kind === "action") icon = <IconCopy size={14} stroke={2.2} color="var(--ink)" />;
  else icon = <IconSearch size={14} stroke={2.2} color="var(--ink)" />;
  return <span className={box} style={style}>{icon}</span>;
}

function KindTag({ kind }: { kind: Kind }) {
  const Icon = kind === "tab" ? IconAppWindow : kind === "history" ? IconHistory : kind === "shortcut" ? IconLayoutGrid : kind === "workspace" ? IconStack2 : IconWorld;
  return (
    <span className="hidden shrink-0 items-center gap-1 text-[9px] uppercase sm:inline-flex" style={{ fontFamily: "var(--font-head)", color: "var(--muted)" }}>
      <Icon size={11} stroke={2.2} /> {KIND_LABEL[kind]}
    </span>
  );
}

/**
 * Buscador universal (Ctrl+K): pestañas abiertas, espacios, accesos,
 * proyectos e historial en una sola lista.
 */
export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [history, setHistory] = useState<{ url: string; title: string }[]>([]);
  const [hasExtension, setHasExtension] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [workspaces] = useWorkspaces();
  const [shortcuts] = usePersistentState<GridItem[]>(SHORTCUTS_KEY, {
    initial: seedItems,
    parse: parseGridItems,
    migrate: readLegacyShortcuts,
  });
  const [projects] = usePersistentState<Project[]>("dash-projects-v1", { initial: [], parse: parseProjects });

  const close = useCallback(() => setOpen(false), []);

  const show = useCallback(() => {
    setQuery("");
    setActive(0);
    setHistory([]);
    setOpen(true);
    callExtension<{ tabs: OpenTab[] }>("listTabs")
      .then(({ tabs: list }) => {
        setTabs(Array.isArray(list) ? list : []);
        setHasExtension(true);
      })
      .catch(() => {
        setTabs([]);
        setHasExtension(false);
      });
  }, []);

  // Ctrl+K / Cmd+K desde cualquier lado, y el evento del botón del header.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (open) close();
        else show();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_PALETTE_EVENT, show);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_PALETTE_EVENT, show);
    };
  }, [open, show, close]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Historial del navegador (vía extensión) mientras se escribe.
  useEffect(() => {
    const q = query.trim();
    if (!open || !hasExtension || q.length < 2) return;
    let alive = true;
    const t = window.setTimeout(() => {
      callExtension<{ results: { url: string; title: string }[] }>("searchHistory", { query: q })
        .then(({ results }) => alive && setHistory(Array.isArray(results) ? results : []))
        .catch(() => {});
    }, 150);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [query, open, hasExtension]);

  const items = useMemo<Item[]>(() => {
    const q = query.trim();
    const all: Item[] = [];

    for (const tab of tabs) {
      all.push({
        key: `tab-${tab.id}`,
        kind: "tab",
        title: tab.title,
        subtitle: [tab.group, hostLabel(tab.url)].filter(Boolean).join(" · "),
        url: tab.url,
        rank: 0,
        run: async () => {
          // Si esta pestaña es una pestaña nueva sin historial, ya no hace falta.
          await callExtension("focusTab", { tabId: tab.id, closeSender: window.history.length <= 1 });
        },
      });
    }

    for (const workspace of workspaces) {
      all.push({
        key: `ws-${workspace.id}`,
        kind: "workspace",
        title: workspace.name,
        subtitle: workspace.links.length
          ? `${workspace.links.length} pestañas${workspace.note ? ` · ${workspace.note.split("\n")[0]}` : ""}`
          : "Sin pestañas guardadas",
        accent: colorCss(workspace.color),
        rank: 0,
        run: async () => {
          if (workspace.links.length && hasExtension) await openWorkspace(workspace);
        },
      });
    }

    for (const item of shortcuts) {
      const links = item.kind === "folder" ? item.items.map((l) => ({ ...l, folder: item.name })) : [{ ...item, folder: "" }];
      for (const link of links) {
        all.push({
          key: `sc-${link.folder}-${link.url}`,
          kind: "shortcut",
          title: link.name,
          subtitle: [link.folder, hostLabel(link.url)].filter(Boolean).join(" · "),
          url: link.url,
          rank: 0,
          run: () => go(link.url),
        });
      }
    }

    for (const project of projects) {
      for (const link of project.links) {
        all.push({
          key: `pr-${project.id}-${link.id}`,
          kind: "project",
          title: `${project.name} · ${link.label}`,
          subtitle: hostLabel(link.url),
          url: link.url,
          rank: 0,
          run: () => go(link.url),
        });
      }
    }

    if (hasExtension) {
      all.push({
        key: "action-duplicates",
        kind: "action",
        title: "Cerrar pestañas duplicadas",
        subtitle: "Deja una sola copia de cada página abierta",
        rank: 0,
        run: async () => {
          const { groups } = await callExtension<{ groups: DuplicateTabGroup[] }>("findDuplicateTabs");
          const extra = groups.flatMap((g) => g.tabs.slice(1).map((t) => ({ id: t.id, url: g.url })));
          if (extra.length) await callExtension("closeTabs", { tabs: extra });
        },
      });
    }

    // Sin texto: lo más útil para arrancar (espacios y pestañas recientes).
    if (!q) {
      const recentTabs = all
        .filter((i) => i.kind === "tab")
        .sort((a, b) => {
          const ta = tabs.find((t) => `tab-${t.id}` === a.key)?.lastAccessed ?? 0;
          const tb = tabs.find((t) => `tab-${t.id}` === b.key)?.lastAccessed ?? 0;
          return tb - ta;
        })
        .slice(0, 6);
      return [...all.filter((i) => i.kind === "workspace"), ...recentTabs].slice(0, MAX_RESULTS);
    }

    for (const entry of history) {
      if (all.some((i) => i.url === entry.url)) continue;
      all.push({
        key: `h-${entry.url}`,
        kind: "history",
        title: entry.title,
        subtitle: hostLabel(entry.url),
        url: entry.url,
        rank: 0,
        run: () => go(entry.url),
      });
    }

    const ranked = all
      .map((item) => {
        const s = score(q, item.title, `${item.subtitle} ${item.url ?? ""}`);
        return { ...item, rank: s ? s + KIND_BOOST[item.kind] : 0 };
      })
      .filter((item) => item.rank > 0)
      .sort((a, b) => b.rank - a.rank)
      .slice(0, MAX_RESULTS - 1);

    const web: Item = looksLikeUrl(q)
      ? { key: "web", kind: "web", title: `Ir a ${q}`, subtitle: "Abrir dirección", rank: 0, run: () => go(/^https?:\/\//i.test(q) ? q : `https://${q}`) }
      : { key: "web", kind: "web", title: `Buscar «${q}» en Google`, subtitle: "google.com", rank: 0, run: () => go(`https://www.google.com/search?q=${encodeURIComponent(q)}`) };

    return looksLikeUrl(q) ? [web, ...ranked] : [...ranked, web];
  }, [query, tabs, workspaces, shortcuts, projects, history, hasExtension]);

  const safeActive = Math.min(active, Math.max(0, items.length - 1));

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${safeActive}"]`)?.scrollIntoView({ block: "nearest" });
  }, [safeActive]);

  async function choose(item: Item | undefined) {
    if (!item) return;
    close();
    try {
      await item.run();
    } catch {
      /* extensión no disponible */
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % Math.max(1, items.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i - 1 + items.length) % Math.max(1, items.length));
    } else if (event.key === "Enter") {
      event.preventDefault();
      void choose(items[safeActive]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
      style={{ background: "rgba(20, 19, 15, 0.45)" }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscador"
        className="flex w-full max-w-[640px] flex-col overflow-hidden"
        style={{
          background: "var(--surface)",
          border: "2px solid var(--ink)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--sh-md)",
          maxHeight: "72vh",
        }}
      >
        <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: "2px solid var(--ink)" }}>
          <IconSearch size={18} stroke={2.4} color="var(--ink)" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
              if (event.target.value.trim().length < 2) setHistory([]);
            }}
            onKeyDown={onKeyDown}
            placeholder={hasExtension ? "Pestañas, espacios, accesos, historial…" : "Espacios, accesos, proyectos…"}
            aria-label="Buscar"
            aria-controls="palette-results"
            aria-activedescendant={items[safeActive] ? `palette-${items[safeActive].key}` : undefined}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--ink)", fontFamily: "var(--font-sans)" }}
          />
          <kbd className="text-[9px]" style={{ fontFamily: "var(--font-head)", color: "var(--muted)" }}>ESC</kbd>
        </div>

        <ul id="palette-results" ref={listRef} role="listbox" className="flex-1 overflow-y-auto p-1.5">
          {items.length === 0 && (
            <li className="px-3 py-6 text-center text-xs" style={{ color: "var(--muted)" }}>
              Escribí para buscar.
            </li>
          )}
          {items.map((item, index) => {
            const selected = index === safeActive;
            return (
              <li
                key={item.key}
                id={`palette-${item.key}`}
                data-index={index}
                role="option"
                aria-selected={selected}
                onMouseMove={() => setActive(index)}
                onClick={() => void choose(item)}
                className="flex cursor-pointer items-center gap-2.5 px-2 py-1.5"
                style={{
                  borderRadius: "var(--radius)",
                  background: selected ? "var(--paper)" : "transparent",
                  outline: selected ? "1.5px solid var(--ink)" : "none",
                }}
              >
                <KindIcon item={item} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs" style={{ fontFamily: "var(--font-head)" }}>{item.title}</span>
                  <span className="block truncate text-[10px]" style={{ color: "var(--muted)" }}>{item.subtitle}</span>
                </span>
                <KindTag kind={item.kind} />
              </li>
            );
          })}
        </ul>

        <div
          className="flex items-center gap-3 px-3 py-1.5 text-[9px] uppercase"
          style={{ borderTop: "1.5px solid var(--ink)", fontFamily: "var(--font-head)", color: "var(--muted)" }}
        >
          <span>↑↓ mover</span>
          <span>Enter abrir</span>
          <span className="ml-auto">{hasExtension ? "Pestañas + historial activos" : "Sin extensión: solo datos del dashboard"}</span>
        </div>
      </div>
    </div>
  );
}
