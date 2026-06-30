"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { IconPlus, IconX, IconPencil, IconCheck } from "@tabler/icons-react";
import { shortcuts as defaultShortcuts, type Shortcut } from "@/lib/shortcuts";

const CHIP_OPTIONS = [
  { label: "ink",    value: "var(--ink)"    },
  { label: "violet", value: "var(--violet)" },
  { label: "coral",  value: "var(--coral)"  },
  { label: "sky",    value: "var(--sky)"    },
  { label: "teal",   value: "var(--teal)"   },
  { label: "lime",   value: "var(--lime)"   },
  { label: "gold",   value: "var(--gold)"   },
];

const STORAGE_KEY = "dash-shortcuts-v2";

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

// ── Formulario reutilizable (agregar y editar) ──────────────────────────────

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
          }}
        />
      </div>

      {/* Preview favicon */}
      {previewUrl && (
        <div className="flex items-center gap-2">
          <Image src={previewUrl} alt="favicon" width={18} height={18} unoptimized />
          <span className="text-[10px]" style={{ color: "var(--muted)", fontFamily: "var(--font-sans)" }}>
            Ícono detectado automáticamente
          </span>
        </div>
      )}

      {/* Color de acento */}
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

// ── Tile individual ─────────────────────────────────────────────────────────

function ShortcutTile({
  s,
  onEdit,
  onRemove,
}: {
  s: Shortcut;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const favicon = faviconUrl(s.url);
  const [imgOk, setImgOk] = useState(!!favicon);

  return (
    <div className="relative group/item flex flex-col items-center gap-1">
      {/* Botones hover */}
      <div className="absolute -top-1 -right-1 hidden group-hover/item:flex gap-0.5 z-10">
        <button
          type="button"
          aria-label={`Editar ${s.name}`}
          onClick={onEdit}
          className="flex items-center justify-center w-4 h-4"
          style={{
            background: "var(--sky)", border: "1.5px solid var(--ink)",
            borderRadius: "9999px",
          }}
        >
          <IconPencil size={9} stroke={2.5} color="#fff" />
        </button>
        <button
          type="button"
          aria-label={`Eliminar ${s.name}`}
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
        href={s.url}
        title={s.name}
        target="_blank"
        rel="noopener noreferrer"
        className="tile flex items-center justify-center overflow-hidden"
        style={{
          width: 60, height: 60,
          background: "var(--surface)",
          border: "2px solid var(--ink)",
          borderRadius: "var(--radius)",
          boxShadow: `3px 3px 0 0 ${s.chip}`,
        }}
      >
        {favicon && imgOk ? (
          <Image
            src={favicon}
            alt={s.name}
            width={34}
            height={34}
            onError={() => setImgOk(false)}
            unoptimized
          />
        ) : (
          <span
            className="flex items-center justify-center w-full h-full text-base font-bold"
            style={{ background: s.chip, fontFamily: "var(--font-head)" }}
          >
            <span style={{ color: ["var(--lime)","var(--gold)"].includes(s.chip) ? "var(--ink)" : "#fff" }}>
              {s.name[0]?.toUpperCase() ?? "?"}
            </span>
          </span>
        )}
      </a>

      <span
        className="text-[9px] font-bold text-center leading-tight max-w-[68px] truncate"
        style={{ fontFamily: "var(--font-head)", color: "var(--ink)" }}
      >
        {s.name}
      </span>
    </div>
  );
}

// ── Componente principal ────────────────────────────────────────────────────

export default function Shortcuts() {
  const [list, setList] = useState<Shortcut[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);

  // Carga inicial: localStorage o defaults
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setList(raw ? JSON.parse(raw) : defaultShortcuts);
    } catch {
      setList(defaultShortcuts);
    }
    setLoaded(true);
  }, []);

  // Persistir cualquier cambio
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* ignore */ }
  }, [list, loaded]);

  function add(f: FormState) {
    setList((prev) => [...prev, { name: f.name, url: f.url, chip: f.chip }]);
    setAdding(false);
  }

  function save(index: number, f: FormState) {
    setList((prev) => prev.map((s, i) => i === index ? { name: f.name, url: f.url, chip: f.chip } : s));
    setEditing(null);
  }

  function remove(index: number) {
    setList((prev) => prev.filter((_, i) => i !== index));
    if (editing === index) setEditing(null);
  }

  return (
    <section aria-label="Accesos directos" className="flex flex-col gap-3">
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: "repeat(auto-fill, 68px)",
          maxWidth: "calc(12 * 68px + 11 * 8px)", /* 904px — max 12 por fila */
        }}
      >
        {list.map((s, i) => (
          <ShortcutTile
            key={`${s.url}-${i}`}
            s={s}
            onEdit={() => setEditing(editing === i ? null : i)}
            onRemove={() => remove(i)}
          />
        ))}

        {/* Botón Agregar */}
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            aria-label="Agregar acceso directo"
            onClick={() => { setAdding((v) => !v); setEditing(null); }}
            className="tile flex items-center justify-center"
            style={{
              width: 60, height: 60,
              background: adding ? "var(--ink)" : "transparent",
              border: "2px dashed var(--ink)",
              borderRadius: "var(--radius)",
            }}
          >
            {adding
              ? <IconCheck size={20} stroke={2} color="var(--paper)" />
              : <IconPlus size={20} stroke={2} color="var(--muted)" />
            }
          </button>
          <span
            className="text-[9px] font-bold text-center"
            style={{ fontFamily: "var(--font-head)", color: "var(--muted)" }}
          >
            Agregar
          </span>
        </div>
      </div>

      {/* Panel de edición */}
      {editing !== null && list[editing] && (
        <ShortcutForm
          key={`edit-${editing}`}
          title={`Editar — ${list[editing].name}`}
          initial={{ name: list[editing].name, url: list[editing].url, chip: list[editing].chip }}
          onSave={(f) => save(editing, f)}
          onCancel={() => setEditing(null)}
        />
      )}

      {/* Panel de agregar */}
      {adding && (
        <ShortcutForm
          key="add"
          title="Nuevo acceso"
          initial={{ name: "", url: "", chip: "var(--sky)" }}
          onSave={add}
          onCancel={() => setAdding(false)}
        />
      )}
    </section>
  );
}
