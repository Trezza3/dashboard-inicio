"use client";

import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { IconDownload, IconSettings, IconUpload, IconX } from "@tabler/icons-react";
import {
  DASHBOARD_BACKUP_MAX_BYTES,
  createDashboardBackup,
  parseDashboardBackup,
  restoreDashboardBackup,
} from "@/lib/dashboard-backup";

const COLOR_OPTIONS = [
  "#FBF1C7", // crema
  "#FDBA74", // naranja
  "#FCA5A5", // salmon
  "#F9A8D4", // rosa
  "#F0ABFC", // fucsia
  "#E9D5FF", // lila claro
  "#C4B5FD", // lavanda
  "#BFDBFE", // celeste
  "#7DD3FC", // cielo
  "#A5F3FC", // cyan
  "#A7F3D0", // menta
  "#BEF264", // lima
  "#FCE7C8", // crema
  "#E5E7EB", // gris claro
];
const POSTIT_SETTINGS = [
  { key: "dash-notes", label: "Post-it", fallbackColor: "#FBF1C7", fallbackTitle: "Post-it" },
  { key: "dash-notes-left-v1", label: "Ideas", fallbackColor: "#A7F3D0", fallbackTitle: "Ideas" },
] as const;

export default function DashboardSettings() {
  const [open, setOpen] = useState(false);
  const [colors, setColors] = useState<Record<string, string>>({});
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [backupStatus, setBackupStatus] = useState("");
  const backupInputRef = useRef<HTMLInputElement>(null);

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

  function exportBackup() {
    try {
      const backup = createDashboardBackup(localStorage);
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const date = backup.exportedAt.slice(0, 10);
      anchor.href = url;
      anchor.download = `dashboard-respaldo-${date}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setBackupStatus(`Respaldo creado · ${Object.keys(backup.data).length} datos`);
    } catch {
      setBackupStatus("No pude crear el respaldo.");
    }
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > DASHBOARD_BACKUP_MAX_BYTES) {
      setBackupStatus("El archivo es demasiado grande.");
      return;
    }

    try {
      const backup = parseDashboardBackup(await file.text());
      const count = Object.keys(backup.data).length;
      if (!window.confirm(`Se restaurarán ${count} datos del dashboard. ¿Continuar?`)) return;
      restoreDashboardBackup(localStorage, backup);
      setBackupStatus(`Listo · ${count} datos restaurados`);
      window.setTimeout(() => window.location.reload(), 700);
    } catch {
      setBackupStatus("El archivo no es un respaldo válido.");
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
          className="fixed left-4 right-4 top-4 z-40 max-h-[calc(100vh-32px)] w-auto overflow-y-auto p-3 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-[min(620px,calc(100vh-90px))] sm:w-[300px]"
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

            <div className="pt-3" style={{ borderTop: "1.5px solid var(--ink)" }}>
              <p className="mb-1 text-[9px] uppercase" style={{ fontFamily: "var(--font-head)", color: "var(--muted)" }}>
                Respaldo
              </p>
              <p className="mb-2 text-[10px] leading-snug" style={{ color: "var(--muted)" }}>
                Guarda notas, agenda, accesos, proyectos y preferencias en un archivo.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={exportBackup}
                  className="tile inline-flex flex-1 items-center justify-center gap-1.5 px-2 py-2 text-[9px] uppercase"
                  style={{
                    fontFamily: "var(--font-head)",
                    border: "1.5px solid var(--ink)",
                    borderRadius: "var(--radius)",
                    background: "var(--lime)",
                    color: "#14130F",
                    boxShadow: "var(--sh-sm)",
                  }}
                >
                  <IconDownload size={13} stroke={2.5} />
                  Descargar
                </button>
                <button
                  type="button"
                  onClick={() => backupInputRef.current?.click()}
                  className="tile inline-flex flex-1 items-center justify-center gap-1.5 px-2 py-2 text-[9px] uppercase"
                  style={{
                    fontFamily: "var(--font-head)",
                    border: "1.5px solid var(--ink)",
                    borderRadius: "var(--radius)",
                    background: "var(--surface)",
                    color: "var(--ink)",
                    boxShadow: "var(--sh-sm)",
                  }}
                >
                  <IconUpload size={13} stroke={2.5} />
                  Restaurar
                </button>
                <input
                  ref={backupInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={importBackup}
                  className="sr-only"
                  aria-label="Elegir respaldo del dashboard"
                />
              </div>
              {backupStatus && (
                <p role="status" className="mt-2 text-[9px]" style={{ color: "var(--muted)" }}>
                  {backupStatus}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
