// Expone al dashboard las pestanas/ventanas cerradas recientemente usando la
// API nativa del navegador (chrome.sessions), igual que "Cerradas recientemente"
// del historial. El content script hace de puente con la pagina.

const DASHBOARD_HOSTS = ["dashboard-inicio.vercel.app", "localhost:3000", "127.0.0.1:3000"];

function isRealPage(url) {
  if (!/^https?:\/\//i.test(url || "")) return false;
  return !DASHBOARD_HOSTS.some((host) => url.includes(host));
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
    const items = await chrome.history.search({ text: query || "", maxResults: 20, startTime: 0 });
    return items
      .filter((item) => isRealPage(item.url))
      .sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0))
      .slice(0, 8)
      .map((item) => ({ url: item.url, title: item.title || item.url }));
  } catch {
    return [];
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "getRecentlyClosed") {
    getRecentlyClosed().then((items) => sendResponse({ items }));
    return true; // respuesta asincronica
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
