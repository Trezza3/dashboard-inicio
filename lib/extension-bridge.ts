"use client";

// Llamadas a la extensión del navegador (chrome-extension/) vía postMessage.
// El content script de la extensión las reenvía al background y responde.

export class ExtensionUnavailableError extends Error {
  constructor() {
    super("extension-unavailable");
  }
}

type RpcResult = { source?: string; type?: string; id?: string; ok?: boolean; result?: unknown; error?: string };

let counter = 0;

/**
 * Llama un método RPC de la extensión. Si no responde en `timeoutMs`
 * (no está instalada o es una versión vieja sin RPC) rechaza con
 * ExtensionUnavailableError.
 */
export function callExtension<T>(method: string, params?: unknown, timeoutMs = 2_000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    counter += 1;
    const id = `${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2, 8)}`;
    const message = { source: "dash-page", type: "rpc", id, method, params };

    function cleanup() {
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
    }

    function onMessage(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const data = event.data as RpcResult;
      if (data?.source !== "dash-extension") return;

      // El content script cargó después de nuestro pedido: se reenvía
      // (la extensión atiende cada id una sola vez).
      if (data.type === "ready") {
        window.postMessage(message, window.location.origin);
        return;
      }
      if (data.type !== "rpc-result" || data.id !== id) return;
      cleanup();
      if (data.ok) resolve(data.result as T);
      else if (data.error === "unavailable") reject(new ExtensionUnavailableError());
      else reject(new Error(data.error || "extension-error"));
    }

    const timer = window.setTimeout(() => {
      cleanup();
      reject(new ExtensionUnavailableError());
    }, timeoutMs);

    window.addEventListener("message", onMessage);
    window.postMessage(message, window.location.origin);
  });
}

/** Tipos de las respuestas de la extensión. */
export type BrowserTab = { url: string; title: string; pinned: boolean };
export type DuplicateTabGroup = {
  url: string;
  title: string;
  /** La primera es la que se conserva. */
  tabs: { id: number; windowId: number; active: boolean; pinned: boolean }[];
};
