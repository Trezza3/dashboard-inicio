// Service worker del dashboard: hace que la pestaña nueva abra al instante.
//
// - Página (HTML): se sirve desde el cache y se actualiza de fondo
//   (stale-while-revalidate). La versión nueva se ve en la próxima apertura.
// - /_next/static/*: los archivos tienen hash en el nombre y no cambian nunca,
//   así que se sirven del cache sin tocar la red (cache-first).
// - Imágenes propias y favicons optimizados (/_next/image): stale-while-revalidate.
// - /api/* y todo lo de otros dominios: directo a la red, sin cache.
//
// Para invalidar todo en un deploy, subir CACHE_VERSION.

const CACHE_VERSION = "v1";
const PAGE_CACHE = `dash-page-${CACHE_VERSION}`;
const STATIC_CACHE = `dash-static-${CACHE_VERSION}`;
const ASSET_CACHE = `dash-assets-${CACHE_VERSION}`;
const CACHES = [PAGE_CACHE, STATIC_CACHE, ASSET_CACHE];

// Los chunks viejos de deploys anteriores se acumulan: se recorta por cantidad.
const MAX_STATIC_ENTRIES = 250;
const MAX_ASSET_ENTRIES = 150;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGE_CACHE)
      .then((cache) => cache.add(new Request("/", { cache: "reload" })))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => name.startsWith("dash-") && !CACHES.includes(name)).map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  // cache.keys() respeta el orden de inserción: se borran los más viejos.
  for (let i = 0; i < keys.length - max; i += 1) await cache.delete(keys[i]);
}

// Solo respuestas propias y directas: una redirigida no se puede reusar
// para responder una navegación.
function cacheable(response) {
  return response && response.ok && response.type === "basic" && !response.redirected;
}

async function pageResponse(event) {
  const cache = await caches.open(PAGE_CACHE);
  // Una sola entrada por ruta: la query (?utm=...) no cambia el HTML.
  const url = new URL(event.request.url);
  const key = new Request(url.origin + url.pathname);

  const network = fetch(event.request)
    .then(async (response) => {
      if (cacheable(response)) await cache.put(key, response.clone());
      return response;
    })
    .catch(() => null);

  const cached = await cache.match(key);
  if (cached) {
    event.waitUntil(network);
    return cached;
  }
  return (await network) || Response.error();
}

async function staticResponse(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (cacheable(response)) {
    await cache.put(request, response.clone());
    trim(STATIC_CACHE, MAX_STATIC_ENTRIES).catch(() => {});
  }
  return response;
}

async function assetResponse(event) {
  const cache = await caches.open(ASSET_CACHE);
  const network = fetch(event.request)
    .then(async (response) => {
      if (cacheable(response)) {
        await cache.put(event.request, response.clone());
        trim(ASSET_CACHE, MAX_ASSET_ENTRIES).catch(() => {});
      }
      return response;
    })
    .catch(() => null);

  const cached = await cache.match(event.request);
  if (cached) {
    event.waitUntil(network);
    return cached;
  }
  return (await network) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;
  // Pedidos internos de Next (RSC, prefetch): siempre a la red.
  if (url.searchParams.has("_rsc") || request.headers.get("RSC")) return;

  if (request.mode === "navigate") {
    event.respondWith(pageResponse(event));
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(staticResponse(request));
  } else if (url.pathname === "/_next/image" || !url.pathname.startsWith("/_next/")) {
    event.respondWith(assetResponse(event));
  }
});
