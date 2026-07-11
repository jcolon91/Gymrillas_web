'use strict';
const express = require('express');
const { query } = require('../db');
const { requireAdmin, maybeAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/reviews  body: { producto_id, rating, titulo, comentario, autor }
router.post('/', maybeAuth, async (req, res) => {
  try {
    const { producto_id, rating, titulo, comentario, autor } = req.body || {};
    if (!producto_id || !rating) return res.status(400).json({ error: 'Producto y rating requeridos' });
    if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating debe ser 1-5' });
    const { rows } = await query(
      `INSERT INTO reviews (producto_id, usuario_id, autor, rating, titulo, comentario, aprobado)
       VALUES ($1,$2,$3,$4,$5,$6,FALSE) RETURNING id`,
      [producto_id, req.usuario?.id || null, autor || req.usuario?.nombre || 'Anónimo', rating, titulo || null, comentario || null]);
    res.status(201).json({ ok: true, id: rows[0].id, nota: 'Tu reseña será publicada tras revisión.' });
  } catch (e) { res.status(500).json({ error: 'Error' }); }
});

// ADMIN
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const soloPend = req.query.pendientes === '1';
    const { rows } = await query(`
      SELECT r.*, p.nombre AS producto FROM reviews r JOIN productos p ON p.id=r.producto_id
      ${soloPend ? 'WHERE r.aprobado=FALSE' : ''} ORDER BY r.creado_en DESC LIMIT 200`);
    res.json(rows);
  } catch (e) { console.error('[reviews admin]', e.message); res.status(500).json({ error: 'Error' }); }
});
router.put('/admin/:id', requireAdmin, async (req, res) => {
  try {
    const { aprobado } = req.body || {};
    await query('UPDATE reviews SET aprobado=$1 WHERE id=$2', [!!aprobado, req.params.id]);
    res.json({ ok: true });
  } catch (e) { console.error('[reviews put]', e.message); res.status(500).json({ error: 'Error' }); }
});
router.delete('/admin/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM reviews WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { console.error('[reviews delete]', e.message); res.status(500).json({ error: 'Error' }); }
});

module.exports = router;
