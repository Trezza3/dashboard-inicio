export type Feed = { category: string; name: string; url: string };

export const feeds: Feed[] = [
  // Tech en español
  { category: "Tech",   name: "Xataka",       url: "https://www.xataka.com/tag/feeds/rss2.xml" },
  { category: "Tech",   name: "Genbeta",      url: "https://www.genbeta.com/tag/feeds/rss2.xml" },
  { category: "Tech",   name: "Hipertextual", url: "https://hipertextual.com/feed" },
  // IA en inglés
  { category: "IA",     name: "Hacker News",  url: "https://hnrss.org/frontpage" },
  // Gaming
  { category: "Gaming", name: "Vandal",       url: "https://vandal.elespanol.com/xml.cfm" },
  { category: "Gaming", name: "3DJuegos",     url: "https://www.3djuegos.com/rss/noticias.xml" },
  // Argentina
  { category: "ARG",    name: "Infobae",      url: "https://www.infobae.com/feeds/rss/" },
  { category: "ARG",    name: "Página/12",    url: "https://www.pagina12.com.ar/rss/portada" },
];

export const categories = ["Tech", "IA", "Gaming", "ARG"] as const;
export type Category = (typeof categories)[number];
