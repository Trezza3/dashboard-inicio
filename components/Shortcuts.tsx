"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  IconPlus,
  IconX,
  IconPencil,
  IconCheck,
  IconFolderPlus,
  IconFolder,
  IconTrash,
  IconArrowBackUp,
} from "@tabler/icons-react";
import {
  shortcuts as defaultShortcuts,
  type Link,
  type GridItem,
  type FolderItem,
} from "@/lib/shortcuts";

const CHIP_OPTIONS = [
  { label: "ink",    value: "var(--ink)"    },
  { label: "violet", value: "var(--violet)" },
  { label: "coral",  value: "var(--coral)"  },
  { label: "sky",    value: "var(--sky)"    },
  { label: "teal",   value: "var(--teal)"   },
  { label: "lime",   value: "var(--lime)"   },
  { label: "gold",   value: "var(--gold)"   },
];

const STORAGE_KEY = "dash-shortcuts-v3";
const LEGACY_KEY = "dash-shortcuts-v2";

function genId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `f-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function seedItems(): GridItem[] {
  return defaultShortcuts.map((s) => ({ kind: "link", name: s.name, url: s.url, chip: s.chip }));
}

function faviconUrl(url: string): string | null {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  } catch {
    return null;
  }
}

function normalizeUrl(raw: string) {
  const s = raw.trim();
  return /^https?:\/\//i.test(s) ? s : "https://" + s;
}

/* ---------------- Formulario de link (agregar / editar) ---------------- */
type FormState = { name: string; url: string; chip: string };

function ShortcutForm({
  initial,
  onSave,
  onCancel,
  title,
}: {
  initial: FormState;
  onSave: (f: FormState) => void;
  onCancel: () => void;
  title: string;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const previewUrl = form.url ? faviconUrl(normalizeUrl(form.url)) : null;

  function submit() {
    if (!form.name.trim() || !form.url.trim()) return;
    onSave({ ...form, url: normalizeUrl(form.url) });
  }

  return (
    <div
      className="flex flex-col gap-3 p-3"
      style={{
        border: "2px solid var(--ink)",
        borderRadius: "var(--radius)",
        background: "var(--surface)",
        boxShadow: "var(--sh-sm)",
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] uppercase"
          style={{ fontFamily: "var(--font-head)", letterSpacing: "0.04em" }}
        >
          {title}
        </span>
        <button type="button" onClick={onCancel} aria-label="Cancelar">
          <IconX size={14} stroke={2} color="var(--muted)" />
        </button>
      </div>

      <div className="flex gap-2">
        <input
          ref={nameRef}
          placeholder="Nombre"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="flex-1 px-2 py-1.5 text-xs outline-none"
          style={{
            border: "2px solid var(--ink)",
            borderRadius: "var(--radius)",
            fontFamily: "var(--font-sans)",
            background: "var(--surface)",
            color: "var(--ink)",
          }}
        />
        <input
          placeholder="URL (ej: spotify.com)"
          value={form.url}
          onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          className="flex-[2] px-2 py-1.5 text-xs outline-none"
          style={{
            border: "2px solid var(--ink)",
            borderRadius: "var(--radius)",
            fontFamily: "var(--font-sans)",
            background: "var(--surface)",
            color: "var(--ink)",
          }}
        />
      </div>

      {previewUrl && (
        <div className="flex items-center gap-2">
          <Image src={previewUrl} alt="favicon" width={18} height={18} unoptimized />
          <span className="text-[10px]" style={{ color: "var(--muted)", fontFamily: "var(--font-sans)" }}>
            Ícono detectado automáticamente
          </span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-[9px] uppercase" style={{ fontFamily: "var(--font-head)", color: "var(--muted)" }}>
          Acento
        </span>
        <div className="flex gap-1.5">
          {CHIP_OPTIONS.map((c) => (
            <button
              key={c.label}
              type="button"
              aria-label={c.label}
              onClick={() => setForm((f) => ({ ...f, chip: c.value }))}
              style={{
                width: 18, height: 18,
                background: c.value,
                border: form.chip === c.value ? "2.5px solid var(--ink)" : "1.5px solid var(--ink)",
                borderRadius: "var(--radius)",
                boxShadow: form.chip === c.value ? "2px 2px 0 0 var(--ink)" : "none",
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          className="tile px-4 py-1.5 text-xs font-bold"
          style={{
            background: "var(--ink)", color: "var(--paper)",
            border: "2px solid var(--ink)", borderRadius: "var(--radius)",
            boxShadow: "var(--sh-sm)", fontFamily: "var(--font-head)",
          }}
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs"
          style={{
            border: "2px solid var(--ink)", borderRadius: "var(--radius)",
            fontFamily: "var(--font-sans)", color: "var(--muted)",
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

/* ---------------- Ícono de un link (favicon o inicial) ---------------- */
function LinkGlyph({ link, size = 34 }: { link: Link; size?: number }) {
  const favicon = faviconUrl(link.url);
  const [imgOk, setImgOk] = useState(!!favicon);
  if (favicon && imgOk) {
    return (
      <Image
        src={favicon}
        alt={link.name}
        width={size}
        height={size}
        draggable={false}
        onError={() => setImgOk(false)}
        unoptimized
      />
    );
  }
  return (
    <span
      className="flex items-center justify-center w-full h-full font-bold"
      style={{ background: link.chip, fontFamily: "var(--font-head)", fontSize: size * 0.42 }}
    >
      <span style={{ color: ["var(--lime)", "var(--gold)"].includes(link.chip) ? "#14130F" : "#fff" }}>
        {link.name[0]?.toUpperCase() ?? "?"}
      </span>
    </span>
  );
}

/* ---------------- Tile de link ---------------- */
function LinkTile({
  link,
  onEdit,
  onRemove,
  onMoveOut,
  drag,
  highlight,
}: {
  link: Link;
  onEdit: () => void;
  onRemove: () => void;
  onMoveOut?: () => void;
  drag?: {
    dragging: boolean;
    onDragStart: () => void;
    onDragEnter: () => void;
    onDragEnd: () => void;
    onDrop: () => void;
  };
  highlight?: "reorder" | "none";
}) {
  return (
    <div
      draggable={!!drag}
      onDragStart={drag ? (e) => { e.dataTransfer.effectAllowed = "move"; drag.onDragStart(); } : undefined}
      onDragEnter={drag ? drag.onDragEnter : undefined}
      onDragOver={drag ? (e) => e.preventDefault() : undefined}
      onDragEnd={drag ? drag.onDragEnd : undefined}
      onDrop={drag ? (e) => { e.preventDefault(); drag.onDrop(); } : undefined}
      className={`${drag ? "sc-grabbable" : ""} relative group/item flex flex-col items-center gap-1${drag?.dragging ? " sc-drag" : ""}`}
    >
      <div className="absolute -top-1 -right-1 hidden group-hover/item:flex gap-0.5 z-10">
        {onMoveOut && (
          <button
            type="button"
            aria-label={`Sacar ${link.name} de la carpeta`}
            onClick={onMoveOut}
            className="flex items-center justify-center w-4 h-4"
            style={{ background: "var(--gold)", border: "1.5px solid var(--ink)", borderRadius: "9999px" }}
          >
            <IconArrowBackUp size={9} stroke={2.5} color="#14130F" />
          </button>
        )}
        <button
          type="button"
          aria-label={`Editar ${link.name}`}
          onClick={onEdit}
          className="flex items-center justify-center w-4 h-4"
          style={{ background: "var(--sky)", border: "1.5px solid var(--ink)", borderRadius: "9999px" }}
        >
          <IconPencil size={9} stroke={2.5} color="#fff" />
        </button>
        <button
          type="button"
          aria-label={`Eliminar ${link.name}`}
          onClick={onRemove}
          className="flex items-center justify-center w-4 h-4"
          style={{
            background: "var(--coral)", border: "1.5px solid var(--ink)",
            borderRadius: "9999px", color: "#fff", fontSize: 10, lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <a
        href={link.url}
        title={link.name}
        target="_blank"
        rel="noopener noreferrer"
        draggable={false}
        className="tile flex items-center justify-center overflow-hidden"
        style={{
          width: 60, height: 60,
          background: "#fff",
          border: "2px solid var(--ink)",
          borderRadius: "var(--radius)",
          boxShadow: highlight === "reorder"
            ? "0 0 0 2px var(--sky) inset, 3px 3px 0 0 var(--ink)"
            : `3px 3px 0 0 ${link.chip}`,
        }}
      >
        <LinkGlyph link={link} />
      </a>

      <span
        className="text-[9px] font-bold text-center leading-tight max-w-[68px] truncate"
        style={{ fontFamily: "var(--font-head)", color: "var(--ink)" }}
      >
        {link.name}
      </span>
    </div>
  );
}

/* ---------------- Tile de carpeta ---------------- */
function FolderTile({
  folder,
  open,
  onOpen,
  drag,
  highlight,
}: {
  folder: FolderItem;
  open: boolean;
  onOpen: () => void;
  drag: {
    dragging: boolean;
    onDragStart: () => void;
    onDragEnter: () => void;
    onDragEnd: () => void;
    onDrop: () => void;
  };
  highlight: "reorder" | "folder" | "none";
}) {
  const preview = folder.items.slice(0, 4);
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; drag.onDragStart(); }}
      onDragEnter={drag.onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragEnd={drag.onDragEnd}
      onDrop={(e) => { e.preventDefault(); drag.onDrop(); }}
      className={`sc-grabbable relative flex flex-col items-center gap-1${drag.dragging ? " sc-drag" : ""}`}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Carpeta ${folder.name}`}
        aria-expanded={open}
        className="tile flex items-center justify-center"
        style={{
          width: 60, height: 60,
          background: highlight === "folder" ? "var(--gold)" : "var(--paper)",
          border: "2px solid var(--ink)",
          borderRadius: "var(--radius)",
          boxShadow: highlight === "reorder"
            ? "0 0 0 2px var(--sky) inset, 3px 3px 0 0 var(--ink)"
            : open
              ? "1px 1px 0 0 var(--ink)"
              : "3px 3px 0 0 var(--gold)",
          transform: open ? "translate(2px, 2px)" : undefined,
          padding: 6,
        }}
      >
        {preview.length === 0 ? (
          <IconFolder size={26} stroke={2} color="var(--muted)" />
        ) : (
          <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-[3px]">
            {preview.map((l, i) => (
              <div
                key={`${l.url}-${i}`}
                className="flex items-center justify-center overflow-hidden"
                style={{ background: "#fff", border: "1px solid var(--ink)", borderRadius: 2 }}
              >
                <LinkGlyph link={l} size={16} />
              </div>
            ))}
          </div>
        )}
      </button>

      <span
        className="text-[9px] font-bold text-center leading-tight max-w-[68px] truncate flex items-center gap-0.5"
        style={{ fontFamily: "var(--font-head)", color: "var(--ink)" }}
      >
        {folder.name}
      </span>
    </div>
  );
}

