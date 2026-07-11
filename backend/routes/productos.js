'use strict';
const express = require('express');
const path = require('path');
const { query, tx } = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

const slugify = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 200);

// Valida precios/costo del body. Devuelve string de error o null.
function validarPrecios(b, exigirBase) {
  const pb = parseFloat(b.precio_base);
  if (exigirBase || b.precio_base != null) {
    if (!(pb > 0) || pb > 1000000) return 'Precio base inv\u00e1lido (debe ser > 0)';
  }
  if (b.precio_oferta != null && b.precio_oferta !== '') {
    const po = parseFloat(b.precio_oferta);
    if (!(po >= 0)) return 'Precio de oferta inv\u00e1lido';
    if (!isNaN(pb) && po >= pb) return 'El precio de oferta debe ser menor al precio base';
  }
  if (b.costo != null && b.costo !== '' && parseFloat(b.costo) < 0) return 'El costo no puede ser negativo';
  return null;
}

// Arma el objeto producto completo con relaciones
async function productoCompleto(id) {
  const p = await query('SELECT * FROM productos WHERE id=$1', [id]);
  if (!p.rows.length) return null;
  const prod = p.rows[0];
  const [imgs, comp, vars] = await Promise.all([
    query('SELECT * FROM producto_imagenes WHERE producto_id=$1 ORDER BY orden, id', [id]),
    query('SELECT * FROM producto_composicion WHERE producto_id=$1 ORDER BY orden, id', [id]),
    query(`SELECT v.*, COALESCE(i.stock,0) AS stock, i.stock_minimo
           FROM variantes v LEFT JOIN inventario i ON i.variante_id=v.id
           WHERE v.producto_id=$1 ORDER BY v.id`, [id]),
  ]);
  prod.imagenes = imgs.rows;
  prod.composicion = comp.rows;
  prod.variantes = vars.rows;
  prod.stock_total = vars.rows.reduce((s, v) => s + (v.stock || 0), 0);
  return prod;
}

// ============================================================
// PÚBLICO
// ============================================================

// GET /api/productos  — listado con filtros ?categoria= &sub= &tag= &q= &orden= &limit= &offset=
router.get('/', async (req, res) => {
  try {
    const { categoria, sub, q, orden, destacado, limit = 50, offset = 0 } = req.query;
    const cond = ['p.activo = TRUE'];
    const args = [];
    if (categoria) { args.push(categoria); cond.push(`p.categoria = $${args.length}`); }
    if (sub) { args.push(sub); cond.push(`p.subcategoria = $${args.length}`); }
    if (destacado === '1') cond.push('p.destacado = TRUE');
    if (q) { args.push(`%${q}%`); cond.push(`p.nombre ILIKE $${args.length}`); }

    let ord = 'p.creado_en DESC';
    if (orden === 'precio_asc') ord = 'p.precio_base ASC';
    else if (orden === 'precio_desc') ord = 'p.precio_base DESC';
    else if (orden === 'nombre') ord = 'p.nombre ASC';

    args.push(parseInt(limit, 10)); const lim = `$${args.length}`;
    args.push(parseInt(offset, 10)); const off = `$${args.length}`;

    const sql = `
      SELECT p.id, p.nombre, p.slug, p.descripcion_corta, p.categoria, p.subcategoria,
             p.precio_base, p.precio_oferta, p.destacado, p.nuevo,
             (SELECT url FROM producto_imagenes pi WHERE pi.producto_id=p.id ORDER BY es_principal DESC, orden LIMIT 1) AS imagen,
             COALESCE((SELECT SUM(i.stock) FROM variantes v JOIN inventario i ON i.variante_id=v.id WHERE v.producto_id=p.id),0) AS stock_total
      FROM productos p
      WHERE ${cond.join(' AND ')}
      ORDER BY ${ord} LIMIT ${lim} OFFSET ${off}`;
    const { rows } = await query(sql, args);
    res.json(rows);
  } catch (e) {
    console.error('[productos GET]', e.message);
    res.status(500).json({ error: 'Error al listar productos' });
  }
});

// GET /api/productos/:slug — detalle público por slug
router.get('/:slug', async (req, res) => {
  try {
    const p = await query('SELECT id FROM productos WHERE slug=$1 AND activo=TRUE', [req.params.slug]);
    if (!p.rows.length) return res.status(404).json({ error: 'Producto no encontrado' });
    const prod = await productoCompleto(p.rows[0].id);
    // reviews aprobadas
    const rev = await query(
      'SELECT autor, rating, titulo, comentario, creado_en FROM reviews WHERE producto_id=$1 AND aprobado=TRUE ORDER BY creado_en DESC LIMIT 50',
      [prod.id]
    );
    prod.reviews = rev.rows;
    prod.rating_promedio = rev.rows.length
      ? +(rev.rows.reduce((s, r) => s + r.rating, 0) / rev.rows.length).toFixed(1) : null;
    res.json(prod);
  } catch (e) {
    console.error('[producto detalle]', e.message);
    res.status(500).json({ error: 'Error' });
  }
});

