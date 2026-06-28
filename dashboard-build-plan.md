# Dashboard de inicio — Plan de build para Antigravity

Workflow: pegás cada prompt en Antigravity (Opus/Codex ejecuta) → verificás visual en el navegador (nunca headless) → pasás al siguiente. Cada paso deja un estado visible y verificable.

---

## 0. Stack y reglas globales

- **Next 16 (App Router) + TypeScript + Tailwind CSS v4**, deploy en Vercel.
- Mobile-first, responsive hasta mobile.
- Foco de teclado visible en todo lo interactivo.
- Respetar `prefers-reduced-motion` (sin animaciones si está activo).
- Nada de `localStorage` en SSR: los componentes que lo usan van con `"use client"` y leen en `useEffect`.
- Data (links y feeds) vive en `lib/` como arrays editables, separada de los componentes.

---

## 1. Sistema de tokens — EL CONTRATO DE DISEÑO

> Esto es ley. Todo color, borde, sombra y radio sale de acá. Prohibido inventar valores sueltos.

### Color (light modern-neobrutalism)
| Token | Hex | Uso |
|---|---|---|
| `--paper` | `#EBE7DB` | fondo de página |
| `--ink` | `#14130F` | bordes, sombras, texto principal |
| `--surface` | `#FFFFFF` | cards, tiles |
| `--muted` | `#6E6A5E` | texto secundario / metadata |
| `--faint` | `#8A857A` | texto tachado / deshabilitado |
| `--violet` | `#6C5CE7` | acento |
| `--lime` | `#BEE63B` | acento |
| `--coral` | `#FF5B43` | acento + estado "vivo/ahora" |
| `--sky` | `#2E8BFF` | acento |
| `--teal` | `#14B8A6` | acento |
| `--gold` | `#FFC93C` | acento |

### Bordes
- Default: `2px solid var(--ink)`
- Énfasis / foco: `3px solid var(--ink)`
- Nunca mezclar 2px y 3px en un mismo componente.

### Sombras (duras, SIN blur — la firma del neobrutalism)
- `--sh-sm: 3px 3px 0 0 var(--ink)`
- `--sh-md: 4px 4px 0 0 var(--ink)`
- `--sh-lg: 6px 6px 0 0 var(--ink)`
- **Hover (levantar):** subir un nivel de sombra + `transform: translate(-1px,-1px)`
- **Active (apretar):** `transform: translate(2px,2px)` y sombra a `0 0 0` (se hunde)
- Una sola sombra por elemento. Jamás stackear.

### Radio
- `3px` en todo (versión moderna; si querés full-raw clásico, bajalo a `0px` — está centralizado).
- `9999px` solo para puntos/indicadores circulares y avatares.

### Tipografía
- **Display / labels / números:** Archivo Black (`--font-head`)
- **Cuerpo / UI:** Space Grotesk (`--font-sans`)
- Labels tipo eyebrow: Archivo Black, uppercase, 10px, letter-spacing 0.04em.
- Cargar ambas de Google Fonts en el layout.

### globals.css (arrancá con esto)
```css
@import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Space+Grotesk:wght@400;500;700&display=swap');

:root {
  --paper:#EBE7DB; --ink:#14130F; --surface:#FFFFFF;
  --muted:#6E6A5E; --faint:#8A857A;
  --violet:#6C5CE7; --lime:#BEE63B; --coral:#FF5B43;
  --sky:#2E8BFF; --teal:#14B8A6; --gold:#FFC93C;
  --sh-sm:3px 3px 0 0 var(--ink);
  --sh-md:4px 4px 0 0 var(--ink);
  --sh-lg:6px 6px 0 0 var(--ink);
  --radius:3px;
  --font-head:'Archivo Black',sans-serif;
  --font-sans:'Space Grotesk',sans-serif;
}
body { background:var(--paper); color:var(--ink); font-family:var(--font-sans); }
```

---

## 2. Estructura de carpetas

