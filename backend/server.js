'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
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
app.use(express.static(FRONT, {
  extensions: ['html'],
  setHeaders: function (res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (MIME_EXTRA[ext]) res.setHeader('Content-Type', MIME_EXTRA[ext]);
    // HTML siempre fresco; assets (img/css/js/webp/mp4/fonts) con caché largo.
    if (ext === '.html') res.setHeader('Cache-Control', 'no-cache');
    else res.setHeader('Cache-Control', 'public, max-age=2592000, immutable'); // 30 días
  },
}));

// Fallback storefront (deja pasar /api y /admin)
app.get(/^\/(?!api|admin|uploads).*/, (req, res) => {
  res.sendFile(path.join(FRONT, 'index.html'), (err) => { if (err) res.status(404).send('No encontrado'); });
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
