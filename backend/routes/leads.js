'use strict';
const express = require('express');
const { query } = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '');

// POST /api/leads  body: { email, nombre, origen }
router.post('/', async (req, res) => {
  try {
    const { email, nombre, origen } = req.body || {};
    if (!emailOk(email)) return res.status(400).json({ error: 'Email inválido' });
    const { rows } = await query(
      `INSERT INTO leads (email, nombre, origen) VALUES ($1,$2,$3)
       ON CONFLICT (email) DO UPDATE SET nombre=COALESCE(EXCLUDED.nombre, leads.nombre)
       RETURNING id, email`,
      [email.toLowerCase(), nombre || null, origen || 'popup']);
    res.status(201).json({ ok: true, id: rows[0].id });
  } catch (e) { res.status(500).json({ error: 'Error' }); }
});

// GET /api/leads/admin
router.get('/admin', requireAdmin, async (_req, res) => {
  try {
    const { rows } = await query('SELECT * FROM leads ORDER BY creado_en DESC LIMIT 1000');
    res.json(rows);
  } catch (e) { console.error('[leads admin]', e.message); res.status(500).json({ error: 'Error' }); }
});

// Celda CSV segura: comilla siempre y neutraliza fórmulas (=,+,-,@) -> anti CSV injection.
const csvCell = (v) => {
  let s = String(v == null ? '' : v);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
};

// GET /api/leads/admin/export.csv
router.get('/admin/export.csv', requireAdmin, async (_req, res) => {
  try {
    const { rows } = await query('SELECT email, nombre, origen, creado_en FROM leads ORDER BY creado_en DESC');
    const csv = 'Email,Nombre,Origen,Fecha\n' + rows.map(r =>
      [r.email, r.nombre || '', r.origen, r.creado_en.toISOString().slice(0, 10)].map(csvCell).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="leads-gymrillas.csv"');
    res.send(csv);
  } catch (e) { console.error('[leads csv]', e.message); res.status(500).json({ error: 'Error' }); }
});

module.exports = router;
