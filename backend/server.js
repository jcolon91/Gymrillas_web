'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

// ---------- Seguridad / parsing ----------
const PROD = process.env.NODE_ENV === 'production';
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Cabeceras de seguridad (sin dependencias extra)
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  if (PROD) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

const origins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
if (PROD && !origins.length) {
  console.warn('[seguridad] CORS_ORIGINS vacío en producción: se rechazarán las peticiones cross-origin.');
}
app.use(cors({
  origin: (origin, cb) => {
    // Sin Origin (same-origin, curl, apps móviles) se permite.
    if (!origin) return cb(null, true);
    // En dev sin allowlist se permite todo; en prod hay que listar los orígenes.
    if (!origins.length) return cb(null, !PROD);
    return cb(null, origins.includes(origin));
  },
  credentials: true,
}));

// Rate limit global a la API
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false }));
// Límite más estricto en auth
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 40 }));

// ---------- Healthcheck ----------
app.get('/api/health', (_req, res) => res.json({ ok: true, servicio: 'gymrillas-api', ts: new Date().toISOString() }));

// ---------- Rutas API ----------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/inventario', require('./routes/inventario'));
app.use('/api/ordenes', require('./routes/ordenes'));
app.use('/api/contabilidad', require('./routes/contabilidad'));
app.use('/api/envios', require('./routes/envios'));
app.use('/api/pagos', require('./routes/pagos'));
app.use('/api/cupones', require('./routes/cupones'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/carrito', require('./routes/carrito'));
app.use('/api/dashboard', require('./routes/dashboard'));

// ---------- Archivos subidos ----------
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '7d' }));

// ---------- Panel admin (estático) ----------
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

// ---------- Storefront (estático) ----------
const FRONT = path.join(__dirname, '..', 'frontend');
// MIME explícito para 3D (GLB/AR) y video spin del drop.
const MIME_EXTRA = { '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.usdz': 'model/vnd.usdz+zip', '.mp4': 'video/mp4' };

// HTML del storefront: se sirve con ?v=<hash del contenido> en cada CSS/JS local.
// Así esos assets pueden ir con caché inmutable de 1 año y, al editarlos, el HTML
// apunta solo a la URL nueva. Sin paso de build ni versiones a mano.
const hashes = new Map(); // ruta absoluta → { mtime, v }
function versionDe(abs) {
  const mtime = fs.statSync(abs).mtimeMs;
  const c = hashes.get(abs);
  if (c && c.mtime === mtime) return c.v;
  const v = crypto.createHash('md5').update(fs.readFileSync(abs)).digest('hex').slice(0, 10);
  hashes.set(abs, { mtime, v });
  return v;
}
const REF_ASSET = /((?:href|src)=")(assets\/(?:css|js)\/[\w.-]+\.(?:css|js))(")/g;
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  let rel;
  try { rel = decodeURIComponent(req.path); } catch (e) { return next(); }
  if (rel.endsWith('/')) rel += 'index.html';
  else if (!path.extname(rel)) rel += '.html';
  if (!rel.endsWith('.html')) return next();
  const abs = path.join(FRONT, rel);
  if (!abs.startsWith(FRONT + path.sep)) return next();
  let html;
  try { html = fs.readFileSync(abs, 'utf8'); } catch (e) { return next(); }
  html = html.replace(REF_ASSET, (m, a, ref, z) => {
    try { return a + ref + '?v=' + versionDe(path.join(FRONT, ref)) + z; } catch (e) { return m; }
  });
  res.set('Cache-Control', 'no-cache').type('html').send(html);
});

app.use(express.static(FRONT, {
  extensions: ['html'],
  setHeaders: function (res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (MIME_EXTRA[ext]) res.setHeader('Content-Type', MIME_EXTRA[ext]);
    // HTML siempre fresco. Assets con ?v=<hash> (los pone el middleware de arriba) y
    // fuentes: caché de 1 año inmutable. El resto se reemplaza a veces con el mismo
    // nombre, así que caché corto + revalidación (ETag) en segundo plano.
    if (ext === '.html') res.setHeader('Cache-Control', 'no-cache');
    else if (res.req.query.v || ext === '.woff2') res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    else res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
  },
}));

// Ruta inexistente del storefront → 404 real (no la home con 200: confunde a Google
// y devolvía HTML para /favicon.ico, imágenes rotas, etc.). Deja pasar /api y /admin.
app.get(/^\/(?!api|admin|uploads).*/, (req, res) => {
  res.status(404).sendFile(path.join(FRONT, '404.html'), (err) => { if (err) res.end('No encontrado'); });
});

// ---------- Manejo de errores ----------
app.use((err, _req, res, _next) => {
  console.error('[error]', err.message);
  if (err.message && err.message.includes('Formato no permitido')) return res.status(400).json({ error: err.message });
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Archivo muy grande (máx 8MB)' });
  res.status(500).json({ error: 'Error interno' });
});

app.listen(PORT, () => {
  console.log(`✓ GYMRILLAS API en puerto ${PORT} — ${process.env.NODE_ENV || 'development'}`);
});