```
dashboard-inicio/
├─ app/
│  ├─ page.tsx              ← grilla principal (compone todo)
│  ├─ layout.tsx            ← fuentes + metadata
│  ├─ globals.css           ← tokens de arriba
│  └─ api/
│     └─ news/route.ts      ← fetch + parse de RSS (server-side)
├─ components/
│  ├─ Header.tsx            ← reloj + fecha + clima
│  ├─ Shortcuts.tsx         ← grilla central (protagonista)
│  ├─ News.tsx              ← noticias (riel derecho)
│  ├─ Notes.tsx             ← notas (riel izquierdo, localStorage)
│  └─ widgets/Dolar.tsx     ← mini-widget dólar
├─ lib/
│  ├─ shortcuts.ts          ← tus links
│  └─ feeds.ts              ← RSS por categoría
└─ ...
```

---

## 3. Orden de ejecución

1. Scaffold + tokens + fuentes
2. Shell de layout (grilla header / 3 columnas)
3. Shortcuts (centro) ← lo primero "real"
4. Header (reloj live + clima)
5. Notes (localStorage)
6. News (API route + componente)
7. Pulido (hover/press, responsive, foco, reduced-motion)
8. Deploy + config Brave + extensión Ctrl+T

---

## 4. Prompts por paso

> Pegá el **BLOQUE DE DISEÑO** una vez al inicio de la sesión de Antigravity, y después cada prompt numerado. Si el modelo "pierde" el estilo, volvé a pegar el bloque.

### BLOQUE DE DISEÑO (contexto fijo)
```
Estilo: neobrutalism moderno. Reglas innegociables:
- Bordes: 2px solid var(--ink) (3px en foco/énfasis).
- Sombras DURAS sin blur: var(--sh-sm/md/lg). Hover = subir un nivel + translate(-1px,-1px). Active = translate(2px,2px) y sombra 0.
- Esquinas: radius var(--radius) (3px). Sin gradientes, sin blur, sin sombras suaves.
- Color saturado en bloques, pero con restricción: la mayoría de los tiles son blancos con borde negro; el color va en los chips de íconos, no en todos los fondos.
- Tipografía: Archivo Black (var(--font-head)) para labels/números, Space Grotesk (var(--font-sans)) para el resto.
- Tokens en globals.css ya definidos. Prohibido hex sueltos en componentes: usar var(--token).
- Layout: el CENTRO (grilla de accesos directos) es el protagonista; los rieles laterales lo enmarcan sin pisarlo. NO hay buscador.
- Calidad mínima: responsive a mobile, foco de teclado visible, prefers-reduced-motion respetado, HTML semántico.
```

### Prompt 1 — Scaffold + tokens
```
Creá un proyecto Next 16 con App Router, TypeScript y Tailwind CSS v4.
Configurá app/globals.css con EXACTAMENTE estos tokens [pegá el bloque globals.css de la sección 1].
En app/layout.tsx cargá las fuentes Archivo Black y Space Grotesk y aplicá var(--font-sans) al body.
Dejá app/page.tsx con un H1 de prueba "Dashboard" usando var(--font-head) sobre fondo var(--paper).
No agregues nada más todavía. Quiero verificar que las fuentes y el fondo papel cargan bien.
```

### Prompt 2 — Shell de layout
```
[BLOQUE DE DISEÑO]
En app/page.tsx armá la estructura de layout, todavía con placeholders (cajas vacías rotuladas):
- Barra superior (flex, space-between): a la izquierda una caja ink con texto papel "DOM 28 · BUENAS, VALEN" (Archivo Black, sombra var(--sh-sm) en color var(--violet)); a la derecha dos cajas chicas (clima y reloj).
- Cuerpo: grid de 3 columnas → 140px / 1fr / 150px, gap 14px, align-items start.
  - Columna izquierda: placeholder "NOTAS" y "DÓLAR" (dos cajas apiladas).
  - Columna central: placeholder "GRILLA DE ACCESOS" (caja grande, es la protagonista).
  - Columna derecha: placeholder "NOTICIAS".
En mobile, las 3 columnas pasan a una sola (centro primero, después rieles). Cada caja con borde 2px, radius var(--radius), sombra var(--sh-sm).
```

