# Extensión de Dashboard Inicio

Extensión mínima para que cada pestaña nueva abra el dashboard publicado y,
con permiso del usuario, integre el historial y las sesiones recientes.

## Instalar en Chrome o Brave

1. Descargar o copiar la carpeta `chrome-extension`.
2. Abrir `chrome://extensions` o `brave://extensions`.
3. Activar **Modo desarrollador**.
4. Elegir **Cargar sin empaquetar** y seleccionar esa carpeta.

Cuando la extension este activa, cada nueva pestana abre:

`https://dashboard-inicio.vercel.app`

## Pestanas cerradas recientemente

La seccion `Continuar` del dashboard muestra las **pestanas y ventanas cerradas
recientemente** (igual que "Cerradas recientemente" del historial) y permite
reabrirlas restaurando la sesion tal cual, con su historial.

- `background.js`: usa la API nativa `chrome.sessions.getRecentlyClosed()` y
  `chrome.sessions.restore()` (permisos `tabs` y `sessions`).
- `content.js`: puente entre la pagina del dashboard y el background.

## Espacios, buscador y duplicadas (version 1.2)

- **Espacios:** uno por cliente o proyecto, con sus pestanas y notas. "Abrir"
  las abre en una ventana nueva como grupo nativo con ese nombre y color; si el
  grupo ya esta abierto, lleva a el. "Guardar" toma las pestanas actuales del
  grupo y "Guardar y cerrar" ademas lo cierra.
- **Buscador (Ctrl+K):** busca en pestanas abiertas (y salta a la que ya
  tenes), espacios, accesos, proyectos e historial.
- **Duplicadas:** si hay pestanas abiertas con la misma URL (en cualquier
  ventana), aparece un panel para cerrarlas con un click. Se conserva la fijada,
  la activa o la usada mas recientemente; las fijadas nunca se cierran.

Metodos RPC de `background.js` (llamados desde `lib/extension-bridge.ts`):
`getCurrentWindowTabs`, `openTabGroup`, `getGroupTabs`, `closeGroup`,
`listTabs`, `focusTab`, `searchHistory`, `findDuplicateTabs`, `closeTabs`.

## Seguridad

La extension solo responde a `https://dashboard-inicio.vercel.app`
(`content_scripts.matches` en el manifest y `DASHBOARD_ORIGINS` en
`background.js`). Antes tambien respondia a `localhost:3000`, lo que permitia
que cualquier proyecto levantado en ese puerto leyera el historial.

Para probar la extension contra el servidor local, agregar temporalmente
`http://localhost:3000/*` a `matches` y `http://localhost:3000` a
`DASHBOARD_ORIGINS`, y sacarlos antes de compartir la extension.

> Tras actualizar la extension hay que **recargarla**: en `chrome://extensions`,
> boton de recargar sobre la tarjeta "Dashboard Inicio".

## Privacidad y permisos

- `sessions` y `tabs`: muestran y restauran pestañas cerradas recientemente,
  leen las pestañas abiertas para guardar grupos y detectar duplicadas.
- `tabGroups`: pone nombre y color al grupo al abrir uno guardado.
- `history`: suma resultados del historial al buscador del dashboard.
- Los datos leídos por la extensión se envían únicamente a la pestaña del
  dashboard; no se guardan en el servidor.

Después de modificar los archivos de la extensión, hay que recargarla desde la
pantalla de extensiones del navegador.
