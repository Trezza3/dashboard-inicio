"use client";

import { useEffect, useState } from "react";
import { IconSettings, IconX } from "@tabler/icons-react";

const COLOR_OPTIONS = ["#FFE769", "#A7F3D0", "#F9A8D4", "#BFDBFE", "#FDE68A", "#FDBA74"];
const POSTIT_SETTINGS = [
  { key: "dash-notes", label: "Post-it", fallbackColor: "#FFE769", fallbackTitle: "Post-it" },
  { key: "dash-notes-left-v1", label: "Ideas", fallbackColor: "#A7F3D0", fallbackTitle: "Ideas" },
] as const;

export default function DashboardSettings() {
  const [open, setOpen] = useState(false);
  const [colors, setColors] = useState<Record<string, string>>({});
  const [titles, setTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    const t = window.setTimeout(() => {
      setColors(Object.fromEntries(
        POSTIT_SETTINGS.map((item) => [`${item.key}-color`, localStorage.getItem(`${item.key}-color`) ?? item.fallbackColor]),
      ));
      setTitles(Object.fromEntries(
        POSTIT_SETTINGS.map((item) => [`${item.key}-title`, localStorage.getItem(`${item.key}-title`) ?? item.fallbackTitle]),
      ));
    }, 0);

    return () => window.clearTimeout(t);
  }, []);

  function setColor(key: string, value: string) {
    setColors((prev) => ({ ...prev, [key]: value }));
    try {
      localStorage.setItem(key, value);
      window.dispatchEvent(new CustomEvent("dashboard-settings-updated"));
    } catch {
      /* ignore */
    }
  }

  function setTitle(key: string, value: string, fallback: string) {
    setTitles((prev) => ({ ...prev, [key]: value }));
    try {
      localStorage.setItem(key, value.trim() || fallback);
      window.dispatchEvent(new CustomEvent("dashboard-settings-updated"));
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Abrir configuracion del dashboard"
        aria-expanded={open}
        className="tile flex items-center justify-center"
        style={{
          width: 42,
          height: 42,
          background: "var(--surface)",
          border: "2px solid var(--ink)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--sh-sm)",
        }}
      >
        <IconSettings size={18} stroke={2.3} color="var(--ink)" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-40 mt-2 w-[260px] p-3"
          style={{
            background: "var(--surface)",
            border: "2px solid var(--ink)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--sh-md)",
          }}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase" style={{ fontFamily: "var(--font-head)", letterSpacing: "0.04em" }}>
                Configuracion
              </p>
              <p className="text-[9px]" style={{ color: "var(--muted)" }}>
                Dashboard
              </p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar configuracion">
              <IconX size={15} stroke={2.4} color="var(--muted)" />
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {POSTIT_SETTINGS.map((item) => (
              <div key={item.key}>
                <p className="mb-1.5 text-[9px] uppercase" style={{ fontFamily: "var(--font-head)", color: "var(--muted)" }}>
                  {item.label}
                </p>
                <input
                  value={titles[`${item.key}-title`] ?? item.fallbackTitle}
                  onChange={(event) => setTitle(`${item.key}-title`, event.target.value, item.fallbackTitle)}
                  aria-label={`Titulo de ${item.label}`}
                  className="mb-2 w-full px-2 py-1.5 text-xs outline-none"
                  style={{
                    background: "var(--surface)",
                    border: "1.5px solid var(--ink)",
                    borderRadius: "var(--radius)",
                    color: "var(--ink)",
                    fontFamily: "var(--font-sans)",
                  }}
                />
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_OPTIONS.map((option) => (
                    <button
                      key={`${item.key}-color-${option}`}
                      type="button"
                      aria-label={`${item.label} color ${option}`}
                      onClick={() => setColor(`${item.key}-color`, option)}
                      className="h-6 w-6"
                      style={{
                        background: option,
                        border: (colors[`${item.key}-color`] ?? item.fallbackColor) === option
                          ? "2.5px solid var(--ink)"
                          : "1.5px solid var(--ink)",
                        borderRadius: "var(--radius)",
                        boxShadow: (colors[`${item.key}-color`] ?? item.fallbackColor) === option
                          ? "2px 2px 0 0 var(--ink)"
                          : "none",
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
