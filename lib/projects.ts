import { arrayOf, asOptionalString, asString, isHttpUrl, isRecord, newId, oneOf } from "@/lib/validate";

export type ProjectStatus = "idea" | "building" | "live" | "paused";

export type ProjectLink = {
  id: string;
  label: string;
  url: string;
};

export type Project = {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  accent: string;
  /** URL que se pinguea para el estado en vivo (opcional). */
  monitorUrl?: string;
  links: ProjectLink[];
};

export const ACCENT_OPTIONS: readonly string[] = [
  "var(--lime)",
  "var(--sky)",
  "var(--teal)",
  "var(--violet)",
  "var(--coral)",
  "var(--gold)",
];

export const STATUS_META: Record<ProjectStatus, { label: string; bg: string; text: string }> = {
  live: { label: "En vivo", bg: "var(--lime)", text: "#14130F" },
  building: { label: "En curso", bg: "var(--gold)", text: "#14130F" },
  paused: { label: "Pausado", bg: "var(--muted)", text: "#fff" },
  idea: { label: "Idea", bg: "var(--sky)", text: "#fff" },
};

// Cada navegador empieza vacío y guarda sus propios proyectos en localStorage.
export const DEFAULT_PROJECTS: Project[] = [];

const STATUSES: readonly ProjectStatus[] = ["idea", "building", "live", "paused"];

function parseLink(value: unknown): ProjectLink | null {
  if (!isRecord(value) || !isHttpUrl(value.url)) return null;
  return { id: asString(value.id) || newId(), label: asString(value.label), url: value.url };
}

function parseProject(value: unknown): Project | null {
  if (!isRecord(value)) return null;
  const name = asString(value.name).trim();
  if (!name) return null;
  return {
    id: asString(value.id) || newId(),
    name,
    description: asOptionalString(value.description),
    status: oneOf(value.status, STATUSES, "building"),
    accent: oneOf(value.accent, ACCENT_OPTIONS, ACCENT_OPTIONS[0]),
    monitorUrl: isHttpUrl(value.monitorUrl) ? value.monitorUrl : undefined,
    links: arrayOf(value.links, parseLink) ?? [],
  };
}

export function parseProjects(value: unknown): Project[] | null {
  return arrayOf(value, parseProject);
}
