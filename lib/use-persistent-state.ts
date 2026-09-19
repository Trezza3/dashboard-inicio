"use client";

import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from "react";

// Aviso entre instancias del hook dentro de la misma pestaña (el evento
// `storage` solo llega a las OTRAS pestañas).
const SAME_TAB_EVENT = "dash-persistent-state";

type SameTabDetail = { key: string; raw: string; source: symbol };

type Options<T> = {
  /** Valor antes de leer y cuando no hay nada guardado. */
  initial: T | (() => T);
  /** Valida y normaliza lo guardado. Devuelve null si no sirve. */
  parse: (value: unknown) => T | null;
  /** Se usa solo si la clave no existe (p. ej. migrar una clave vieja). */
  migrate?: () => T | null;
};

function resolveInitial<T>(initial: T | (() => T)): T {
  return typeof initial === "function" ? (initial as () => T)() : initial;
}

function parseRaw<T>(raw: string, parse: (value: unknown) => T | null): T | null {
  try {
    return parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * Estado persistido en localStorage que se mantiene sincronizado entre
 * pestañas: si otra pestaña guarda la misma clave, esta se actualiza en vez
 * de pisar el dato con su copia vieja en el próximo cambio.
 */
export function usePersistentState<T>(
  key: string,
  { initial, parse, migrate }: Options<T>,
): [T, Dispatch<SetStateAction<T>>, boolean] {
  const [value, setValue] = useState<T>(() => resolveInitial(initial));
  const [loaded, setLoaded] = useState(false);
  // Versión serializada del valor que vino de afuera (carga u otra pestaña).
  // Solo se escribe cuando el valor cambia respecto de esto, es decir, por un
  // cambio hecho acá. Leer nunca escribe: si no, una pestaña con código viejo
  // (p. ej. abierta antes de un deploy) reescribiría los datos a su formato y
  // podría borrar lo que guardó una pestaña más nueva.
  const lastRaw = useRef<string | null>(null);
  const instance = useRef(Symbol(key));
  const parseRef = useRef(parse);
  const migrateRef = useRef(migrate);
  const initialRef = useRef(initial);

  useEffect(() => {
    parseRef.current = parse;
    migrateRef.current = migrate;
    initialRef.current = initial;
  });

  useEffect(() => {
    const t = window.setTimeout(() => {
      let raw: string | null = null;
      try {
        raw = localStorage.getItem(key);
      } catch {
        /* storage bloqueado: se usa el valor inicial */
      }

      let next: T | null = null;
      if (raw !== null) {
        next = parseRaw(raw, parseRef.current);
      } else {
        try {
          next = migrateRef.current?.() ?? null;
        } catch {
          next = null;
        }
      }

      const resolved = next ?? resolveInitial(initialRef.current);
      lastRaw.current = JSON.stringify(resolved);
      setValue(resolved);
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(t);
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    const raw = JSON.stringify(value);
    if (raw === lastRaw.current) return;
    lastRaw.current = raw;
    try {
      localStorage.setItem(key, raw);
      window.dispatchEvent(
        new CustomEvent<SameTabDetail>(SAME_TAB_EVENT, { detail: { key, raw, source: instance.current } }),
      );
    } catch {
      /* sin espacio o bloqueado */
    }
  }, [key, value, loaded]);

  useEffect(() => {
    function apply(raw: string | null) {
      if (raw === null) return;
      const next = parseRaw(raw, parseRef.current);
      if (next === null) return;
      const normalized = JSON.stringify(next);
      if (normalized === lastRaw.current) return;
      lastRaw.current = normalized;
      setValue(next);
    }

    function onStorage(event: StorageEvent) {
      if (event.storageArea !== localStorage || event.key !== key) return;
      apply(event.newValue);
    }

    function onSameTab(event: Event) {
      const detail = (event as CustomEvent<SameTabDetail>).detail;
      if (detail?.key !== key || detail.source === instance.current) return;
      apply(detail.raw);
    }

    window.addEventListener("storage", onStorage);
    window.addEventListener(SAME_TAB_EVENT, onSameTab);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(SAME_TAB_EVENT, onSameTab);
    };
  }, [key]);

  return [value, setValue, loaded];
}
