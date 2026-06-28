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
};

const parser = new Parser({ timeout: 8000 });

async function parseFeed(feed: (typeof feeds)[number]): Promise<NewsItem[]> {
  const parsed = await parser.parseURL(feed.url);
  return (parsed.items ?? []).slice(0, 10).map((item) => ({
    title: item.title ?? "(sin título)",
    source: feed.name,
    category: feed.category,
    link: item.link ?? "#",
    date: item.pubDate ?? item.isoDate ?? new Date().toISOString(),
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
