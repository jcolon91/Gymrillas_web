'use strict';
const jwt = require('jsonwebtoken');

// El secreto JWT es OBLIGATORIO en producción; en dev usa un fallback local.
const SECRET = process.env.JWT_SECRET || (
  process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('FATAL: define JWT_SECRET en el entorno (mín. 32 caracteres) antes de arrancar en producción'); })()
    : 'dev_secret_solo_local_no_usar_en_prod'
);
if (process.env.NODE_ENV === 'production' && SECRET.length < 32) {
  throw new Error('FATAL: JWT_SECRET debe tener al menos 32 caracteres en producción');
}

function firmarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, email: usuario.email, rol: usuario.rol, nombre: usuario.nombre },
    SECRET,
    { expiresIn: process.env.JWT_EXPIRES || '7d' }
  );
}

// Extrae token del header Authorization: Bearer xxx
function leerToken(req) {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) return h.slice(7);
  return null;
}

// Requiere sesión válida
function requireAuth(req, res, next) {
  const token = leerToken(req);
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  try {
    req.usuario = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// Requiere rol admin
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'Acceso solo para administradores' });
    }
    next();
  });
}

// Sesión opcional (carrito invitado, etc.)
function maybeAuth(req, _res, next) {
  const token = leerToken(req);
  if (token) {
    try { req.usuario = jwt.verify(token, SECRET); } catch { /* ignora */ }
  }
  next();
}

module.exports = { firmarToken, requireAuth, requireAdmin, maybeAuth };
