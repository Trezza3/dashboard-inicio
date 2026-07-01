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
  { name: "localhost", url: "http://localhost:3000",             chip: "var(--lime)",   category: "Trabajo" },
  { name: "Kayasclub", url: "https://kayasclub-web.vercel.app",  chip: "var(--sky)",    category: "Proyectos", favorite: true },
  { name: "Kalma",     url: "#",                                 chip: "var(--teal)",   category: "Proyectos", favorite: true },
  { name: "Steam",     url: "https://store.steampowered.com",    chip: "var(--violet)", category: "Ocio" },
  { name: "YouTube",   url: "https://youtube.com",               chip: "var(--coral)",  category: "Ocio" },
];
