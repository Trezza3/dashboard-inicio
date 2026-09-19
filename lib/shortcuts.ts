import { arrayOf, asString, isHttpUrl, isRecord, newId } from "@/lib/validate";

export type ShortcutCategory = "Trabajo" | "Proyectos" | "IA" | "Admin" | "Ocio";

export type Shortcut = {
  name: string;
  url: string;
  chip: string;
  category?: ShortcutCategory;
  favorite?: boolean;
};

export const shortcutCategories = ["Todo", "Trabajo", "Proyectos", "IA", "Admin", "Ocio"] as const;
export type ShortcutFilter = (typeof shortcutCategories)[number];

export const shortcuts: Shortcut[] = [
  { name: "GitHub",    url: "https://github.com",                chip: "var(--ink)",    category: "Trabajo", favorite: true },
  { name: "Vercel",    url: "https://vercel.com/dashboard",      chip: "var(--gold)",   category: "Admin", favorite: true },
  { name: "Claude",    url: "https://claude.ai",                 chip: "var(--coral)",  category: "IA", favorite: true },
  { name: "Gmail",     url: "https://mail.google.com",           chip: "var(--lime)",   category: "Trabajo" },
  { name: "Drive",     url: "https://drive.google.com",          chip: "var(--sky)",    category: "Trabajo", favorite: true },
  { name: "Calendar",  url: "https://calendar.google.com",       chip: "var(--teal)",   category: "Trabajo", favorite: true },
  { name: "Steam",     url: "https://store.steampowered.com",    chip: "var(--violet)", category: "Ocio" },
  { name: "YouTube",   url: "https://youtube.com",               chip: "var(--coral)",  category: "Ocio" },
];

/* --- Items de la grilla: pueden ser un link o una carpeta con links dentro --- */
export type Link = { name: string; url: string; chip: string };
export type LinkItem = { kind: "link" } & Link;
export type FolderItem = { kind: "folder"; id: string; name: string; items: Link[] };
export type GridItem = LinkItem | FolderItem;

function parseLink(value: unknown): Link | null {
  if (!isRecord(value) || !isHttpUrl(value.url)) return null;
  return { name: asString(value.name) || value.url, url: value.url, chip: asString(value.chip, "var(--ink)") };
}

function parseGridItem(value: unknown): GridItem | null {
  if (!isRecord(value)) return null;
  if (value.kind === "folder") {
    return {
      kind: "folder",
      id: asString(value.id) || newId(),
      name: asString(value.name) || "Carpeta",
      items: arrayOf(value.items, parseLink) ?? [],
    };
  }
  const link = parseLink(value);
  return link ? { kind: "link", ...link } : null;
}

export function parseGridItems(value: unknown): GridItem[] | null {
  return arrayOf(value, parseGridItem);
}

export const SHORTCUTS_KEY = "dash-shortcuts-v3";
const LEGACY_SHORTCUTS_KEY = "dash-shortcuts-v2";

/** Accesos iniciales (mientras el usuario no guardó los suyos). */
export function seedItems(): GridItem[] {
  return shortcuts.map((s) => ({ kind: "link", name: s.name, url: s.url, chip: s.chip }));
}

/** Accesos guardados con el formato de la v2 (lista plana de links). */
export function readLegacyShortcuts(): GridItem[] | null {
  const raw = localStorage.getItem(LEGACY_SHORTCUTS_KEY);
  return raw ? parseGridItems(JSON.parse(raw)) : null;
}
