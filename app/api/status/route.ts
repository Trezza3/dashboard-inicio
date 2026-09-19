import { NextResponse } from "next/server";
import { fetchPublicHttp } from "@/lib/server/public-http";
import { createRateLimiter, guardRequest } from "@/lib/server/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type PingResult = {
  url: string;
  ok: boolean;
  code: number;
  ms: number;
};

async function ping(url: string): Promise<PingResult> {
  const start = Date.now();
  try {
    const res = await fetchPublicHttp(url, {
      method: "GET",
      signal: AbortSignal.timeout(7000),
      headers: { "User-Agent": "DashboardStatusBot/1.0" },
    });
    const result = { url, ok: res.status >= 200 && res.status < 400, code: res.status, ms: Date.now() - start };
    await res.body?.cancel();
    return result;
  } catch {
    return { url, ok: false, code: 0, ms: Date.now() - start };
  }
}

// La página chequea cada 60 s por pestaña visible: 30/min deja margen de sobra.
const limiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

export async function POST(request: Request) {
  const blocked = guardRequest(request, limiter, { results: [] });
  if (blocked) return blocked;
  try {
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return NextResponse.json({ results: [] }, { status: 415 });
    }
    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > 32_000) {
      return NextResponse.json({ results: [] }, { status: 413 });
    }
    const body = (await request.json()) as { urls?: string[] };
    const urls = Array.isArray(body.urls)
      ? [...new Set(body.urls.filter((url): url is string => typeof url === "string" && url.length <= 2_048))].slice(0, 12)
      : [];
    const results = await Promise.all(urls.map(ping));
    return NextResponse.json({ results }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ results: [] }, { status: 400 });
  }
}
