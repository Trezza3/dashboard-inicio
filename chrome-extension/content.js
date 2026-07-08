// Puente entre la pagina del dashboard y el background.
// La pagina pide (postMessage) la lista de cerradas recientemente o restaurar
// una sesion; este script lo reenvia al background y devuelve la respuesta.

function ask(message, replyType, extra) {
  chrome.runtime.sendMessage(message, (response) => {
    if (chrome.runtime.lastError) return;
    window.postMessage({ source: "dash-extension", type: replyType, ...extra, ...response }, window.location.origin);
  });
}

window.addEventListener("message", (event) => {
  if (event.source !== window || event.origin !== window.location.origin) return;
  const data = event.data;
  if (!data || data.source !== "dash-page") return;

  if (data.type === "getRecentlyClosed") {
    ask({ type: "getRecentlyClosed" }, "recentlyClosed");
  } else if (data.type === "restore") {
    ask({ type: "restore", sessionId: data.sessionId }, "restored", { sessionId: data.sessionId });
  }
});

// Avisa a la pagina que la extension esta lista para responder.
window.postMessage({ source: "dash-extension", type: "ready" }, window.location.origin);
