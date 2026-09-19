"use client";

import { useEffect } from "react";

/**
 * Ejecuta `task` al montar y cada `ms`, pero solo con la pestaña visible.
 * Al volver a la pestaña, si pasó más de `ms` desde la última vez, corre enseguida.
 * Con varias pestañas nuevas abiertas evita que todas consulten en paralelo.
 * `task` debe estar memoizada (useCallback): si cambia, se reinicia y corre de nuevo.
 */
export function useVisibleInterval(task: () => void, ms: number, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    let lastRun = 0;
    let timer: number | undefined;

    function run() {
      lastRun = Date.now();
      task();
    }

    function schedule() {
      window.clearTimeout(timer);
      if (document.visibilityState !== "visible") return;
      const wait = Math.max(0, lastRun + ms - Date.now());
      timer = window.setTimeout(() => {
        run();
        schedule();
      }, wait);
    }

    function onVisibility() {
      schedule();
    }

    run();
    schedule();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [task, ms, enabled]);
}
