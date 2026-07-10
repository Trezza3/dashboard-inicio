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

// Semilla inicial (se copia a localStorage la primera vez). Editable desde la UI.
export const DEFAULT_PROJECTS: Project[] = [
  {
    id: "seed-dashboard",
    name: "Dashboard",
    status: "live",
    accent: "var(--lime)",
    description: "Inicio diario y centro operativo.",
    monitorUrl: "https://dashboard-inicio.vercel.app",
    links: [
      { id: "seed-dashboard-web", label: "Web", url: "https://dashboard-inicio.vercel.app" },
      { id: "seed-dashboard-vercel", label: "Vercel", url: "https://vercel.com/valentin-s-projects37/dashboard-inicio" },
    ],
  },
  {
    id: "seed-kayasclub",
    name: "Kayasclub",
    status: "live",
    accent: "var(--sky)",
    description: "Catálogo, checkout y operación comercial.",
    monitorUrl: "https://kayasclub-web.vercel.app",
    links: [{ id: "seed-kayasclub-web", label: "Web", url: "https://kayasclub-web.vercel.app" }],
  },
  {
    id: "seed-kalma",
    name: "Kalma",
    status: "building",
    accent: "var(--teal)",
    description: "Agenda, turnos y configuración operativa.",
    links: [],
  },
  {
    id: "seed-javier",
    name: "Javier",
    status: "building",
    accent: "var(--violet)",
    description: "Web, contenidos y QA visual.",
    links: [],
  },
];
