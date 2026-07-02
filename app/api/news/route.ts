import { NextResponse } from "next/server";
import Parser from "rss-parser";
import { feeds } from "@/lib/feeds";

export const revalidate = 900; // 15 min

export type NewsItem = {
  title: string;
  source: string;
  category: string;
  link: string;
  date: string;
  image?: string;
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
      ["media:thumbnail", "mediaThumbnail"],
      ["content:encoded", "contentEncoded"],
    ],
  },
});

function mediaUrl(node: unknown): string | undefined {
  if (!node || typeof node !== "object") return undefined;
  const url = (node as { $?: { url?: string; medium?: string; type?: string } }).$;
  if (url?.url && (!url.medium || url.medium === "image") && (!url.type || url.type.startsWith("image"))) {
    return url.url;
  }
  return undefined;
}

function extractImage(item: FeedItem): string | undefined {
  const enc = item.enclosure;
  if (enc?.url && (!enc.type || enc.type.startsWith("image"))) return enc.url;

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

  const thumb = mediaUrl(item.mediaThumbnail);
  if (thumb) return thumb;

  const html = item.contentEncoded || item.content || "";
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  if (m) return m[1];

  return undefined;
}

async function parseFeed(feed: (typeof feeds)[number]): Promise<NewsItem[]> {
  const parsed = await parser.parseURL(feed.url);
  return (parsed.items ?? []).slice(0, 10).map((item) => ({
    title: item.title ?? "(sin título)",
    source: feed.name,
    category: feed.category,
    link: item.link ?? "#",
    date: item.pubDate ?? item.isoDate ?? new Date().toISOString(),
    image: extractImage(item),
  }));
}

export async function GET() {
  const results = await Promise.allSettled(feeds.map(parseFeed));

  const items: NewsItem[] = results
    .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === "fulfilled")
    .flatMap((r) => r.value)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json(items);
}