// ============================================================
// ADMIN
// ============================================================

// GET /api/productos/admin/todos — listado admin (incluye inactivos)
router.get('/admin/todos', requireAdmin, async (_req, res) => {
  try {
    const { rows } = await query(`
      SELECT p.id, p.nombre, p.slug, p.categoria, p.subcategoria, p.precio_base, p.precio_oferta,
             p.costo, p.activo, p.destacado, p.nuevo, p.creado_en,
             (SELECT url FROM producto_imagenes pi WHERE pi.producto_id=p.id ORDER BY es_principal DESC, orden LIMIT 1) AS imagen,
             COALESCE((SELECT SUM(i.stock) FROM variantes v JOIN inventario i ON i.variante_id=v.id WHERE v.producto_id=p.id),0) AS stock_total,
             (SELECT COUNT(*) FROM variantes v WHERE v.producto_id=p.id) AS num_variantes
      FROM productos p ORDER BY p.creado_en DESC`);
    res.json(rows);
  } catch (e) {
    console.error('[admin productos]', e.message);
    res.status(500).json({ error: 'Error' });
  }
});

// GET /api/productos/admin/:id — detalle admin por id
router.get('/admin/:id', requireAdmin, async (req, res) => {
  try {
    const prod = await productoCompleto(req.params.id);
    if (!prod) return res.status(404).json({ error: 'No encontrado' });
    res.json(prod);
  } catch (e) {
    res.status(500).json({ error: 'Error' });
  }
});

// POST /api/productos/admin — crear producto completo
router.post('/admin', requireAdmin, async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.nombre || b.precio_base == null) return res.status(400).json({ error: 'Nombre y precio base requeridos' });
    const errP = validarPrecios(b, true);
    if (errP) return res.status(400).json({ error: errP });
    let slug = b.slug ? slugify(b.slug) : slugify(b.nombre);
    // slug único
    const existe = await query('SELECT id FROM productos WHERE slug=$1', [slug]);
    if (existe.rows.length) slug = `${slug}-${Date.now().toString().slice(-5)}`;

    const result = await tx(async (c) => {
      const ins = await c.query(
        `INSERT INTO productos (nombre, slug, descripcion, descripcion_corta, categoria, subcategoria,
            precio_base, precio_oferta, costo, material, cuidado, fit, genero, caracteristicas,
            peso_oz, largo_in, ancho_in, alto_in, activo, destacado, nuevo, meta_titulo, meta_descripcion)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
         RETURNING id`,
        [b.nombre, slug, b.descripcion || null, b.descripcion_corta || null,
         b.categoria || 'hombre', b.subcategoria || null, b.precio_base, b.precio_oferta || null,
         b.costo || null, b.material || null, b.cuidado || null, b.fit || null, b.genero || null,
         JSON.stringify(b.caracteristicas || []), b.peso_oz || null, b.largo_in || null,
         b.ancho_in || null, b.alto_in || null, b.activo !== false, !!b.destacado, b.nuevo !== false,
         b.meta_titulo || null, b.meta_descripcion || null]
      );
      const id = ins.rows[0].id;
      await guardarRelaciones(c, id, b);
      return id;
    });
    const prod = await productoCompleto(result);
    res.status(201).json(prod);
  } catch (e) {
    console.error('[crear producto]', e.message);
    res.status(500).json({ error: 'Error al crear producto: ' + e.message });
  }
});

// PUT /api/productos/admin/:id — actualizar producto completo
router.put('/admin/:id', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const b = req.body || {};
    const ex = await query('SELECT id FROM productos WHERE id=$1', [id]);
    if (!ex.rows.length) return res.status(404).json({ error: 'No encontrado' });
    const errP = validarPrecios(b, false);
    if (errP) return res.status(400).json({ error: errP });

    await tx(async (c) => {
      await c.query(
        `UPDATE productos SET nombre=COALESCE($1,nombre), descripcion=$2, descripcion_corta=$3,
           categoria=COALESCE($4,categoria), subcategoria=$5, precio_base=COALESCE($6,precio_base),
           precio_oferta=$7, costo=$8, material=$9, cuidado=$10, fit=$11, genero=$12,
           caracteristicas=$13, peso_oz=$14, largo_in=$15, ancho_in=$16, alto_in=$17,
           activo=COALESCE($18,activo), destacado=COALESCE($19,destacado), nuevo=COALESCE($20,nuevo),
           meta_titulo=$21, meta_descripcion=$22
         WHERE id=$23`,
        [b.nombre, b.descripcion || null, b.descripcion_corta || null, b.categoria, b.subcategoria || null,
         b.precio_base, b.precio_oferta || null, b.costo || null, b.material || null, b.cuidado || null,
         b.fit || null, b.genero || null, JSON.stringify(b.caracteristicas || []), b.peso_oz || null,
         b.largo_in || null, b.ancho_in || null, b.alto_in || null,
         typeof b.activo === 'boolean' ? b.activo : null,
         typeof b.destacado === 'boolean' ? b.destacado : null,
         typeof b.nuevo === 'boolean' ? b.nuevo : null,
         b.meta_titulo || null, b.meta_descripcion || null, id]
      );
      // si vienen arrays, reemplazar relaciones
      if (Array.isArray(b.composicion) || Array.isArray(b.imagenes) || Array.isArray(b.variantes)) {
        await guardarRelaciones(c, id, b, true);
      }
    });
    const prod = await productoCompleto(id);
    res.json(prod);
  } catch (e) {
    console.error('[update producto]', e.message);
    res.status(500).json({ error: 'Error al actualizar: ' + e.message });
  }
});

