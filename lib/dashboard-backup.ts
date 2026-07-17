export const DASHBOARD_BACKUP_APP = "dashboard-inicio";
export const DASHBOARD_BACKUP_VERSION = 1;
export const DASHBOARD_BACKUP_MAX_BYTES = 2_000_000;

const PERSONAL_KEY_PREFIX = "dash-";
const EXCLUDED_KEYS = new Set(["dash-news-cache-v1"]);

export type DashboardBackup = {
  app: typeof DASHBOARD_BACKUP_APP;
  version: typeof DASHBOARD_BACKUP_VERSION;
  exportedAt: string;
  data: Record<string, string>;
};

function isPersonalKey(key: string): boolean {
  return key.startsWith(PERSONAL_KEY_PREFIX) && !EXCLUDED_KEYS.has(key);
}

export function createDashboardBackup(storage: Storage): DashboardBackup {
  const data: Record<string, string> = {};

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key || !isPersonalKey(key)) continue;
    const value = storage.getItem(key);
    if (value !== null) data[key] = value;
  }

  return {
    app: DASHBOARD_BACKUP_APP,
    version: DASHBOARD_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function parseDashboardBackup(text: string): DashboardBackup {
  if (new TextEncoder().encode(text).byteLength > DASHBOARD_BACKUP_MAX_BYTES) {
    throw new Error("backup-too-large");
  }

  const parsed = JSON.parse(text) as Partial<DashboardBackup>;
  if (
    !parsed ||
    parsed.app !== DASHBOARD_BACKUP_APP ||
    parsed.version !== DASHBOARD_BACKUP_VERSION ||
    typeof parsed.exportedAt !== "string" ||
    !parsed.data ||
    typeof parsed.data !== "object" ||
    Array.isArray(parsed.data)
  ) {
    throw new Error("invalid-backup");
  }

  const entries = Object.entries(parsed.data);
  if (
    entries.length > 100 ||
    entries.some(([key, value]) => !isPersonalKey(key) || typeof value !== "string")
  ) {
    throw new Error("invalid-backup-data");
  }

  return parsed as DashboardBackup;
}

export function restoreDashboardBackup(storage: Storage, backup: DashboardBackup): number {
  const entries = Object.entries(backup.data);
  const previous = new Map(entries.map(([key]) => [key, storage.getItem(key)]));

  try {
    for (const [key, value] of entries) storage.setItem(key, value);
  } catch (error) {
    for (const [key, value] of previous) {
      if (value === null) storage.removeItem(key);
      else storage.setItem(key, value);
    }
    throw error;
  }

  return entries.length;
}
