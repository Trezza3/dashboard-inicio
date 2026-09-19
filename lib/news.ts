// Lógica pura de noticias (sin red) — compartida por la API y los tests.

export type FeedInput = { name: string; category: string; url: string };

type DedupeItem = { link: string; title: string };

export function cleanText(value?: string): string {
  return (value ?? "")
    .replace(/\s+/g, " ")
    .replace(/&nbsp;/g, " ")
    .trim();
}

export function validUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export function dedupe<T extends DedupeItem>(items: T[]): T[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${item.link.replace(/[#?].*$/, "")}|${item.title.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function sanitizeFeeds(raw: unknown): FeedInput[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((f): f is FeedInput => {
      if (!f || typeof f !== "object") return false;
      const feed = f as Partial<FeedInput>;
      return (
        typeof feed.url === "string" &&
        feed.url.length <= 2_048 &&
        !!validUrl(feed.url) &&
        typeof feed.name === "string" &&
        (feed.category === undefined || typeof feed.category === "string")
      );
    })
    .slice(0, 20)
    .map((f) => ({
      name: cleanText(f.name).slice(0, 40) || "Fuente",
      category: cleanText(f.category).slice(0, 24) || "Otros",
      url: f.url,
    }));
}
