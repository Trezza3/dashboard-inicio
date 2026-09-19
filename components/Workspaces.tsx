"use client";

import { useEffect, useState } from "react";
import {
  IconChevronDown,
  IconDeviceFloppy,
  IconDoorExit,
  IconExternalLink,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { type BrowserTab, callExtension } from "@/lib/extension-bridge";
import {
  MAX_GROUP_LINKS,
  TAB_GROUP_COLORS,
  colorCss,
  type TabGroup,
  type TabGroupColor,
  type TabGroupLink,
} from "@/lib/tab-groups";
import {
  closeWorkspaceTabs,
  openWorkspace,
  readCurrentWindowTabs,
  readOpenWorkspaceTabs,
  useWorkspaces,
} from "@/lib/workspace-actions";

type Draft = {
  name: string;
  color: TabGroupColor;
  /** null: sin extensión, el espacio arranca vacío. */
  tabs: (BrowserTab & { checked: boolean })[] | null;
};

type ExtensionStatus = "checking" | "ready" | "missing";

function hostLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function hosts(links: TabGroupLink[]) {
  return [...new Set(links.map((l) => hostLabel(l.url)))].slice(0, 3).join(" · ");
}

/**
 * Espacios de trabajo: un grupo de pestañas + notas por cliente o proyecto.
 * "Abrir" lo abre como grupo nativo (o lleva a él si ya está abierto),
 * "Guardar" toma sus pestañas actuales y "Cerrar" guarda y cierra el grupo.
 */
export default function Workspaces() {
  const [workspaces, setWorkspaces, loaded] = useWorkspaces();
  const [extension, setExtension] = useState<ExtensionStatus>("checking");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [status, setStatus] = useState<{ id: string; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    callExtension("ping")
      .then(() => alive && setExtension("ready"))
      .catch(() => alive && setExtension("missing"));
    return () => {
      alive = false;
    };
  }, []);

  function report(id: string, text: string) {
    setStatus({ id, text });
    window.setTimeout(() => setStatus((current) => (current?.text === text ? null : current)), 4_000);
  }

  function update(id: string, patch: Partial<TabGroup>) {
    setWorkspaces((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  }

  // El formulario abre al instante; las pestañas de la ventana llegan después.
  async function startCreate() {
    setDraft({ name: "", color: "blue", tabs: null });
    if (extension === "missing") return;
    try {
      const tabs = (await readCurrentWindowTabs()).slice(0, MAX_GROUP_LINKS).map((t) => ({ ...t, checked: true }));
      setExtension("ready");
      setDraft((current) => (current && current.tabs === null ? { ...current, tabs } : current));
    } catch {
      setExtension("missing");
    }
  }

  function create() {
    if (!draft) return;
    const name = draft.name.trim().slice(0, 60);
    if (!name) return;
    if (workspaces.some((w) => w.name.toLowerCase() === name.toLowerCase())) {
      report("new", "Ya hay un espacio con ese nombre.");
      return;
    }
    const links = (draft.tabs ?? []).filter((t) => t.checked).map(({ url, title }) => ({ url, title }));
    const now = Date.now();
    setWorkspaces((prev) => [{ id: crypto.randomUUID(), name, color: draft.color, links, createdAt: now, updatedAt: now }, ...prev]);
    setDraft(null);
  }

  async function open(workspace: TabGroup) {
    if (!workspace.links.length) {
      report(workspace.id, "Todavía no tiene pestañas: abrí las que uses y tocá Guardar.");
      return;
    }
    try {
      await openWorkspace(workspace);
    } catch {
      setExtension("missing");
    }
  }

  /** Pestañas actuales del espacio: su grupo abierto o, si no está, esta ventana. */
  async function currentLinks(workspace: TabGroup): Promise<TabGroupLink[] | null> {
    const fromGroup = await readOpenWorkspaceTabs(workspace);
    if (fromGroup) return fromGroup;
    const ok = window.confirm(
      `"${workspace.name}" no está abierto como grupo. ¿Guardar en él las pestañas de esta ventana?`,
    );
    if (!ok) return null;
    return (await readCurrentWindowTabs()).slice(0, MAX_GROUP_LINKS).map(({ url, title }) => ({ url, title }));
  }

  async function save(workspace: TabGroup) {
    try {
      const links = await currentLinks(workspace);
      if (!links) return;
      update(workspace.id, { links, updatedAt: Date.now() });
      report(workspace.id, `Guardado · ${links.length} pestañas`);
    } catch {
      setExtension("missing");
    }
  }

  async function saveAndClose(workspace: TabGroup) {
    try {
      const links = await readOpenWorkspaceTabs(workspace);
      if (!links) {
        report(workspace.id, "No está abierto: no hay nada para cerrar.");
        return;
      }
      update(workspace.id, { links, updatedAt: Date.now() });
      const closed = await closeWorkspaceTabs(workspace);
      report(workspace.id, `Guardado y cerrado · ${closed} pestañas`);
    } catch {
      setExtension("missing");
    }
  }

  function remove(workspace: TabGroup) {
    if (!window.confirm(`¿Borrar el espacio "${workspace.name}"? Sus notas se pierden.`)) return;
    setWorkspaces((prev) => prev.filter((w) => w.id !== workspace.id));
  }

  const noExtension = extension === "missing";

  return (
    <section
      aria-label="Espacios de trabajo"
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
            Espacios
          </p>
          <p className="text-[9px]" style={{ color: "var(--muted)" }}>Pestañas y notas por cliente o proyecto</p>
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
            {workspaces.length}
          </span>
          <button
            type="button"
            aria-label="Nuevo espacio"
            title="Nuevo espacio"
            onClick={() => void startCreate()}
            className="grid h-6 w-6 place-items-center"
            style={{ border: "1.5px solid var(--ink)", borderRadius: "var(--radius)", background: "var(--lime)", color: "#14130F" }}
          >
            <IconPlus size={13} stroke={2.6} />
          </button>
        </div>
      </div>

      {noExtension && (
        <p className="mb-2 text-[10px] leading-snug" style={{ color: "var(--muted)" }}>
          Con la extensión (1.2 o superior) los espacios abren, guardan y cierran sus pestañas.
        </p>
      )}

      {draft && (
        <CreateForm
          draft={draft}
          error={status?.id === "new" ? status.text : ""}
          onChange={setDraft}
          onSave={create}
          onCancel={() => setDraft(null)}
        />
      )}

      <ul className="flex flex-col gap-2">
        {workspaces.map((workspace) => {
          const isOpen = expanded === workspace.id;
          const accent = colorCss(workspace.color);
          return (
            <li
              key={workspace.id}
              className="p-2"
              style={{ border: "1.5px solid var(--ink)", borderRadius: "var(--radius)", boxShadow: `2px 2px 0 0 ${accent}` }}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : workspace.id)}
                  aria-expanded={isOpen}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: accent, border: "1px solid var(--ink)" }} />
                    <span className="truncate text-xs uppercase" style={{ fontFamily: "var(--font-head)" }}>
                      {workspace.name}
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
                    {status?.id === workspace.id
                      ? status.text
                      : workspace.note?.split("\n")[0] ||
                        (workspace.links.length ? `${workspace.links.length} pestañas · ${hosts(workspace.links)}` : "Sin pestañas guardadas")}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => void open(workspace)}
                  disabled={noExtension}
                  aria-label={`Abrir ${workspace.name}`}
                  title="Abrir (o ir si ya está abierto)"
                  className="inline-flex shrink-0 items-center gap-1 px-1.5 py-1 text-[9px] uppercase disabled:opacity-40"
                  style={{
                    fontFamily: "var(--font-head)",
                    border: "1.5px solid var(--ink)",
                    borderRadius: "var(--radius)",
                    background: accent,
                    color: "#14130F",
                  }}
                >
                  Abrir <IconExternalLink size={10} stroke={2.5} />
                </button>
                <button
                  type="button"
                  onClick={() => void save(workspace)}
                  disabled={noExtension}
                  aria-label={`Guardar las pestañas de ${workspace.name}`}
                  title="Guardar sus pestañas actuales"
                  className="shrink-0 disabled:opacity-40"
                >
                  <IconDeviceFloppy size={14} stroke={2.2} color="var(--muted)" />
                </button>
                <button
                  type="button"
                  onClick={() => void saveAndClose(workspace)}
                  disabled={noExtension}
                  aria-label={`Guardar y cerrar ${workspace.name}`}
                  title="Guardar y cerrar sus pestañas"
                  className="shrink-0 disabled:opacity-40"
                >
                  <IconDoorExit size={14} stroke={2.2} color="var(--muted)" />
                </button>
              </div>

              {isOpen && (
                <div className="mt-2 flex flex-col gap-2">
                  <textarea
                    value={workspace.note ?? ""}
                    onChange={(e) => update(workspace.id, { note: e.target.value.slice(0, 4_000) })}
                    placeholder="Notas: pendientes, accesos, datos del cliente…"
                    aria-label={`Notas de ${workspace.name}`}
                    rows={3}
                    className="w-full resize-y px-2 py-1.5 text-[11px] leading-snug outline-none"
                    style={{
                      background: "var(--paper)",
                      border: "1.5px solid var(--ink)",
                      borderRadius: "var(--radius)",
                      color: "var(--ink)",
                      fontFamily: "var(--font-sans)",
                    }}
                  />
                  {workspace.links.length > 0 && (
                    <ul className="flex max-h-44 flex-col gap-1 overflow-y-auto">
                      {workspace.links.map((link, index) => (
                        <li key={`${link.url}-${index}`} className="flex min-w-0 items-center gap-1">
                          <a href={link.url} className="min-w-0 flex-1 truncate text-[10px] hover:underline" title={link.url}>
                            {link.title}
                            <span style={{ color: "var(--faint)" }}> · {hostLabel(link.url)}</span>
                          </a>
                          <button
                            type="button"
                            aria-label={`Quitar ${link.title}`}
                            onClick={() => update(workspace.id, { links: workspace.links.filter((_, i) => i !== index) })}
                            className="shrink-0"
                          >
                            <IconX size={11} stroke={2.4} color="var(--muted)" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(workspace)}
                    className="inline-flex items-center gap-1 self-end text-[9px] uppercase"
                    style={{ fontFamily: "var(--font-head)", color: "var(--muted)" }}
                  >
                    <IconTrash size={11} stroke={2.4} /> Borrar espacio
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {loaded && workspaces.length === 0 && !draft && (
        <button
          type="button"
          onClick={() => void startCreate()}
          className="w-full px-2 py-3 text-center text-[10px]"
          style={{
            color: "var(--muted)",
            border: "1.5px dashed var(--ink)",
            borderRadius: "var(--radius)",
            background: "var(--paper)",
          }}
        >
          Creá un espacio por cliente o proyecto
        </button>
      )}
    </section>
  );
}

type CreateFormProps = {
  draft: Draft;
  error: string;
  onChange: (draft: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
};

function CreateForm({ draft, error, onChange, onSave, onCancel }: CreateFormProps) {
  const tabs = draft.tabs;
  const checkedCount = tabs?.filter((t) => t.checked).length ?? 0;
  const allChecked = !!tabs && checkedCount === tabs.length;

  function setTabs(next: NonNullable<Draft["tabs"]>) {
    onChange({ ...draft, tabs: next });
  }

  return (
    <div
      className="mb-3 flex flex-col gap-2 p-2"
      style={{ border: "1.5px solid var(--ink)", borderRadius: "var(--radius)", background: "var(--paper)" }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[9px] uppercase" style={{ fontFamily: "var(--font-head)", color: "var(--muted)" }}>
          Nuevo espacio
        </p>
        <button type="button" onClick={onCancel} aria-label="Cerrar">
          <IconX size={13} stroke={2.4} color="var(--muted)" />
        </button>
      </div>

      <input
        value={draft.name}
        onChange={(e) => onChange({ ...draft, name: e.target.value })}
        onKeyDown={(e) => e.key === "Enter" && onSave()}
        placeholder="Nombre (ej. Kalma)"
        aria-label="Nombre del espacio"
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
      {error && <p role="alert" className="text-[9px]" style={{ color: "var(--coral)" }}>{error}</p>}

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

      {tabs && tabs.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[8px] uppercase" style={{ fontFamily: "var(--font-head)", color: "var(--muted)" }}>
              Pestañas de esta ventana · {checkedCount} de {tabs.length}
            </span>
            <button
              type="button"
              onClick={() => setTabs(tabs.map((t) => ({ ...t, checked: !allChecked })))}
              className="text-[9px] underline"
              style={{ color: "var(--muted)" }}
            >
              {allChecked ? "Ninguna" : "Todas"}
            </button>
          </div>
          <ul className="flex max-h-44 flex-col gap-1 overflow-y-auto">
            {tabs.map((tab, index) => (
              <li key={`${tab.url}-${index}`}>
                <label className="flex min-w-0 cursor-pointer items-center gap-1.5 text-[10px]">
                  <input
                    type="checkbox"
                    checked={tab.checked}
                    onChange={() => setTabs(tabs.map((t, i) => (i === index ? { ...t, checked: !t.checked } : t)))}
                    className="shrink-0"
                  />
                  <span className="truncate" title={tab.url}>
                    {tab.title}
                    <span style={{ color: "var(--faint)" }}> · {hostLabel(tab.url)}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </>
      )}

      <button
        type="button"
        onClick={onSave}
        disabled={!draft.name.trim()}
        className="px-3 py-1.5 text-[10px] uppercase disabled:opacity-40"
        style={{
          fontFamily: "var(--font-head)",
          border: "2px solid var(--ink)",
          borderRadius: "var(--radius)",
          background: "var(--lime)",
          color: "#14130F",
          boxShadow: "var(--sh-sm)",
        }}
      >
        Crear espacio
      </button>
    </div>
  );
}
