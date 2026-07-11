'use strict';
const express = require('express');
const { query } = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/contabilidad/resumen?desde=&hasta=
router.get('/resumen', requireAdmin, async (req, res) => {
  try {
    const desde = req.query.desde || '2000-01-01';
    const hasta = req.query.hasta || '2999-12-31';

    const tot = await query(`
      SELECT
        COALESCE(SUM(monto) FILTER (WHERE tipo='ingreso'),0) AS ingresos,
        COALESCE(SUM(monto) FILTER (WHERE tipo='gasto'),0) AS gastos
      FROM movimientos_contables WHERE fecha BETWEEN $1 AND $2`, [desde, hasta]);

    // margen bruto estimado de ventas (precio - costo) de órdenes pagadas+
    const margen = await query(`
      SELECT COALESCE(SUM((oi.precio_unitario - oi.costo_unitario) * oi.cantidad),0) AS margen_bruto,
             COALESCE(SUM(oi.costo_unitario * oi.cantidad),0) AS costo_productos_vendidos,
             COUNT(DISTINCT o.id) AS ordenes_pagadas
      FROM ordenes o JOIN orden_items oi ON oi.orden_id=o.id
      WHERE o.estado IN ('pagada','procesando','enviada','entregada')
        AND o.creado_en::date BETWEEN $1 AND $2`, [desde, hasta]);

    const porCat = await query(`
      SELECT tipo, categoria, SUM(monto) AS total
      FROM movimientos_contables WHERE fecha BETWEEN $1 AND $2
      GROUP BY tipo, categoria ORDER BY total DESC`, [desde, hasta]);

    const r = tot.rows[0];
    const utilidad = parseFloat(r.ingresos) - parseFloat(r.gastos);
    res.json({
      ingresos: parseFloat(r.ingresos),
      gastos: parseFloat(r.gastos),
      utilidad_neta: +utilidad.toFixed(2),
      margen_bruto: parseFloat(margen.rows[0].margen_bruto),
      costo_productos_vendidos: parseFloat(margen.rows[0].costo_productos_vendidos),
      ordenes_pagadas: parseInt(margen.rows[0].ordenes_pagadas, 10),
      por_categoria: porCat.rows,
    });
  } catch (e) {
    console.error('[contabilidad resumen]', e.message);
    res.status(500).json({ error: 'Error' });
  }
});

// GET /api/contabilidad/mensual?anio=YYYY — P&L por mes
router.get('/mensual', requireAdmin, async (req, res) => {
  try {
    const anio = parseInt(req.query.anio, 10) || new Date().getFullYear();
    const { rows } = await query(`
      SELECT EXTRACT(MONTH FROM fecha)::int AS mes,
             COALESCE(SUM(monto) FILTER (WHERE tipo='ingreso'),0) AS ingresos,
             COALESCE(SUM(monto) FILTER (WHERE tipo='gasto'),0) AS gastos
      FROM movimientos_contables
      WHERE EXTRACT(YEAR FROM fecha)=$1
      GROUP BY mes ORDER BY mes`, [anio]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Error' }); }
});

// GET /api/contabilidad/movimientos?tipo=&desde=&hasta=
router.get('/movimientos', requireAdmin, async (req, res) => {
  try {
    const { tipo } = req.query;
    const desde = req.query.desde || '2000-01-01';
    const hasta = req.query.hasta || '2999-12-31';
    const args = [desde, hasta]; let extra = '';
    if (tipo) { args.push(tipo); extra = `AND tipo=$${args.length}`; }
    const { rows } = await query(
      `SELECT * FROM movimientos_contables WHERE fecha BETWEEN $1 AND $2 ${extra} ORDER BY fecha DESC, id DESC LIMIT 500`, args);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Error' }); }
});

// POST /api/contabilidad/movimientos — registrar gasto/ingreso manual
router.post('/movimientos', requireAdmin, async (req, res) => {
  try {
    const { tipo, categoria, descripcion, monto, fecha } = req.body || {};
    if (!['ingreso','gasto'].includes(tipo)) return res.status(400).json({ error: 'Tipo inválido' });
    if (!monto || monto <= 0) return res.status(400).json({ error: 'Monto inválido' });
    const { rows } = await query(
      `INSERT INTO movimientos_contables (tipo, categoria, descripcion, monto, fecha)
       VALUES ($1,$2,$3,$4,COALESCE($5,CURRENT_DATE)) RETURNING *`,
      [tipo, categoria || 'otro', descripcion || null, monto, fecha || null]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: 'Error' }); }
});

// DELETE /api/contabilidad/movimientos/:id
router.delete('/movimientos/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM movimientos_contables WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Error' }); }
});

// GET /api/contabilidad/export.csv
router.get('/export.csv', requireAdmin, async (req, res) => {
  try {
    const { rows } = await query('SELECT fecha, tipo, categoria, descripcion, monto FROM movimientos_contables ORDER BY fecha DESC');
    const cell = (v) => { let s = String(v == null ? '' : v); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    const head = 'Fecha,Tipo,Categoria,Descripcion,Monto\n';
    const body = rows.map(r =>
      [r.fecha.toISOString().slice(0, 10), r.tipo, r.categoria, r.descripcion || '', r.monto].map(cell).join(',')
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="contabilidad-gymrillas.csv"');
    res.send(head + body);
  } catch (e) { res.status(500).json({ error: 'Error' }); }
});

module.exports = router;
