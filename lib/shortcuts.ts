export type Shortcut = { name: string; url: string; chip: string };

export const shortcuts: Shortcut[] = [
  { name: "GitHub",    url: "https://github.com",                chip: "var(--ink)"    },
  { name: "Vercel",    url: "https://vercel.com/dashboard",      chip: "var(--gold)"   },
  { name: "Claude",    url: "https://claude.ai",                 chip: "var(--coral)"  },
  { name: "localhost", url: "http://localhost:3000",             chip: "var(--lime)"   },
  { name: "Kayasclub", url: "https://kayasclub-web.vercel.app",  chip: "var(--sky)"    },
  { name: "Kalma",     url: "#",                                 chip: "var(--teal)"   },
  { name: "Steam",     url: "https://store.steampowered.com",    chip: "var(--violet)" },
  { name: "YouTube",   url: "https://youtube.com",               chip: "var(--coral)"  },
];
