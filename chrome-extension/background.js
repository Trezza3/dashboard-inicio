// Expone al dashboard datos del navegador que la pagina no puede leer sola:
// pestanas cerradas recientemente (chrome.sessions), historial, pestanas
// abiertas (para guardar grupos y detectar duplicadas). El content script
// hace de puente con la pagina.

// Origenes que pueden pedirle cosas a la extension. Tiene que coincidir con
// "matches" de content_scripts en el manifest.
const DASHBOARD_ORIGINS = new Set(["https://dashboard-inicio.vercel.app"]);
// Paginas del dashboard (incluye desarrollo local): no se listan como pestanas.
const DASHBOARD_HOSTS = new Set(["dashboard-inicio.vercel.app", "localhost:3000", "127.0.0.1:3000"]);

const MAX_GROUP_TABS = 60;
const GROUP_COLORS = new Set(["grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan", "orange"]);

function isHttpUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isRealPage(url) {
  try {
    const parsed = new URL(url);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && !DASHBOARD_HOSTS.has(parsed.host);
  } catch {
    return false;
  }
}

function fromDashboard(sender) {
  try {
    return sender.id === chrome.runtime.id && DASHBOARD_ORIGINS.has(new URL(sender.url).origin);
  } catch {
    return false;
  }
}

// Clave para comparar pestanas: la misma URL sin el #fragmento.
function tabKey(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url;
  }
}

// Convierte una Session de chrome.sessions a un item simple para el dashboard.
function mapSession(session) {
  if (session.window) {
    const tabs = (session.window.tabs || [])
      .map((tab) => ({ url: tab.url || "", title: tab.title || "" }))
      .filter((tab) => isRealPage(tab.url));
    if (!tabs.length) return null;
    return {
      kind: "window",
      sessionId: session.window.sessionId,
      count: (session.window.tabs || []).length,
      links: tabs,
      lastModified: session.lastModified,
    };
  }
  if (session.tab && isRealPage(session.tab.url)) {
    return {
      kind: "tab",
      sessionId: session.tab.sessionId,
      url: session.tab.url,
      title: session.tab.title || session.tab.url,
      lastModified: session.lastModified,
    };
  }
  return null;
}

async function getRecentlyClosed() {
  try {
    const sessions = await chrome.sessions.getRecentlyClosed({ maxResults: 25 });
    return sessions.map(mapSession).filter(Boolean);
  } catch {
    return [];
  }
}

// Busca en el historial del navegador (para el buscador del dashboard).
async function searchHistory(query) {
  try {
    const text = typeof query === "string" ? query.slice(0, 200) : "";
    const items = await chrome.history.search({ text, maxResults: 20, startTime: 0 });
    return items
      .filter((item) => isRealPage(item.url))
      .sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0))
      .slice(0, 8)
      .map((item) => ({ url: item.url, title: item.title || item.url }));
  } catch {
    return [];
  }
}

/* ------------------------------ Metodos RPC ------------------------------ */

// Pestanas de la ventana donde esta abierto el dashboard (para guardarlas).
async function getCurrentWindowTabs(_params, sender) {
  const windowId = sender.tab?.windowId;
  const tabs = await chrome.tabs.query(windowId === undefined ? { currentWindow: true } : { windowId });
  return {
    tabs: tabs
      .filter((tab) => isRealPage(tab.url || ""))
      .map((tab) => ({ url: tab.url, title: tab.title || tab.url, pinned: Boolean(tab.pinned) })),
  };
}

