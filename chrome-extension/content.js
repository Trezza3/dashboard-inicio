// Puente entre la extension y la pagina del dashboard.
// El dashboard avisa "listo" (postMessage) y este script le entrega las
// sesiones que el background guardo al cerrar ventanas con muchas pestanas.

let ready = false;

async function flush() {
  if (!ready) return;
  try {
    const { pendingSessions = [] } = await chrome.storage.local.get("pendingSessions");
    if (!pendingSessions.length) return;
    // Sacamos las pendientes ANTES de entregarlas para no duplicar en carreras.
    await chrome.storage.local.remove("pendingSessions");
    window.postMessage(
      { source: "dash-extension", type: "sessions", sessions: pendingSessions },
      window.location.origin,
    );
  } catch {
    // storage no disponible: se reintenta en el proximo evento
  }
}

// La pagina (React) avisa cuando termino de cargar y puede recibir sesiones.
window.addEventListener("message", (event) => {
  if (event.source !== window || event.origin !== window.location.origin) return;
  const data = event.data;
  if (data && data.source === "dash-page" && data.type === "ready") {
    ready = true;
    flush();
  }
});

// Si se cierra una ventana grande mientras el dashboard esta abierto, entregarla al toque.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.pendingSessions && changes.pendingSessions.newValue?.length) {
    flush();
  }
});
