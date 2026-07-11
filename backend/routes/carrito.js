'use strict';
const express = require('express');
const crypto = require('crypto');
const { query, tx } = require('../db');
const { maybeAuth } = require('../middleware/auth');

const router = express.Router();

// Resuelve (o crea) el carrito del request. Devuelve {id, token}
async function obtenerCarrito(req, crear = true) {
  if (req.usuario?.id) {
    const r = await query('SELECT id FROM carritos WHERE usuario_id=$1', [req.usuario.id]);
    if (r.rows.length) return { id: r.rows[0].id, token: null };
    if (!crear) return null;
    const n = await query('INSERT INTO carritos (usuario_id) VALUES ($1) RETURNING id', [req.usuario.id]);
    return { id: n.rows[0].id, token: null };
  }
  const token = req.headers['x-cart-token'];
  if (token) {
    const r = await query('SELECT id FROM carritos WHERE session_token=$1', [token]);
    if (r.rows.length) return { id: r.rows[0].id, token };
  }
  if (!crear) return null;
  const nuevo = crypto.randomBytes(16).toString('hex');
  const n = await query('INSERT INTO carritos (session_token) VALUES ($1) RETURNING id', [nuevo]);
  return { id: n.rows[0].id, token: nuevo };
}

async function itemsDe(carritoId) {
  const { rows } = await query(`
    SELECT ci.id, ci.variante_id, ci.cantidad, v.sku, v.talla, v.color, v.precio_ajuste,
           p.id AS producto_id, p.nombre, p.slug, p.precio_base, p.precio_oferta,
           (SELECT url FROM producto_imagenes pi WHERE pi.producto_id=p.id ORDER BY es_principal DESC, orden LIMIT 1) AS imagen,
           COALESCE(i.stock,0) AS stock
    FROM carrito_items ci JOIN variantes v ON v.id=ci.variante_id JOIN productos p ON p.id=v.producto_id
    LEFT JOIN inventario i ON i.variante_id=v.id WHERE ci.carrito_id=$1 ORDER BY ci.id`, [carritoId]);
  const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
  let subtotal = 0;
  rows.forEach(r => {
    r.precio = num(r.precio_oferta) > 0 ? num(r.precio_oferta) : num(r.precio_base) + num(r.precio_ajuste);
    subtotal += r.precio * r.cantidad;
  });
  return { items: rows, subtotal: +subtotal.toFixed(2) };
}

router.get('/', maybeAuth, async (req, res) => {
  try {
    const c = await obtenerCarrito(req, false);
    if (!c) return res.json({ items: [], subtotal: 0, token: null });
    const data = await itemsDe(c.id);
    res.json({ ...data, token: c.token });
  } catch (e) { res.status(500).json({ error: 'Error' }); }
});

router.post('/items', maybeAuth, async (req, res) => {
  try {
    const { variante_id, cantidad } = req.body || {};
    if (!variante_id) return res.status(400).json({ error: 'Variante requerida' });
    const c = await obtenerCarrito(req, true);
    let cant = parseInt(cantidad, 10) || 1;
    cant = Math.min(99, Math.max(1, cant)); // 1..99
    await query(`INSERT INTO carrito_items (carrito_id, variante_id, cantidad) VALUES ($1,$2,$3)
                 ON CONFLICT (carrito_id, variante_id) DO UPDATE SET cantidad = carrito_items.cantidad + $3`,
      [c.id, variante_id, cant]);
    const data = await itemsDe(c.id);
    res.json({ ...data, token: c.token });
  } catch (e) { res.status(500).json({ error: 'Error' }); }
});

router.put('/items/:id', maybeAuth, async (req, res) => {
  try {
    const { cantidad } = req.body || {};
    const c = await obtenerCarrito(req, false);
    if (!c) return res.status(404).json({ error: 'Carrito vacío' });
    const n = parseInt(cantidad, 10);
    if (!Number.isInteger(n) || n <= 0) {
      await query('DELETE FROM carrito_items WHERE id=$1 AND carrito_id=$2', [req.params.id, c.id]);
    } else {
      await query('UPDATE carrito_items SET cantidad=$1 WHERE id=$2 AND carrito_id=$3', [Math.min(99, n), req.params.id, c.id]);
    }
    const data = await itemsDe(c.id);
    res.json({ ...data, token: c.token });
  } catch (e) { res.status(500).json({ error: 'Error' }); }
});

router.delete('/items/:id', maybeAuth, async (req, res) => {
  try {
    const c = await obtenerCarrito(req, false);
    if (c) await query('DELETE FROM carrito_items WHERE id=$1 AND carrito_id=$2', [req.params.id, c.id]);
    const data = c ? await itemsDe(c.id) : { items: [], subtotal: 0 };
    res.json({ ...data, token: c?.token || null });
  } catch (e) { res.status(500).json({ error: 'Error' }); }
});

module.exports = router;
