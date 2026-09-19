"use client";

import { useCallback, useEffect, useState } from "react";
import { IconChevronDown, IconCopy, IconX } from "@tabler/icons-react";
import { type DuplicateTabGroup, callExtension } from "@/lib/extension-bridge";

function hostLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Todas las pestañas del grupo menos la primera (la que se conserva). */
function extras(group: DuplicateTabGroup) {
  return group.tabs.slice(1).map((tab) => ({ id: tab.id, url: group.url }));
}

/**
 * Pestañas abiertas con la misma URL. Solo se muestra si hay duplicadas
 * (y la extensión está instalada).
 */
export default function DuplicateTabs() {
  const [groups, setGroups] = useState<DuplicateTabGroup[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const result = await callExtension<{ groups: DuplicateTabGroup[] }>("findDuplicateTabs");
      setGroups(Array.isArray(result.groups) ? result.groups : []);
    } catch {
      setGroups([]);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void refresh(), 0);
    // Al volver a esta pestaña pueden haber cambiado las otras.
    function onVisible() {
      if (document.visibilityState === "visible") void refresh();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refresh]);

  async function close(tabs: { id: number; url: string }[]) {
    if (!tabs.length) return;
    setBusy(true);
    try {
      await callExtension("closeTabs", { tabs });
    } catch {
      /* sin extensión: el refresh deja el panel vacío */
    }
    await refresh();
    setBusy(false);
  }

  const extraCount = groups.reduce((sum, group) => sum + group.tabs.length - 1, 0);
  if (!extraCount) return null;

  return (
    <section
      aria-label="Pestañas duplicadas"
      className="p-2.5"
      style={{
        background: "var(--surface)",
        border: "2px solid var(--ink)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--sh-sm)",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="grid h-7 w-7 shrink-0 place-items-center"
          style={{ border: "1.5px solid var(--ink)", borderRadius: "var(--radius)", background: "var(--gold)", color: "#14130F" }}
        >
          <IconCopy size={14} stroke={2.3} />
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="min-w-0 flex-1 text-left"
        >
          <span className="flex items-center gap-1 text-xs" style={{ fontFamily: "var(--font-head)" }}>
            {extraCount} {extraCount === 1 ? "pestaña duplicada" : "pestañas duplicadas"}
            <IconChevronDown
              size={12}
              stroke={2.4}
              color="var(--muted)"
              className="shrink-0 transition-transform"
              style={{ transform: open ? "rotate(180deg)" : undefined }}
            />
          </span>
          <span className="block truncate text-[9px]" style={{ color: "var(--muted)" }}>
            {groups.slice(0, 3).map((g) => hostLabel(g.url)).join(" · ")}
          </span>
        </button>
        <button
          type="button"
          onClick={() => void close(groups.flatMap(extras))}
          disabled={busy}
          className="shrink-0 px-2 py-1 text-[9px] uppercase disabled:opacity-40"
          style={{
            fontFamily: "var(--font-head)",
            border: "1.5px solid var(--ink)",
            borderRadius: "var(--radius)",
            background: "var(--lime)",
            color: "#14130F",
          }}
        >
          Cerrar
        </button>
      </div>

      {open && (
        <ul className="mt-2 flex max-h-56 flex-col gap-1 overflow-y-auto">
          {groups.map((group) => (
            <li
              key={group.url}
              className="flex items-center gap-2 px-2 py-1"
              style={{ border: "1.5px solid var(--ink)", borderRadius: "var(--radius)", background: "var(--paper)" }}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[10px]" title={group.url}>{group.title}</span>
                <span className="block truncate text-[9px]" style={{ color: "var(--muted)" }}>
                  {hostLabel(group.url)} · abierta {group.tabs.length} veces
                </span>
              </span>
              <button
                type="button"
                onClick={() => void close(extras(group))}
                disabled={busy}
                aria-label={`Cerrar copias de ${group.title}`}
                title="Dejar una sola"
                className="shrink-0 disabled:opacity-40"
              >
                <IconX size={13} stroke={2.4} color="var(--muted)" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
