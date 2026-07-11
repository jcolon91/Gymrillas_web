'use strict';
const express = require('express');
const { query } = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
const num = (v, d = 0) => { const n = parseFloat(v); return isNaN(n) ? d : n; };

// POST /api/cupones/validar  body: { codigo, subtotal }
router.post('/validar', async (req, res) => {
  try {
    const { codigo, subtotal } = req.body || {};
    if (!codigo) return res.status(400).json({ error: 'Código requerido' });
    const { rows } = await query('SELECT * FROM cupones WHERE codigo=$1 AND activo=TRUE', [String(codigo).toUpperCase()]);
    if (!rows.length) return res.status(404).json({ valido: false, error: 'Cupón inválido' });
    const c = rows[0];
    if (c.expira_en && new Date(c.expira_en) < new Date()) return res.json({ valido: false, error: 'Cupón expirado' });
    if (c.usos_max && c.usos_actuales >= c.usos_max) return res.json({ valido: false, error: 'Cupón agotado' });
    const sub = num(subtotal);
    if (sub < num(c.minimo_compra)) return res.json({ valido: false, error: `Compra mínima $${c.minimo_compra}` });
    const descuento = c.tipo === 'porcentaje' ? +(sub * (num(c.valor)/100)).toFixed(2) : Math.min(num(c.valor), sub);
    res.json({ valido: true, codigo: c.codigo, tipo: c.tipo, valor: num(c.valor), descuento });
  } catch (e) { res.status(500).json({ error: 'Error' }); }
});

// Valida tipo/valor del cupón. Devuelve string de error o null.
function validarCupon({ tipo, valor, minimo_compra }) {
  if (!['porcentaje', 'fijo'].includes(tipo)) return 'Tipo inválido (porcentaje o fijo)';
  const v = parseFloat(valor);
  if (isNaN(v) || v < 0) return 'El valor debe ser un número ≥ 0';
  if (tipo === 'porcentaje' && v > 100) return 'El porcentaje no puede ser mayor a 100';
  if (minimo_compra != null && minimo_compra !== '' && parseFloat(minimo_compra) < 0) return 'La compra mínima no puede ser negativa';
  return null;
}

// ADMIN
router.get('/admin', requireAdmin, async (_req, res) => {
  try {
    const { rows } = await query('SELECT * FROM cupones ORDER BY id DESC');
    res.json(rows);
  } catch (e) { console.error('[cupones admin]', e.message); res.status(500).json({ error: 'Error' }); }
});
router.post('/admin', requireAdmin, async (req, res) => {
  try {
    const { codigo, tipo, valor, minimo_compra, usos_max, expira_en, activo } = req.body || {};
    if (!codigo || !tipo || valor == null) return res.status(400).json({ error: 'Código, tipo y valor requeridos' });
    const errV = validarCupon({ tipo, valor, minimo_compra });
    if (errV) return res.status(400).json({ error: errV });
    const { rows } = await query(
      `INSERT INTO cupones (codigo, tipo, valor, minimo_compra, usos_max, expira_en, activo)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [String(codigo).toUpperCase(), tipo, valor, minimo_compra || 0, usos_max || null, expira_en || null, activo !== false]);
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Ese código ya existe' });
    res.status(500).json({ error: 'Error' });
  }
});
router.put('/admin/:id', requireAdmin, async (req, res) => {
  try {
    const { tipo, valor, minimo_compra, usos_max, expira_en, activo } = req.body || {};
    if (tipo != null || valor != null) {
      const errV = validarCupon({ tipo: tipo || 'porcentaje', valor: valor == null ? 0 : valor, minimo_compra });
      if (errV) return res.status(400).json({ error: errV });
    }
    const { rows } = await query(
      `UPDATE cupones SET tipo=COALESCE($1,tipo), valor=COALESCE($2,valor), minimo_compra=COALESCE($3,minimo_compra),
         usos_max=$4, expira_en=$5, activo=COALESCE($6,activo) WHERE id=$7 RETURNING *`,
      [tipo, valor, minimo_compra, usos_max || null, expira_en || null,
       typeof activo === 'boolean' ? activo : null, req.params.id]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: 'Error' }); }
});
router.delete('/admin/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM cupones WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { console.error('[cupones delete]', e.message); res.status(500).json({ error: 'Error' }); }
});

module.exports = router;
