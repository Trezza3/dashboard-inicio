import { describe, expect, it } from "vitest";
import {
  DASHBOARD_BACKUP_APP,
  DASHBOARD_BACKUP_VERSION,
  createDashboardBackup,
  parseDashboardBackup,
  restoreDashboardBackup,
} from "@/lib/dashboard-backup";

// Storage mínimo en memoria (localStorage no existe en Node).
class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  failOn?: string;
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  key(index: number) {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    if (key === this.failOn) throw new Error("QuotaExceededError");
    this.map.set(key, value);
  }
}

function backupText(data: Record<string, unknown>) {
  return JSON.stringify({ app: DASHBOARD_BACKUP_APP, version: DASHBOARD_BACKUP_VERSION, exportedAt: "2026-01-01", data });
}

describe("createDashboardBackup", () => {
  it("incluye solo claves dash- y excluye los caches", () => {
    const storage = new MemoryStorage();
    storage.setItem("dash-notes", "[]");
    storage.setItem("dash-news-last-visit", "1");
    storage.setItem("dash-news-cache-v1", "{}");
    storage.setItem("dash-weather-cache-v1", "{}");
    storage.setItem("otra-app", "x");

    const backup = createDashboardBackup(storage);
    expect(Object.keys(backup.data).sort()).toEqual(["dash-news-last-visit", "dash-notes"]);
  });
});

describe("parseDashboardBackup", () => {
  it("acepta un respaldo válido", () => {
    expect(parseDashboardBackup(backupText({ "dash-notes": "[]" })).data).toEqual({ "dash-notes": "[]" });
  });

  it.each([
    ["otra app", JSON.stringify({ app: "otra", version: 1, exportedAt: "x", data: {} })],
    ["clave ajena", backupText({ token: "x" })],
    ["valor no string", backupText({ "dash-notes": [] })],
    ["data como array", JSON.stringify({ app: DASHBOARD_BACKUP_APP, version: 1, exportedAt: "x", data: [] })],
    ["JSON roto", "{"],
  ])("rechaza: %s", (_label, text) => {
    expect(() => parseDashboardBackup(text)).toThrow();
  });
});

describe("restoreDashboardBackup", () => {
  it("reemplaza solo las claves del respaldo", () => {
    const storage = new MemoryStorage();
    storage.setItem("dash-notes", "viejo");
    storage.setItem("dash-agenda-v2", "se-queda");
    restoreDashboardBackup(storage, parseDashboardBackup(backupText({ "dash-notes": "nuevo" })));
    expect(storage.getItem("dash-notes")).toBe("nuevo");
    expect(storage.getItem("dash-agenda-v2")).toBe("se-queda");
  });

  it("si falla a mitad de camino, vuelve todo atrás", () => {
    const storage = new MemoryStorage();
    storage.setItem("dash-a", "1");
    storage.failOn = "dash-b";
    const backup = parseDashboardBackup(backupText({ "dash-a": "2", "dash-b": "3" }));
    expect(() => restoreDashboardBackup(storage, backup)).toThrow();
    expect(storage.getItem("dash-a")).toBe("1");
    expect(storage.getItem("dash-b")).toBeNull();
  });
});