// Abre un grupo guardado en una ventana nueva y lo agrupa con su nombre.
// Una sola llamada a windows.create: no la frena el bloqueador de popups.
async function openTabGroup(params) {
  const urls = (Array.isArray(params?.urls) ? params.urls : [])
    .filter((url) => typeof url === "string" && isHttpUrl(url))
    .slice(0, MAX_GROUP_TABS);
  if (!urls.length) return { ok: false, opened: 0 };

  const win = await chrome.windows.create({ url: urls, focused: true });
  const title = typeof params?.name === "string" ? params.name.slice(0, 60) : "";
  const tabIds = (win.tabs || []).map((tab) => tab.id).filter((id) => typeof id === "number");

  if (title && tabIds.length && chrome.tabGroups) {
    try {
      const groupId = await chrome.tabs.group({ tabIds, createProperties: { windowId: win.id } });
      const color = GROUP_COLORS.has(params?.color) ? params.color : "grey";
      await chrome.tabGroups.update(groupId, { title, color });
    } catch {
      /* navegador sin grupos de pestanas: quedan sueltas en la ventana */
    }
  }
  return { ok: true, opened: urls.length };
}

// Pestanas abiertas con la misma URL, en todas las ventanas.
// La primera de cada grupo es la que conviene conservar (fijada, activa o la
// usada mas recientemente).
async function findDuplicateTabs() {
  const tabs = await chrome.tabs.query({});
  const groups = new Map();
  for (const tab of tabs) {
    if (typeof tab.id !== "number" || !isRealPage(tab.url || "")) continue;
    const key = tabKey(tab.url);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(tab);
  }

  const duplicates = [];
  for (const [url, list] of groups) {
    if (list.length < 2) continue;
    list.sort((a, b) =>
      Number(b.pinned) - Number(a.pinned) ||
      Number(b.active) - Number(a.active) ||
      (b.lastAccessed || 0) - (a.lastAccessed || 0));
    duplicates.push({
      url,
      title: list[0].title || url,
      tabs: list.map((tab) => ({ id: tab.id, windowId: tab.windowId, active: Boolean(tab.active), pinned: Boolean(tab.pinned) })),
    });
  }
  duplicates.sort((a, b) => b.tabs.length - a.tabs.length);
  return { groups: duplicates };
}

// Cierra pestanas por id, solo si siguen en la URL esperada (la lista del
// dashboard puede estar vieja) y nunca la pestana del propio dashboard.
async function closeTabs(params, sender) {
  const requested = (Array.isArray(params?.tabs) ? params.tabs : [])
    .filter((tab) => tab && Number.isInteger(tab.id) && typeof tab.url === "string")
    .slice(0, 200);

  const toClose = [];
  for (const { id, url } of requested) {
    if (id === sender.tab?.id) continue;
    try {
      const tab = await chrome.tabs.get(id);
      if (tab.pinned || tabKey(tab.url || "") !== tabKey(url)) continue;
      toClose.push(id);
    } catch {
      /* ya estaba cerrada */
    }
  }
  if (toClose.length) await chrome.tabs.remove(toClose);
  return { closed: toClose.length };
}

const RPC_METHODS = {
  ping: async () => ({ version: chrome.runtime.getManifest().version }),
  getCurrentWindowTabs,
  openTabGroup,
  findDuplicateTabs,
  closeTabs,
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!fromDashboard(sender)) return false;

  if (message?.type === "rpc") {
    const method = Object.prototype.hasOwnProperty.call(RPC_METHODS, message.method) ? RPC_METHODS[message.method] : null;
    if (!method) {
      sendResponse({ ok: false, error: "unknown-method" });
      return false;
    }
    Promise.resolve()
      .then(() => method(message.params, sender))
      .then((result) => sendResponse({ ok: true, result }))
      .catch(() => sendResponse({ ok: false, error: "failed" }));
    return true; // respuesta asincronica
  }

  // Mensajes de la version 1.0 (siguen en uso por Sessions y Search).
  if (message?.type === "getRecentlyClosed") {
    getRecentlyClosed().then((items) => sendResponse({ items }));
    return true;
  }
  if (message?.type === "searchHistory") {
    searchHistory(message.query).then((results) => sendResponse({ results }));
    return true;
  }
  if (message?.type === "restore") {
    chrome.sessions
      .restore(message.sessionId)
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
  return false;
});