### Prompt 3 — Shortcuts (centro, protagonista)
```
[BLOQUE DE DISEÑO]
Creá lib/shortcuts.ts exportando un array tipado Shortcut { name, url, icon, chip } donde icon es un nombre de Tabler Icons y chip es uno de los tokens de acento (violet/lime/coral/sky/teal/gold/ink). Llenalo con: GitHub(ink), Vercel(gold), Claude(coral), localhost:3000(lime), Kayasclub(sky), Kalma(teal), Steam(violet), YouTube(coral). [los edito yo después]
Creá components/Shortcuts.tsx: grilla de 3 columnas (2 en tablet, 2 en mobile) de tiles.
Cada tile: <a> con fondo var(--surface), borde 2px var(--ink), sombra var(--sh-sm), radius var(--radius), centrado:
  - chip de 36px (borde 2px, sombra 2px 2px 0 var(--ink), fondo = color del acento) con el ícono Tabler adentro (blanco si el chip es oscuro, ink si es claro como lime/gold).
  - label debajo en Space Grotesk 12px bold.
Hover: el tile sube a var(--sh-md) + translate(-1px,-1px). Active: translate(2px,2px) + sombra 0.
Sumá al final un tile "Agregar" con borde y chip dashed, sin sombra, que por ahora no hace nada.
Montalo en la columna central de page.tsx.
Instalá @tabler/icons-react para los íconos.
```

### Prompt 4 — Header (reloj live + clima)
```
[BLOQUE DE DISEÑO]
Creá components/Header.tsx ("use client"):
- Caja izquierda ink/papel con la fecha en español ("DOM 28 JUN") + saludo, Archivo Black, sombra var(--sh-sm) en var(--violet). La fecha se calcula con Intl.DateTimeFormat('es-AR').
- Derecha: caja blanca con clima ("23°" + ícono ti-cloud) y caja var(--lime) con el reloj en Archivo Black que actualiza cada segundo (HH:MM) vía useEffect + setInterval, limpiando el interval al desmontar.
Para el clima: pegá a la API de Open-Meteo (sin API key) con lat/lon de Buenos Aires (-34.61, -58.38), fetch en el cliente, fallback a "—" si falla.
Reemplazá los placeholders de la barra superior por este Header.
```

### Prompt 5 — Notes (localStorage)
```
[BLOQUE DE DISEÑO]
Creá components/Notes.tsx ("use client"): caja blanca con eyebrow "NOTAS".
- Lista de tareas { id, text, done }. Persistencia en localStorage (key "dash-notes"), leída en useEffect (no en SSR).
- Cada ítem: un cuadradito de color con borde 1.5px ink (coral si urgente, sino sky) + texto; done = tachado y color var(--faint).
- Input abajo (borde 2px ink, radius var(--radius)) para agregar con Enter. Click en un ítem lo marca done.
Montalo en la columna izquierda, arriba del widget Dólar.
```

### Prompt 6 — News (API route + componente)
```
[BLOQUE DE DISEÑO]
Creá lib/feeds.ts: array de { category, name, url } con las fuentes de feeds.ts de este documento (sección 5).
Creá app/api/news/route.ts: server-side, hace fetch de todos los feeds, los parsea con rss-parser, normaliza a { title, source, category, link, date }, ordena por fecha desc, cachea 15 min (revalidate), devuelve JSON. Manejar feeds que fallan sin romper el resto (Promise.allSettled).
Creá components/News.tsx ("use client"): caja blanca con eyebrow "NOTICIAS" y un punto var(--coral). Badges de categoría (Archivo Black, boxy, borde 1.5px ink) que filtran; la activa va con fondo var(--coral) texto blanco. Lista de titulares (separados por línea 1.5px ink), con fuente + "Xh" en Archivo Black 9px var(--muted). Fetch a /api/news.
Instalá rss-parser. Montalo en la columna derecha.
```

### Prompt 7 — Pulido
```
[BLOQUE DE DISEÑO]
Pasada de pulido sobre todo el dashboard:
- Verificá que TODOS los interactivos tengan estados hover (subir sombra + translate -1,-1) y active (translate 2,2 + sombra 0) consistentes.
- Foco de teclado visible: outline de 3px var(--ink) con offset en links, tiles, input y badges.
- Envolvé las transiciones en @media (prefers-reduced-motion: reduce) para anularlas.
- Responsive: revisá mobile (1 columna, centro primero) y tablet (2 columnas en la grilla).
- Asegurá HTML semántico: <header>, <main>, <nav> para los badges, jerarquía de headings.
```

