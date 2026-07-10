import { NextResponse } from "next/server";

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
  if (!/^https?:\/\//i.test(url)) {
    return { url, ok: false, code: 0, ms: 0 };
  }
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(7000),
      headers: { "User-Agent": "DashboardStatusBot/1.0" },
    });
    return { url, ok: res.status >= 200 && res.status < 400, code: res.status, ms: Date.now() - start };
  } catch {
    return { url, ok: false, code: 0, ms: Date.now() - start };
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { urls?: string[] };
    const urls = Array.isArray(body.urls) ? body.urls.slice(0, 20) : [];
    const results = await Promise.all(urls.map(ping));
    return NextResponse.json({ results }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ results: [] }, { status: 400 });
  }
}
