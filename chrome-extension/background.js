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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "getRecentlyClosed") {
    getRecentlyClosed().then((items) => sendResponse({ items }));
    return true; // respuesta asincronica
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
