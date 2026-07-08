# Dashboard Inicio Chrome Extension

Extension minima para que `Ctrl+T` abra el dashboard publicado.

## Instalar en Chrome o Brave

1. Abrir `chrome://extensions` o `brave://extensions`.
2. Activar `Modo desarrollador`.
3. Elegir `Cargar sin empaquetar`.
4. Seleccionar esta carpeta: `chrome-extension`.

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

## Instalacion externa local

Tambien queda empaquetada como:

`/home/valentin/Escritorio/Dashbord/chrome-extension.crx`

ID de extension:

`kncedjlnbljhljkkmcenppfnofannbkg`

## Proxima etapa

Boton "Guardar pestanas abiertas" (captura manual de la ventana actual) y sincronizacion de sesiones entre dispositivos.
