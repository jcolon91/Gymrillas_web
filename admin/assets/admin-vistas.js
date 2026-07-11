/* ============================================================
   GYMRILLAS ADMIN — vistas (usa helpers de admin.js)
============================================================ */
window.VISTAS = {};

/* ============================================================
   DASHBOARD
============================================================ */
const PERIODOS = [
  { k: 'hoy', label: 'Hoy' }, { k: 'semana', label: '7 días' }, { k: 'mes', label: '30 días' },
  { k: 'ano', label: 'Año' }, { k: 'todo', label: 'Todo' },
];

function chartBarras(serie) {
  if (!serie || !serie.length) return '<p class="vacio" style="margin:auto">Sin ventas en este periodo</p>';
  const maxV = Math.max(1, ...serie.map(s => parseFloat(s.total)));
  return serie.map(s => {
    const h = (parseFloat(s.total) / maxV) * 100;
    return `<div class="barra" style="height:${Math.max(2, h)}%" title="${esc(String(s.etiqueta))}: ${money(s.total)}"><span>${esc(String(s.etiqueta))}</span></div>`;
  }).join('');
}

function pintarPeriodo(per) {
  if (!per) return;
  const st = $('#periodo-stats');
  if (st) st.innerHTML = `
    <div class="card"><div class="lbl">${IC.dinero} Ventas del periodo</div><div class="val">${money(per.ventas)}</div></div>
    <div class="card"><div class="lbl">${IC.orden} Órdenes</div><div class="val">${per.ordenes}</div></div>
    <div class="card"><div class="lbl">${IC.dinero} Ticket promedio</div><div class="val">${money(per.ticket)}</div></div>
    <div class="card"><div class="lbl">${IC.caja} Unidades vendidas</div><div class="val">${per.unidades}</div></div>`;
  const ch = $('#periodo-chart'); if (ch) ch.innerHTML = chartBarras(per.serie || []);
  const tp = $('#top-periodo');
  if (tp) tp.innerHTML = per.top && per.top.length
    ? per.top.map(p => `<tr><td>${esc(p.nombre_producto)}</td><td style="text-align:right"><b>${p.vendidas}</b> uds</td><td style="text-align:right;color:var(--verde)">${money(p.ingreso)}</td></tr>`).join('')
    : '<tr><td class="vacio">Sin datos</td></tr>';
  $$('#periodo-tabs button').forEach(b => b.classList.toggle('activo', b.dataset.k === per.clave));
}

async function cambiarPeriodo(k) {
  $$('#periodo-tabs button').forEach(b => b.classList.toggle('activo', b.dataset.k === k));
  try { const d = await api('/dashboard?periodo=' + k); pintarPeriodo(d.periodo || { clave: k, ventas: 0, ordenes: 0, ticket: 0, unidades: 0, serie: [], top: [] }); }
  catch (e) { toast(e.message, 'err'); }
}

VISTAS.dashboard = async function () {
  try {
    const d = await api('/dashboard?periodo=mes');

    // Bloque "Ventas por periodo" (si el backend lo provee; si no, gráfico 14 días)
    const bloquePeriodo = d.periodo ? `
      <div class="panel">
        <div class="ph"><h3>Ventas</h3><div class="tabs" id="periodo-tabs" style="margin:0">
          ${PERIODOS.map(p => `<button data-k="${p.k}" class="${p.k === 'mes' ? 'activo' : ''}" onclick="cambiarPeriodo('${p.k}')">${p.label}</button>`).join('')}
        </div></div>
        <div class="pb">
          <div class="cards" id="periodo-stats" style="margin-bottom:18px"></div>
          <div class="chart" id="periodo-chart"></div>
        </div>
      </div>
      <div class="panel">
        <div class="ph"><h3>Más vendidos del periodo</h3></div>
        <div class="pb nopad"><table><tbody id="top-periodo"></tbody></table></div>
      </div>` : `
      <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:20px" class="grid-dash">
        <div class="panel"><div class="ph"><h3>Ventas últimos 14 días</h3></div><div class="pb"><div class="chart">${chartBarras((d.ventas_por_dia || []).map(v => ({ etiqueta: new Date(v.dia).getDate(), total: v.total })))}</div></div></div>
        <div class="panel"><div class="ph"><h3>Top productos</h3></div><div class="pb nopad"><table><tbody>
          ${(d.top_productos || []).map(p => `<tr><td>${esc(p.nombre_producto)}</td><td style="text-align:right"><b>${p.vendidas}</b> uds</td><td style="text-align:right;color:var(--verde)">${money(p.ingreso)}</td></tr>`).join('') || '<tr><td class="vacio">Sin datos</td></tr>'}
        </tbody></table></div></div>
      </div>`;

    $('#contenido').innerHTML = `
      <div class="cards">
        <div class="card"><div class="lbl">${IC.dinero} Ventas hoy</div><div class="val">${money(d.ventas_hoy)}</div></div>
        <div class="card"><div class="lbl">${IC.dinero} Ventas del mes</div><div class="val">${money(d.ventas_mes)}</div></div>
        <div class="card"><div class="lbl">${IC.dinero} Ventas totales</div><div class="val">${money(d.ventas_total)}</div><div class="sub">${d.ordenes_total} órdenes</div></div>
        <div class="card ${d.ordenes_pendientes > 0 ? 'warn' : ''}"><div class="lbl">${IC.orden} Pendientes de pago</div><div class="val">${d.ordenes_pendientes}</div><div class="sub">${d.ordenes_por_enviar} por enviar</div></div>
        <div class="card"><div class="lbl">${IC.cliente} Clientes</div><div class="val">${d.clientes}</div><div class="sub">${d.leads} leads</div></div>
        <div class="card ${d.inventario_bajas > 0 ? 'warn' : ''}"><div class="lbl">${IC.inv} Inventario</div><div class="val">${d.inventario_unidades}</div><div class="sub">${d.inventario_bajas} con stock bajo</div></div>
      </div>

      ${bloquePeriodo}

      <div class="panel">
        <div class="ph"><h3>Últimas órdenes</h3><button class="btn btn-sec btn-sm" onclick="irA('ordenes')">Ver todas</button></div>
        <div class="pb nopad"><table>
          <thead><tr><th>Orden</th><th>Cliente</th><th class="ocultar-movil">Fecha</th><th>Total</th><th>Estado</th></tr></thead>
          <tbody>${(d.ultimas_ordenes || []).map(o => `
            <tr style="cursor:pointer" onclick="verOrden('${escJs(o.numero_orden)}', ${o.id})">
              <td><b>${esc(o.numero_orden)}</b></td><td>${esc(o.nombre || '—')}</td>
              <td class="ocultar-movil">${fechaHora(o.creado_en)}</td><td>${money(o.total)}</td>
              <td><span class="pill ${o.estado}">${o.estado}</span></td></tr>`).join('') || '<tr><td colspan="5" class="vacio">Sin órdenes</td></tr>'}
          </tbody>
        </table></div>
      </div>`;
    if (d.periodo) pintarPeriodo(d.periodo);
    const gd = $('.grid-dash'); if (gd && window.innerWidth < 860) gd.style.gridTemplateColumns = '1fr';
  } catch (e) { $('#contenido').innerHTML = `<div class="vacio">Error: ${esc(e.message)}</div>`; }
};

