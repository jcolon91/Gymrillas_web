'use strict';
const express = require('express');
const { query, tx } = require('../db');
const { requireAdmin, maybeAuth } = require('../middleware/auth');

const router = express.Router();

// Autoriza al solicitante sobre una orden: dueño autenticado o invitado que
// demuestra el email de la orden. Devuelve la orden o null.
async function autorizarOrden(req, orden_id) {
  if (!orden_id) return null;
  const r = await query('SELECT id, usuario_id, email, total, estado, numero_orden FROM ordenes WHERE id=$1', [orden_id]);
  if (!r.rows.length) return { error: 404 };
  const o = r.rows[0];
  const email = (req.body && req.body.email || '').toLowerCase();
  const esDueno = req.usuario && o.usuario_id && req.usuario.id === o.usuario_id;
  const esInvitado = !o.usuario_id && email && email === o.email;
  const esAdmin = req.usuario && req.usuario.rol === 'admin';
  if (!esDueno && !esInvitado && !esAdmin) return { error: 403 };
  return { orden: o };
}

// Verificación REAL del pago contra ATH Móvil Business API.
// Fail-closed: en producción NO auto-confirma hasta implementar la llamada real.
async function validarPagoATH({ referencia, montoEsperado }) {
  const token = process.env.ATH_MOVIL_TOKEN;
  // TODO: implementar findPaymentByReference contra ATH Móvil Business y comparar monto/estado.
  if (!token) return process.env.NODE_ENV !== 'production'; // dev: permite probar; prod: rechaza
  return false; // hasta implementar la verificación real, no se auto-confirma en prod
}

// POST /api/pagos/iniciar — crea registro de pago pendiente para una orden
// body: { orden_id, proveedor, email? }
router.post('/iniciar', maybeAuth, async (req, res) => {
  try {
    const { orden_id, proveedor } = req.body || {};
    const auth = await autorizarOrden(req, orden_id);
    if (!auth) return res.status(400).json({ error: 'orden_id requerido' });
    if (auth.error === 404) return res.status(404).json({ error: 'Orden no encontrada' });
    if (auth.error === 403) return res.status(403).json({ error: 'No autorizado para esta orden' });
    const o = auth.orden;
    const prov = proveedor || 'ath_movil';
    const { rows } = await query(
      `INSERT INTO pagos (orden_id, proveedor, monto, estado) VALUES ($1,$2,$3,'pendiente') RETURNING *`,
      [o.id, prov, o.total]);

    const pub = process.env.ATH_MOVIL_PUBLIC_TOKEN || '';
    res.status(201).json({
      pago: rows[0],
      ath_movil: prov === 'ath_movil' ? {
        public_token: pub,
        total: o.total,
        configurado: !!pub,
        nota: pub ? undefined : 'ATH Móvil se activa al poner ATH_MOVIL_PUBLIC_TOKEN',
      } : undefined,
    });
  } catch (e) {
    console.error('[pago iniciar]', e.message);
    res.status(500).json({ error: 'Error' });
  }
});

// POST /api/pagos/ath/confirmar — confirma pago ATH Móvil tras callback del front
// body: { orden_id, referencia, datos, email? }
router.post('/ath/confirmar', maybeAuth, async (req, res) => {
  try {
    const { orden_id, referencia, datos } = req.body || {};
    if (!orden_id || !referencia) return res.status(400).json({ error: 'orden_id y referencia requeridos' });

    const auth = await autorizarOrden(req, orden_id);
    if (auth.error === 404) return res.status(404).json({ error: 'Orden no encontrada' });
    if (auth.error === 403) return res.status(403).json({ error: 'No autorizado para esta orden' });
    const o = auth.orden;

    // Idempotencia / anti-replay: solo se confirma una orden aún pendiente.
    if (o.estado !== 'pendiente') return res.status(409).json({ error: 'La orden ya no está pendiente de pago' });

    // Verificación real del pago (fail-closed en producción).
    const verificado = await validarPagoATH({ referencia, montoEsperado: o.total });
    if (!verificado) {
      return res.status(202).json({
        ok: false, pendiente_revision: true,
        mensaje: 'Pago recibido. Se confirmará tras verificarlo con ATH Móvil o por confirmación manual del comercio.',
      });
    }

    await tx(async (c) => {
      await c.query(`UPDATE pagos SET estado='completado', referencia_externa=$1, datos=$2
                     WHERE orden_id=$3 AND proveedor='ath_movil'`,
        [referencia, datos ? JSON.stringify(datos) : null, o.id]);
      await c.query(`UPDATE ordenes SET estado='pagada' WHERE id=$1`, [o.id]);
      await c.query(`INSERT INTO movimientos_contables (tipo, categoria, descripcion, monto, orden_id)
                     VALUES ('ingreso','venta',$1,$2,$3)`, [`Venta ${o.numero_orden}`, o.total, o.id]);
    });
    res.json({ ok: true });
  } catch (e) {
    console.error('[ath confirmar]', e.message);
    res.status(500).json({ error: 'Error al confirmar pago' });
  }
});

// ADMIN: marcar pago manual (efectivo, transferencia, ATH directo)
// POST /api/pagos/admin/manual  body: { orden_id, referencia }
// El monto SIEMPRE es el total real de la orden (no se acepta del cliente).
router.post('/admin/manual', requireAdmin, async (req, res) => {
  try {
    const { orden_id, referencia } = req.body || {};
    if (!orden_id) return res.status(400).json({ error: 'orden_id requerido' });
    await tx(async (c) => {
      const o = await c.query('SELECT total, estado, numero_orden FROM ordenes WHERE id=$1', [orden_id]);
      if (!o.rows.length) throw new Error('Orden no encontrada');
      const monto = o.rows[0].total; // fuente de verdad: el total de la orden
      await c.query(`INSERT INTO pagos (orden_id, proveedor, monto, estado, referencia_externa)
                     VALUES ($1,'manual',$2,'completado',$3)`, [orden_id, monto, referencia || null]);
      await c.query(`UPDATE ordenes SET estado='pagada' WHERE id=$1`, [orden_id]);
      if (o.rows[0].estado !== 'pagada') {
        await c.query(`INSERT INTO movimientos_contables (tipo, categoria, descripcion, monto, orden_id)
                       VALUES ('ingreso','venta',$1,$2,$3)`, [`Venta ${o.rows[0].numero_orden}`, monto, orden_id]);
      }
    });
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ error: e.message || 'Error' }); }
});

// Webhook placeholder (Stripe/Clover futuro)
router.post('/webhook/:proveedor', express.json(), (req, res) => {
  console.log(`[webhook ${req.params.proveedor}] recibido`);
  // TODO: verificar firma del proveedor antes de actualizar pago/orden.
  res.json({ recibido: true });
});

module.exports = router;