### Prompt 8 — Deploy
```
Preparalo para Vercel: build limpio (sin errores de tipos ni de lint), variables de entorno si hicieran falta, y commit. Después lo conecto al repo y deployeo.
```

---

## 5. Data de arranque

### lib/shortcuts.ts (editá los URLs a gusto)
```ts
export type Shortcut = { name: string; url: string; icon: string; chip: string };
export const shortcuts: Shortcut[] = [
  { name: "GitHub",    url: "https://github.com",                  icon: "brand-github",   chip: "var(--ink)"    },
  { name: "Vercel",    url: "https://vercel.com/dashboard",        icon: "triangle",       chip: "var(--gold)"   },
  { name: "Claude",    url: "https://claude.ai",                   icon: "sparkles",       chip: "var(--coral)"  },
  { name: "localhost", url: "http://localhost:3000",               icon: "terminal-2",     chip: "var(--lime)"   },
  { name: "Kayasclub", url: "https://kayasclub-web.vercel.app",    icon: "bottle",         chip: "var(--sky)"    },
  { name: "Kalma",     url: "#",                                   icon: "calendar-heart", chip: "var(--teal)"   },
  { name: "Steam",     url: "https://store.steampowered.com",      icon: "brand-steam",    chip: "var(--violet)" },
  { name: "YouTube",   url: "https://youtube.com",                 icon: "brand-youtube",  chip: "var(--coral)"  },
];
```

### lib/feeds.ts (CONFIRMÁ cada endpoint al armar — algunos cambian la ruta)
```ts
export const feeds = [
  // IA / Tech en español
  { category: "Tech", name: "Xataka",       url: "https://www.xataka.com/tag/feeds/rss2.xml" },
  { category: "Tech", name: "Genbeta",      url: "https://www.genbeta.com/tag/feeds/rss2.xml" },
  { category: "Tech", name: "Hipertextual", url: "https://hipertextual.com/feed" },
  // IA en inglés (ancla confiable)
  { category: "IA",   name: "Hacker News",  url: "https://hnrss.org/frontpage" },
  // Gaming
  { category: "Gaming", name: "Vandal",     url: "https://vandal.elespanol.com/xml.cfm" },
  { category: "Gaming", name: "3DJuegos",   url: "https://www.3djuegos.com/rss/noticias.xml" },
  // Argentina
  { category: "ARG",  name: "Infobae",      url: "https://www.infobae.com/feeds/rss/" },
  { category: "ARG",  name: "Página/12",    url: "https://www.pagina12.com.ar/rss/portada" },
];
```
> `hnrss.org/frontpage` es el más estable, dejalo como ancla. Los demás validalos abriendo la URL en el navegador: si te baja XML, anda. Si alguno tira 404, buscá "[medio] rss" y reemplazá la línea.

---

## 6. Config de Brave + extensión Ctrl+T (al final, post-deploy)

### Homepage + arranque (nativo, sin extensión)
- `Settings → Get started → On startup → Open a specific page or set of pages` → tu URL de Vercel.
- `Settings → Appearance → Show home button → ON` → tu URL.

### Extensión mínima para pisar el Ctrl+T (new tab)
Carpeta con 2 archivos. Cargala en `brave://extensions` → modo desarrollador → "Cargar descomprimida".

`manifest.json`
```json
{
  "manifest_version": 3,
  "name": "Mi Dashboard New Tab",
  "version": "1.0",
  "chrome_url_overrides": { "newtab": "redirect.html" }
}
```

`redirect.html`
```html
<!doctype html>
<meta http-equiv="refresh" content="0; url=https://TU-DASHBOARD.vercel.app">
<script>location.replace("https://TU-DASHBOARD.vercel.app")</script>
```
> Reemplazá la URL por la tuya. El redirect instantáneo hace que Ctrl+T te lleve directo al dashboard.
