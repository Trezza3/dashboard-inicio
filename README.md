# Dashboard Inicio

Dashboard personalizable para usar como página de inicio o pestaña nueva. Reúne
buscador, accesos directos, notas, agenda, proyectos, clima, dólar y noticias en
una sola pantalla.

**Versión publicada:** [dashboard-inicio.vercel.app](https://dashboard-inicio.vercel.app)

## Uso

La web se puede abrir directamente, sin crear una cuenta. Cada navegador guarda
su configuración de forma independiente:

- accesos, carpetas y favoritos;
- notas y agenda;
- proyectos y URLs monitoreadas;
- fuentes de noticias, tema y preferencias visuales;
- ciudad del clima (Configuración → Clima) y espacios de trabajo.

**Ctrl+K** (o el botón ⌘K del encabezado) abre un buscador de pestañas
abiertas, espacios, accesos, proyectos e historial. Los **espacios** agrupan
las pestañas y notas de cada cliente o proyecto y se abren/guardan/cierran como
grupo del navegador (necesitan la extensión).

Si hay varias pestañas del dashboard abiertas, los cambios hechos en una se
reflejan en las demás al instante (no se pisan entre sí).

La página se guarda en el navegador con un service worker: después de la
primera visita, la pestaña nueva abre desde el cache local sin esperar la red y
la versión nueva de un deploy se ve en la apertura siguiente (las pestañas del
dashboard que quedaron en segundo plano se recargan solas).

Los datos quedan en `localStorage`. No hay sincronización entre dispositivos ni
recuperación si se borran los datos del sitio.

Desde **Configuración → Respaldo** se puede descargar un archivo `.json` con los
datos personales e importarlo en otro navegador o después de una reinstalación.
La restauración solo reemplaza las claves incluidas en el archivo y nunca borra
el resto del almacenamiento.

### Contrato de compatibilidad

Para que los despliegues futuros no afecten a usuarios existentes:

- todas las preferencias personales usan claves con prefijo `dash-`;
- una clave publicada no se renombra ni elimina sin una migración automática;
- los valores iniciales solo se aplican cuando el usuario todavía no tiene datos;
- importar un respaldo combina y reemplaza datos, pero no vacía el almacenamiento;
- el dominio público debe mantenerse, porque `localStorage` está asociado al origen.

Para reemplazar la pestaña nueva de Chrome o Brave y habilitar historial/sesiones,
seguí la guía de [la extensión](./chrome-extension/README.md).

## Desarrollo local

Requisitos: Node.js 20.9 o superior (se recomienda la versión LTS actual) y npm.

```bash
npm ci
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000). No se requieren variables de
entorno.

Comandos disponibles:

```bash
npm run lint    # ESLint
npm test        # tests (Vitest)
npm run build   # build de producción + TypeScript
npm run check   # lint, tests y build (lo mismo corre en CI)
npm run start   # sirve el build de producción
```

## Publicación

El proyecto usa Next.js App Router y necesita un runtime Node.js por sus Route
Handlers; no funciona como exportación completamente estática. En Vercel alcanza
con importar el repositorio y desplegarlo sin variables adicionales.

Antes de publicar:

```bash
npm ci
npm run check
```

Si cambia el dominio, también hay que actualizar las coincidencias y la URL del
dashboard en `chrome-extension/manifest.json`, `background.js`, `newtab.js` y
`newtab.html`.

## Privacidad y servicios externos

- Las notas, agenda, accesos y proyectos no salen del navegador.
- Las búsquedas usan Google y las sugerencias pasan por `/api/suggest`.
- El clima usa Open-Meteo con la ubicación predeterminada de Buenos Aires.
- Dólar y noticias consultan proveedores públicos; las fuentes RSS personalizadas
  deben ser URLs públicas HTTP/HTTPS.
- La extensión solicita `history`, `sessions` y `tabs` exclusivamente para las
  funciones explicadas en su README.

El endpoint de estado solo consulta URLs públicas y bloquea destinos locales,
privados y puertos no estándar.

## Stack

- Next.js 16 (App Router y Turbopack)
- React 19 y TypeScript
- Tailwind CSS 4
- `rss-parser` y Tabler Icons
