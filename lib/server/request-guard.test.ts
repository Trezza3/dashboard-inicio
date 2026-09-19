import { describe, expect, it } from "vitest";
import { clientKey, createRateLimiter, guardRequest, isCrossSite } from "@/lib/server/request-guard";

describe("createRateLimiter", () => {
  it("deja pasar hasta el límite y después corta", () => {
    const check = createRateLimiter({ limit: 3, windowMs: 1_000 });
    const now = 10_000;
    expect([1, 2, 3].map(() => check("a", now).ok)).toEqual([true, true, true]);
    expect(check("a", now).ok).toBe(false);
    // Otro cliente tiene su propia cuenta.
    expect(check("b", now).ok).toBe(true);
  });

  it("reinicia la cuenta al terminar la ventana", () => {
    const check = createRateLimiter({ limit: 1, windowMs: 1_000 });
    expect(check("a", 0).ok).toBe(true);
    expect(check("a", 500).ok).toBe(false);
    expect(check("a", 1_000).ok).toBe(true);
  });

  it("informa cuántos segundos faltan", () => {
    const check = createRateLimiter({ limit: 1, windowMs: 60_000 });
    check("a", 0);
    expect(check("a", 15_000).retryAfter).toBe(45);
  });
});

describe("guardRequest", () => {
  const request = (headers: Record<string, string>) => new Request("https://dash.test/api/x", { headers });

  it("rechaza pedidos de otros sitios", () => {
    expect(isCrossSite(request({ "sec-fetch-site": "cross-site" }))).toBe(true);
    expect(isCrossSite(request({ "sec-fetch-site": "same-origin" }))).toBe(false);
    // Clientes que no son navegadores no mandan el header: los frena el límite.
    expect(isCrossSite(request({}))).toBe(false);

    const blocked = guardRequest(request({ "sec-fetch-site": "cross-site" }), createRateLimiter({ limit: 9, windowMs: 1 }), {});
    expect(blocked?.status).toBe(403);
  });

  it("identifica al cliente por la primera IP de x-forwarded-for", () => {
    expect(clientKey(request({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
    expect(clientKey(request({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
  });

  it("responde 429 al pasar el límite", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
    const req = () => request({ "x-forwarded-for": "9.9.9.9" });
    expect(guardRequest(req(), limiter, {})).toBeNull();
    const blocked = guardRequest(req(), limiter, {});
    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get("Retry-After")).toBeTruthy();
  });
});
