# Dashboard Inicio Chrome Extension

Extension minima para que `Ctrl+T` abra el dashboard publicado.

## Instalar en Chrome o Brave

1. Abrir `chrome://extensions` o `brave://extensions`.
2. Activar `Modo desarrollador`.
3. Elegir `Cargar sin empaquetar`.
4. Seleccionar esta carpeta: `chrome-extension`.

Cuando la extension este activa, cada nueva pestana abre:

`https://dashboard-inicio.vercel.app`

## Guardado automatico de sesiones

Al **cerrar una ventana con mas de 5 pestanas**, la extension guarda esas URLs
como una sesion. La proxima vez que abris el dashboard, aparece en la seccion
`Continuar` lista para reabrir todo junto.

- `background.js`: vigila las ventanas y detecta el cierre (permisos `tabs` y `storage`).
- `content.js`: le entrega las sesiones guardadas a la pagina del dashboard.
- El umbral (5) se ajusta en `TAB_THRESHOLD` dentro de `background.js`.

> Tras actualizar la extension hay que **recargarla**: en `chrome://extensions`,
> boton de recargar sobre la tarjeta "Dashboard Inicio".

## Instalacion externa local

Tambien queda empaquetada como:

`/home/valentin/Escritorio/Dashbord/chrome-extension.crx`

ID de extension:

`kncedjlnbljhljkkmcenppfnofannbkg`

## Proxima etapa

Boton "Guardar pestanas abiertas" (captura manual de la ventana actual) y sincronizacion de sesiones entre dispositivos.