/* ============================================================
   PRODUCTOS
============================================================ */
VISTAS.productos = async function () {
  $('#topbar-acciones').innerHTML = `<button class="btn btn-primary" id="btn-nuevo-prod">${IC.add}Nuevo producto</button>`;
  $('#btn-nuevo-prod').onclick = () => editorProducto();
  try {
    const prods = await api('/productos/admin/todos');
    $('#contenido').innerHTML = `
      <div class="toolbar">
        <div class="buscar">${IC.buscar}<input id="bp" placeholder="Buscar producto…"></div>
        <select id="fcat"><option value="">Todas las categorías</option><option value="hombre">Hombre</option><option value="mujer">Mujer</option><option value="accesorios">Accesorios</option></select>
      </div>
      <div class="panel"><div class="pb nopad"><table>
        <thead><tr><th>Producto</th><th class="ocultar-movil">Categoría</th><th>Precio</th><th>Stock</th><th class="ocultar-movil">Variantes</th><th>Estado</th><th></th></tr></thead>
        <tbody id="tbody-prod"></tbody>
      </table></div></div>`;
    const render = () => {
      const q = $('#bp').value.toLowerCase();
      const cat = $('#fcat').value;
      const lista = prods.filter(p => (!q || p.nombre.toLowerCase().includes(q)) && (!cat || p.categoria === cat));
      $('#tbody-prod').innerHTML = lista.length ? lista.map(p => `
        <tr>
          <td><div class="celda-prod"><img class="mini" src="${esc(p.imagen || '')}" onerror="this.style.visibility='hidden'"><div><b>${esc(p.nombre)}</b><div style="font-size:12px;color:var(--txt3)">${esc(p.slug)}</div></div></div></td>
          <td class="ocultar-movil" style="text-transform:capitalize">${esc(p.categoria)}${p.subcategoria ? ' · ' + esc(p.subcategoria) : ''}</td>
          <td>${money(p.precio_base)}${p.precio_oferta ? `<br><span style="color:var(--verde);font-size:12px">${money(p.precio_oferta)}</span>` : ''}</td>
          <td><span class="pill ${p.stock_total > 0 ? 'ok' : 'bajo'}">${p.stock_total}</span></td>
          <td class="ocultar-movil">${p.num_variantes}</td>
          <td><span class="pill ${p.activo ? 'pagada' : 'cancelada'}">${p.activo ? 'Activo' : 'Oculto'}</span></td>
          <td style="text-align:right;white-space:nowrap">
            <button class="btn btn-sec btn-sm" onclick="editorProducto(${p.id})">Editar</button>
          </td>
        </tr>`).join('') : '<tr><td colspan="7" class="vacio">No hay productos. Crea el primero.</td></tr>';
    };
    $('#bp').oninput = render; $('#fcat').onchange = render;
    render();
  } catch (e) { $('#contenido').innerHTML = `<div class="vacio">Error: ${esc(e.message)}</div>`; }
};

/* ---------- EDITOR DE PRODUCTO (crear / editar) ---------- */
let EDITOR = { fotos: [], composicion: [], variantes: [] };

