import "server-only";

import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

const MAX_TRACKED_CLIENTS = 5_000;

/**
 * Límite de pedidos por cliente con ventana fija, en memoria.
 * En Vercel cada instancia lleva su propia cuenta: no es exacto, pero corta
 * el abuso sostenido sin sumar dependencias ni variables de entorno.
 */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const buckets = new Map<string, Bucket>();

  return function check(key: string, now = Date.now()): { ok: boolean; retryAfter: number } {
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      if (buckets.size >= MAX_TRACKED_CLIENTS) {
        for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
        // Si siguen todos vigentes, se descarta el más viejo.
        if (buckets.size >= MAX_TRACKED_CLIENTS) buckets.delete(buckets.keys().next().value!);
      }
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    return { ok: bucket.count <= limit, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  };
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "local";
}

/**
 * Las APIs son para la propia página. Los navegadores mandan `Sec-Fetch-Site`:
 * si otro sitio intenta usarlas desde el navegador de alguien, se rechaza.
 */
export function isCrossSite(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  return site === "cross-site" || site === "same-site";
}

/** Devuelve una respuesta de error si el pedido no pasa, o null si sigue. */
export function guardRequest(
  request: Request,
  limiter: ReturnType<typeof createRateLimiter>,
  emptyBody: Record<string, unknown>,
): NextResponse | null {
  if (isCrossSite(request)) {
    return NextResponse.json(emptyBody, { status: 403 });
  }
  const { ok, retryAfter } = limiter(clientKey(request));
  if (!ok) {
    return NextResponse.json(emptyBody, {
      status: 429,
      headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" },
    });
  }
  return null;
}
