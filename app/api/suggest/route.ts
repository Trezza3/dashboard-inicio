import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Proxy de las sugerencias de Google (desde el server para evitar CORS).
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 200);
  if (!query) {
    return NextResponse.json({ suggestions: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const response = await fetch(
      `https://suggestqueries.google.com/complete/search?client=firefox&hl=es&q=${encodeURIComponent(query)}`,
      { signal: AbortSignal.timeout(4000) },
    );
    const text = await response.text();
    const data = JSON.parse(text) as [string, string[], ...unknown[]];
    const suggestions = Array.isArray(data?.[1]) ? data[1].slice(0, 8) : [];
    return NextResponse.json({ suggestions }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ suggestions: [] }, { headers: { "Cache-Control": "no-store" } });
  }
}
