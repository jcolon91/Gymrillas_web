'use strict';
const express = require('express');
const { query, tx } = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/inventario — vista completa por variante
router.get('/', requireAdmin, async (req, res) => {
  try {
    const bajo = req.query.bajo === '1';
    const sql = `
      SELECT v.id AS variante_id, v.sku, v.talla, v.color, v.activo,
             p.id AS producto_id, p.nombre AS producto, p.categoria,
             COALESCE(i.stock,0) AS stock, COALESCE(i.stock_minimo,5) AS stock_minimo,
             p.costo, p.precio_base
      FROM variantes v
      JOIN productos p ON p.id = v.producto_id
      LEFT JOIN inventario i ON i.variante_id = v.id
      ${bajo ? 'WHERE COALESCE(i.stock,0) <= COALESCE(i.stock_minimo,5)' : ''}
      ORDER BY (COALESCE(i.stock,0) <= COALESCE(i.stock_minimo,5)) DESC, p.nombre, v.talla`;
    const { rows } = await query(sql);
    res.json(rows);
  } catch (e) {
    console.error('[inventario]', e.message);
    res.status(500).json({ error: 'Error' });
  }
});

// GET /api/inventario/resumen — totales para dashboard
router.get('/resumen', requireAdmin, async (_req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        COALESCE(SUM(i.stock),0) AS unidades_total,
        COALESCE(SUM(i.stock * COALESCE(p.costo,0)),0) AS valor_costo,
        COALESCE(SUM(i.stock * p.precio_base),0) AS valor_retail,
        COUNT(*) FILTER (WHERE i.stock <= i.stock_minimo) AS variantes_bajas,
        COUNT(*) FILTER (WHERE i.stock = 0) AS variantes_agotadas
      FROM inventario i JOIN variantes v ON v.id=i.variante_id JOIN productos p ON p.id=v.producto_id`);
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Error' });
  }
});

// PUT /api/inventario/:varianteId — fijar stock absoluto (registra delta)
router.put('/:varianteId', requireAdmin, async (req, res) => {
  try {
    const { stock, stock_minimo, motivo, referencia } = req.body || {};
    const vid = req.params.varianteId;
    await tx(async (c) => {
      const cur = await c.query('SELECT stock FROM inventario WHERE variante_id=$1', [vid]);
      const actual = cur.rows.length ? cur.rows[0].stock : 0;
      const nuevo = stock != null ? Math.max(0, parseInt(stock, 10) || 0) : actual;
      const delta = nuevo - actual;
      await c.query(`INSERT INTO inventario (variante_id, stock, stock_minimo) VALUES ($1,$2,$3)
                     ON CONFLICT (variante_id) DO UPDATE SET stock=$2, stock_minimo=COALESCE($3,inventario.stock_minimo)`,
        [vid, nuevo, stock_minimo != null ? parseInt(stock_minimo, 10) : null]);
      if (delta !== 0) {
        await c.query(`INSERT INTO inventario_movimientos (variante_id, delta, motivo, referencia, usuario_id)
                       VALUES ($1,$2,$3,$4,$5)`,
          [vid, delta, motivo || 'ajuste', referencia || null, req.usuario.id]);
      }
    });
    res.json({ ok: true });
  } catch (e) {
    console.error('[inventario PUT]', e.message);
    res.status(500).json({ error: 'Error al ajustar inventario' });
  }
});

// POST /api/inventario/:varianteId/entrada — sumar stock (compra a proveedor)
router.post('/:varianteId/entrada', requireAdmin, async (req, res) => {
  try {
    const { cantidad, referencia, costo_total } = req.body || {};
    const n = parseInt(cantidad, 10);
    if (!n || n <= 0) return res.status(400).json({ error: 'Cantidad inválida' });
    const vid = req.params.varianteId;
    await tx(async (c) => {
      await c.query(`INSERT INTO inventario (variante_id, stock) VALUES ($1,$2)
                     ON CONFLICT (variante_id) DO UPDATE SET stock = inventario.stock + $2`, [vid, n]);
      await c.query(`INSERT INTO inventario_movimientos (variante_id, delta, motivo, referencia, usuario_id)
                     VALUES ($1,$2,'compra',$3,$4)`, [vid, n, referencia || null, req.usuario.id]);
      // registrar gasto si dieron costo
      if (costo_total) {
        await c.query(`INSERT INTO movimientos_contables (tipo, categoria, descripcion, monto)
                       VALUES ('gasto','inventario',$1,$2)`,
          [`Compra inventario ${referencia || ''}`.trim(), costo_total]);
      }
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Error' });
  }
});

// GET /api/inventario/:varianteId/movimientos
router.get('/:varianteId/movimientos', requireAdmin, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT m.*, u.nombre AS usuario FROM inventario_movimientos m
       LEFT JOIN usuarios u ON u.id=m.usuario_id
       WHERE variante_id=$1 ORDER BY creado_en DESC LIMIT 100`, [req.params.varianteId]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Error' });
  }
});

module.exports = router;
