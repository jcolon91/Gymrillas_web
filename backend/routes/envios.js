'use strict';
const express = require('express');
const { query } = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
const num = (v, d = 0) => { const n = parseFloat(v); return isNaN(n) ? d : n; };
async function cfg(clave, def) {
  const { rows } = await query('SELECT valor FROM configuracion WHERE clave=$1', [clave]);
  return rows.length ? rows[0].valor : def;
}

// POST /api/envios/cotizar
// body: { zip_destino, items:[{variante_id, cantidad}], subtotal }
// Hoy: tarifa flat + envío gratis sobre el mínimo.
// Mañana: descomenta USPS / Routes (stubs abajo) cuando pongas las llaves.
router.post('/cotizar', async (req, res) => {
  try {
    const b = req.body || {};
    const envioFlat = num(await cfg('envio_flat', '5.99'));
    const envioGratisMin = num(await cfg('envio_gratis_min', '75'));
    const subtotal = num(b.subtotal);

    const opciones = [];

    // Opción base (siempre disponible)
    const gratis = subtotal >= envioGratisMin;
    opciones.push({
      id: 'flat',
      transportista: 'manual',
      servicio: gratis ? 'Envío estándar (GRATIS)' : 'Envío estándar PR',
      dias: '3-5 días',
      costo: gratis ? 0 : envioFlat,
    });

    // Pickup local Caguas
    opciones.push({
      id: 'pickup',
      transportista: 'pickup',
      servicio: 'Recogido en Caguas',
      dias: 'Coordinar',
      costo: 0,
    });

    // ---- USPS (PENDIENTE: requiere USPS_USER_ID) ----
    const uspsId = process.env.USPS_USER_ID || (await cfg('usps_userid', ''));
    if (uspsId && b.zip_destino) {
      try {
        const peso = await pesoTotal(b.items);
        const rate = await cotizarUSPS({ userId: uspsId, origen: process.env.USPS_ORIGIN_ZIP || await cfg('origen_zip','00725'), destino: b.zip_destino, pesoOz: peso });
        if (rate) opciones.push(rate);
      } catch (err) { console.warn('[USPS] no disponible:', err.message); }
    }

    res.json({ opciones, nota: uspsId ? undefined : 'USPS en vivo se activa al configurar USPS_USER_ID' });
  } catch (e) {
    console.error('[cotizar envio]', e.message);
    res.status(500).json({ error: 'Error al cotizar envío' });
  }
});

async function pesoTotal(items) {
  if (!Array.isArray(items) || !items.length) return 16;
  let total = 0;
  for (const it of items) {
    const r = await query(`SELECT p.peso_oz FROM variantes v JOIN productos p ON p.id=v.producto_id WHERE v.id=$1`, [it.variante_id]);
    const peso = r.rows.length ? num(r.rows[0].peso_oz, 6) : 6;
    total += peso * (parseInt(it.cantidad, 10) || 1);
  }
  return Math.max(total, 1);
}

// STUB USPS Prices 3.0 — implementar cuando haya credenciales.
async function cotizarUSPS({ userId, origen, destino, pesoOz }) {
  // TODO: llamada real a secure.shippingapis.com / Prices 3.0 API.
  // Devuelve null hasta implementar para no romper el checkout.
  return null;
}

// ---- ADMIN: marcar enviado con tracking ----
// PUT /api/envios/:ordenId/tracking
router.put('/:ordenId/tracking', requireAdmin, async (req, res) => {
  try {
    const { transportista, servicio, tracking, etiqueta_url, marcar_enviada } = req.body || {};
    await query(
      `UPDATE ordenes SET transportista=COALESCE($1,transportista), servicio_envio=COALESCE($2,servicio_envio),
         tracking=COALESCE($3,tracking), etiqueta_url=COALESCE($4,etiqueta_url),
         estado = CASE WHEN $5 THEN 'enviada' ELSE estado END
       WHERE id=$6`,
      [transportista || null, servicio || null, tracking || null, etiqueta_url || null, !!marcar_enviada, req.params.ordenId]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Error al actualizar tracking' });
  }
});

// GET /api/envios/pendientes — órdenes pagadas sin enviar
router.get('/pendientes', requireAdmin, async (_req, res) => {
  try {
    const { rows } = await query(`
      SELECT id, numero_orden, nombre, email, direccion_envio, total, estado, creado_en
      FROM ordenes WHERE estado IN ('pagada','procesando') ORDER BY creado_en`);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Error' }); }
});

module.exports = router;
