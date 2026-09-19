"use client";

import { useEffect, useState } from "react";
import { IconChevronDown, IconDeviceFloppy, IconExternalLink, IconTrash, IconX } from "@tabler/icons-react";
import { type BrowserTab, callExtension } from "@/lib/extension-bridge";
import {
  MAX_GROUP_LINKS,
  TAB_GROUPS_KEY,
  TAB_GROUP_COLORS,
  colorCss,
  parseTabGroups,
  type TabGroup,
  type TabGroupColor,
} from "@/lib/tab-groups";
import { usePersistentState } from "@/lib/use-persistent-state";

type Draft = {
  name: string;
  color: TabGroupColor;
  tabs: (BrowserTab & { checked: boolean })[];
};

type ExtensionStatus = "checking" | "ready" | "missing";

function hostLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function defaultName() {
  const when = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    .format(new Date())
    .replace(/\./g, "");
  return `Ventana ${when}`;
}

function savedLabel(time: number) {
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(new Date(time)).replace(/\./g, "");
}

export default function TabGroups() {
  const [groups, setGroups, loaded] = usePersistentState<TabGroup[]>(TAB_GROUPS_KEY, {
    initial: [],
    parse: parseTabGroups,
  });
  const [extension, setExtension] = useState<ExtensionStatus>("checking");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;
    callExtension("ping")
      .then(() => alive && setExtension("ready"))
      .catch(() => alive && setExtension("missing"));
    return () => {
      alive = false;
    };
  }, []);

  async function startSave() {
    setMessage("");
    try {
      const { tabs } = await callExtension<{ tabs: BrowserTab[] }>("getCurrentWindowTabs");
      if (!tabs.length) {
        setMessage("No hay pestañas para guardar en esta ventana.");
        return;
      }
      setExtension("ready");
      setDraft({
        name: defaultName(),
        color: "blue",
        tabs: tabs.slice(0, MAX_GROUP_LINKS).map((tab) => ({ ...tab, checked: true })),
      });
    } catch {
      setExtension("missing");
    }
  }

  function save() {
    if (!draft) return;
    const links = draft.tabs.filter((t) => t.checked).map(({ url, title }) => ({ url, title }));
    if (!links.length) return;
    const group: TabGroup = {
      id: crypto.randomUUID(),
      name: draft.name.trim().slice(0, 60) || defaultName(),
      color: draft.color,
      links,
      createdAt: Date.now(),
    };
    setGroups((prev) => [group, ...prev]);
    setDraft(null);
  }

  async function openGroup(group: TabGroup) {
    setMessage("");
    try {
      await callExtension("openTabGroup", { name: group.name, color: group.color, urls: group.links.map((l) => l.url) });
    } catch {
      setExtension("missing");
    }
  }

  function remove(id: string) {
    if (!window.confirm("¿Borrar este grupo guardado?")) return;
    setGroups((prev) => prev.filter((g) => g.id !== id));
  }

  return (
    <section
      aria-label="Grupos de pestañas"
      className="p-3"
      style={{
        background: "var(--surface)",
        border: "2px solid var(--ink)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--sh-sm)",
      }}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase" style={{ fontFamily: "var(--font-head)", letterSpacing: "0.04em" }}>
            Grupos de pestañas
          </p>
          <p className="text-[9px]" style={{ color: "var(--muted)" }}>Guardá una ventana y abrila entera después</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="px-1.5 py-0.5 text-[9px] tabular-nums"
            style={{
              fontFamily: "var(--font-head)",
              background: "var(--ink)",
              color: "var(--paper)",
              border: "1.5px solid var(--ink)",
              borderRadius: "var(--radius)",
            }}
          >
            {groups.length}
          </span>
          <button
            type="button"
            aria-label="Guardar las pestañas de esta ventana"
            title="Guardar esta ventana"
            onClick={() => void startSave()}
            disabled={extension === "missing"}
            className="grid h-6 w-6 place-items-center disabled:opacity-40"
            style={{ border: "1.5px solid var(--ink)", borderRadius: "var(--radius)", background: "var(--lime)", color: "#14130F" }}
          >
            <IconDeviceFloppy size={13} stroke={2.4} />
          </button>
        </div>
      </div>

      {extension === "missing" && (
        <p className="mb-2 text-[10px] leading-snug" style={{ color: "var(--muted)" }}>
          Necesitás la extensión (versión 1.1 o superior) para guardar y abrir grupos.
        </p>
      )}
      {message && (
        <p role="status" className="mb-2 text-[10px]" style={{ color: "var(--muted)" }}>
          {message}
        </p>
      )}

      {draft && (
        <GroupForm
          draft={draft}
          onChange={setDraft}
          onSave={save}
          onCancel={() => setDraft(null)}
        />
      )}

      <ul className="flex flex-col gap-2">
        {groups.map((group) => {
          const isOpen = expanded === group.id;
          return (
            <li
              key={group.id}
              className="p-2"
              style={{ border: "1.5px solid var(--ink)", borderRadius: "var(--radius)", boxShadow: `2px 2px 0 0 ${colorCss(group.color)}` }}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : group.id)}
                  aria-expanded={isOpen}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="flex items-center gap-1">
                    <span className="truncate text-xs uppercase" style={{ fontFamily: "var(--font-head)" }}>
                      {group.name}
                    </span>
                    <IconChevronDown
                      size={12}
                      stroke={2.4}
                      color="var(--muted)"
                      className="shrink-0 transition-transform"
                      style={{ transform: isOpen ? "rotate(180deg)" : undefined }}
                    />
                  </span>
                  <span className="block truncate text-[9px]" style={{ color: "var(--muted)" }}>
                    {group.links.length} pestañas · {savedLabel(group.createdAt)} ·{" "}
                    {[...new Set(group.links.map((l) => hostLabel(l.url)))].slice(0, 3).join(" · ")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void openGroup(group)}
                  disabled={extension === "missing"}
                  aria-label={`Abrir ${group.name}`}
                  className="inline-flex shrink-0 items-center gap-1 px-1.5 py-1 text-[9px] uppercase disabled:opacity-40"
                  style={{
                    fontFamily: "var(--font-head)",
                    border: "1.5px solid var(--ink)",
                    borderRadius: "var(--radius)",
                    background: colorCss(group.color),
                    color: "#14130F",
                  }}
                >
                  Abrir <IconExternalLink size={10} stroke={2.5} />
                </button>
                <button type="button" aria-label={`Borrar ${group.name}`} onClick={() => remove(group.id)} className="shrink-0">
                  <IconTrash size={12} stroke={2.4} color="var(--muted)" />
                </button>
              </div>

              {isOpen && (
                <ul className="mt-2 flex max-h-48 flex-col gap-1 overflow-y-auto">
                  {group.links.map((link, index) => (
                    <li key={`${link.url}-${index}`} className="min-w-0">
                      <a href={link.url} className="block truncate text-[10px] hover:underline" title={link.url}>
                        {link.title}
                        <span style={{ color: "var(--faint)" }}> · {hostLabel(link.url)}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {loaded && groups.length === 0 && !draft && extension !== "missing" && (
        <button
          type="button"
          onClick={() => void startSave()}
          className="w-full px-2 py-3 text-center text-[10px]"
          style={{
            color: "var(--muted)",
            border: "1.5px dashed var(--ink)",
            borderRadius: "var(--radius)",
            background: "var(--paper)",
          }}
        >
          Guardá las pestañas de esta ventana
        </button>
      )}
    </section>
  );
}

type GroupFormProps = {
  draft: Draft;
  onChange: (draft: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
};

function GroupForm({ draft, onChange, onSave, onCancel }: GroupFormProps) {
  const checkedCount = draft.tabs.filter((t) => t.checked).length;
  const allChecked = checkedCount === draft.tabs.length;

  function toggle(index: number) {
    onChange({ ...draft, tabs: draft.tabs.map((t, i) => (i === index ? { ...t, checked: !t.checked } : t)) });
  }

  return (
    <div
      className="mb-3 flex flex-col gap-2 p-2"
      style={{ border: "1.5px solid var(--ink)", borderRadius: "var(--radius)", background: "var(--paper)" }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[9px] uppercase" style={{ fontFamily: "var(--font-head)", color: "var(--muted)" }}>
          Guardar ventana
        </p>
        <button type="button" onClick={onCancel} aria-label="Cerrar">
          <IconX size={13} stroke={2.4} color="var(--muted)" />
        </button>
      </div>

      <input
        value={draft.name}
        onChange={(e) => onChange({ ...draft, name: e.target.value })}
        onKeyDown={(e) => e.key === "Enter" && onSave()}
        placeholder="Nombre del grupo"
        aria-label="Nombre del grupo"
        autoFocus
        className="px-2 py-1.5 text-xs outline-none"
        style={{
          background: "var(--surface)",
          border: "1.5px solid var(--ink)",
          borderRadius: "var(--radius)",
          color: "var(--ink)",
          fontFamily: "var(--font-sans)",
        }}
      />

      <div className="flex items-center gap-1.5">
        <span className="text-[8px] uppercase" style={{ fontFamily: "var(--font-head)", color: "var(--muted)" }}>
          Color
        </span>
        {TAB_GROUP_COLORS.map((color) => (
          <button
            key={color.id}
            type="button"
            aria-label={`Color ${color.id}`}
            aria-pressed={draft.color === color.id}
            onClick={() => onChange({ ...draft, color: color.id })}
            className="h-5 w-5"
            style={{
              background: color.css,
              border: draft.color === color.id ? "2.5px solid var(--ink)" : "1.5px solid var(--ink)",
              borderRadius: "var(--radius)",
            }}
          />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[8px] uppercase" style={{ fontFamily: "var(--font-head)", color: "var(--muted)" }}>
          {checkedCount} de {draft.tabs.length} pestañas
        </span>
        <button
          type="button"
          onClick={() => onChange({ ...draft, tabs: draft.tabs.map((t) => ({ ...t, checked: !allChecked })) })}
          className="text-[9px] underline"
          style={{ color: "var(--muted)" }}
        >
          {allChecked ? "Ninguna" : "Todas"}
        </button>
      </div>
      <ul className="flex max-h-44 flex-col gap-1 overflow-y-auto">
        {draft.tabs.map((tab, index) => (
          <li key={`${tab.url}-${index}`}>
            <label className="flex min-w-0 cursor-pointer items-center gap-1.5 text-[10px]">
              <input type="checkbox" checked={tab.checked} onChange={() => toggle(index)} className="shrink-0" />
              <span className="truncate" title={tab.url}>
                {tab.title}
                <span style={{ color: "var(--faint)" }}> · {hostLabel(tab.url)}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={onSave}
          disabled={checkedCount === 0}
          className="flex-1 px-3 py-1.5 text-[10px] uppercase disabled:opacity-40"
          style={{
            fontFamily: "var(--font-head)",
            border: "2px solid var(--ink)",
            borderRadius: "var(--radius)",
            background: "var(--lime)",
            color: "#14130F",
            boxShadow: "var(--sh-sm)",
          }}
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-[10px] uppercase"
          style={{ fontFamily: "var(--font-head)", border: "1.5px solid var(--ink)", borderRadius: "var(--radius)", background: "var(--surface)", color: "var(--muted)" }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
