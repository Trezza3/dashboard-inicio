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

> Tras actualizar la extension hay que **recargarla**: en `chrome://extensions`,
> boton de recargar sobre la tarjeta "Dashboard Inicio".

## Privacidad y permisos

- `sessions` y `tabs`: muestran y restauran pestañas cerradas recientemente.
- `history`: suma resultados del historial al buscador del dashboard.
- Los datos leídos por la extensión se envían únicamente a la pestaña del
  dashboard; no se guardan en el servidor.

Después de modificar los archivos de la extensión, hay que recargarla desde la
pantalla de extensiones del navegador.
