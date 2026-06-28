import {
  IconBrandGithub,
  IconTriangle,
  IconSparkles,
  IconTerminal2,
  IconBottle,
  IconCalendarHeart,
  IconBrandSteam,
  IconBrandYoutube,
  IconPlus,
  type IconProps,
} from "@tabler/icons-react";
import type { ComponentType } from "react";
import { shortcuts } from "@/lib/shortcuts";

const icons: Record<string, ComponentType<IconProps>> = {
  "brand-github": IconBrandGithub,
  triangle: IconTriangle,
  sparkles: IconSparkles,
  "terminal-2": IconTerminal2,
  bottle: IconBottle,
  "calendar-heart": IconCalendarHeart,
  "brand-steam": IconBrandSteam,
  "brand-youtube": IconBrandYoutube,
};

// chips claros → ícono en tinta; el resto → ícono blanco
const lightChips = ["var(--lime)", "var(--gold)"];

export default function Shortcuts() {
  return (
    <section
      aria-label="Accesos directos"
      className="grid grid-cols-2 gap-[14px] sm:grid-cols-2 md:grid-cols-3"
    >
      {shortcuts.map((s) => {
        const Icon = icons[s.icon] ?? IconSparkles;
        const iconColor = lightChips.includes(s.chip) ? "var(--ink)" : "#fff";
        return (
          <a
            key={s.name}
            href={s.url}
            className="tile group flex flex-col items-center justify-center gap-2 py-5"
            style={{
              background: "var(--surface)",
              border: "2px solid var(--ink)",
              borderRadius: "var(--radius)",
              boxShadow: "var(--sh-sm)",
            }}
          >
            <span
              className="flex h-9 w-9 items-center justify-center"
              style={{
                background: s.chip,
                border: "2px solid var(--ink)",
                borderRadius: "var(--radius)",
                boxShadow: "2px 2px 0 0 var(--ink)",
              }}
            >
              <Icon size={20} stroke={2} color={iconColor} />
            </span>
            <span
              className="text-xs font-bold"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              {s.name}
            </span>
          </a>
        );
      })}

      <button
        type="button"
        aria-label="Agregar acceso directo"
        className="flex flex-col items-center justify-center gap-2 py-5"
        style={{
          background: "transparent",
          border: "2px dashed var(--ink)",
          borderRadius: "var(--radius)",
          color: "var(--muted)",
        }}
      >
        <span
          className="flex h-9 w-9 items-center justify-center"
          style={{
            border: "2px dashed var(--ink)",
            borderRadius: "var(--radius)",
          }}
        >
          <IconPlus size={20} stroke={2} color="var(--muted)" />
        </span>
        <span className="text-xs font-bold" style={{ fontFamily: "var(--font-sans)" }}>
          Agregar
        </span>
      </button>
    </section>
  );
}