async function editorProducto(id) {
  EDITOR = { id: id || null, fotos: [], composicion: [], variantes: [] };
  let p = {};
  if (id) {
    try { p = await api('/productos/admin/' + id); } catch (e) { return toast(e.message, 'err'); }
    EDITOR.fotos = (p.imagenes || []).map(i => ({ url: i.url, alt: i.alt }));
    EDITOR.composicion = (p.composicion || []).map(c => ({ material: c.material, porcentaje: c.porcentaje }));
    EDITOR.variantes = (p.variantes || []).map(v => ({ id: v.id, sku: v.sku, talla: v.talla, color: v.color, color_hex: v.color_hex, precio_ajuste: v.precio_ajuste, stock: v.stock, stock_minimo: v.stock_minimo, activo: v.activo }));
  }
  const car = Array.isArray(p.caracteristicas) ? p.caracteristicas.join(', ') : '';

  modal.abrir(
    id ? 'Editar producto' : 'Nuevo producto',
    `
    <div class="seccion-form">
      <h4>${IC.prod} Información básica</h4>
      <div class="campo"><label>Nombre *</label><input id="e-nombre" value="${esc(p.nombre || '')}" placeholder="Savage Tee"></div>
      <div class="campo"><label>Descripción corta</label><input id="e-corta" value="${esc(p.descripcion_corta || '')}" placeholder="Frase de venta breve"></div>
      <div class="campo"><label>Descripción completa</label><textarea id="e-desc" placeholder="Detalle del producto…">${esc(p.descripcion || '')}</textarea></div>
      <div class="grid2">
        <div class="campo"><label>Categoría *</label><select id="e-cat">
          ${['hombre', 'mujer', 'accesorios', 'equipo'].map(c => `<option value="${c}" ${p.categoria === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select></div>
        <div class="campo"><label>Subcategoría</label><input id="e-sub" value="${esc(p.subcategoria || '')}" placeholder="h-tees, w-leggings, a-botellas…"></div>
      </div>
    </div>

    <div class="seccion-form">
      <h4>${IC.dinero} Precio e inventario base</h4>
      <div class="grid3">
        <div class="campo"><label>Precio base *</label><input type="number" step="0.01" id="e-precio" value="${p.precio_base || ''}"></div>
        <div class="campo"><label>Precio oferta</label><input type="number" step="0.01" id="e-oferta" value="${p.precio_oferta || ''}"></div>
        <div class="campo"><label>Costo (privado)</label><input type="number" step="0.01" id="e-costo" value="${p.costo || ''}"></div>
      </div>
    </div>

    <div class="seccion-form">
      <h4>${IC.caja} Fotos del producto <span style="color:var(--txt3);font-weight:500">(mínimo 4)</span></h4>
      <div class="fotos-grid" id="e-fotos"></div>
      <input type="file" id="e-file" accept="image/*" multiple style="display:none">
      <p class="hint">Puedes subir imágenes o pegar URLs. La primera es la principal.</p>
      <button type="button" class="btn btn-sec btn-sm" id="e-url-btn" style="margin-top:8px">+ Añadir por URL</button>
    </div>

    <div class="seccion-form">
      <h4>${IC.prod} Especificaciones de la prenda</h4>
      <div class="grid2">
        <div class="campo"><label>Material (texto)</label><input id="e-material" value="${esc(p.material || '')}" placeholder="Poliéster reciclado + Elastano"></div>
        <div class="campo"><label>Fit / Corte</label><input id="e-fit" value="${esc(p.fit || '')}" placeholder="Oversized, Compression…"></div>
      </div>
      <div class="grid2">
        <div class="campo"><label>Género</label><select id="e-genero">${['', 'hombre', 'mujer', 'unisex'].map(g => `<option value="${g}" ${p.genero === g ? 'selected' : ''}>${g || '—'}</option>`).join('')}</select></div>
        <div class="campo"><label>Características (separadas por coma)</label><input id="e-carac" value="${esc(car)}" placeholder="Quick-dry, Anti-olor, 4-way stretch"></div>
      </div>
      <div class="campo"><label>Instrucciones de cuidado</label><textarea id="e-cuidado" placeholder="Lavar en frío…">${esc(p.cuidado || '')}</textarea></div>
    </div>

    <div class="seccion-form">
      <h4>${IC.inv} Composición de tela (cantidades en %)</h4>
      <div id="e-comp"></div>
      <button type="button" class="btn btn-sec btn-sm" id="e-comp-add">+ Material</button>
      <div class="comp-total" id="e-comp-total"></div>
    </div>

    <div class="seccion-form">
      <h4>${IC.caja} Peso y dimensiones <span style="color:var(--txt3);font-weight:500">(para envío USPS)</span></h4>
      <div class="grid2">
        <div class="campo"><label>Peso (oz)</label><input type="number" step="0.1" id="e-peso" value="${p.peso_oz || ''}"></div>
        <div class="campo"><label>Largo (in)</label><input type="number" step="0.1" id="e-largo" value="${p.largo_in || ''}"></div>
      </div>
      <div class="grid2">
        <div class="campo"><label>Ancho (in)</label><input type="number" step="0.1" id="e-ancho" value="${p.ancho_in || ''}"></div>
        <div class="campo"><label>Alto (in)</label><input type="number" step="0.1" id="e-alto" value="${p.alto_in || ''}"></div>
      </div>
    </div>

    <div class="seccion-form">
      <h4>${IC.inv} Variantes (talla / color / stock)</h4>
      <div id="e-vars"></div>
      <button type="button" class="btn btn-sec btn-sm" id="e-var-add">+ Variante</button>
    </div>

    <div class="seccion-form">
      <h4>${IC.config} Visibilidad y SEO</h4>
      <label class="sw"><input type="checkbox" id="e-activo" ${p.activo !== false ? 'checked' : ''}><span class="track"></span> Producto activo (visible en tienda)</label>
      <label class="sw"><input type="checkbox" id="e-destacado" ${p.destacado ? 'checked' : ''}><span class="track"></span> Destacado (best seller)</label>
      <label class="sw"><input type="checkbox" id="e-nuevo" ${p.nuevo !== false ? 'checked' : ''}><span class="track"></span> Etiqueta "Nuevo"</label>
      <div class="campo" style="margin-top:12px"><label>Meta título (SEO)</label><input id="e-meta-t" value="${esc(p.meta_titulo || '')}"></div>
      <div class="campo"><label>Meta descripción (SEO)</label><textarea id="e-meta-d">${esc(p.meta_descripcion || '')}</textarea></div>
    </div>
    `,
    `${id ? `<button class="btn btn-danger" onclick="borrarProducto(${id})">Eliminar</button>` : ''}
     <button class="btn btn-sec" onclick="modal.cerrar()">Cancelar</button>
     <button class="btn btn-primary" id="e-guardar">Guardar producto</button>`
  );

  // render dinámicos
  renderFotos(); renderComp(); renderVars();

  // eventos
  $('#e-file').onchange = subirFotos;
  $('#e-url-btn').onclick = () => {
    const u = prompt('URL de la imagen:');
    if (u) { EDITOR.fotos.push({ url: u.trim(), alt: '' }); renderFotos(); }
  };
  $('#e-comp-add').onclick = () => { EDITOR.composicion.push({ material: '', porcentaje: '' }); renderComp(); };
  $('#e-var-add').onclick = () => { EDITOR.variantes.push({ talla: '', color: '', color_hex: '', stock: 0, stock_minimo: 5, activo: true }); renderVars(); };
  $('#e-guardar').onclick = guardarProducto;
}

function renderFotos() {
  const cont = $('#e-fotos');
  cont.innerHTML = EDITOR.fotos.map((f, i) => `
    <div class="foto-item">
      <img src="${esc(f.url)}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22%3E%3Crect width=%2280%22 height=%2280%22 fill=%22%23333%22/%3E%3C/svg%3E'">
      <button type="button" class="quitar" onclick="EDITOR.fotos.splice(${i},1);renderFotos()">&times;</button>
      ${i === 0 ? '<div class="principal">PRINCIPAL</div>' : ''}
    </div>`).join('') +
    `<button type="button" class="foto-add" onclick="$('#e-file').click()">${IC.add}<span>Subir</span></button>`;
}

async function subirFotos(e) {
  const files = [...e.target.files];
  if (!files.length) return;
  const fd = new FormData();
  files.forEach(f => fd.append('imagenes', f));
  toast('Subiendo ' + files.length + ' foto(s)…');
  try {
    const r = await api('/productos/admin/upload', { method: 'POST', form: fd });
    r.urls.forEach(u => EDITOR.fotos.push({ url: u, alt: '' }));
    renderFotos();
    toast('Fotos subidas');
  } catch (err) { toast(err.message, 'err'); }
  e.target.value = '';
}

function renderComp() {
  const cont = $('#e-comp');
  cont.innerHTML = EDITOR.composicion.map((c, i) => `
    <div class="fila-din">
      <input placeholder="Material (Algodón…)" value="${esc(c.material)}" oninput="EDITOR.composicion[${i}].material=this.value">
      <input type="number" step="1" placeholder="%" value="${c.porcentaje}" style="max-width:90px" oninput="EDITOR.composicion[${i}].porcentaje=this.value;sumarComp()">
      <button type="button" class="quitar-fila" onclick="EDITOR.composicion.splice(${i},1);renderComp()">&times;</button>
    </div>`).join('');
  sumarComp();
}
function sumarComp() {
  const total = EDITOR.composicion.reduce((s, c) => s + (parseFloat(c.porcentaje) || 0), 0);
  const el = $('#e-comp-total');
  if (!el) return;
  if (!EDITOR.composicion.length) { el.textContent = ''; return; }
  el.textContent = `Total: ${total}%` + (total === 100 ? ' ✓' : ' (debe sumar 100%)');
  el.className = 'comp-total ' + (total === 100 ? 'ok' : 'mal');
}

function renderVars() {
  const cont = $('#e-vars');
  cont.innerHTML = EDITOR.variantes.map((v, i) => `
    <div class="fila-din" style="flex-wrap:wrap">
      <input placeholder="Talla" value="${esc(v.talla || '')}" style="max-width:80px" oninput="EDITOR.variantes[${i}].talla=this.value">
      <input placeholder="Color" value="${esc(v.color || '')}" style="max-width:110px" oninput="EDITOR.variantes[${i}].color=this.value">
      <input type="color" value="${v.color_hex || '#262726'}" style="max-width:46px;padding:3px" oninput="EDITOR.variantes[${i}].color_hex=this.value">
      <input type="number" placeholder="Stock" value="${v.stock ?? 0}" style="max-width:90px" title="Stock" oninput="EDITOR.variantes[${i}].stock=this.value">
      <input placeholder="SKU (auto)" value="${esc(v.sku || '')}" style="max-width:130px" oninput="EDITOR.variantes[${i}].sku=this.value">
      <button type="button" class="quitar-fila" onclick="EDITOR.variantes.splice(${i},1);renderVars()">&times;</button>
    </div>`).join('') || '<p class="hint">Sin variantes. Añade al menos una (ej. Talla M).</p>';
}

async function guardarProducto() {
  const carac = $('#e-carac').value.split(',').map(s => s.trim()).filter(Boolean);
  const body = {
    nombre: $('#e-nombre').value.trim(),
    descripcion: $('#e-desc').value.trim(),
    descripcion_corta: $('#e-corta').value.trim(),
    categoria: $('#e-cat').value,
    subcategoria: $('#e-sub').value.trim() || null,
    precio_base: parseFloat($('#e-precio').value),
    precio_oferta: $('#e-oferta').value ? parseFloat($('#e-oferta').value) : null,
    costo: $('#e-costo').value ? parseFloat($('#e-costo').value) : null,
    material: $('#e-material').value.trim() || null,
    fit: $('#e-fit').value.trim() || null,
    genero: $('#e-genero').value || null,
    caracteristicas: carac,
    cuidado: $('#e-cuidado').value.trim() || null,
    peso_oz: $('#e-peso').value ? parseFloat($('#e-peso').value) : null,
    largo_in: $('#e-largo').value ? parseFloat($('#e-largo').value) : null,
    ancho_in: $('#e-ancho').value ? parseFloat($('#e-ancho').value) : null,
    alto_in: $('#e-alto').value ? parseFloat($('#e-alto').value) : null,
    activo: $('#e-activo').checked,
    destacado: $('#e-destacado').checked,
    nuevo: $('#e-nuevo').checked,
    meta_titulo: $('#e-meta-t').value.trim() || null,
    meta_descripcion: $('#e-meta-d').value.trim() || null,
    composicion: EDITOR.composicion.filter(c => c.material && c.porcentaje),
    imagenes: EDITOR.fotos,
    variantes: EDITOR.variantes,
  };
  if (!body.nombre || !body.precio_base) return toast('Nombre y precio base son obligatorios', 'err');
  $('#e-guardar').textContent = 'Guardando…';
  try {
    if (EDITOR.id) await api('/productos/admin/' + EDITOR.id, { method: 'PUT', body });
    else await api('/productos/admin', { method: 'POST', body });
    modal.cerrar();
    toast('Producto guardado');
    irA('productos');
  } catch (e) { toast(e.message, 'err'); $('#e-guardar').textContent = 'Guardar producto'; }
}

async function borrarProducto(id) {
  if (!confirm('¿Eliminar este producto permanentemente? Esto borra sus variantes e imágenes.')) return;
  try { await api('/productos/admin/' + id, { method: 'DELETE' }); modal.cerrar(); toast('Producto eliminado'); irA('productos'); }
  catch (e) { toast(e.message, 'err'); }
}

/* ============================================================
   INVENTARIO
============================================================ */
VISTAS.inventario = async function () {
  try {
    const [inv, resumen] = await Promise.all([api('/inventario'), api('/inventario/resumen')]);
    $('#contenido').innerHTML = `
      <div class="cards">
        <div class="card"><div class="lbl">${IC.inv} Unidades totales</div><div class="val">${resumen.unidades_total}</div></div>
        <div class="card"><div class="lbl">${IC.dinero} Valor a costo</div><div class="val">${money(resumen.valor_costo)}</div></div>
        <div class="card"><div class="lbl">${IC.dinero} Valor retail</div><div class="val">${money(resumen.valor_retail)}</div></div>
        <div class="card ${resumen.variantes_bajas > 0 ? 'warn' : ''}"><div class="lbl">${IC.inv} Stock bajo</div><div class="val">${resumen.variantes_bajas}</div><div class="sub">${resumen.variantes_agotadas} agotados</div></div>
      </div>
      <div class="toolbar"><div class="buscar">${IC.buscar}<input id="bi" placeholder="Buscar por producto o SKU…"></div>
        <label class="sw"><input type="checkbox" id="solo-bajo"><span class="track"></span> Solo stock bajo</label></div>
      <div class="panel"><div class="pb nopad"><table>
        <thead><tr><th>Producto</th><th>SKU</th><th class="ocultar-movil">Talla/Color</th><th>Stock</th><th class="ocultar-movil">Mínimo</th><th></th></tr></thead>
        <tbody id="tbody-inv"></tbody>
      </table></div></div>`;
    const render = () => {
      const q = $('#bi').value.toLowerCase();
      const bajo = $('#solo-bajo').checked;
      const lista = inv.filter(v =>
        (!q || v.producto.toLowerCase().includes(q) || (v.sku || '').toLowerCase().includes(q)) &&
        (!bajo || v.stock <= v.stock_minimo));
      $('#tbody-inv').innerHTML = lista.length ? lista.map(v => `
        <tr>
          <td><b>${esc(v.producto)}</b></td>
          <td style="font-family:monospace;font-size:12px">${esc(v.sku)}</td>
          <td class="ocultar-movil">${esc(v.talla || '—')} ${v.color ? '· ' + esc(v.color) : ''}</td>
          <td><span class="pill ${v.stock <= v.stock_minimo ? 'bajo' : 'ok'}">${v.stock}</span></td>
          <td class="ocultar-movil">${v.stock_minimo}</td>
          <td style="text-align:right"><button class="btn btn-sec btn-sm" onclick="ajustarStock(${v.variante_id}, '${escJs(v.producto)} ${escJs(v.talla || '')}', ${v.stock}, ${v.stock_minimo})">Ajustar</button></td>
        </tr>`).join('') : '<tr><td colspan="6" class="vacio">Sin resultados</td></tr>';
    };
    $('#bi').oninput = render; $('#solo-bajo').onchange = render;
    render();
  } catch (e) { $('#contenido').innerHTML = `<div class="vacio">Error: ${esc(e.message)}</div>`; }
};

function ajustarStock(vid, nombre, stock, minimo) {
  modal.abrir('Ajustar inventario', `
    <p style="color:var(--txt2);margin-bottom:16px">${esc(nombre)}</p>
    <div class="grid2">
      <div class="campo"><label>Stock actual</label><input type="number" id="aj-stock" value="${stock}"></div>
      <div class="campo"><label>Stock mínimo (alerta)</label><input type="number" id="aj-min" value="${minimo}"></div>
    </div>
    <div class="campo"><label>Motivo</label><select id="aj-motivo">
      <option value="ajuste">Ajuste manual</option><option value="compra">Compra/entrada</option>
      <option value="merma">Merma/daño</option><option value="devolucion">Devolución</option></select></div>
    <div class="campo"><label>Referencia (opcional)</label><input id="aj-ref" placeholder="Factura, nota…"></div>
  `, `<button class="btn btn-sec" onclick="modal.cerrar()">Cancelar</button>
      <button class="btn btn-primary" id="aj-guardar">Guardar</button>`);
  $('#aj-guardar').onclick = async () => {
    try {
      await api('/inventario/' + vid, { method: 'PUT', body: {
        stock: parseInt($('#aj-stock').value, 10),
        stock_minimo: parseInt($('#aj-min').value, 10),
        motivo: $('#aj-motivo').value, referencia: $('#aj-ref').value.trim() || null } });
      modal.cerrar(); toast('Inventario actualizado'); irA('inventario'); refrescarBadges();
    } catch (e) { toast(e.message, 'err'); }
  };
}

/* ============================================================
   ÓRDENES
============================================================ */
VISTAS.ordenes = async function () {
  try {
    const ordenes = await api('/ordenes/admin');
    $('#contenido').innerHTML = `
      <div class="toolbar">
        <div class="buscar">${IC.buscar}<input id="bo" placeholder="Buscar orden, cliente, email…"></div>
        <select id="fo"><option value="">Todos los estados</option>
          ${['pendiente', 'pagada', 'procesando', 'enviada', 'entregada', 'cancelada', 'reembolsada'].map(e => `<option value="${e}">${e}</option>`).join('')}
        </select>
      </div>
      <div class="panel"><div class="pb nopad"><table>
        <thead><tr><th>Orden</th><th>Cliente</th><th class="ocultar-movil">Fecha</th><th>Items</th><th>Total</th><th>Estado</th></tr></thead>
        <tbody id="tbody-ord"></tbody>
      </table></div></div>`;
    const render = () => {
      const q = $('#bo').value.toLowerCase();
      const est = $('#fo').value;
      const lista = ordenes.filter(o =>
        (!q || o.numero_orden.toLowerCase().includes(q) || (o.nombre || '').toLowerCase().includes(q) || o.email.toLowerCase().includes(q)) &&
        (!est || o.estado === est));
      $('#tbody-ord').innerHTML = lista.length ? lista.map(o => `
        <tr style="cursor:pointer" onclick="verOrden('${escJs(o.numero_orden)}', ${o.id})">
          <td><b>${esc(o.numero_orden)}</b></td>
          <td>${esc(o.nombre || '—')}<div style="font-size:12px;color:var(--txt3)">${esc(o.email)}</div></td>
          <td class="ocultar-movil">${fechaHora(o.creado_en)}</td>
          <td>${o.num_items}</td><td>${money(o.total)}</td>
          <td><span class="pill ${o.estado}">${o.estado}</span></td>
        </tr>`).join('') : '<tr><td colspan="6" class="vacio">Sin órdenes</td></tr>';
    };
    $('#bo').oninput = render; $('#fo').onchange = render;
    render();
  } catch (e) { $('#contenido').innerHTML = `<div class="vacio">Error: ${esc(e.message)}</div>`; }
};

async function verOrden(numero, id) {
  try {
    let o;
    if (id) o = await api('/ordenes/admin/' + id);
    else {
      const lista = await api('/ordenes/admin?q=' + encodeURIComponent(numero));
      const found = lista.find(x => x.numero_orden === numero);
      if (!found) return toast('Orden no encontrada', 'err');
      o = await api('/ordenes/admin/' + found.id);
    }
    const dir = o.direccion_envio || {};
    const estados = ['pendiente', 'pagada', 'procesando', 'enviada', 'entregada', 'cancelada', 'reembolsada'];
    modal.abrir(`Orden ${esc(o.numero_orden)}`, `
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:16px;flex-wrap:wrap">
        <span class="pill ${o.estado}">${o.estado}</span>
        <span style="color:var(--txt3);font-size:13px">${fechaHora(o.creado_en)}</span>
      </div>
      <div class="seccion-form">
        <h4>${IC.cliente} Cliente</h4>
        <p><b>${esc(o.nombre || '—')}</b></p><p style="color:var(--txt2)">${esc(o.email)}</p>
        <p style="color:var(--txt2)">${esc(o.telefono || '')}</p>
        ${dir.linea1 ? `<p style="color:var(--txt2);margin-top:8px">${esc(dir.linea1)} ${esc(dir.linea2 || '')}, ${esc(dir.ciudad || '')}, ${esc(dir.estado || 'PR')} ${esc(dir.zip || '')}</p>` : ''}
      </div>
      <div class="seccion-form">
        <h4>${IC.caja} Productos</h4>
        <table><tbody>
          ${o.items.map(it => `<tr><td>${esc(it.nombre_producto)}<div style="font-size:12px;color:var(--txt3)">${esc(it.talla || '')} ${it.color ? '· ' + esc(it.color) : ''} · ${esc(it.sku || '')}</div></td><td style="text-align:center">×${it.cantidad}</td><td style="text-align:right">${money(it.precio_unitario * it.cantidad)}</td></tr>`).join('')}
        </tbody></table>
        <div style="border-top:1px solid var(--linea);margin-top:12px;padding-top:12px;font-size:14px">
          <div style="display:flex;justify-content:space-between;padding:3px 0;color:var(--txt2)"><span>Subtotal</span><span>${money(o.subtotal)}</span></div>
          ${parseFloat(o.descuento) > 0 ? `<div style="display:flex;justify-content:space-between;padding:3px 0;color:var(--verde)"><span>Descuento</span><span>-${money(o.descuento)}</span></div>` : ''}
          <div style="display:flex;justify-content:space-between;padding:3px 0;color:var(--txt2)"><span>Envío</span><span>${money(o.envio)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:3px 0;color:var(--txt2)"><span>IVU</span><span>${money(o.impuesto)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:6px 0;font-weight:800;font-size:17px"><span>Total</span><span>${money(o.total)}</span></div>
        </div>
      </div>
      <div class="seccion-form">
        <h4>${IC.envio} Envío y estado</h4>
        ${o.tracking ? `<p style="color:var(--txt2)">Tracking: <b>${esc(o.tracking)}</b> (${esc(o.transportista || '')})</p>` : ''}
        <div class="campo"><label>Cambiar estado</label>
          <select id="o-estado">${estados.map(e => `<option value="${e}" ${o.estado === e ? 'selected' : ''}>${e}</option>`).join('')}</select></div>
        <div class="grid2">
          <div class="campo"><label>Transportista</label><select id="o-transp"><option value="">—</option><option value="usps" ${o.transportista === 'usps' ? 'selected' : ''}>USPS</option><option value="manual" ${o.transportista === 'manual' ? 'selected' : ''}>Manual</option><option value="pickup" ${o.transportista === 'pickup' ? 'selected' : ''}>Pickup</option></select></div>
          <div class="campo"><label>Tracking #</label><input id="o-track" value="${esc(o.tracking || '')}"></div>
        </div>
      </div>
    `, `${o.estado === 'pendiente' ? `<button class="btn btn-sec" id="o-pago-manual">Marcar pagada (manual)</button>` : ''}
        <button class="btn btn-sec" onclick="modal.cerrar()">Cerrar</button>
        <button class="btn btn-primary" id="o-guardar">Guardar cambios</button>`);

    $('#o-guardar').onclick = async () => {
      try {
        const nuevoEstado = $('#o-estado').value;
        if (nuevoEstado !== o.estado) await api(`/ordenes/admin/${o.id}/estado`, { method: 'PUT', body: { estado: nuevoEstado } });
        if ($('#o-track').value.trim() || $('#o-transp').value) {
          await api(`/envios/${o.id}/tracking`, { method: 'PUT', body: {
            transportista: $('#o-transp').value || null, tracking: $('#o-track').value.trim() || null,
            marcar_enviada: nuevoEstado === 'enviada' } });
        }
        modal.cerrar(); toast('Orden actualizada'); irA('ordenes'); refrescarBadges();
      } catch (e) { toast(e.message, 'err'); }
    };
    const pm = $('#o-pago-manual');
    if (pm) pm.onclick = async () => {
      try { await api('/pagos/admin/manual', { method: 'POST', body: { orden_id: o.id } }); modal.cerrar(); toast('Marcada como pagada'); irA('ordenes'); refrescarBadges(); }
      catch (e) { toast(e.message, 'err'); }
    };
  } catch (e) { toast(e.message, 'err'); }
}

/* ============================================================
   ENVÍOS
============================================================ */
VISTAS.envios = async function () {
  try {
    const pend = await api('/envios/pendientes');
    $('#contenido').innerHTML = `
      <div class="panel">
        <div class="ph"><h3>Pendientes de envío (${pend.length})</h3></div>
        <div class="pb nopad"><table>
          <thead><tr><th>Orden</th><th>Cliente</th><th class="ocultar-movil">Dirección</th><th>Total</th><th></th></tr></thead>
          <tbody>${pend.length ? pend.map(o => {
            const d = o.direccion_envio || {};
            return `<tr>
              <td><b>${esc(o.numero_orden)}</b></td>
              <td>${esc(o.nombre || '—')}<div style="font-size:12px;color:var(--txt3)">${esc(o.email)}</div></td>
              <td class="ocultar-movil" style="font-size:13px;color:var(--txt2)">${d.linea1 ? esc(d.linea1) + ', ' + esc(d.ciudad || '') + ' ' + esc(d.zip || '') : '—'}</td>
              <td>${money(o.total)}</td>
              <td style="text-align:right"><button class="btn btn-primary btn-sm" onclick="verOrden('${escJs(o.numero_orden)}', ${o.id})">Procesar</button></td>
            </tr>`;
          }).join('') : '<tr><td colspan="5" class="vacio">No hay envíos pendientes 🎉</td></tr>'}</tbody>
        </table></div>
      </div>
      <div class="panel"><div class="pb">
        <p style="color:var(--txt2);font-size:14px"><b>USPS en vivo:</b> configura <code>USPS_USER_ID</code> en Configuración para cotización y etiquetas automáticas. Mientras tanto, el envío usa tarifa fija + pickup local.</p>
      </div></div>`;
  } catch (e) { $('#contenido').innerHTML = `<div class="vacio">Error: ${esc(e.message)}</div>`; }
};

/* ============================================================
   CONTABILIDAD
============================================================ */
VISTAS.contabilidad = async function () {
  $('#topbar-acciones').innerHTML = `<button class="btn btn-sec btn-sm" id="exp-csv">Exportar CSV</button> <button class="btn btn-primary" id="btn-mov">${IC.add}Movimiento</button>`;
  try {
    const [resumen, movs] = await Promise.all([api('/contabilidad/resumen'), api('/contabilidad/movimientos')]);
    $('#contenido').innerHTML = `
      <div class="cards">
        <div class="card"><div class="lbl">${IC.dinero} Ingresos</div><div class="val" style="color:var(--verde)">${money(resumen.ingresos)}</div></div>
        <div class="card"><div class="lbl">${IC.dinero} Gastos</div><div class="val" style="color:var(--err)">${money(resumen.gastos)}</div></div>
        <div class="card"><div class="lbl">${IC.dinero} Utilidad neta</div><div class="val">${money(resumen.utilidad_neta)}</div></div>
        <div class="card"><div class="lbl">${IC.dinero} Margen bruto ventas</div><div class="val">${money(resumen.margen_bruto)}</div><div class="sub">COGS: ${money(resumen.costo_productos_vendidos)}</div></div>
      </div>
      <div class="panel"><div class="ph"><h3>Movimientos</h3></div><div class="pb nopad"><table>
        <thead><tr><th>Fecha</th><th>Tipo</th><th>Categoría</th><th class="ocultar-movil">Descripción</th><th>Monto</th><th></th></tr></thead>
        <tbody>${movs.length ? movs.map(m => `
          <tr><td>${fecha(m.fecha)}</td>
            <td><span class="pill ${m.tipo === 'ingreso' ? 'ok' : 'cancelada'}">${m.tipo}</span></td>
            <td style="text-transform:capitalize">${esc(m.categoria)}</td>
            <td class="ocultar-movil">${esc(m.descripcion || '—')}</td>
            <td style="color:${m.tipo === 'ingreso' ? 'var(--verde)' : 'var(--err)'}">${m.tipo === 'ingreso' ? '+' : '-'}${money(m.monto)}</td>
            <td style="text-align:right">${m.orden_id ? '' : `<button class="btn btn-danger btn-sm" onclick="borrarMov(${m.id})">×</button>`}</td>
          </tr>`).join('') : '<tr><td colspan="6" class="vacio">Sin movimientos</td></tr>'}
        </tbody></table></div></div>`;
    $('#exp-csv').onclick = () => descargarCSV('/contabilidad/export.csv', 'contabilidad-gymrillas.csv');
    $('#btn-mov').onclick = nuevoMovimiento;
  } catch (e) { $('#contenido').innerHTML = `<div class="vacio">Error: ${esc(e.message)}</div>`; }
};

function nuevoMovimiento() {
  modal.abrir('Nuevo movimiento', `
    <div class="campo"><label>Tipo</label><select id="m-tipo"><option value="gasto">Gasto</option><option value="ingreso">Ingreso</option></select></div>
    <div class="campo"><label>Categoría</label><select id="m-cat">
      <option value="inventario">Inventario</option><option value="marketing">Marketing</option>
      <option value="envio">Envío</option><option value="operacion">Operación</option>
      <option value="venta">Venta</option><option value="otro">Otro</option></select></div>
    <div class="campo"><label>Monto</label><input type="number" step="0.01" id="m-monto"></div>
    <div class="campo"><label>Descripción</label><input id="m-desc"></div>
    <div class="campo"><label>Fecha</label><input type="date" id="m-fecha" value="${new Date().toISOString().slice(0, 10)}"></div>
  `, `<button class="btn btn-sec" onclick="modal.cerrar()">Cancelar</button><button class="btn btn-primary" id="m-guardar">Guardar</button>`);
  $('#m-guardar').onclick = async () => {
    try {
      await api('/contabilidad/movimientos', { method: 'POST', body: {
        tipo: $('#m-tipo').value, categoria: $('#m-cat').value,
        monto: parseFloat($('#m-monto').value), descripcion: $('#m-desc').value.trim(), fecha: $('#m-fecha').value } });
      modal.cerrar(); toast('Movimiento registrado'); irA('contabilidad');
    } catch (e) { toast(e.message, 'err'); }
  };
}
async function borrarMov(id) {
  if (!confirm('¿Eliminar movimiento?')) return;
  try { await api('/contabilidad/movimientos/' + id, { method: 'DELETE' }); toast('Eliminado'); irA('contabilidad'); }
  catch (e) { toast(e.message, 'err'); }
}

/* ============================================================
   CLIENTES
============================================================ */
VISTAS.clientes = async function () {
  try {
    const cli = await api('/dashboard/clientes');
    $('#contenido').innerHTML = `
      <div class="toolbar"><div class="buscar">${IC.buscar}<input id="bc" placeholder="Buscar cliente…"></div></div>
      <div class="panel"><div class="pb nopad"><table>
        <thead><tr><th>Cliente</th><th class="ocultar-movil">Email</th><th class="ocultar-movil">Teléfono</th><th>Órdenes</th><th>Gastado</th></tr></thead>
        <tbody id="tbody-cli"></tbody>
      </table></div></div>`;
    const render = () => {
      const q = $('#bc').value.toLowerCase();
      const lista = cli.filter(c => !q || `${c.nombre} ${c.apellido} ${c.email}`.toLowerCase().includes(q));
      $('#tbody-cli').innerHTML = lista.length ? lista.map(c => `
        <tr><td><b>${esc(c.nombre)} ${esc(c.apellido || '')}</b></td>
          <td class="ocultar-movil">${esc(c.email)}</td>
          <td class="ocultar-movil">${esc(c.telefono || '—')}</td>
          <td>${c.ordenes}</td><td>${money(c.gastado)}</td></tr>`).join('') : '<tr><td colspan="5" class="vacio">Sin clientes</td></tr>';
    };
    $('#bc').oninput = render; render();
  } catch (e) { $('#contenido').innerHTML = `<div class="vacio">Error: ${esc(e.message)}</div>`; }
};

/* ============================================================
   CUPONES
============================================================ */
VISTAS.cupones = async function () {
  $('#topbar-acciones').innerHTML = `<button class="btn btn-sec" id="btn-ref">${IC.cliente}Código de referido</button> <button class="btn btn-primary" id="btn-cup">${IC.add}Nuevo cupón</button>`;
  try {
    const cupones = await api('/cupones/admin');
    // Métricas por cupón (con fallback para backend que aún no las provee)
    const compras = (c) => (c.compras != null ? c.compras : (c.usos_actuales || 0));
    const vendido = (c) => (c.vendido || 0);
    const desc = (c) => (c.descuento_total || 0);
    const comisionPct = (c) => (c.comision_pct || 0);
    const comision = (c) => (c.comision_pagar != null ? c.comision_pagar : +(vendido(c) * comisionPct(c) / 100).toFixed(2));
    const orden = cupones.slice().sort((a, b) => vendido(b) - vendido(a) || compras(b) - compras(a));
    const tot = cupones.reduce((a, c) => ({ compras: a.compras + compras(c), vendido: a.vendido + vendido(c), descuento: a.descuento + desc(c), comision: a.comision + comision(c) }), { compras: 0, vendido: 0, descuento: 0, comision: 0 });

    $('#contenido').innerHTML = `
      <p style="color:var(--txt2);font-size:14px;margin-bottom:18px;max-width:720px">
        Cada código mide <b>cuántas compras</b> generó y <b>cuánto dinero</b> movió. Para incentivos por
        referido crea un código <code>REF-*</code> con una <b>comisión %</b>: la columna <b>Comisión a pagar</b>
        te dice cuánto le debes al referido sobre sus ventas.
      </p>
      <div class="cards">
        <div class="card"><div class="lbl">${IC.orden} Compras con cupón</div><div class="val">${tot.compras}</div></div>
        <div class="card"><div class="lbl">${IC.dinero} Ventas con cupón</div><div class="val" style="color:var(--verde)">${money(tot.vendido)}</div></div>
        <div class="card"><div class="lbl">${IC.cupon} Descuento otorgado</div><div class="val">${money(tot.descuento)}</div></div>
        <div class="card ${tot.comision > 0 ? 'warn' : ''}"><div class="lbl">${IC.cliente} Comisión a pagar</div><div class="val">${money(tot.comision)}</div><div class="sub">a referidos</div></div>
      </div>
      <div class="panel"><div class="pb nopad"><table>
        <thead><tr><th>Código</th><th class="ocultar-movil">Valor</th><th>Compras</th><th class="ocultar-movil">Clientes</th><th>Vendido</th><th class="ocultar-movil">Descuento</th><th>Comisión a pagar</th><th>Estado</th><th></th></tr></thead>
        <tbody>${orden.length ? orden.map(c => `
          <tr><td><b style="font-family:monospace">${esc(c.codigo)}</b>${c.es_referido && c.referido_nombre ? `<div style="font-size:12px;color:var(--txt3)">Referido: ${esc(c.referido_nombre)}</div>` : ''}</td>
            <td class="ocultar-movil">${c.tipo === 'porcentaje' ? c.valor + '%' : money(c.valor)}</td>
            <td><b>${compras(c)}</b>${c.usos_max ? ` <span style="color:var(--txt3)">/ ${c.usos_max}</span>` : ''}</td>
            <td class="ocultar-movil">${c.clientes_unicos != null ? c.clientes_unicos : '—'}</td>
            <td style="color:var(--verde)">${money(vendido(c))}</td>
            <td class="ocultar-movil">${money(desc(c))}</td>
            <td>${comisionPct(c) > 0 ? `<b>${money(comision(c))}</b> <span style="color:var(--txt3);font-size:12px">(${comisionPct(c)}%)</span>` : '—'}</td>
            <td><span class="pill ${c.activo ? 'ok' : 'cancelada'}">${c.activo ? 'Activo' : 'Inactivo'}</span></td>
            <td style="text-align:right"><button class="btn btn-danger btn-sm" onclick="borrarCupon(${c.id})">×</button></td></tr>`).join('') : '<tr><td colspan="9" class="vacio">Sin cupones</td></tr>'}
        </tbody></table></div></div>`;
    $('#btn-cup').onclick = nuevoCupon;
    $('#btn-ref').onclick = nuevoReferido;
  } catch (e) { $('#contenido').innerHTML = `<div class="vacio">Error: ${esc(e.message)}</div>`; }
};

function nuevoReferido() {
  modal.abrir('Nuevo código de referido', `
    <p style="color:var(--txt2);font-size:13px;margin-bottom:16px">Genera un código único para una persona que refiere clientes. El cliente recibe un descuento y tú registras la comisión que le pagarás al referido.</p>
    <div class="campo"><label>Nombre del referido</label><input id="r-nombre" placeholder="Ej. Carlos Meléndez"></div>
    <div class="campo"><label>Código (se genera del nombre, editable)</label><input id="r-codigo" placeholder="REF-CARLOS" style="text-transform:uppercase;font-family:monospace"></div>
    <div class="grid2">
      <div class="campo"><label>Descuento al cliente (%)</label><input type="number" step="1" id="r-desc" value="10"></div>
      <div class="campo"><label>Comisión al referido (%)</label><input type="number" step="1" id="r-com" value="10"></div>
    </div>
    <p class="hint">La comisión se calcula sobre las ventas que traiga el código.</p>
  `, `<button class="btn btn-sec" onclick="modal.cerrar()">Cancelar</button><button class="btn btn-primary" id="r-guardar">Crear código</button>`);
  // Autogenerar código desde el nombre
  const slugRef = (s) => { var f = String(s||"").trim().split(" ")[0].normalize("NFD"); var out=""; for (var i=0;i<f.length;i++){ var ch=f[i].toUpperCase(); if ((ch>="A"&&ch<="Z")||(ch>="0"&&ch<="9")) out+=ch; } return "REF-" + (out || "CODE"); };
  let editado = false;
  $('#r-codigo').oninput = () => { editado = true; };
  $('#r-nombre').oninput = () => { if (!editado) $('#r-codigo').value = slugRef($('#r-nombre').value); };
  $('#r-guardar').onclick = async () => {
    const nombre = $('#r-nombre').value.trim();
    const codigo = ($('#r-codigo').value.trim() || slugRef(nombre)).toUpperCase();
    if (!nombre || !codigo || codigo === 'REF-') return toast('Escribe el nombre del referido', 'err');
    try {
      await api('/cupones/admin', { method: 'POST', body: {
        codigo, tipo: 'porcentaje', valor: parseFloat($('#r-desc').value) || 0,
        minimo_compra: 0, usos_max: null, expira_en: null,
        es_referido: true, comision_pct: parseFloat($('#r-com').value) || 0, referido_nombre: nombre } });
      modal.cerrar(); toast('Código de referido creado: ' + codigo); irA('cupones');
    } catch (e) { toast(e.message, 'err'); }
  };
}
function nuevoCupon() {
  modal.abrir('Nuevo cupón', `
    <div class="campo"><label>Código</label><input id="c-cod" placeholder="VERANO20" style="text-transform:uppercase"></div>
    <div class="grid2">
      <div class="campo"><label>Tipo</label><select id="c-tipo"><option value="porcentaje">Porcentaje</option><option value="fijo">Monto fijo</option></select></div>
      <div class="campo"><label>Valor</label><input type="number" step="0.01" id="c-val"></div>
    </div>
    <div class="grid2">
      <div class="campo"><label>Compra mínima</label><input type="number" step="0.01" id="c-min" value="0"></div>
      <div class="campo"><label>Usos máximos (vacío = ∞)</label><input type="number" id="c-usos"></div>
    </div>
    <div class="campo"><label>Expira (opcional)</label><input type="date" id="c-exp"></div>
  `, `<button class="btn btn-sec" onclick="modal.cerrar()">Cancelar</button><button class="btn btn-primary" id="c-guardar">Crear</button>`);
  $('#c-guardar').onclick = async () => {
    try {
      await api('/cupones/admin', { method: 'POST', body: {
        codigo: $('#c-cod').value.trim(), tipo: $('#c-tipo').value, valor: parseFloat($('#c-val').value),
        minimo_compra: parseFloat($('#c-min').value) || 0, usos_max: $('#c-usos').value ? parseInt($('#c-usos').value, 10) : null,
        expira_en: $('#c-exp').value || null } });
      modal.cerrar(); toast('Cupón creado'); irA('cupones');
    } catch (e) { toast(e.message, 'err'); }
  };
}
async function borrarCupon(id) {
  if (!confirm('¿Eliminar cupón?')) return;
  try { await api('/cupones/admin/' + id, { method: 'DELETE' }); toast('Eliminado'); irA('cupones'); }
  catch (e) { toast(e.message, 'err'); }
}

/* ============================================================
   RESEÑAS
============================================================ */
VISTAS.resenas = async function () {
  try {
    const reviews = await api('/reviews/admin');
    const estrellas = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
    $('#contenido').innerHTML = `
      <div class="panel"><div class="pb nopad"><table>
        <thead><tr><th>Producto</th><th>Autor</th><th>Rating</th><th class="ocultar-movil">Comentario</th><th>Estado</th><th></th></tr></thead>
        <tbody>${reviews.length ? reviews.map(r => `
          <tr><td><b>${esc(r.producto)}</b></td><td>${esc(r.autor || '—')}</td>
            <td style="color:var(--volt)">${estrellas(r.rating)}</td>
            <td class="ocultar-movil" style="max-width:260px">${esc(r.titulo || '')} ${esc(r.comentario || '')}</td>
            <td><span class="pill ${r.aprobado ? 'ok' : 'pendiente'}">${r.aprobado ? 'Aprobada' : 'Pendiente'}</span></td>
            <td style="text-align:right;white-space:nowrap">
              ${r.aprobado ? '' : `<button class="btn btn-primary btn-sm" onclick="aprobarReview(${r.id},true)">Aprobar</button>`}
              <button class="btn btn-danger btn-sm" onclick="borrarReview(${r.id})">×</button></td></tr>`).join('') : '<tr><td colspan="6" class="vacio">Sin reseñas</td></tr>'}
        </tbody></table></div></div>`;
  } catch (e) { $('#contenido').innerHTML = `<div class="vacio">Error: ${esc(e.message)}</div>`; }
};
async function aprobarReview(id, val) {
  try { await api('/reviews/admin/' + id, { method: 'PUT', body: { aprobado: val } }); toast('Reseña aprobada'); irA('resenas'); }
  catch (e) { toast(e.message, 'err'); }
}
async function borrarReview(id) {
  if (!confirm('¿Eliminar reseña?')) return;
  try { await api('/reviews/admin/' + id, { method: 'DELETE' }); toast('Eliminada'); irA('resenas'); }
  catch (e) { toast(e.message, 'err'); }
}

/* ============================================================
   LEADS
============================================================ */
VISTAS.leads = async function () {
  $('#topbar-acciones').innerHTML = `<button class="btn btn-sec btn-sm" id="exp-leads">Exportar CSV</button>`;
  try {
    const leads = await api('/leads/admin');
    $('#contenido').innerHTML = `
      <div class="panel"><div class="ph"><h3>${leads.length} suscriptores</h3></div><div class="pb nopad"><table>
        <thead><tr><th>Email</th><th class="ocultar-movil">Nombre</th><th>Origen</th><th class="ocultar-movil">Fecha</th></tr></thead>
        <tbody>${leads.length ? leads.map(l => `
          <tr><td>${esc(l.email)}</td><td class="ocultar-movil">${esc(l.nombre || '—')}</td>
            <td><span class="pill ok">${esc(l.origen)}</span></td>
            <td class="ocultar-movil">${fecha(l.creado_en)}</td></tr>`).join('') : '<tr><td colspan="4" class="vacio">Sin leads</td></tr>'}
        </tbody></table></div></div>`;
    $('#exp-leads').onclick = () => descargarCSV('/leads/admin/export.csv', 'leads-gymrillas.csv');
  } catch (e) { $('#contenido').innerHTML = `<div class="vacio">Error: ${esc(e.message)}</div>`; }
};

/* ============================================================
   CONFIGURACIÓN
============================================================ */
VISTAS.config = async function () {
  try {
    const cfg = await api('/dashboard/config');
    const val = (k) => (cfg.find(c => c.clave === k) || {}).valor || '';
    $('#contenido').innerHTML = `
      <div class="panel"><div class="ph"><h3>Tienda</h3></div><div class="pb">
        <div class="grid2">
          <div class="campo"><label>Nombre de la tienda</label><input id="cf-tienda_nombre" value="${esc(val('tienda_nombre'))}"></div>
          <div class="campo"><label>Moneda</label><input id="cf-moneda" value="${esc(val('moneda'))}"></div>
        </div>
        <div class="grid3">
          <div class="campo"><label>IVU %</label><input id="cf-ivu_pct" value="${esc(val('ivu_pct'))}"></div>
          <div class="campo"><label>Envío fijo $</label><input id="cf-envio_flat" value="${esc(val('envio_flat'))}"></div>
          <div class="campo"><label>Envío gratis desde $</label><input id="cf-envio_gratis_min" value="${esc(val('envio_gratis_min'))}"></div>
        </div>
        <div class="grid2">
          <div class="campo"><label>ZIP de origen</label><input id="cf-origen_zip" value="${esc(val('origen_zip'))}"></div>
          <div class="campo"><label>Puntos por dólar</label><input id="cf-puntos_por_dolar" value="${esc(val('puntos_por_dolar'))}"></div>
        </div>
      </div></div>

      <div class="panel"><div class="ph"><h3>Integraciones (pendientes)</h3></div><div class="pb">
        <p style="color:var(--txt2);font-size:13px;margin-bottom:14px">Estas llaves activan pagos y envíos en vivo. La tienda funciona sin ellas.</p>
        <div class="campo"><label>ATH Móvil — Public Token</label><input id="cf-ath_movil_public" value="${esc(val('ath_movil_public'))}" placeholder="pendiente"></div>
        <div class="campo"><label>ATH Móvil — Business Token</label><input id="cf-ath_movil_token" value="${esc(val('ath_movil_token'))}" placeholder="pendiente"></div>
        <div class="campo"><label>USPS User ID</label><input id="cf-usps_userid" value="${esc(val('usps_userid'))}" placeholder="pendiente"></div>
        <div class="campo"><label>Google Routes API Key</label><input id="cf-routes_api_key" value="${esc(val('routes_api_key'))}" placeholder="pendiente"></div>
      </div></div>

      <button class="btn btn-primary" id="cf-guardar">Guardar configuración</button>`;
    $('#cf-guardar').onclick = async () => {
      const claves = ['tienda_nombre', 'moneda', 'ivu_pct', 'envio_flat', 'envio_gratis_min', 'origen_zip', 'puntos_por_dolar', 'ath_movil_public', 'ath_movil_token', 'usps_userid', 'routes_api_key'];
      const body = {};
      claves.forEach(k => { const el = $('#cf-' + k); if (el) body[k] = el.value.trim(); });
      try { await api('/dashboard/config', { method: 'PUT', body }); toast('Configuración guardada'); }
      catch (e) { toast(e.message, 'err'); }
    };
  } catch (e) { $('#contenido').innerHTML = `<div class="vacio">Error: ${esc(e.message)}</div>`; }
};

/* ============================================================
   PAGOS — métodos y cuentas para dirigir el dinero
============================================================ */
VISTAS.pagos = async function () {
  $('#topbar-acciones').innerHTML = '';
  try {
    const cfg = await api('/dashboard/config');
    const val = (k) => { const c = cfg.find(x => x.clave === k); return c ? c.valor : ''; };
    const on = (k) => val(k) === '1' || val(k) === 'true';
    const sw = (k, label) => `<label class="sw"><input type="checkbox" id="pg-${k}" ${on(k) ? 'checked' : ''}><span class="track"></span> ${label}</label>`;
    const campo = (k, label, ph, type) => `<div class="campo"><label>${label}</label><input id="pg-${k}" value="${esc(val(k))}" placeholder="${ph || ''}" ${type ? `type="${type}"` : ''}></div>`;

    $('#contenido').innerHTML = `
      <p style="color:var(--txt2);font-size:14px;margin-bottom:18px;max-width:680px">
        Activa los métodos que aceptas en el checkout y define la <b>cuenta de destino</b> de cada uno.
        Aquí es donde se dirige el dinero de cada venta. Las llaves secretas se guardan para procesar los cobros.
      </p>

      <div class="panel">
        <div class="ph"><h3>ATH Móvil <span style="font-weight:500;color:var(--txt3);font-size:13px">· Puerto Rico</span></h3>${sw('pago_athmovil_activo', 'Activo')}</div>
        <div class="pb">
          <div class="grid2">
            ${campo('pago_athmovil_negocio', 'Nombre del comercio', 'Gymrillas')}
            ${campo('pago_athmovil_telefono', 'Teléfono / cuenta destino', '787-555-0100')}
          </div>
          ${campo('pago_athmovil_business_token', 'Business Token (privado)', 'pega tu token de ATH Business', 'password')}
          <p class="hint">El dinero entra a tu cuenta ATH Móvil Business asociada a este teléfono.</p>
        </div>
      </div>

      <div class="panel">
        <div class="ph"><h3>Tarjeta de crédito/débito <span style="font-weight:500;color:var(--txt3);font-size:13px">· Stripe</span></h3>${sw('pago_tarjeta_activo', 'Activo')}</div>
        <div class="pb">
          ${campo('pago_stripe_pk', 'Publishable key', 'pk_live_…')}
          ${campo('pago_stripe_sk', 'Secret key (privado)', 'sk_live_…', 'password')}
          <p class="hint">Los cobros con tarjeta se depositan en la cuenta bancaria conectada a tu cuenta Stripe.</p>
        </div>
      </div>

      <div class="panel">
        <div class="ph"><h3>PayPal</h3>${sw('pago_paypal_activo', 'Activo')}</div>
        <div class="pb">
          <div class="grid2">
            ${campo('pago_paypal_email', 'Email de PayPal (destino)', 'pagos@gymrillas.com', 'email')}
            ${campo('pago_paypal_client', 'Client ID', 'AY…')}
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="ph"><h3>Transferencia bancaria / ACH</h3>${sw('pago_transferencia_activo', 'Activo')}</div>
        <div class="pb">
          <div class="grid2">
            ${campo('pago_banco_nombre', 'Banco', 'Banco Popular')}
            ${campo('pago_banco_titular', 'Titular de la cuenta', 'Gymrillas')}
          </div>
          <div class="grid2">
            ${campo('pago_banco_routing', 'Routing #', '021502011')}
            ${campo('pago_banco_cuenta', 'Número de cuenta (destino)', '••••••1234', 'password')}
          </div>
          <p class="hint">El cliente transfiere directo a esta cuenta. Confirma el pago y marca la orden como pagada.</p>
        </div>
      </div>

      <div class="panel">
        <div class="ph"><h3>Efectivo / Pickup</h3>${sw('pago_efectivo_activo', 'Activo')}</div>
        <div class="pb">
          <div class="campo"><label>Instrucciones</label><textarea id="pg-pago_efectivo_nota" placeholder="Pago en efectivo al recoger…">${esc(val('pago_efectivo_nota'))}</textarea></div>
        </div>
      </div>

      <button class="btn btn-primary" id="pg-guardar">Guardar métodos de pago</button>`;

    const CLAVES_SW = ['pago_athmovil_activo', 'pago_tarjeta_activo', 'pago_paypal_activo', 'pago_transferencia_activo', 'pago_efectivo_activo'];
    const CLAVES_TXT = ['pago_athmovil_negocio', 'pago_athmovil_telefono', 'pago_athmovil_business_token', 'pago_stripe_pk', 'pago_stripe_sk', 'pago_paypal_email', 'pago_paypal_client', 'pago_banco_nombre', 'pago_banco_titular', 'pago_banco_routing', 'pago_banco_cuenta', 'pago_efectivo_nota'];
    $('#pg-guardar').onclick = async () => {
      const body = {};
      CLAVES_SW.forEach(k => { const el = $('#pg-' + k); body[k] = el && el.checked ? '1' : '0'; });
      CLAVES_TXT.forEach(k => { const el = $('#pg-' + k); if (el) body[k] = el.value.trim(); });
      try { await api('/dashboard/config', { method: 'PUT', body }); toast('Métodos de pago guardados'); }
      catch (e) { toast(e.message, 'err'); }
    };
  } catch (e) { $('#contenido').innerHTML = `<div class="vacio">Error: ${esc(e.message)}</div>`; }
};

/* ---------- util: descargar CSV (auth real o demo) ---------- */
async function descargarCSV(path, nombre) {
  try {
    let texto;
    if (window.DEMO_MODE && window.DEMO) {
      texto = await window.DEMO.handle(path);
    } else {
      const r = await fetch(API + path, { headers: { Authorization: 'Bearer ' + TOKEN } });
      texto = await r.text();
    }
    const blob = new Blob([texto], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nombre; a.click();
    URL.revokeObjectURL(a.href);
  } catch (e) { toast('Error al exportar', 'err'); }
}
