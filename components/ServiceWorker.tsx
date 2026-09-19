"use client";

import { useEffect } from "react";

// Registra public/sw.js en producción: la página y sus archivos quedan en el
// navegador y la pestaña nueva abre sin esperar la red.
export default function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // En desarrollo un SW de un build anterior serviría código viejo.
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => registrations.forEach((r) => void r.unregister()))
        .catch(() => {});
      return;
    }

    // Hay una versión nueva: las pestañas en segundo plano se recargan solas
    // (y la visible, apenas se oculte) para no dejar código viejo corriendo.
    let pendingReload = false;
    function reloadIfHidden() {
      if (pendingReload && document.visibilityState === "hidden") window.location.reload();
    }
    function onMessage(event: MessageEvent) {
      if (event.data?.type !== "dash-update") return;
      pendingReload = true;
      reloadIfHidden();
    }
    navigator.serviceWorker.addEventListener("message", onMessage);
    document.addEventListener("visibilitychange", reloadIfHidden);

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    };
    // Después de la carga, para no competir con el primer render.
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
      document.removeEventListener("visibilitychange", reloadIfHidden);
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}
