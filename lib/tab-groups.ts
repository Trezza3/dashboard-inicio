import { arrayOf, asString, isHttpUrl, isRecord, newId, oneOf } from "@/lib/validate";

export type TabGroupLink = { url: string; title: string };

/** Colores que acepta chrome.tabGroups (solo los que tienen equivalente en el tema). */
export type TabGroupColor = "blue" | "green" | "red" | "yellow" | "purple" | "cyan";

/**
 * Espacio de trabajo: pestañas que se abren juntas como grupo nativo del
 * navegador, más notas propias. (Se guardaba como "grupo de pestañas": la
 * clave y el formato se mantienen, `note` y `updatedAt` son opcionales.)
 */
export type TabGroup = {
  id: string;
  name: string;
  color: TabGroupColor;
  links: TabGroupLink[];
  note?: string;
  createdAt: number;
  updatedAt?: number;
};

export const TAB_GROUPS_KEY = "dash-tab-groups-v1";
export const MAX_GROUP_LINKS = 60;

export const TAB_GROUP_COLORS: { id: TabGroupColor; css: string }[] = [
  { id: "blue", css: "var(--sky)" },
  { id: "green", css: "var(--lime)" },
  { id: "red", css: "var(--coral)" },
  { id: "yellow", css: "var(--gold)" },
  { id: "purple", css: "var(--violet)" },
  { id: "cyan", css: "var(--teal)" },
];

const COLOR_IDS = TAB_GROUP_COLORS.map((c) => c.id);

export function colorCss(color: TabGroupColor): string {
  return TAB_GROUP_COLORS.find((c) => c.id === color)?.css ?? "var(--sky)";
}

function parseLink(value: unknown): TabGroupLink | null {
  if (!isRecord(value) || !isHttpUrl(value.url)) return null;
  return { url: value.url, title: asString(value.title).slice(0, 200) || value.url };
}

function parseGroup(value: unknown): TabGroup | null {
  if (!isRecord(value)) return null;
  const name = asString(value.name).trim().slice(0, 60);
  if (!name) return null;
  const note = asString(value.note).slice(0, 4_000);
  return {
    id: asString(value.id) || newId(),
    name,
    color: oneOf(value.color, COLOR_IDS, "blue"),
    links: (arrayOf(value.links, parseLink) ?? []).slice(0, MAX_GROUP_LINKS),
    ...(note ? { note } : {}),
    createdAt: typeof value.createdAt === "number" ? value.createdAt : Date.now(),
    ...(typeof value.updatedAt === "number" ? { updatedAt: value.updatedAt } : {}),
  };
}

export function parseTabGroups(value: unknown): TabGroup[] | null {
  return arrayOf(value, parseGroup);
}
