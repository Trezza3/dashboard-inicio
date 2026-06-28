export type Shortcut = { name: string; url: string; icon: string; chip: string };

export const shortcuts: Shortcut[] = [
  { name: "GitHub",    url: "https://github.com",               icon: "brand-github",   chip: "var(--ink)"    },
  { name: "Vercel",    url: "https://vercel.com/dashboard",     icon: "triangle",       chip: "var(--gold)"   },
  { name: "Claude",    url: "https://claude.ai",                icon: "sparkles",       chip: "var(--coral)"  },
  { name: "localhost", url: "http://localhost:3000",            icon: "terminal-2",     chip: "var(--lime)"   },
  { name: "Kayasclub", url: "https://kayasclub-web.vercel.app", icon: "bottle",         chip: "var(--sky)"    },
  { name: "Kalma",     url: "#",                                icon: "calendar-heart", chip: "var(--teal)"   },
  { name: "Steam",     url: "https://store.steampowered.com",   icon: "brand-steam",    chip: "var(--violet)" },
  { name: "YouTube",   url: "https://youtube.com",              icon: "brand-youtube",  chip: "var(--coral)"  },
];
