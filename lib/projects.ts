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

export const ACCENT_OPTIONS = [
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
