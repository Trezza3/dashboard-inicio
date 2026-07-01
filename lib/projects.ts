export type Project = {
  name: string;
  status: "online" | "review" | "pending";
  accent: string;
  description: string;
  production?: string;
  vercel?: string;
  github?: string;
  admin?: string;
};

export const projects: Project[] = [
  {
    name: "Dashboard",
    status: "online",
    accent: "var(--lime)",
    description: "Inicio diario y centro operativo.",
    production: "https://dashboard-inicio.vercel.app",
    vercel: "https://vercel.com/valentin-s-projects37/dashboard-inicio",
  },
  {
    name: "Kayasclub",
    status: "online",
    accent: "var(--sky)",
    description: "Catálogo, checkout y operación comercial.",
    production: "https://kayasclub-web.vercel.app",
  },
  {
    name: "Kalma",
    status: "review",
    accent: "var(--teal)",
    description: "Agenda, turnos y configuración operativa.",
  },
  {
    name: "Javier",
    status: "review",
    accent: "var(--violet)",
    description: "Web, contenidos y QA visual.",
  },
];
