// Puente entre la pagina del dashboard y el background.
// La pagina pide cosas por postMessage; este script lo reenvia al background
// y devuelve la respuesta a la pagina.

function post(message) {
  window.postMessage({ source: "dash-extension", ...message }, window.location.origin);
}

function ask(message, replyType, extra) {
  chrome.runtime.sendMessage(message, (response) => {
    if (chrome.runtime.lastError) return;
    post({ type: replyType, ...extra, ...response });
  });
}

// La pagina puede reenviar un pedido RPC si llega antes de que este script
// este listo: se atiende una sola vez por id (importa para abrir/cerrar pestanas).
const handledRpc = new Set();

function rpc(data) {
  if (typeof data.id !== "string" || handledRpc.has(data.id)) return;
  handledRpc.add(data.id);
  chrome.runtime.sendMessage({ type: "rpc", method: data.method, params: data.params }, (response) => {
    if (chrome.runtime.lastError || !response) {
      post({ type: "rpc-result", id: data.id, ok: false, error: "unavailable" });
      return;
    }
    post({ type: "rpc-result", id: data.id, ...response });
  });
}

window.addEventListener("message", (event) => {
  if (event.source !== window || event.origin !== window.location.origin) return;
  const data = event.data;
  if (!data || data.source !== "dash-page") return;

  if (data.type === "rpc") {
    rpc(data);
  } else if (data.type === "getRecentlyClosed") {
    ask({ type: "getRecentlyClosed" }, "recentlyClosed");
  } else if (data.type === "restore") {
    ask({ type: "restore", sessionId: data.sessionId }, "restored", { sessionId: data.sessionId });
  } else if (data.type === "searchHistory") {
    ask({ type: "searchHistory", query: data.query }, "historyResults", { query: data.query });
  }
});

// Avisa a la pagina que la extension esta lista para responder.
post({ type: "ready", version: chrome.runtime.getManifest().version, rpc: true });