/* ================================ Componente ================================ */
export default function Shortcuts() {
  const [items, setItems] = useState<GridItem[]>(seedItems);
  const [loaded, setLoaded] = useState(false);
  const [openFolder, setOpenFolder] = useState<string | null>(null);

  // where: "top" para la grilla principal, o el id de una carpeta
  const [adding, setAdding] = useState<{ where: string } | null>(null);
  const [editing, setEditing] = useState<{ where: string; index: number } | null>(null);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  // Espejo síncrono del índice arrastrado — el state puede llegar tarde al drop
  const dragIndexRef = useRef<number | null>(null);

  function startDrag(i: number) { dragIndexRef.current = i; setDragIndex(i); }
  function endDrag() { dragIndexRef.current = null; setDragIndex(null); setOverIndex(null); }

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          setItems(JSON.parse(raw));
        } else {
          const legacy = localStorage.getItem(LEGACY_KEY);
          if (legacy) {
            const arr = JSON.parse(legacy) as { name: string; url: string; chip: string }[];
            setItems(arr.map((s) => ({ kind: "link", name: s.name, url: s.url, chip: s.chip })));
          }
        }
      } catch {
        setItems(seedItems());
      }
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* ignore */ }
  }, [items, loaded]);

  /* -------- helpers -------- */
  function updateFolder(id: string, fn: (f: FolderItem) => FolderItem) {
    setItems((prev) => prev.map((it) => (it.kind === "folder" && it.id === id ? fn(it) : it)));
  }

  function reorder(from: number, to: number) {
    setItems((prev) => {
      if (from === to) return prev;
      const next = [...prev];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      return next;
    });
  }

  function moveIntoFolder(from: number, folderId: string) {
    setItems((prev) => {
      const dragged = prev[from];
      if (!dragged || dragged.kind !== "link") return prev;
      const link: Link = { name: dragged.name, url: dragged.url, chip: dragged.chip };
      const next: GridItem[] = [];
      prev.forEach((it, i) => {
        if (i === from) return;
        if (it.kind === "folder" && it.id === folderId) {
          next.push({ ...it, items: [...it.items, link] });
        } else {
          next.push(it);
        }
      });
      return next;
    });
  }

  function moveOutOfFolder(folderId: string, index: number) {
    setItems((prev) => {
      const folder = prev.find((it): it is FolderItem => it.kind === "folder" && it.id === folderId);
      const moved = folder?.items[index];
      if (!moved) return prev;
      return prev
        .map((it) => (it.kind === "folder" && it.id === folderId
          ? { ...it, items: it.items.filter((_, i) => i !== index) }
          : it))
        .concat({ kind: "link", ...moved });
    });
  }

  function deleteFolder(id: string) {
    setItems((prev) => {
      const folder = prev.find((it): it is FolderItem => it.kind === "folder" && it.id === id);
      const rest = prev.filter((it) => !(it.kind === "folder" && it.id === id));
      const freed: GridItem[] = folder ? folder.items.map((l) => ({ kind: "link", ...l })) : [];
      return [...rest, ...freed];
    });
    if (openFolder === id) setOpenFolder(null);
  }

  /* -------- top-level actions -------- */
  function addLinkTop(f: FormState) {
    setItems((prev) => [...prev, { kind: "link", name: f.name, url: f.url, chip: f.chip }]);
    setAdding(null);
  }

  function editTopLink(index: number, f: FormState) {
    setItems((prev) => prev.map((it, i) =>
      i === index && it.kind === "link" ? { ...it, name: f.name, url: f.url, chip: f.chip } : it
    ));
    setEditing(null);
  }

  function removeTop(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setEditing(null);
  }

  function addFolder() {
    const id = genId();
    setItems((prev) => [...prev, { kind: "folder", id, name: "Carpeta", items: [] }]);
    setOpenFolder(id);
    setAdding(null);
    setEditing(null);
  }

  /* -------- folder-scoped actions -------- */
  function addLinkToFolder(folderId: string, f: FormState) {
    updateFolder(folderId, (fol) => ({ ...fol, items: [...fol.items, { name: f.name, url: f.url, chip: f.chip }] }));
    setAdding(null);
  }

  function editFolderLink(folderId: string, index: number, f: FormState) {
    updateFolder(folderId, (fol) => ({
      ...fol,
      items: fol.items.map((l, i) => (i === index ? { name: f.name, url: f.url, chip: f.chip } : l)),
    }));
    setEditing(null);
  }

  function removeFolderLink(folderId: string, index: number) {
    updateFolder(folderId, (fol) => ({ ...fol, items: fol.items.filter((_, i) => i !== index) }));
    setEditing(null);
  }

  /* -------- highlight de drag -------- */
  function highlightFor(i: number): "reorder" | "folder" | "none" {
    if (dragIndex === null || overIndex !== i || dragIndex === i) return "none";
    const target = items[i];
    const dragged = items[dragIndex];
    if (target.kind === "folder" && dragged?.kind === "link") return "folder";
    return "reorder";
  }

  function handleDrop(i: number) {
    const from = dragIndexRef.current;
    if (from === null) return;
    const target = items[i];
    const dragged = items[from];
    if (target.kind === "folder" && dragged?.kind === "link") {
      moveIntoFolder(from, target.id);
    } else {
      reorder(from, i);
    }
    endDrag();
  }

  const open = openFolder ? items.find((it): it is FolderItem => it.kind === "folder" && it.id === openFolder) ?? null : null;

  return (
    <section aria-label="Accesos directos" className="flex flex-col gap-3">
      <div
        className="grid justify-center gap-2"
        style={{ gridTemplateColumns: "repeat(auto-fit, 68px)", maxWidth: "100%" }}
      >
        {items.map((it, i) => {
          const drag = {
            dragging: dragIndex === i,
            onDragStart: () => startDrag(i),
            onDragEnter: () => { if (dragIndexRef.current !== null) setOverIndex(i); },
            onDragEnd: endDrag,
            onDrop: () => handleDrop(i),
          };
          if (it.kind === "folder") {
            return (
              <FolderTile
                key={`f-${it.id}`}
                folder={it}
                open={openFolder === it.id}
                onOpen={() => { setOpenFolder((v) => (v === it.id ? null : it.id)); setAdding(null); setEditing(null); }}
                drag={drag}
                highlight={highlightFor(i)}
              />
            );
          }
          return (
            <LinkTile
              key={`l-${it.url}-${i}`}
              link={it}
              onEdit={() => { setEditing({ where: "top", index: i }); setAdding(null); }}
              onRemove={() => removeTop(i)}
              drag={drag}
              highlight={highlightFor(i) === "reorder" ? "reorder" : "none"}
            />
          );
        })}

        {/* Agregar atajo */}
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            aria-label="Agregar acceso directo"
            onClick={() => { setAdding((v) => (v?.where === "top" ? null : { where: "top" })); setEditing(null); }}
            className="tile flex items-center justify-center"
            style={{
              width: 60, height: 60,
              background: adding?.where === "top" ? "var(--ink)" : "transparent",
              border: "2px dashed var(--ink)",
              borderRadius: "var(--radius)",
            }}
          >
            {adding?.where === "top"
              ? <IconCheck size={20} stroke={2} color="var(--paper)" />
              : <IconPlus size={20} stroke={2} color="var(--muted)" />}
          </button>
          <span className="text-[9px] font-bold text-center" style={{ fontFamily: "var(--font-head)", color: "var(--muted)" }}>
            Agregar
          </span>
        </div>

        {/* Nueva carpeta */}
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            aria-label="Nueva carpeta"
            onClick={addFolder}
            className="tile flex items-center justify-center"
            style={{
              width: 60, height: 60,
              background: "transparent",
              border: "2px dashed var(--ink)",
              borderRadius: "var(--radius)",
            }}
          >
            <IconFolderPlus size={20} stroke={2} color="var(--muted)" />
          </button>
          <span className="text-[9px] font-bold text-center" style={{ fontFamily: "var(--font-head)", color: "var(--muted)" }}>
            Carpeta
          </span>
        </div>
      </div>

      {/* Form de agregar/editar a nivel superior */}
      {adding?.where === "top" && (
        <ShortcutForm
          key="add-top"
          title="Nuevo acceso"
          initial={{ name: "", url: "", chip: "var(--sky)" }}
          onSave={addLinkTop}
          onCancel={() => setAdding(null)}
        />
      )}
      {editing?.where === "top" && items[editing.index]?.kind === "link" && (
        <ShortcutForm
          key={`edit-top-${editing.index}`}
          title={`Editar — ${(items[editing.index] as { name: string }).name}`}
          initial={{
            name: (items[editing.index] as Link).name,
            url: (items[editing.index] as Link).url,
            chip: (items[editing.index] as Link).chip,
          }}
          onSave={(f) => editTopLink(editing.index, f)}
          onCancel={() => setEditing(null)}
        />
      )}

      {/* Panel de carpeta abierta — se expande abajo */}
      {open && (
        <div
          className="flex flex-col gap-3 p-3"
          style={{
            border: "2px solid var(--ink)",
            borderRadius: "var(--radius)",
            background: "var(--surface)",
            boxShadow: "var(--sh-sm)",
          }}
        >
          <div className="flex items-center gap-2">
            <IconFolder size={16} stroke={2} color="var(--muted)" />
            <input
              value={open.name}
              onChange={(e) => updateFolder(open.id, (f) => ({ ...f, name: e.target.value }))}
              aria-label="Nombre de la carpeta"
              className="flex-1 px-2 py-1 text-xs outline-none"
              style={{
                border: "2px solid var(--ink)", borderRadius: "var(--radius)",
                fontFamily: "var(--font-head)", background: "var(--surface)", color: "var(--ink)",
                textTransform: "uppercase", letterSpacing: "0.03em",
              }}
            />
            <button
              type="button"
              aria-label="Eliminar carpeta"
              onClick={() => deleteFolder(open.id)}
              className="tile flex items-center justify-center"
              style={{ width: 28, height: 28, background: "var(--coral)", border: "2px solid var(--ink)", borderRadius: "var(--radius)", boxShadow: "var(--sh-sm)" }}
            >
              <IconTrash size={14} stroke={2} color="#fff" />
            </button>
            <button
              type="button"
              aria-label="Cerrar carpeta"
              onClick={() => { setOpenFolder(null); setAdding(null); setEditing(null); }}
              className="flex items-center justify-center"
              style={{ width: 28, height: 28 }}
            >
              <IconX size={16} stroke={2} color="var(--muted)" />
            </button>
          </div>

          <div className="grid justify-center gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, 68px)" }}>
            {open.items.map((l, idx) => (
              <LinkTile
                key={`fl-${l.url}-${idx}`}
                link={l}
                onEdit={() => { setEditing({ where: open.id, index: idx }); setAdding(null); }}
                onRemove={() => removeFolderLink(open.id, idx)}
                onMoveOut={() => moveOutOfFolder(open.id, idx)}
              />
            ))}

            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                aria-label="Agregar acceso a la carpeta"
                onClick={() => { setAdding((v) => (v?.where === open.id ? null : { where: open.id })); setEditing(null); }}
                className="tile flex items-center justify-center"
                style={{
                  width: 60, height: 60,
                  background: adding?.where === open.id ? "var(--ink)" : "transparent",
                  border: "2px dashed var(--ink)", borderRadius: "var(--radius)",
                }}
              >
                {adding?.where === open.id
                  ? <IconCheck size={20} stroke={2} color="var(--paper)" />
                  : <IconPlus size={20} stroke={2} color="var(--muted)" />}
              </button>
              <span className="text-[9px] font-bold text-center" style={{ fontFamily: "var(--font-head)", color: "var(--muted)" }}>
                Agregar
              </span>
            </div>
          </div>

          {open.items.length === 0 && adding?.where !== open.id && (
            <p className="text-[10px] text-center" style={{ color: "var(--muted)", fontFamily: "var(--font-sans)" }}>
              Arrastrá íconos acá o tocá + para agregar.
            </p>
          )}

          {/* Form dentro de la carpeta */}
          {adding?.where === open.id && (
            <ShortcutForm
              key={`add-${open.id}`}
              title="Nuevo acceso"
              initial={{ name: "", url: "", chip: "var(--sky)" }}
              onSave={(f) => addLinkToFolder(open.id, f)}
              onCancel={() => setAdding(null)}
            />
          )}
          {editing?.where === open.id && open.items[editing.index] && (
            <ShortcutForm
              key={`edit-${open.id}-${editing.index}`}
              title={`Editar — ${open.items[editing.index].name}`}
              initial={{
                name: open.items[editing.index].name,
                url: open.items[editing.index].url,
                chip: open.items[editing.index].chip,
              }}
              onSave={(f) => editFolderLink(open.id, editing.index, f)}
              onCancel={() => setEditing(null)}
            />
          )}
        </div>
      )}
    </section>
  );
}
