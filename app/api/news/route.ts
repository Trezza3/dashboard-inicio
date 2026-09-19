import { NextResponse } from "next/server";
import Parser from "rss-parser";
import { DEFAULT_FEEDS } from "@/lib/feeds";
import { type FeedInput, cleanText, dedupe, sanitizeFeeds, validUrl } from "@/lib/news";
import { fetchPublicHttp, readTextWithLimit } from "@/lib/server/public-http";
import { createRateLimiter, guardRequest } from "@/lib/server/request-guard";

export const dynamic = "force-dynamic";

export type NewsItem = {
  title: string;
  source: string;
  category: string;
  link: string;
  date: string;
  image?: string;
};

export type NewsFeedError = {
  source: string;
  category: string;
};

export type NewsResponse = {
  items: NewsItem[];
  fetchedAt: string;
  failedFeeds: NewsFeedError[];
};

type FeedItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
  enclosure?: { url?: string; type?: string };
  mediaContent?: unknown;
  mediaThumbnail?: unknown;
  contentEncoded?: string;
  content?: string;
};

const parser = new Parser<unknown, FeedItem>({
  timeout: 8000,
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
      ["content:encoded", "contentEncoded"],
    ],
  },
});

function normalizedDate(item: FeedItem): string {
  const candidate = item.isoDate ?? item.pubDate;
  const time = candidate ? new Date(candidate).getTime() : NaN;
  return Number.isFinite(time) ? new Date(time).toISOString() : new Date().toISOString();
}

function mediaUrl(node: unknown): string | undefined {
  if (!node || typeof node !== "object") return undefined;
  const url = (node as { $?: { url?: string; medium?: string; type?: string } }).$;
  if (url?.url && (!url.medium || url.medium === "image") && (!url.type || url.type.startsWith("image"))) {
    return validUrl(url.url);
  }
  return undefined;
}

function extractImage(item: FeedItem): string | undefined {
  const enc = item.enclosure;
  const enclosureUrl = validUrl(enc?.url);
  if (enclosureUrl && (!enc?.type || enc.type.startsWith("image"))) return enclosureUrl;

  const mc = item.mediaContent;
  if (Array.isArray(mc)) {
    for (const m of mc) {
      const u = mediaUrl(m);
      if (u) return u;
    }
  } else {
    const u = mediaUrl(mc);
    if (u) return u;
  }

  const thumbs = item.mediaThumbnail;
  if (Array.isArray(thumbs)) {
    for (const thumb of thumbs) {
      const u = mediaUrl(thumb);
      if (u) return u;
    }
  } else {
    const thumb = mediaUrl(thumbs);
    if (thumb) return thumb;
  }

  const html = item.contentEncoded || item.content || "";
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  if (m) return validUrl(m[1]);

  return undefined;
}

async function parseFeed(feed: FeedInput): Promise<NewsItem[]> {
  // fetch con revalidate: el XML de cada fuente queda en la cache de datos
  // de Next 15 min — las cargas siguientes no vuelven a pegarle al sitio.
  const response = await fetchPublicHttp(feed.url, {
    next: { revalidate: 900 },
    headers: { "User-Agent": "Mozilla/5.0 (compatible; DashboardNews/1.0)" },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`feed-http-${response.status}`);
  const xml = await readTextWithLimit(response);
  const parsed = await parser.parseString(xml);
  const items: NewsItem[] = [];

  for (const item of parsed.items ?? []) {
    const link = validUrl(item.link);
    if (!link) continue;

    items.push({
      title: cleanText(item.title) || "(sin título)",
      source: feed.name,
      category: feed.category,
      link,
      date: normalizedDate(item),
      image: extractImage(item),
    });

    if (items.length >= 12) break;
  }

  return items;
}

async function buildResponse(feedList: FeedInput[]) {
  const results = await Promise.allSettled(feedList.map(parseFeed));

  const failedFeeds = results
    .map((result, index) => ({ result, feed: feedList[index] }))
    .filter(({ result }) => result.status === "rejected")
    .map(({ feed }) => ({ source: feed.name, category: feed.category }));

  const items: NewsItem[] = dedupe(results
    .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === "fulfilled")
    .flatMap((r) => r.value)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
    .slice(0, 80);

  return NextResponse.json<NewsResponse>(
    { items, fetchedAt: new Date().toISOString(), failedFeeds },
    { headers: { "Cache-Control": "no-store" } },
  );
}

// Cada carga de noticias dispara hasta 20 feeds: margen para varias pestañas
// y recargas manuales, no para usar la API como proxy.
const limiter = createRateLimiter({ limit: 20, windowMs: 60_000 });
const EMPTY = { items: [], fetchedAt: "", failedFeeds: [] };

// Noticias con las fuentes del usuario.
export async function POST(request: Request) {
  const blocked = guardRequest(request, limiter, EMPTY);
  if (blocked) return blocked;
  try {
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return NextResponse.json({ items: [], fetchedAt: new Date().toISOString(), failedFeeds: [] }, { status: 415 });
    }
    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > 64_000) {
      return NextResponse.json({ items: [], fetchedAt: new Date().toISOString(), failedFeeds: [] }, { status: 413 });
    }
    const body = (await request.json()) as { feeds?: unknown };
    const feedList = sanitizeFeeds(body.feeds);
    if (!feedList.length) return buildResponse(DEFAULT_FEEDS);
    return await buildResponse(feedList);
  } catch {
    return NextResponse.json({ items: [], fetchedAt: new Date().toISOString(), failedFeeds: [] }, { status: 400 });
  }
}

// Fallback con las fuentes por defecto.
export async function GET(request: Request) {
  const blocked = guardRequest(request, limiter, EMPTY);
  if (blocked) return blocked;
  return buildResponse(DEFAULT_FEEDS);
}
