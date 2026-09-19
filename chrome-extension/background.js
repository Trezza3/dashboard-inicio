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

function cleanTitle(value) {
  return typeof value === "string" ? value.trim().slice(0, 60) : "";
}

// Grupo nativo abierto con ese nombre exacto (el filtro de la API usa patrones).
async function findGroup(title) {
  if (!title || !chrome.tabGroups) return null;
  const groups = await chrome.tabGroups.query({});
  return groups.find((group) => group.title === title) || null;
}

async function focusTabById(tabId) {
  const tab = await chrome.tabs.update(tabId, { active: true });
  await chrome.windows.update(tab.windowId, { focused: true });
  return tab;
}

// Abre un grupo guardado en una ventana nueva y lo agrupa con su nombre.
// Una sola llamada a windows.create: no la frena el bloqueador de popups.
// Con `reuse`, si ya hay un grupo abierto con ese nombre, lleva a ese grupo.
async function openTabGroup(params) {
  const title = cleanTitle(params?.name);
  if (params?.reuse) {
    const existing = await findGroup(title);
    if (existing) {
      const [first] = await chrome.tabs.query({ groupId: existing.id });
      if (first) {
        await focusTabById(first.id);
        return { ok: true, opened: 0, reused: true };
      }
    }
  }

  const urls = (Array.isArray(params?.urls) ? params.urls : [])
    .filter((url) => typeof url === "string" && isHttpUrl(url))
    .slice(0, MAX_GROUP_TABS);
  if (!urls.length) return { ok: false, opened: 0 };

  const win = await chrome.windows.create({ url: urls, focused: true });
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
  return { ok: true, opened: urls.length, reused: false };
}

// Pestanas del grupo nativo con ese nombre (para guardar el estado de un espacio).
async function getGroupTabs(params) {
  const group = await findGroup(cleanTitle(params?.name));
  if (!group) return { found: false, tabs: [] };
  const tabs = await chrome.tabs.query({ groupId: group.id });
  return {
    found: true,
    tabs: tabs
      .filter((tab) => isRealPage(tab.url || ""))
      .map((tab) => ({ url: tab.url, title: tab.title || tab.url, pinned: Boolean(tab.pinned) })),
  };
}

// Cierra las pestanas del grupo con ese nombre (nunca la del dashboard).
async function closeGroup(params, sender) {
  const group = await findGroup(cleanTitle(params?.name));
  if (!group) return { closed: 0 };
  const tabs = await chrome.tabs.query({ groupId: group.id });
  const ids = tabs.map((tab) => tab.id).filter((id) => typeof id === "number" && id !== sender.tab?.id);
  if (ids.length) await chrome.tabs.remove(ids);
  return { closed: ids.length };
}

// Todas las pestanas abiertas, para el buscador (Ctrl+K).
async function listTabs() {
  const [tabs, groups] = await Promise.all([
    chrome.tabs.query({}),
    chrome.tabGroups ? chrome.tabGroups.query({}) : Promise.resolve([]),
  ]);
  const groupTitles = new Map(groups.map((group) => [group.id, group.title || ""]));
  return {
    tabs: tabs
      .filter((tab) => typeof tab.id === "number" && isRealPage(tab.url || ""))
      .map((tab) => ({
        id: tab.id,
        windowId: tab.windowId,
        url: tab.url,
        title: tab.title || tab.url,
        active: Boolean(tab.active),
        group: groupTitles.get(tab.groupId) || "",
        lastAccessed: tab.lastAccessed || 0,
      })),
  };
}

// Lleva a una pestana ya abierta. Con `closeSender` cierra la pestana del
// dashboard (una pestana nueva que ya no hace falta).
async function focusTab(params, sender) {
  if (!Number.isInteger(params?.tabId)) return { ok: false };
  await focusTabById(params.tabId);
  if (params.closeSender && typeof sender.tab?.id === "number" && sender.tab.id !== params.tabId) {
    await chrome.tabs.remove(sender.tab.id);
  }
  return { ok: true };
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
  getGroupTabs,
  closeGroup,
  listTabs,
  focusTab,
  searchHistory: async (params) => ({ results: await searchHistory(params?.query) }),
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
