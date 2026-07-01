import { IconExternalLink } from "@tabler/icons-react";
import { projects } from "@/lib/projects";

const STATUS_LABEL = {
  online: "OK",
  review: "Revisar",
  pending: "Pendiente",
};

const STATUS_BG = {
  online: "var(--lime)",
  review: "var(--gold)",
  pending: "var(--coral)",
};

export default function Projects() {
  return (
    <section
      aria-label="Proyectos a cargo"
      className="p-3"
      style={{
        background: "var(--surface)",
        border: "2px solid var(--ink)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--sh-sm)",
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p
          className="text-[10px] uppercase"
          style={{ fontFamily: "var(--font-head)", letterSpacing: "0.04em" }}
        >
          Proyectos
        </p>
        <span
          className="text-[9px] px-1.5 py-0.5 tabular-nums"
          style={{
            fontFamily: "var(--font-head)",
            background: "var(--ink)",
            color: "var(--paper)",
            border: "1.5px solid var(--ink)",
            borderRadius: "var(--radius)",
          }}
        >
          {projects.length}
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {projects.map((project) => (
          <li
            key={project.name}
            className="p-2"
            style={{
              border: "1.5px solid var(--ink)",
              borderRadius: "var(--radius)",
              boxShadow: `2px 2px 0 0 ${project.accent}`,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p
                  className="truncate text-xs uppercase"
                  style={{ fontFamily: "var(--font-head)" }}
                >
                  {project.name}
                </p>
                <p className="mt-1 text-[10px] leading-tight" style={{ color: "var(--muted)" }}>
                  {project.description}
                </p>
              </div>
              <span
                className="shrink-0 px-1.5 py-0.5 text-[8px] uppercase"
                style={{
                  fontFamily: "var(--font-head)",
                  background: STATUS_BG[project.status],
                  border: "1.5px solid var(--ink)",
                  borderRadius: "var(--radius)",
                  color: project.status === "pending" ? "#fff" : "#14130F",
                }}
              >
                {STATUS_LABEL[project.status]}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {project.production && (
                <a
                  href={project.production}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="badge inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] uppercase"
                  style={{
                    fontFamily: "var(--font-head)",
                    border: "1.5px solid var(--ink)",
                    borderRadius: "var(--radius)",
                  }}
                >
                  Web
                  <IconExternalLink size={10} stroke={2.5} />
                </a>
              )}
              {project.vercel && (
                <a
                  href={project.vercel}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="badge inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] uppercase"
                  style={{
                    fontFamily: "var(--font-head)",
                    border: "1.5px solid var(--ink)",
                    borderRadius: "var(--radius)",
                  }}
                >
                  Vercel
                  <IconExternalLink size={10} stroke={2.5} />
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
