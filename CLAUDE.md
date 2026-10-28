# GYMRILLAS — memoria del proyecto para Claude

Tienda online de ropa/accesorios fitness de Puerto Rico. El dueño (Jesús) trabaja en español;
responde y comenta el código en español. Ver `README.md` para el stack y la estructura.

## Cómo está armado
- **Sin build step.** Storefront (`frontend/`) y admin (`admin/`) son HTML/CSS/JS vanilla servidos
  por Express (`backend/server.js`, puerto 4000) detrás de Nginx en un VPS Hostinger (PM2).
- Los archivos suelen llegar por "Add files via upload" de GitHub: **los dotfiles no suben**
  (por eso faltaban `.gitignore` y `backend/.env.example`).
- Dominio: `https://gymrillas.com` (canonical, OG, sitemap y JSON-LD lo usan fijo).

## Convenciones del storefront
- **Bilingüe ES/EN** (`assets/js/i18n.js`): el español va visible en el HTML y el inglés en
  `data-en`, `data-en-html`, `data-en-ph`, `data-en-alt`, `data-en-aria`. En JS usar
  `T('es','en')` y escuchar `gym:langchange` para re-pintar. Todo texto nuevo debe llevar su EN.
- Header/drawer/footer están **copiados en cada página** (13 HTML + `404.html`): un cambio ahí
  se aplica a todos los archivos.
- Imágenes locales en **WebP** (`assets/img/`). No subir JPG/PNG nuevos sin convertir
  (Pillow: `quality=80, method=6`).
- Fuente Saira **auto-hospedada** (`assets/fonts/`, subset latin: 400, 500, 700 italic,
  800 italic). No volver a Google Fonts. Si se usa otro peso, añadir su `@font-face` en `main.css`.
- Videos del drop: `<video data-lazy-video>` con `<source data-src>`; `main.js` los carga al
  acercarse al viewport y los pausa fuera de pantalla.

## Caché (importante)
- `server.js` sirve cada HTML inyectando `?v=<hash del contenido>` en los `<link>`/`<script>`
  de `assets/css|js` → esos assets van con caché inmutable de 1 año y se invalidan solos al
  cambiar. **No hace falta versionar a mano.**
- Imágenes/videos sin `?v=`: `max-age=1 día` + `stale-while-revalidate`, porque a veces se
  reemplazan con el mismo nombre. Fuentes `.woff2`: 1 año inmutable.
- Rutas inexistentes → `404.html` con status 404 (usa `<base href="/">`).

## Verificar cambios
```bash
cd backend && npm ci && node server.js   # http://localhost:4000
```
Playwright + Chromium vienen preinstalados en el entorno cloud. Revisar consola sin errores en
home, tienda, producto (`?p=gloves`), carrito y la 404, en 390px y 1280px de ancho.

## Bitácora de optimización
- **2026-10-28** — Fuentes locales (fuera Google Fonts y la Saira Condensed sin uso) ·
  JPG→WebP (−43%, 473→271 KB) · videos del drop re-codificados (−42%) y con carga diferida ·
  caché con versionado automático + 404 real · favicon, canonical, Open Graph, `robots.txt`,
  `sitemap.xml`, `noindex` en carrito/checkout/cuenta/login, JSON-LD Organization (home) y
  Product (producto) · header móvil: idioma/tema pasan al drawer <760px (tapaban el logo) ·
  `.gitignore` y `backend/.env.example` (setup.sh fallaba sin él).

## Pendientes conocidos
- Hero y tiles de la home son PNG en `d8j0ntlcm91z4.cloudfront.net`, el logo está en
  `assets.zyrosite.com` y `nosotros.html` usa Unsplash: bajarlos, pasarlos a WebP y servirlos
  locales (el hero es la imagen LCP). El entorno cloud no tiene acceso a esos hosts.
- Drop 001: el countdown cerró el 2026-07-10; la sección de pre-orden sigue en la home.
- Links de pago del drop vacíos (`PAGOS` en `main.js`).
- Sin uso: `img/drop-*-back.jpg`, `img/tienda/socks-collection.jpg`, `img/tienda/socks-white.jpg`.
- El admin (`admin/index.html`) aún carga Saira desde Google Fonts.
