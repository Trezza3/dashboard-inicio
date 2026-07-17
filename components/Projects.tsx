"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IconExternalLink, IconPencil, IconPlus, IconTrash, IconX } from "@tabler/icons-react";
import {
  ACCENT_OPTIONS,
  DEFAULT_PROJECTS,
  STATUS_META,
  type Project,
  type ProjectLink,
  type ProjectStatus,
} from "@/lib/projects";

type PingResult = { url: string; ok: boolean; code: number; ms: number };

const STORAGE_KEY = "dash-projects-v1";
const STATUS_ORDER: ProjectStatus[] = ["idea", "building", "live", "paused"];

function normalizeUrl(raw: string) {
  const value = raw.trim();
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function hostLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function emptyDraft(): Project {
  return { id: "", name: "", description: "", status: "building", accent: ACCENT_OPTIONS[0], monitorUrl: "", links: [] };
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pings, setPings] = useState<Record<string, PingResult>>({});
  const [editingId, setEditingId] = useState<string | null>(null); // null=cerrado, "new"=alta, id=edicion
  const [draft, setDraft] = useState<Project>(emptyDraft);

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        setProjects(raw ? (JSON.parse(raw) as Project[]) : DEFAULT_PROJECTS);
      } catch {
        setProjects(DEFAULT_PROJECTS);
      }
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch {
      /* ignore */
    }
  }, [projects, loaded]);

  const monitorKey = useMemo(
    () => projects.map((p) => p.monitorUrl).filter(Boolean).join("|"),
    [projects],
  );

  // Estado en vivo: pinguea las URLs monitoreadas al cargar y cada 60s.
  useEffect(() => {
    if (!loaded) return;
    const urls = monitorKey.split("|").filter(Boolean);
    if (!urls.length) return;
    let alive = true;
    async function checkAll() {
      try {
        const res = await fetch("/api/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls }),
        });
        const data = (await res.json()) as { results?: PingResult[] };
        if (!alive) return;
        setPings((prev) => {
          const next = { ...prev };
          for (const r of data.results ?? []) next[r.url] = r;
          return next;
        });
      } catch {
        /* red caida */
      }
    }
    void checkAll();
    const id = window.setInterval(checkAll, 60000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [monitorKey, loaded]);

  const openAdd = useCallback(() => {
    setDraft(emptyDraft());
    setEditingId("new");
  }, []);

  const openEdit = useCallback((project: Project) => {
    setDraft({ ...project, links: project.links.map((l) => ({ ...l })) });
    setEditingId(project.id);
  }, []);

  function save() {
    const name = draft.name.trim();
    if (!name) return;
    const cleaned: Project = {
      ...draft,
      id: editingId === "new" || !editingId ? crypto.randomUUID() : editingId,
      name,
      description: draft.description?.trim() || undefined,
      monitorUrl: draft.monitorUrl?.trim() ? normalizeUrl(draft.monitorUrl) : undefined,
      links: draft.links
        .filter((l) => l.url.trim())
        .map((l) => ({
          id: l.id,
          url: normalizeUrl(l.url),
          label: l.label.trim() || hostLabel(normalizeUrl(l.url)),
        })),
    };
    setProjects((prev) =>
      editingId === "new" ? [...prev, cleaned] : prev.map((p) => (p.id === editingId ? cleaned : p)),
    );
    setEditingId(null);
  }

  function remove(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (editingId === id) setEditingId(null);
  }

  function addLink() {
    setDraft((d) => ({ ...d, links: [...d.links, { id: crypto.randomUUID(), label: "", url: "" }] }));
  }

  function updateLink(index: number, patch: Partial<ProjectLink>) {
    setDraft((d) => ({ ...d, links: d.links.map((l, i) => (i === index ? { ...l, ...patch } : l)) }));
  }

  function removeLink(index: number) {
    setDraft((d) => ({ ...d, links: d.links.filter((_, i) => i !== index) }));
  }

  return (
    <section
      aria-label="Proyectos"
      className="p-3"
      style={{
        background: "var(--surface)",
        border: "2px solid var(--ink)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--sh-sm)",
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase" style={{ fontFamily: "var(--font-head)", letterSpacing: "0.04em" }}>
          Proyectos
        </p>
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
            {projects.length}
          </span>
          <button
            type="button"
            aria-label="Agregar proyecto"
            onClick={openAdd}
            className="grid h-6 w-6 place-items-center"
            style={{ border: "1.5px solid var(--ink)", borderRadius: "var(--radius)", background: "var(--lime)", color: "#14130F" }}
          >
            <IconPlus size={13} stroke={2.6} />
          </button>
        </div>
      </div>

      {editingId !== null && (
        <ProjectForm
          draft={draft}
          isNew={editingId === "new"}
          onField={(patch) => setDraft((d) => ({ ...d, ...patch }))}
          onAddLink={addLink}
          onUpdateLink={updateLink}
          onRemoveLink={removeLink}
          onSave={save}
          onCancel={() => setEditingId(null)}
        />
      )}

      <ul className="flex flex-col gap-2">
        {projects.map((project) => {
          const meta = STATUS_META[project.status];
          const ping = project.monitorUrl ? pings[project.monitorUrl] : undefined;
          const dotColor = !project.monitorUrl
            ? null
            : ping === undefined
              ? "var(--faint)"
              : ping.ok
                ? "var(--lime)"
                : "var(--coral)";
          return (
            <li
              key={project.id}
              className="p-2"
              style={{ border: "1.5px solid var(--ink)", borderRadius: "var(--radius)", boxShadow: `2px 2px 0 0 ${project.accent}` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {dotColor && (
                      <span
                        title={ping === undefined ? "Chequeando" : ping.ok ? `Funcionando · ${ping.ms}ms` : "Caído"}
                        className="inline-block h-2 w-2 shrink-0 rounded-full"
                        style={{ background: dotColor, border: "1px solid var(--ink)" }}
                      />
                    )}
                    <p className="truncate text-xs uppercase" style={{ fontFamily: "var(--font-head)" }}>
                      {project.name}
                    </p>
                  </div>
                  {project.description && (
                    <p className="mt-1 text-[10px] leading-tight" style={{ color: "var(--muted)" }}>
                      {project.description}
                    </p>
                  )}
                  {project.monitorUrl && ping?.ok && (
                    <p className="mt-0.5 text-[9px] tabular-nums" style={{ color: "var(--faint)" }}>
                      {ping.ms}ms · {ping.code}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className="px-1.5 py-0.5 text-[8px] uppercase"
                    style={{
                      fontFamily: "var(--font-head)",
                      background: meta.bg,
                      border: "1.5px solid var(--ink)",
                      borderRadius: "var(--radius)",
                      color: meta.text,
                    }}
                  >
                    {meta.label}
                  </span>
                  <div className="flex gap-1">
                    <button type="button" aria-label={`Editar ${project.name}`} onClick={() => openEdit(project)}>
                      <IconPencil size={12} stroke={2.4} color="var(--muted)" />
                    </button>
                    <button type="button" aria-label={`Borrar ${project.name}`} onClick={() => remove(project.id)}>
                      <IconTrash size={12} stroke={2.4} color="var(--muted)" />
                    </button>
                  </div>
                </div>
              </div>

              {project.links.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {project.links.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="badge inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] uppercase"
                      style={{ fontFamily: "var(--font-head)", border: "1.5px solid var(--ink)", borderRadius: "var(--radius)" }}
                    >
                      {link.label}
                      <IconExternalLink size={10} stroke={2.5} />
                    </a>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {loaded && projects.length === 0 && editingId === null && (
        <button
          type="button"
          onClick={openAdd}
          className="w-full px-2 py-3 text-center text-[10px]"
          style={{
            color: "var(--muted)",
            border: "1.5px dashed var(--ink)",
            borderRadius: "var(--radius)",
            background: "var(--paper)",
          }}
        >
          Agregá tu primer proyecto
        </button>
      )}
    </section>
  );
}

type ProjectFormProps = {
  draft: Project;
  isNew: boolean;
  onField: (patch: Partial<Project>) => void;
  onAddLink: () => void;
  onUpdateLink: (index: number, patch: Partial<ProjectLink>) => void;
  onRemoveLink: (index: number) => void;
  onSave: () => void;
  onCancel: () => void;
};

function ProjectForm({ draft, isNew, onField, onAddLink, onUpdateLink, onRemoveLink, onSave, onCancel }: ProjectFormProps) {
  const inputStyle = {
    background: "var(--surface)",
    border: "1.5px solid var(--ink)",
    borderRadius: "var(--radius)",
    color: "var(--ink)",
    fontFamily: "var(--font-sans)",
  } as const;

  return (
    <div
      className="mb-3 flex flex-col gap-2 p-2"
      style={{ border: "1.5px solid var(--ink)", borderRadius: "var(--radius)", background: "var(--paper)" }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[9px] uppercase" style={{ fontFamily: "var(--font-head)", color: "var(--muted)" }}>
          {isNew ? "Nuevo proyecto" : "Editar proyecto"}
        </p>
        <button type="button" onClick={onCancel} aria-label="Cerrar">
          <IconX size={13} stroke={2.4} color="var(--muted)" />
        </button>
      </div>

      <input
        value={draft.name}
        onChange={(e) => onField({ name: e.target.value })}
        placeholder="Nombre"
        className="px-2 py-1.5 text-xs outline-none"
        style={inputStyle}
      />
      <input
        value={draft.description ?? ""}
        onChange={(e) => onField({ description: e.target.value })}
        placeholder="Descripción"
        className="px-2 py-1.5 text-xs outline-none"
        style={inputStyle}
      />

      <div className="flex flex-wrap gap-1">
        {STATUS_ORDER.map((status) => {
          const active = draft.status === status;
          return (
            <button
              key={status}
              type="button"
              onClick={() => onField({ status })}
              className="px-1.5 py-0.5 text-[8px] uppercase"
              style={{
                fontFamily: "var(--font-head)",
                border: "1.5px solid var(--ink)",
                borderRadius: "var(--radius)",
                background: active ? STATUS_META[status].bg : "var(--surface)",
                color: active ? STATUS_META[status].text : "var(--muted)",
              }}
            >
              {STATUS_META[status].label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-[8px] uppercase" style={{ fontFamily: "var(--font-head)", color: "var(--muted)" }}>
          Color
        </span>
        {ACCENT_OPTIONS.map((accent) => (
          <button
            key={accent}
            type="button"
            aria-label={`Color ${accent}`}
            onClick={() => onField({ accent })}
            className="h-5 w-5"
            style={{
              background: accent,
              border: draft.accent === accent ? "2.5px solid var(--ink)" : "1.5px solid var(--ink)",
              borderRadius: "var(--radius)",
            }}
          />
        ))}
      </div>

      <input
        value={draft.monitorUrl ?? ""}
        onChange={(e) => onField({ monitorUrl: e.target.value })}
        placeholder="URL para estado en vivo (opcional)"
        className="px-2 py-1.5 text-xs outline-none"
        style={inputStyle}
      />

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[8px] uppercase" style={{ fontFamily: "var(--font-head)", color: "var(--muted)" }}>
            Accesos
          </span>
          <button
            type="button"
            onClick={onAddLink}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] uppercase"
            style={{ fontFamily: "var(--font-head)", border: "1.5px solid var(--ink)", borderRadius: "var(--radius)", background: "var(--surface)" }}
          >
            <IconPlus size={10} stroke={2.6} /> Acceso
          </button>
        </div>
        {draft.links.map((link, index) => (
          <div key={link.id} className="flex items-center gap-1">
            <input
              value={link.label}
              onChange={(e) => onUpdateLink(index, { label: e.target.value })}
              placeholder="Etiqueta"
              className="w-[70px] shrink-0 px-1.5 py-1 text-[11px] outline-none"
              style={inputStyle}
            />
            <input
              value={link.url}
              onChange={(e) => onUpdateLink(index, { url: e.target.value })}
              placeholder="URL"
              className="min-w-0 flex-1 px-1.5 py-1 text-[11px] outline-none"
              style={inputStyle}
            />
            <button type="button" onClick={() => onRemoveLink(index)} aria-label="Quitar acceso">
              <IconX size={12} stroke={2.4} color="var(--muted)" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={onSave}
          className="flex-1 px-3 py-1.5 text-[10px] uppercase"
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
