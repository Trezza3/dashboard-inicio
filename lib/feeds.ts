export type Feed = { id: string; category: string; name: string; url: string };

// Semilla inicial (se copia a localStorage la primera vez). Editable desde la UI.
export const DEFAULT_FEEDS: Feed[] = [
  { id: "seed-xataka", category: "Tech", name: "Xataka", url: "https://www.xataka.com/index.xml" },
  { id: "seed-hipertextual", category: "Tech", name: "Hipertextual", url: "https://hipertextual.com/feed" },
  { id: "seed-verge", category: "Tech", name: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
  { id: "seed-hn", category: "IA", name: "Hacker News", url: "https://hnrss.org/frontpage" },
  { id: "seed-3djuegos", category: "Gaming", name: "3DJuegos", url: "https://www.3djuegos.com/index.xml" },
  { id: "seed-ign", category: "Gaming", name: "IGN España", url: "https://es.ign.com/feed.xml" },
  { id: "seed-infobae", category: "ARG", name: "Infobae Argentina", url: "https://www.infobae.com/arc/outboundfeeds/rss/tags_slug/argentina/" },
  { id: "seed-clarin", category: "ARG", name: "Clarín", url: "https://www.clarin.com/rss/lo-ultimo/" },
];

// Catálogo curado para activar con un click (URLs verificadas).
export const FEED_CATALOG: Omit<Feed, "id">[] = [
  { category: "ARG", name: "Clarín", url: "https://www.clarin.com/rss/lo-ultimo/" },
  { category: "ARG", name: "TN", url: "https://tn.com.ar/rss.xml" },
  { category: "ARG", name: "La Nación", url: "https://www.lanacion.com.ar/arc/outboundfeeds/rss/?outputType=xml" },
  { category: "ARG", name: "Perfil", url: "https://www.perfil.com/feed" },
  { category: "Deportes", name: "Clarín Deportes", url: "https://www.clarin.com/rss/deportes/" },
  { category: "Deportes", name: "Marca", url: "https://e00-marca.uecdn.es/rss/portada.xml" },
  { category: "Deportes", name: "AS", url: "https://as.com/rss/tikitakas/portada.xml" },
  { category: "Deportes", name: "ESPN", url: "https://www.espn.com.ar/espn/rss/news" },
  { category: "Economía", name: "Ámbito", url: "https://www.ambito.com/rss/pages/home.xml" },
  { category: "Economía", name: "El Cronista", url: "https://www.cronista.com/files/rss/news.xml" },
  { category: "Economía", name: "Bloomberg Línea", url: "https://www.bloomberglinea.com/arc/outboundfeeds/rss/?outputType=xml" },
  { category: "Cripto", name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { category: "Internacional", name: "BBC Mundo", url: "https://feeds.bbci.co.uk/mundo/rss.xml" },
  { category: "Ciencia", name: "Muy Interesante", url: "https://www.muyinteresante.com/feed" },
  { category: "Ciencia", name: "NASA", url: "https://www.nasa.gov/feed/" },
  { category: "Ciencia", name: "Science Daily", url: "https://www.sciencedaily.com/rss/all.xml" },
  { category: "Cine", name: "Sensacine", url: "https://www.sensacine.com/rss/noticias.xml" },
  { category: "Cine", name: "Fotogramas", url: "https://www.fotogramas.es/rss/all.xml/" },
  { category: "Música", name: "Indie Hoy", url: "https://indiehoy.com/feed/" },
  { category: "Música", name: "Rolling Stone", url: "https://es.rollingstone.com/feed/" },
  { category: "Gaming", name: "IGN España", url: "https://es.ign.com/feed.xml" },
  { category: "Tech", name: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
  { category: "Tech", name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index" },
  { category: "Tech", name: "TechCrunch", url: "https://techcrunch.com/feed/" },
  { category: "Tech", name: "Wired", url: "https://www.wired.com/feed/rss" },
  { category: "IA", name: "TechCrunch AI", url: "https://techcrunch.com/category/artificial-intelligence/feed/" },
  { category: "IA", name: "Hugging Face", url: "https://huggingface.co/blog/feed.xml" },
];
