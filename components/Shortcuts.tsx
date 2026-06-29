"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { IconPlus, IconX } from "@tabler/icons-react";
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

const STORAGE_KEY = "dash-shortcuts";

function faviconUrl(url: string): string | null {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  } catch {
    return null;
  }
}

// Fallback: initial letter when favicon isn't available (localhost, #, etc.)
function Fallback({ name, chip }: { name: string; chip: string }) {
  const isLight = chip === "var(--lime)" || chip === "var(--gold)";
  return (
    <span
      className="flex items-center justify-center text-base font-bold w-full h-full"
      style={{ color: isLight ? "var(--ink)" : "#fff", fontFamily: "var(--font-head)" }}
    >
      {name[0]?.toUpperCase() ?? "?"}
    </span>
  );
}

function ShortcutTile({
  s,
  onRemove,
}: {
  s: Shortcut;
  onRemove?: () => void;
}) {
  const favicon = faviconUrl(s.url);
  const [imgOk, setImgOk] = useState(!!favicon);

  return (
    <div className="relative group/item flex flex-col items-center gap-1">
      <a
        href={s.url}
        title={s.name}
        className="tile flex items-center justify-center overflow-hidden"
        style={{
          width: 48,
          height: 48,
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
            width={28}
            height={28}
            onError={() => setImgOk(false)}
            unoptimized
          />
        ) : (
          <span
            className="flex items-center justify-center w-full h-full text-base font-bold"
            style={{ background: s.chip, fontFamily: "var(--font-head)" }}
          >
            <Fallback name={s.name} chip={s.chip} />
          </span>
        )}
      </a>

      <span
        className="text-[9px] font-bold text-center leading-tight max-w-[56px] truncate"
        style={{ fontFamily: "var(--font-head)", color: "var(--ink)" }}
      >
        {s.name}
      </span>

      {onRemove && (
        <button
          type="button"
          aria-label={`Eliminar ${s.name}`}
          onClick={onRemove}
          className="absolute -top-1 -right-1 hidden group-hover/item:flex items-center justify-center w-4 h-4"
          style={{
            background: "var(--coral)",
            border: "1.5px solid var(--ink)",
            borderRadius: "9999px",
            color: "#fff",
            fontSize: 10,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

export default function Shortcuts() {
  const [custom, setCustom] = useState<Shortcut[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", url: "", chip: "var(--sky)" });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCustom(JSON.parse(raw));
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(custom)); } catch { /* ignore */ }
  }, [custom, loaded]);

  function save() {
    const name = form.name.trim();
    let url = form.url.trim();
    if (!name || !url) return;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    setCustom((prev) => [...prev, { name, url, chip: form.chip }]);
    setForm({ name: "", url: "", chip: "var(--sky)" });
    setAdding(false);
  }

  const all = [...defaultShortcuts, ...custom];

  return (
    <section aria-label="Accesos directos" className="flex flex-col gap-3">
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(56px, 1fr))" }}
      >
        {all.map((s, i) => (
          <ShortcutTile
            key={`${s.url}-${i}`}
            s={s}
            onRemove={
              i >= defaultShortcuts.length
                ? () => setCustom((prev) => prev.filter((_, j) => j !== i - defaultShortcuts.length))
                : undefined
            }
          />
        ))}

        {/* Botón Agregar */}
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            aria-label="Agregar acceso directo"
            onClick={() => setAdding((v) => !v)}
            className="tile flex items-center justify-center"
            style={{
              width: 48,
              height: 48,
              background: "transparent",
              border: "2px dashed var(--ink)",
              borderRadius: "var(--radius)",
            }}
          >
            <IconPlus size={20} stroke={2} color="var(--muted)" />
          </button>
          <span
            className="text-[9px] font-bold text-center"
            style={{ fontFamily: "var(--font-head)", color: "var(--muted)" }}
          >
            Agregar
          </span>
        </div>
      </div>

      {/* Form inline */}
      {adding && (
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
              Nuevo acceso
            </span>
            <button type="button" onClick={() => setAdding(false)} aria-label="Cancelar">
              <IconX size={14} stroke={2} color="var(--muted)" />
            </button>
          </div>

          <div className="flex gap-2">
            <input
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
              onKeyDown={(e) => { if (e.key === "Enter") save(); }}
              className="flex-[2] px-2 py-1.5 text-xs outline-none"
              style={{
                border: "2px solid var(--ink)",
                borderRadius: "var(--radius)",
                fontFamily: "var(--font-sans)",
                background: "var(--surface)",
              }}
            />
          </div>

          {/* Preview del favicon si hay URL */}
          {form.url && faviconUrl(form.url.includes("://") ? form.url : "https://" + form.url) && (
            <div className="flex items-center gap-2">
              <Image
                src={faviconUrl(form.url.includes("://") ? form.url : "https://" + form.url)!}
                alt="favicon preview"
                width={20}
                height={20}
                unoptimized
              />
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
                    width: 18,
                    height: 18,
                    background: c.value,
                    border: form.chip === c.value ? "2.5px solid var(--ink)" : "1.5px solid var(--ink)",
                    borderRadius: "var(--radius)",
                    boxShadow: form.chip === c.value ? "2px 2px 0 0 var(--ink)" : "none",
                  }}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={save}
            className="tile self-start px-4 py-1.5 text-xs font-bold"
            style={{
              background: "var(--ink)",
              color: "var(--paper)",
              border: "2px solid var(--ink)",
              borderRadius: "var(--radius)",
              boxShadow: "var(--sh-sm)",
              fontFamily: "var(--font-head)",
            }}
          >
            Guardar
          </button>
        </div>
      )}
    </section>
  );
}
