'use strict';
const express = require('express');
const { query, tx } = require('../db');
const { requireAdmin, maybeAuth } = require('../middleware/auth');

const router = express.Router();

async function cfg(clave, def) {
  const { rows } = await query('SELECT valor FROM configuracion WHERE clave=$1', [clave]);
  return rows.length ? rows[0].valor : def;
}
const num = (v, d = 0) => { const n = parseFloat(v); return isNaN(n) ? d : n; };

function numeroOrden() {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `GR${y}${(d.getMonth()+1).toString().padStart(2,'0')}${d.getDate().toString().padStart(2,'0')}-${r}`;
}

// POST /api/ordenes — crear orden (checkout)
// body: { email, nombre, telefono, items:[{variante_id, cantidad}], direccion_envio, cupon, metodo_pago }
router.post('/', maybeAuth, async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.email || !Array.isArray(b.items) || !b.items.length)
      return res.status(400).json({ error: 'Email e items requeridos' });

    const ivuPct = num(await cfg('ivu_pct', '11.5'));
    const envioFlat = num(await cfg('envio_flat', '5.99'));
    const envioGratisMin = num(await cfg('envio_gratis_min', '75'));
    const puntosPorDolar = num(await cfg('puntos_por_dolar', '1'));

    const orden = await tx(async (c) => {
      // 1) validar stock y armar items con precio actual
      let subtotal = 0;
      const itemsDetalle = [];
      for (const it of b.items) {
        const r = await c.query(`
          SELECT v.id, v.sku, v.talla, v.color, v.precio_ajuste, v.producto_id,
                 p.nombre, p.precio_base, p.precio_oferta, p.costo,
                 COALESCE(i.stock,0) AS stock
          FROM variantes v JOIN productos p ON p.id=v.producto_id
          LEFT JOIN inventario i ON i.variante_id=v.id
          WHERE v.id=$1 FOR UPDATE`, [it.variante_id]);
        if (!r.rows.length) throw new Error(`Variante ${it.variante_id} no existe`);
        const v = r.rows[0];
        const cant = parseInt(it.cantidad, 10);
        if (!Number.isInteger(cant) || cant <= 0 || cant > 99) {
          throw new Error(`Cantidad inválida para ${v.nombre} (debe ser un entero entre 1 y 99)`);
        }
        if (v.stock < cant) throw new Error(`Stock insuficiente para ${v.nombre} (${v.talla||''}). Quedan ${v.stock}.`);
        const precio = num(v.precio_oferta) > 0 ? num(v.precio_oferta) : num(v.precio_base) + num(v.precio_ajuste);
        subtotal += precio * cant;
        itemsDetalle.push({ ...v, cant, precio });
      }

      // 2) cupón
      let descuento = 0, cuponId = null;
      if (b.cupon) {
        const cup = await c.query('SELECT * FROM cupones WHERE codigo=$1 AND activo=TRUE', [String(b.cupon).toUpperCase()]);
        if (cup.rows.length) {
          const cp = cup.rows[0];
          const venc = !cp.expira_en || new Date(cp.expira_en) > new Date();
          const usos = !cp.usos_max || cp.usos_actuales < cp.usos_max;
          if (venc && usos && subtotal >= num(cp.minimo_compra)) {
            descuento = cp.tipo === 'porcentaje' ? subtotal * (num(cp.valor)/100) : num(cp.valor);
            descuento = Math.min(descuento, subtotal);
            cuponId = cp.id;
            await c.query('UPDATE cupones SET usos_actuales = usos_actuales + 1 WHERE id=$1', [cp.id]);
          }
        }
      }

      // 3) envío + impuesto
      const baseImponible = subtotal - descuento;
      const envio = baseImponible >= envioGratisMin ? 0 : envioFlat;
      const impuesto = +(baseImponible * (ivuPct/100)).toFixed(2);
      const total = +(baseImponible + envio + impuesto).toFixed(2);

      // 4) insertar orden
      const ord = await c.query(`
        INSERT INTO ordenes (numero_orden, usuario_id, email, nombre, telefono, subtotal, descuento,
            envio, impuesto, total, estado, metodo_pago, direccion_envio, cupon_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pendiente',$11,$12,$13) RETURNING *`,
        [numeroOrden(), req.usuario?.id || null, b.email.toLowerCase(), b.nombre || null, b.telefono || null,
         +subtotal.toFixed(2), +descuento.toFixed(2), envio, impuesto, total,
         b.metodo_pago || 'ath_movil', b.direccion_envio ? JSON.stringify(b.direccion_envio) : null, cuponId]);
      const o = ord.rows[0];

      // 5) items + descuento de stock + log
      for (const it of itemsDetalle) {
        await c.query(`INSERT INTO orden_items (orden_id, variante_id, producto_id, nombre_producto, sku, talla, color, precio_unitario, costo_unitario, cantidad)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [o.id, it.id, it.producto_id, it.nombre, it.sku, it.talla, it.color, it.precio, num(it.costo), it.cant]);
        await c.query('UPDATE inventario SET stock = stock - $1 WHERE variante_id=$2', [it.cant, it.id]);
        await c.query(`INSERT INTO inventario_movimientos (variante_id, delta, motivo, referencia)
                       VALUES ($1,$2,'venta',$3)`, [it.id, -it.cant, o.numero_orden]);
      }

      // 6) rewards si hay usuario
      if (req.usuario?.id) {
        const pts = Math.floor(total * puntosPorDolar);
        if (pts > 0) await c.query(`INSERT INTO rewards (usuario_id, puntos, tipo, descripcion, orden_id) VALUES ($1,$2,'ganado',$3,$4)`,
          [req.usuario.id, pts, `Compra ${o.numero_orden}`, o.id]);
      }

      return o;
    });

    res.status(201).json(orden);
  } catch (e) {
    console.error('[crear orden]', e.message);
    res.status(400).json({ error: e.message || 'Error al crear la orden' });
  }
});

// GET /api/ordenes/mias — historial del usuario
router.get('/mias', maybeAuth, async (req, res) => {
  if (!req.usuario) return res.status(401).json({ error: 'No autenticado' });
  try {
    const { rows } = await query(
      `SELECT id, numero_orden, total, estado, creado_en FROM ordenes WHERE usuario_id=$1 ORDER BY creado_en DESC`,
      [req.usuario.id]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Error' }); }
});

// GET /api/ordenes/numero/:numero — seguimiento público por número + email
router.get('/numero/:numero', async (req, res) => {
  try {
    const { email } = req.query;
    const { rows } = await query('SELECT * FROM ordenes WHERE numero_orden=$1', [req.params.numero]);
    if (!rows.length) return res.status(404).json({ error: 'Orden no encontrada' });
    const o = rows[0];
    if (!email || email.toLowerCase() !== o.email) return res.status(403).json({ error: 'Email no coincide' });
    const items = await query('SELECT * FROM orden_items WHERE orden_id=$1', [o.id]);
    o.items = items.rows;
    res.json(o);
  } catch (e) { res.status(500).json({ error: 'Error' }); }
});

// ===================== ADMIN =====================

// GET /api/ordenes/admin — listado con filtros ?estado= &q=
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const { estado, q } = req.query;
    const cond = []; const args = [];
    if (estado) { args.push(estado); cond.push(`estado=$${args.length}`); }
    if (q) { args.push(`%${q}%`); cond.push(`(numero_orden ILIKE $${args.length} OR email ILIKE $${args.length} OR nombre ILIKE $${args.length})`); }
    const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
    const { rows } = await query(`
      SELECT id, numero_orden, email, nombre, total, estado, metodo_pago, transportista, tracking, creado_en,
             (SELECT COUNT(*) FROM orden_items oi WHERE oi.orden_id=ordenes.id) AS num_items
      FROM ordenes ${where} ORDER BY creado_en DESC LIMIT 200`, args);
    res.json(rows);
  } catch (e) {
    console.error('[admin ordenes]', e.message);
    res.status(500).json({ error: 'Error' });
  }
});

// GET /api/ordenes/admin/:id — detalle completo
router.get('/admin/:id', requireAdmin, async (req, res) => {
  try {
    const o = await query('SELECT * FROM ordenes WHERE id=$1', [req.params.id]);
    if (!o.rows.length) return res.status(404).json({ error: 'No encontrada' });
    const orden = o.rows[0];
    const [items, pagos] = await Promise.all([
      query('SELECT * FROM orden_items WHERE orden_id=$1', [orden.id]),
      query('SELECT * FROM pagos WHERE orden_id=$1 ORDER BY creado_en', [orden.id]),
    ]);
    orden.items = items.rows;
    orden.pagos = pagos.rows;
    res.json(orden);
  } catch (e) { res.status(500).json({ error: 'Error' }); }
});

// PUT /api/ordenes/admin/:id/estado — cambiar estado; registra ingreso al marcar pagada
router.put('/admin/:id/estado', requireAdmin, async (req, res) => {
  try {
    const { estado } = req.body || {};
    const validos = ['pendiente','pagada','procesando','enviada','entregada','cancelada','reembolsada'];
    if (!validos.includes(estado)) return res.status(400).json({ error: 'Estado inválido' });

    await tx(async (c) => {
      const prev = await c.query('SELECT estado, total, numero_orden FROM ordenes WHERE id=$1', [req.params.id]);
      if (!prev.rows.length) throw new Error('Orden no encontrada');
      const o = prev.rows[0];
      await c.query('UPDATE ordenes SET estado=$1 WHERE id=$2', [estado, req.params.id]);

      // registrar ingreso contable al pasar a pagada (si no existía)
      if (estado === 'pagada' && o.estado !== 'pagada') {
        const ya = await c.query(`SELECT id FROM movimientos_contables WHERE orden_id=$1 AND tipo='ingreso'`, [req.params.id]);
        if (!ya.rows.length) {
          await c.query(`INSERT INTO movimientos_contables (tipo, categoria, descripcion, monto, orden_id)
                         VALUES ('ingreso','venta',$1,$2,$3)`, [`Venta ${o.numero_orden}`, o.total, req.params.id]);
        }
      }
      // si se cancela/reembolsa: devolver stock
      if ((estado === 'cancelada' || estado === 'reembolsada') && o.estado !== 'cancelada' && o.estado !== 'reembolsada') {
        const its = await c.query('SELECT variante_id, cantidad FROM orden_items WHERE orden_id=$1 AND variante_id IS NOT NULL', [req.params.id]);
        for (const it of its.rows) {
          await c.query('UPDATE inventario SET stock = stock + $1 WHERE variante_id=$2', [it.cantidad, it.variante_id]);
          await c.query(`INSERT INTO inventario_movimientos (variante_id, delta, motivo, referencia, usuario_id)
                         VALUES ($1,$2,'devolucion',$3,$4)`, [it.variante_id, it.cantidad, o.numero_orden, req.usuario.id]);
        }
      }
    });
    res.json({ ok: true });
  } catch (e) {
    console.error('[estado orden]', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
