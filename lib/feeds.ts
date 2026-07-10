export type Feed = { id: string; category: string; name: string; url: string };

// Semilla inicial (se copia a localStorage la primera vez). Editable desde la UI.
export const DEFAULT_FEEDS: Feed[] = [
  { id: "seed-xataka", category: "Tech", name: "Xataka", url: "https://www.xataka.com/tag/feeds/rss2.xml" },
  { id: "seed-genbeta", category: "Tech", name: "Genbeta", url: "https://www.genbeta.com/tag/feeds/rss2.xml" },
  { id: "seed-hipertextual", category: "Tech", name: "Hipertextual", url: "https://hipertextual.com/feed" },
  { id: "seed-hn", category: "IA", name: "Hacker News", url: "https://hnrss.org/frontpage" },
  { id: "seed-vandal", category: "Gaming", name: "Vandal", url: "https://vandal.elespanol.com/xml.cfm" },
  { id: "seed-3djuegos", category: "Gaming", name: "3DJuegos", url: "https://www.3djuegos.com/rss/noticias.xml" },
  { id: "seed-infobae", category: "ARG", name: "Infobae", url: "https://www.infobae.com/feeds/rss/" },
  { id: "seed-pagina12", category: "ARG", name: "Página/12", url: "https://www.pagina12.com.ar/rss/portada" },
];

// Catálogo curado para activar con un click (URLs verificadas).
export const FEED_CATALOG: Omit<Feed, "id">[] = [
  { category: "Deportes", name: "Marca", url: "https://e00-marca.uecdn.es/rss/portada.xml" },
  { category: "Deportes", name: "AS", url: "https://as.com/rss/tikitakas/portada.xml" },
  { category: "Deportes", name: "ESPN", url: "https://www.espn.com.ar/espn/rss/news" },
  { category: "Economía", name: "Ámbito", url: "https://www.ambito.com/rss/pages/home.xml" },
  { category: "Internacional", name: "BBC Mundo", url: "https://feeds.bbci.co.uk/mundo/rss.xml" },
  { category: "Ciencia", name: "Muy Interesante", url: "https://www.muyinteresante.com/feed" },
  { category: "Ciencia", name: "NASA", url: "https://www.nasa.gov/feed/" },
  { category: "Cine", name: "Sensacine", url: "https://www.sensacine.com/rss/noticias.xml" },
  { category: "Música", name: "Indie Hoy", url: "https://indiehoy.com/feed/" },
  { category: "Música", name: "Rolling Stone", url: "https://es.rollingstone.com/feed/" },
  { category: "Tech", name: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
  { category: "Tech", name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index" },
];