// Guarda composición/imágenes/variantes. reemplazar=true borra antes.
async function guardarRelaciones(c, id, b, reemplazar = false) {
  // Composición de tela (%)
  if (Array.isArray(b.composicion)) {
    if (reemplazar) await c.query('DELETE FROM producto_composicion WHERE producto_id=$1', [id]);
    let o = 0;
    for (const comp of b.composicion) {
      const pct = parseFloat(comp.porcentaje);
      if (!comp.material || isNaN(pct) || pct < 0 || pct > 100) continue;
      await c.query('INSERT INTO producto_composicion (producto_id, material, porcentaje, orden) VALUES ($1,$2,$3,$4)',
        [id, String(comp.material).slice(0, 80), pct, o++]);
    }
  }
  // Imágenes
  if (Array.isArray(b.imagenes)) {
    if (reemplazar) await c.query('DELETE FROM producto_imagenes WHERE producto_id=$1', [id]);
    let o = 0;
    for (const img of b.imagenes) {
      const url = typeof img === 'string' ? img : img.url;
      if (!url) continue;
      await c.query('INSERT INTO producto_imagenes (producto_id, url, alt, orden, es_principal) VALUES ($1,$2,$3,$4,$5)',
        [id, url, (img.alt || b.nombre || null), o, o === 0]);
      o++;
    }
  }
  // Variantes + inventario
  if (Array.isArray(b.variantes)) {
    if (reemplazar) {
      // borra variantes que ya no estén (cascade borra inventario)
      const ids = b.variantes.filter(v => v.id).map(v => v.id);
      if (ids.length) {
        await c.query(`DELETE FROM variantes WHERE producto_id=$1 AND id <> ALL($2::bigint[])`, [id, ids]);
      } else {
        await c.query('DELETE FROM variantes WHERE producto_id=$1', [id]);
      }
    }
    for (const v of b.variantes) {
      const sku = v.sku || `${slugify(b.nombre || 'sku')}-${(v.talla||'U')}-${(v.color||'X')}-${Date.now().toString().slice(-4)}`.toUpperCase();
      const stock = Math.max(0, parseInt(v.stock, 10) || 0);
      const stockMin = Math.max(0, parseInt(v.stock_minimo, 10) || 5);
      const ajuste = parseFloat(v.precio_ajuste) || 0;
      if (v.id) {
        await c.query(`UPDATE variantes SET sku=$1, talla=$2, color=$3, color_hex=$4, precio_ajuste=$5, activo=$6 WHERE id=$7 AND producto_id=$8`,
          [sku, v.talla||null, v.color||null, v.color_hex||null, ajuste, v.activo!==false, v.id, id]);
        await c.query(`INSERT INTO inventario (variante_id, stock, stock_minimo) VALUES ($1,$2,$3)
                       ON CONFLICT (variante_id) DO UPDATE SET stock=$2, stock_minimo=$3`,
          [v.id, stock, stockMin]);
      } else {
        const nv = await c.query(`INSERT INTO variantes (producto_id, sku, talla, color, color_hex, precio_ajuste, activo)
                                  VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
          [id, sku, v.talla||null, v.color||null, v.color_hex||null, ajuste, v.activo!==false]);
        await c.query('INSERT INTO inventario (variante_id, stock, stock_minimo) VALUES ($1,$2,$3)',
          [nv.rows[0].id, stock, stockMin]);
      }
    }
  }
}

// DELETE /api/productos/admin/:id
router.delete('/admin/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM productos WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

// POST /api/productos/admin/upload — subir imágenes (multipart). Devuelve URLs públicas.
router.post('/admin/upload', requireAdmin, upload.array('imagenes', 10), (req, res) => {
  try {
    const base = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
    const urls = (req.files || []).map(f => `${base}/uploads/productos/${path.basename(f.path)}`);
    res.json({ urls });
  } catch (e) {
    res.status(500).json({ error: 'Error al subir imágenes' });
  }
});

module.exports = router;
