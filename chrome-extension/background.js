// Vigila las ventanas del navegador y, al cerrar una con mas de TAB_THRESHOLD
// pestanas, guarda esas URLs como sesion pendiente. El content script las
// entrega al dashboard (seccion "Continuar") la proxima vez que se abre.

const TAB_THRESHOLD = 5; // se guarda cuando la ventana tiene MAS de 5 pestanas
const DASHBOARD_HOSTS = ["dashboard-inicio.vercel.app", "localhost:3000", "127.0.0.1:3000"];
const WIN_PREFIX = "win:";
const DEBUG = true;

function log(...args) {
  if (DEBUG) console.log("[Dashboard]", ...args);
}

function isSavable(url) {
  if (!/^https?:\/\//i.test(url)) return false;
  return !DASHBOARD_HOSTS.some((host) => url.includes(host));
}

// Guarda un "snapshot" de las pestanas de una ventana. Se mantiene fresco con
// cada evento de pestanas, porque al cerrar la ventana ya no se puede consultar.
async function snapshotWindow(windowId) {
  if (windowId == null || windowId === chrome.windows.WINDOW_ID_NONE) return;
  try {
    const tabs = await chrome.tabs.query({ windowId });
    const rawUrls = tabs.map((tab) => tab.url || tab.pendingUrl || "");
    const links = rawUrls.filter(isSavable);
    await chrome.storage.session.set({ [`${WIN_PREFIX}${windowId}`]: { count: tabs.length, links } });
    log(`snapshot ventana ${windowId}: ${tabs.length} pestañas, ${links.length} guardables`, rawUrls);
  } catch (err) {
    log(`snapshot ventana ${windowId} fallo:`, err?.message || err);
  }
}

chrome.tabs.onCreated.addListener((tab) => snapshotWindow(tab.windowId));
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.title || changeInfo.status === "complete") snapshotWindow(tab.windowId);
});
chrome.tabs.onRemoved.addListener((_tabId, info) => {
  // Si la ventana se esta cerrando NO re-snapshoteamos: queremos el estado previo.
  if (!info.isWindowClosing) snapshotWindow(info.windowId);
});
chrome.tabs.onMoved.addListener((_tabId, info) => snapshotWindow(info.windowId));
chrome.tabs.onAttached.addListener((_tabId, info) => snapshotWindow(info.newWindowId));
chrome.tabs.onDetached.addListener((_tabId, info) => snapshotWindow(info.oldWindowId));

// Al cerrar una ventana, usamos el ultimo snapshot conocido.
chrome.windows.onRemoved.addListener(async (windowId) => {
  const key = `${WIN_PREFIX}${windowId}`;
  try {
    const stored = await chrome.storage.session.get(key);
    const snap = stored[key];
    await chrome.storage.session.remove(key);
    log(`ventana ${windowId} cerrada. snapshot:`, snap);
    if (!snap || snap.count <= TAB_THRESHOLD || !snap.links.length) {
      log(`no se guarda (count=${snap?.count}, umbral=${TAB_THRESHOLD}, links=${snap?.links?.length ?? 0})`);
      return;
    }

    const session = {
      id: crypto.randomUUID(),
      name: `Ventana cerrada · ${snap.links.length} pestañas`,
      links: snap.links,
      createdAt: new Date().toISOString(),
    };
    const { pendingSessions = [] } = await chrome.storage.local.get("pendingSessions");
    pendingSessions.unshift(session);
    await chrome.storage.local.set({ pendingSessions: pendingSessions.slice(0, 30) });
    log("SESION GUARDADA:", session.name, session.links);
  } catch (err) {
    log("error al cerrar ventana:", err?.message || err);
  }
});

// Snapshot inicial de todas las ventanas cuando arranca el service worker.
async function seedAll() {
  try {
    const windows = await chrome.windows.getAll({ populate: false });
    log(`seedAll: ${windows.length} ventanas`);
    await Promise.all(windows.map((win) => snapshotWindow(win.id)));
  } catch (err) {
    log("seedAll fallo:", err?.message || err);
  }
}
chrome.runtime.onStartup.addListener(() => {
  log("onStartup");
  seedAll();
});
chrome.runtime.onInstalled.addListener(() => {
  log("onInstalled");
  seedAll();
});

log("service worker iniciado. umbral =", TAB_THRESHOLD);
