'use strict';
const express = require('express');
const { query } = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard — KPIs del panel
router.get('/', requireAdmin, async (_req, res) => {
  try {
    const pagadas = `estado IN ('pagada','procesando','enviada','entregada')`;

    const ventas = await query(`
      SELECT
        COALESCE(SUM(total) FILTER (WHERE ${pagadas}),0) AS ventas_total,
        COALESCE(SUM(total) FILTER (WHERE ${pagadas} AND creado_en >= date_trunc('month',CURRENT_DATE)),0) AS ventas_mes,
        COALESCE(SUM(total) FILTER (WHERE ${pagadas} AND creado_en::date = CURRENT_DATE),0) AS ventas_hoy,
        COUNT(*) FILTER (WHERE estado='pendiente') AS ordenes_pendientes,
        COUNT(*) FILTER (WHERE estado IN ('pagada','procesando')) AS ordenes_por_enviar,
        COUNT(*) AS ordenes_total
      FROM ordenes`);

    const clientes = await query(`SELECT COUNT(*) AS n FROM usuarios WHERE rol='cliente'`);
    const leads = await query(`SELECT COUNT(*) AS n FROM leads`);
    const productos = await query(`SELECT COUNT(*) FILTER (WHERE activo) AS activos, COUNT(*) AS total FROM productos`);

    const inv = await query(`
      SELECT COALESCE(SUM(i.stock),0) AS unidades,
             COUNT(*) FILTER (WHERE i.stock <= i.stock_minimo) AS bajas
      FROM inventario i`);

    const topProd = await query(`
      SELECT oi.nombre_producto, SUM(oi.cantidad) AS vendidas, SUM(oi.precio_unitario*oi.cantidad) AS ingreso
      FROM orden_items oi JOIN ordenes o ON o.id=oi.orden_id WHERE o.${pagadas}
      GROUP BY oi.nombre_producto ORDER BY vendidas DESC LIMIT 5`);

    const ventasDia = await query(`
      SELECT creado_en::date AS dia, SUM(total) AS total
      FROM ordenes WHERE ${pagadas} AND creado_en >= CURRENT_DATE - INTERVAL '14 days'
      GROUP BY dia ORDER BY dia`);

    const ultimas = await query(`
      SELECT numero_orden, nombre, total, estado, creado_en FROM ordenes ORDER BY creado_en DESC LIMIT 8`);

    res.json({
      ...ventas.rows[0],
      clientes: parseInt(clientes.rows[0].n, 10),
      leads: parseInt(leads.rows[0].n, 10),
      productos_activos: parseInt(productos.rows[0].activos, 10),
      productos_total: parseInt(productos.rows[0].total, 10),
      inventario_unidades: parseInt(inv.rows[0].unidades, 10),
      inventario_bajas: parseInt(inv.rows[0].bajas, 10),
      top_productos: topProd.rows,
      ventas_por_dia: ventasDia.rows,
      ultimas_ordenes: ultimas.rows,
    });
  } catch (e) {
    console.error('[dashboard]', e.message);
    res.status(500).json({ error: 'Error' });
  }
});

// GET /api/dashboard/clientes — lista de clientes
router.get('/clientes', requireAdmin, async (_req, res) => {
  try {
    const { rows } = await query(`
      SELECT u.id, u.nombre, u.apellido, u.email, u.telefono, u.creado_en,
             COUNT(o.id) AS ordenes,
             COALESCE(SUM(o.total) FILTER (WHERE o.estado IN ('pagada','procesando','enviada','entregada')),0) AS gastado
      FROM usuarios u LEFT JOIN ordenes o ON o.usuario_id=u.id
      WHERE u.rol='cliente'
      GROUP BY u.id ORDER BY gastado DESC, u.creado_en DESC LIMIT 500`);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Error' }); }
});

// Claves sensibles: nunca se envían en claro al cliente; se enmascaran.
const esSecreto = (clave) => /(token|secret|_sk|api_key|cuenta|routing|password|client)/i.test(clave);
const MASCARA = '••••••••';
function enmascarar(valor) {
  if (!valor) return '';
  const v = String(valor);
  return v.length <= 4 ? MASCARA : MASCARA + v.slice(-4);
}

// Configuración
router.get('/config', requireAdmin, async (_req, res) => {
  try {
    const { rows } = await query('SELECT clave, valor, descripcion FROM configuracion ORDER BY clave');
    res.json(rows.map(r => esSecreto(r.clave)
      ? { ...r, valor: enmascarar(r.valor), es_secreto: true, tiene_valor: !!r.valor }
      : r));
  } catch (e) { console.error('[config GET]', e.message); res.status(500).json({ error: 'Error' }); }
});
router.put('/config', requireAdmin, async (req, res) => {
  try {
    const cambios = req.body || {};
    for (const [clave, valor] of Object.entries(cambios)) {
      const v = String(valor == null ? '' : valor);
      // No sobrescribir un secreto si llega vacío o con la máscara (valor sin cambios).
      if (esSecreto(clave) && (v === '' || v.includes('•'))) continue;
      await query(`INSERT INTO configuracion (clave, valor) VALUES ($1,$2)
                   ON CONFLICT (clave) DO UPDATE SET valor=$2, actualizado_en=NOW()`, [clave, v]);
    }
    res.json({ ok: true });
  } catch (e) { console.error('[config PUT]', e.message); res.status(500).json({ error: 'Error' }); }
});

module.exports = router;
