'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { firmarToken, requireAuth } = require('../middleware/auth');

const router = express.Router();
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '');

// POST /api/auth/registro
router.post('/registro', async (req, res) => {
  try {
    const { nombre, apellido, email, password, telefono, acepta_marketing } = req.body || {};
    if (!nombre || !email || !password) return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
    if (!emailOk(email)) return res.status(400).json({ error: 'Email inválido' });
    if (String(password).length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });

    const existe = await query('SELECT id FROM usuarios WHERE email=$1', [email.toLowerCase()]);
    if (existe.rows.length) return res.status(409).json({ error: 'Ese email ya está registrado' });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      `INSERT INTO usuarios (nombre, apellido, email, password_hash, telefono, acepta_marketing)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, nombre, apellido, email, rol`,
      [nombre, apellido || null, email.toLowerCase(), hash, telefono || null, !!acepta_marketing]
    );
    const u = rows[0];
    res.status(201).json({ token: firmarToken(u), usuario: u });
  } catch (e) {
    console.error('[auth/registro]', e.message);
    res.status(500).json({ error: 'Error al registrar' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });
    const { rows } = await query('SELECT * FROM usuarios WHERE email=$1', [email.toLowerCase()]);
    if (!rows.length) return res.status(401).json({ error: 'Credenciales inválidas' });
    const u = rows[0];
    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });
    res.json({
      token: firmarToken(u),
      usuario: { id: u.id, nombre: u.nombre, apellido: u.apellido, email: u.email, rol: u.rol, foto_url: u.foto_url },
    });
  } catch (e) {
    console.error('[auth/login]', e.message);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// GET /api/auth/yo
router.get('/yo', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, nombre, apellido, email, telefono, rol, foto_url, acepta_marketing, creado_en FROM usuarios WHERE id=$1',
      [req.usuario.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Error' });
  }
});

// PUT /api/auth/yo — actualizar perfil
router.put('/yo', requireAuth, async (req, res) => {
  try {
    const { nombre, apellido, telefono, foto_url, acepta_marketing } = req.body || {};
    const { rows } = await query(
      `UPDATE usuarios SET nombre=COALESCE($1,nombre), apellido=COALESCE($2,apellido),
         telefono=COALESCE($3,telefono), foto_url=COALESCE($4,foto_url),
         acepta_marketing=COALESCE($5,acepta_marketing)
       WHERE id=$6 RETURNING id, nombre, apellido, email, telefono, foto_url, acepta_marketing`,
      [nombre, apellido, telefono, foto_url, acepta_marketing, req.usuario.id]
    );
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

// PUT /api/auth/password
router.put('/password', requireAuth, async (req, res) => {
  try {
    const { actual, nueva } = req.body || {};
    if (!nueva || String(nueva).length < 8) return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
    const { rows } = await query('SELECT password_hash FROM usuarios WHERE id=$1', [req.usuario.id]);
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    const ok = await bcrypt.compare(actual || '', rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: 'La contraseña actual no es correcta' });
    const hash = await bcrypt.hash(nueva, 10);
    await query('UPDATE usuarios SET password_hash=$1 WHERE id=$2', [hash, req.usuario.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Error' });
  }
});

module.exports = router;
