/* ============================================================
   GYMRILLAS ADMIN — MODO DEMO (datos locales, sin backend)
   Se carga ANTES de admin.js. Cuando la API real no responde
   (deploy estático), admin.js delega aquí y el panel funciona
   completo con datos realistas guardados en localStorage.
   Las respuestas imitan exactamente las del backend Node.
============================================================ */
(function () {
  'use strict';
  const LS = 'gr_demo_db_v6';
  const DAY = 86400000;

  /* PRNG determinista para que los datos no cambien en cada carga */
  function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; }
  const R = rng(20260623);
  const pick = (arr) => arr[Math.floor(R() * arr.length)];
  const ent = (a, b) => a + Math.floor(R() * (b - a + 1));
  const iso = (d) => new Date(d).toISOString();

  /* ---------- Catálogo base (alineado con el storefront) ---------- */
  const IMG = {
    tee: 'https://d8j0ntlcm91z4.cloudfront.net/user_37oXaVoFICTcwhHWuCWo5lkkfRO/hf_20260610_025820_226e64e1-091f-47c2-9db9-351c2e4482ad.png',
    legg: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=800&q=70',
    hoodie: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&q=70',
    bottle: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=70',
    bag: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=70',
    bra: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=70',
    straps: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=800&q=70',
    joggers: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=800&q=70',
    shorts: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=70',
  };
  const CAT = [
    { n: 'Savage Tee', s: 'savage-tee', cat: 'hombre', sub: 'h-tees', precio: 32, costo: 11, img: IMG.tee, tallas: ['S', 'M', 'L', 'XL'], dest: true },
    { n: 'Apex Leggings', s: 'apex-leggings', cat: 'mujer', sub: 'w-leggings', precio: 45, costo: 16, img: IMG.legg, tallas: ['XS', 'S', 'M', 'L'], dest: true },
    { n: 'Beast Hoodie', s: 'beast-hoodie', cat: 'hombre', sub: 'h-hoodies', precio: 58, costo: 22, img: IMG.hoodie, tallas: ['S', 'M', 'L', 'XL'] },
    { n: 'Power Sports Bra', s: 'power-sports-bra', cat: 'mujer', sub: 'w-bras', precio: 36, costo: 12, img: IMG.bra, tallas: ['XS', 'S', 'M', 'L'] },
    { n: 'Volt Shaker Bottle', s: 'volt-shaker-bottle', cat: 'accesorios', sub: 'a-botellas', precio: 24, costo: 7, img: IMG.bottle, tallas: ['Única'] },
    { n: 'Gym Bag Pro', s: 'gym-bag-pro', cat: 'accesorios', sub: 'a-bags', precio: 52, costo: 19, img: IMG.bag, tallas: ['Única'] },
    { n: 'Lifting Straps', s: 'lifting-straps', cat: 'accesorios', sub: 'a-straps', precio: 18, costo: 5, img: IMG.straps, tallas: ['Única'] },
    { n: 'Joggers Carbon', s: 'joggers-carbon', cat: 'hombre', sub: 'h-joggers', precio: 46, costo: 17, img: IMG.joggers, tallas: ['S', 'M', 'L', 'XL'] },
    { n: 'Seamless Shorts', s: 'seamless-shorts', cat: 'mujer', sub: 'w-shorts', precio: 38, costo: 13, img: IMG.shorts, tallas: ['XS', 'S', 'M', 'L'] },
  ];
  const COLORES = [['Negro', '#262726'], ['Volt', '#DFE44E'], ['Gris', '#6f706b']];
  const NOMBRES = [
    ['Carlos', 'Meléndez', 'Caguas'], ['Andrea', 'Rivera', 'San Juan'], ['José', 'López', 'Bayamón'],
    ['Génesis', 'Torres', 'Carolina'], ['Luis', 'Santiago', 'Ponce'], ['María', 'Rosario', 'Arecibo'],
    ['Héctor', 'Díaz', 'Guaynabo'], ['Valeria', 'Ortiz', 'Mayagüez'], ['Javier', 'Colón', 'Trujillo Alto'],
    ['Paola', 'Vega', 'Humacao'], ['Roberto', 'Cruz', 'Dorado'], ['Camila', 'Morales', 'Aguadilla'],
  ];

  /* ---------- Construcción del set de datos ---------- */
  function construir() {
    let vid = 1, pid = 1;
    const productos = CAT.map((c) => {
      const variantes = [];
      c.tallas.forEach((t) => {
        const [cn, ch] = COLORES[0];
        variantes.push({
          id: vid++, sku: `${c.s.slice(0, 3).toUpperCase()}-${t}-${cn.slice(0, 3).toUpperCase()}`,
          talla: t, color: cn, color_hex: ch, precio_ajuste: 0,
          stock: ent(0, 40), stock_minimo: 5, activo: true,
        });
      });
      return {
        id: pid++, nombre: c.n, slug: c.s, categoria: c.cat, subcategoria: c.sub,
        descripcion: `${c.n} de Gymrillas. Diseñado y probado entrenando en Puerto Rico.`,
        descripcion_corta: 'Savage strength, real results.',
        precio_base: c.precio, precio_oferta: R() < 0.3 ? +(c.precio * 0.85).toFixed(2) : null, costo: c.costo,
        material: '88% Poliéster / 12% Elastano', fit: pick(['Oversized', 'Athletic', 'Compression', 'Regular']),
        genero: c.cat === 'mujer' ? 'mujer' : (c.cat === 'hombre' ? 'hombre' : 'unisex'),
        caracteristicas: ['Quick-dry', 'Anti-olor', '4-way stretch'], cuidado: 'Lavar en frío. No usar secadora a alta temperatura.',
        peso_oz: ent(4, 18), largo_in: 10, ancho_in: 8, alto_in: 1,
        activo: true, destacado: !!c.dest, nuevo: R() < 0.4,
        meta_titulo: c.n + ' | GYMRILLAS', meta_descripcion: '',
        imagen: c.img,
        imagenes: [{ url: c.img, alt: c.n }],
        composicion: [{ material: 'Poliéster', porcentaje: 88 }, { material: 'Elastano', porcentaje: 12 }],
        variantes,
      };
    });

    /* Clientes */
    const clientes = NOMBRES.map((nm, i) => ({
      id: i + 1, nombre: nm[0], apellido: nm[1], ciudad: nm[2],
      email: `${nm[0].toLowerCase()}.${nm[1].toLowerCase().replace(/[^a-z]/g, '')}@email.com`,
      telefono: `787-${ent(200, 899)}-${ent(1000, 9999)}`,
    }));

    /* Cupones / códigos de referido (definidos antes para asignarlos a órdenes) */
    const cupones = [
      { id: 1, codigo: 'BIENVENIDO10', tipo: 'porcentaje', valor: 10, minimo_compra: 0, usos_actuales: 0, usos_max: null, activo: true, expira_en: null, es_referido: false, comision_pct: 0, referido_nombre: null },
      { id: 2, codigo: 'VOLT15', tipo: 'porcentaje', valor: 15, minimo_compra: 75, usos_actuales: 0, usos_max: 200, activo: true, expira_en: null, es_referido: false, comision_pct: 0, referido_nombre: null },
      { id: 3, codigo: 'ENVIOGRATIS', tipo: 'fijo', valor: 5.99, minimo_compra: 40, usos_actuales: 0, usos_max: null, activo: true, expira_en: null, es_referido: false, comision_pct: 0, referido_nombre: null },
      { id: 4, codigo: 'REF-CARLOS', tipo: 'porcentaje', valor: 10, minimo_compra: 0, usos_actuales: 0, usos_max: null, activo: true, expira_en: null, es_referido: true, comision_pct: 10, referido_nombre: 'Carlos Meléndez' },
      { id: 5, codigo: 'REF-ANDREA', tipo: 'porcentaje', valor: 10, minimo_compra: 0, usos_actuales: 0, usos_max: null, activo: true, expira_en: null, es_referido: true, comision_pct: 10, referido_nombre: 'Andrea Rivera' },
      { id: 6, codigo: 'BLACKWEEK', tipo: 'porcentaje', valor: 25, minimo_compra: 0, usos_actuales: 0, usos_max: 0, activo: false, expira_en: null, es_referido: false, comision_pct: 0, referido_nombre: null },
    ];
    // Pool ponderado: el código de bienvenida y los de referido se usan más
    const POOL_CUP = ['BIENVENIDO10', 'BIENVENIDO10', 'BIENVENIDO10', 'VOLT15', 'ENVIOGRATIS', 'REF-CARLOS', 'REF-CARLOS', 'REF-ANDREA'];
    const cupPorCodigo = (cod) => cupones.find((c) => c.codigo === cod);

    /* Órdenes repartidas en ~420 días para alimentar todos los periodos */
    const ESTADOS_PASADO = ['entregada', 'entregada', 'entregada', 'pagada', 'enviada', 'cancelada'];
    const ordenes = [];
    let num = 1000;
    const TOTAL_ORD = 140;
    for (let i = 0; i < TOTAL_ORD; i++) {
      const dias = Math.floor(Math.pow(R(), 1.7) * 420); // sesgo hacia fechas recientes
      const fecha = new Date(Date.now() - dias * DAY - ent(0, 23) * 3600000);
      const cli = pick(clientes);
      const nItems = ent(1, 3);
      const items = [];
      let subtotal = 0;
      const usados = {};
      for (let k = 0; k < nItems; k++) {
        const p = pick(productos);
        if (usados[p.id]) continue; usados[p.id] = 1;
        const v = pick(p.variantes);
        const qty = ent(1, 2);
        const precio = p.precio_oferta || p.precio_base;
        subtotal += precio * qty;
        items.push({
          producto_id: p.id, variante_id: v.id, nombre_producto: p.nombre, sku: v.sku,
          talla: v.talla, color: v.color, cantidad: qty, precio_unitario: precio, costo_unitario: p.costo,
        });
      }
      if (!items.length) continue;
      // ~35% de las órdenes usan un cupón / código de referido
      let cuponCode = null, descuento = 0;
      if (R() < 0.35) {
        const cup = cupPorCodigo(pick(POOL_CUP));
        if (cup && cup.activo && subtotal >= (cup.minimo_compra || 0)) {
          cuponCode = cup.codigo;
          descuento = cup.tipo === 'porcentaje' ? +(subtotal * cup.valor / 100).toFixed(2) : Math.min(cup.valor, subtotal);
        }
      }
      const baseImponible = Math.max(0, subtotal - descuento);
      const envio = subtotal >= 75 ? 0 : 5.99;
      const impuesto = +(baseImponible * 0.115).toFixed(2);
      const total = +(baseImponible + envio + impuesto).toFixed(2);
      let estado;
      if (dias < 4) estado = pick(['pendiente', 'pagada', 'procesando']);
      else if (dias < 9) estado = pick(['pagada', 'procesando', 'enviada', 'entregada']);
      else estado = pick(ESTADOS_PASADO);
      ordenes.push({
        id: i + 1, numero_orden: 'GR-' + (++num), usuario_id: cli.id,
        nombre: cli.nombre + ' ' + cli.apellido, email: cli.email, telefono: cli.telefono,
        direccion_envio: { linea1: `${ent(1, 99)} Calle ${pick(['Luna', 'Sol', 'Palma', 'Ceiba', 'Flamboyán'])}`, linea2: '', ciudad: cli.ciudad, estado: 'PR', zip: String(ent(600, 799) + '0' + ent(0, 9)) },
        subtotal: +subtotal.toFixed(2), descuento, cupon: cuponCode, envio, impuesto, total,
        estado, metodo_pago: pick(['athmovil', 'tarjeta', 'paypal']),
        transportista: ['enviada', 'entregada'].includes(estado) ? 'usps' : null,
        tracking: ['enviada', 'entregada'].includes(estado) ? '9400' + ent(100000000000, 999999999999) : null,
        creado_en: iso(fecha), items,
      });
    }
    ordenes.sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en));

    /* Movimientos contables: ingresos por ventas pagadas + gastos */
    let mid = 1;
    const movimientos = [];
    ordenes.filter((o) => PAGADAS.includes(o.estado)).forEach((o) => {
      movimientos.push({ id: mid++, fecha: o.creado_en.slice(0, 10), tipo: 'ingreso', categoria: 'venta', descripcion: 'Venta ' + o.numero_orden, monto: o.total, orden_id: o.id });
    });
    const GASTOS = [['inventario', 'Reposición de inventario', 300, 850], ['marketing', 'Ads Instagram/TikTok', 60, 220], ['envio', 'Etiquetas USPS', 30, 90], ['operacion', 'Empaque y materiales', 20, 80]];
    for (let m = 0; m < 12; m++) {
      const f = new Date(Date.now() - m * 30 * DAY);
      GASTOS.forEach((g) => {
        if (R() < 0.7) movimientos.push({ id: mid++, fecha: iso(f).slice(0, 10), tipo: 'gasto', categoria: g[0], descripcion: g[1], monto: +(g[2] + R() * (g[3] - g[2])).toFixed(2), orden_id: null });
      });
    }
    movimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    /* Reseñas */
    const COMENTARIOS = [
      ['Brutal la calidad', 'Aguanta leg day, cardio y lo que sea.', 5],
      ['Otro nivel', 'El fit de los leggings es otra cosa. Ya pedí el segundo.', 5],
      ['Llegó rápido', 'Dos días y el diseño del gorila está brutal.', 5],
      ['Buena tela', 'Cómoda y no transparenta. Recomendado.', 4],
      ['Cumple', 'Buen producto, la talla corre un poco grande.', 4],
      ['Excelente', 'Calidad premium por el precio.', 5],
    ];
    const reviews = COMENTARIOS.map((c, i) => ({
      id: i + 1, producto: pick(productos).nombre, autor: pick(clientes).nombre + ' ' + pick(clientes).apellido[0] + '.',
      rating: c[2], titulo: c[0], comentario: c[1], aprobado: i < 4, creado_en: iso(new Date(Date.now() - ent(1, 90) * DAY)),
    }));

    /* Leads */
    const ORIGENES = ['footer', 'drop', 'checkout', 'popup'];
    const leads = [];
    for (let i = 0; i < 28; i++) {
      const nm = pick(NOMBRES);
      leads.push({ id: i + 1, email: `${nm[0].toLowerCase()}${ent(1, 99)}@email.com`, nombre: R() < 0.5 ? nm[0] : null, origen: pick(ORIGENES), creado_en: iso(new Date(Date.now() - ent(0, 180) * DAY)) });
    }
    leads.sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en));

    /* Configuración (tienda + pagos) */
    const config = {
      tienda_nombre: 'GYMRILLAS', moneda: 'USD', ivu_pct: '11.5', envio_flat: '5.99',
      envio_gratis_min: '75', origen_zip: '00926', puntos_por_dolar: '1',
      ath_movil_public: '', ath_movil_token: '', usps_userid: '', routes_api_key: '',
      /* Métodos de pago */
      pago_athmovil_activo: '1', pago_athmovil_negocio: 'Gymrillas', pago_athmovil_telefono: '787-555-0100', pago_athmovil_business_token: '',
      pago_tarjeta_activo: '1', pago_stripe_pk: '', pago_stripe_sk: '',
      pago_paypal_activo: '0', pago_paypal_email: '', pago_paypal_client: '',
      pago_transferencia_activo: '0', pago_banco_nombre: 'Banco Popular', pago_banco_titular: 'Gymrillas', pago_banco_routing: '', pago_banco_cuenta: '',
      pago_efectivo_activo: '1', pago_efectivo_nota: 'Pago en efectivo al recoger (pickup en Caguas).',
    };

    return { productos, clientes, ordenes, movimientos, cupones, reviews, leads, config, _v: 6 };
  }
  const PAGADAS = ['pagada', 'procesando', 'enviada', 'entregada'];

  /* ---------- Persistencia ---------- */
  function load() { try { const r = localStorage.getItem(LS); if (r) { const db = JSON.parse(r); if (db && db._v === 6) return db; } } catch (e) {} const db = construir(); save(db); return db; }
  function save(db) { try { localStorage.setItem(LS, JSON.stringify(db)); } catch (e) {} }
  let DB = load();

  /* ---------- Cálculos ---------- */
  const num = (n) => parseFloat(n) || 0;
  function ordPagadas() { return DB.ordenes.filter((o) => PAGADAS.includes(o.estado)); }
  function inicioDia(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); }

  function rangoPeriodo(clave) {
    const ahora = new Date();
    const finDia = inicioDia(ahora) + DAY;
    if (clave === 'hoy') return { desde: inicioDia(ahora), hasta: finDia, paso: 'hora' };
    if (clave === 'semana') return { desde: finDia - 7 * DAY, hasta: finDia, paso: 'dia' };
    if (clave === 'ano') return { desde: finDia - 365 * DAY, hasta: finDia, paso: 'mes' };
    if (clave === 'todo') return { desde: 0, hasta: finDia, paso: 'mes' };
    return { desde: finDia - 30 * DAY, hasta: finDia, paso: 'dia' }; // mes
  }

  function seriePeriodo(clave) {
    const { desde, hasta, paso } = rangoPeriodo(clave);
    const pag = ordPagadas().filter((o) => { const t = new Date(o.creado_en).getTime(); return t >= desde && t < hasta; });
    const mapa = new Map();
    const fmtMes = (d) => new Date(d).toLocaleDateString('es-PR', { month: 'short' });
    function clave_de(t) {
      if (paso === 'hora') return new Date(t).getHours();
      if (paso === 'mes') { const d = new Date(t); return d.getFullYear() + '-' + d.getMonth(); }
      return inicioDia(t);
    }
    // sembrar buckets vacíos
    const buckets = [];
    if (paso === 'hora') { for (let h = 0; h < 24; h += 2) buckets.push({ k: h, etiqueta: h + 'h' }); }
    else if (paso === 'mes') {
      const meses = clave === 'todo' ? 18 : 12;
      for (let i = meses - 1; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); buckets.push({ k: d.getFullYear() + '-' + d.getMonth(), etiqueta: fmtMes(d) }); }
    } else {
      const dias = clave === 'semana' ? 7 : 30;
      for (let i = dias - 1; i >= 0; i--) { const t = inicioDia(Date.now() - i * DAY); buckets.push({ k: t, etiqueta: new Date(t).getDate() }); }
    }
    buckets.forEach((b) => mapa.set(String(b.k), { etiqueta: b.etiqueta, total: 0 }));
    let ventas = 0, unidades = 0;
    pag.forEach((o) => {
      ventas += num(o.total);
      o.items.forEach((it) => { unidades += it.cantidad; });
      let kk;
      if (paso === 'hora') { const h = new Date(o.creado_en).getHours(); kk = String(h - (h % 2)); }
      else kk = String(clave_de(new Date(o.creado_en).getTime()));
      const b = mapa.get(kk); if (b) b.total += num(o.total);
    });
    // top productos del periodo
    const top = {};
    pag.forEach((o) => o.items.forEach((it) => { const t = top[it.nombre_producto] || (top[it.nombre_producto] = { nombre_producto: it.nombre_producto, vendidas: 0, ingreso: 0 }); t.vendidas += it.cantidad; t.ingreso += it.precio_unitario * it.cantidad; }));
    const topArr = Object.values(top).sort((a, b) => b.ingreso - a.ingreso).slice(0, 6);
    return {
      clave, ventas: +ventas.toFixed(2), ordenes: pag.length, unidades,
      ticket: pag.length ? +(ventas / pag.length).toFixed(2) : 0,
      serie: [...mapa.values()], top: topArr,
    };
  }

  function dashboard(clave) {
    const pag = ordPagadas();
    const hoy0 = inicioDia(new Date());
    const mes0 = (() => { const d = new Date(); d.setDate(1); return inicioDia(d); })();
    const ventas_hoy = pag.filter((o) => new Date(o.creado_en).getTime() >= hoy0).reduce((s, o) => s + num(o.total), 0);
    const ventas_mes = pag.filter((o) => new Date(o.creado_en).getTime() >= mes0).reduce((s, o) => s + num(o.total), 0);
    const ventas_total = pag.reduce((s, o) => s + num(o.total), 0);
    // inventario
    let unidades = 0, bajas = 0;
    DB.productos.forEach((p) => p.variantes.forEach((v) => { unidades += v.stock; if (v.stock <= v.stock_minimo) bajas++; }));
    // 14 días
    const v14 = [];
    for (let i = 13; i >= 0; i--) { const t = inicioDia(Date.now() - i * DAY); const tot = pag.filter((o) => inicioDia(o.creado_en) === t).reduce((s, o) => s + num(o.total), 0); v14.push({ dia: iso(new Date(t)), total: +tot.toFixed(2) }); }
    // top global
    const top = {};
    pag.forEach((o) => o.items.forEach((it) => { const t = top[it.nombre_producto] || (top[it.nombre_producto] = { nombre_producto: it.nombre_producto, vendidas: 0, ingreso: 0 }); t.vendidas += it.cantidad; t.ingreso += it.precio_unitario * it.cantidad; }));
    return {
      ventas_hoy: +ventas_hoy.toFixed(2), ventas_mes: +ventas_mes.toFixed(2), ventas_total: +ventas_total.toFixed(2),
      ordenes_total: DB.ordenes.length,
      ordenes_pendientes: DB.ordenes.filter((o) => o.estado === 'pendiente').length,
      ordenes_por_enviar: DB.ordenes.filter((o) => ['pagada', 'procesando'].includes(o.estado)).length,
      clientes: DB.clientes.length, leads: DB.leads.length,
      inventario_unidades: unidades, inventario_bajas: bajas,
      ventas_por_dia: v14,
      top_productos: Object.values(top).sort((a, b) => b.ingreso - a.ingreso).slice(0, 6),
      ultimas_ordenes: DB.ordenes.slice(0, 8).map((o) => ({ id: o.id, numero_orden: o.numero_orden, nombre: o.nombre, creado_en: o.creado_en, total: o.total, estado: o.estado })),
      periodo: seriePeriodo(clave || 'mes'),
    };
  }

  /* ---------- Router demo (imita el backend) ---------- */
  function ok(data) { return Promise.resolve(data); }
  function err(msg) { return Promise.reject(new Error(msg)); }

  const DEMO = window.DEMO = {
    activo: false,
    resetear() { DB = construir(); save(DB); },
    async handle(path, opts) {
      opts = opts || {};
      const method = (opts.method || 'GET').toUpperCase();
      const body = opts.body || {};
      const [p, qs] = path.split('?');
      const q = new URLSearchParams(qs || '');
      const seg = p.split('/').filter(Boolean); // sin vacíos
      await new Promise((r) => setTimeout(r, 120)); // pequeña latencia realista

      /* AUTH */
      if (p === '/auth/login') {
        if (!body.email || !body.password) return err('Completa email y contraseña');
        return ok({ token: 'demo-token', usuario: { id: 0, nombre: 'Admin Demo', email: body.email, rol: 'admin' } });
      }

      /* DASHBOARD */
      if (p === '/dashboard') return ok(dashboard(q.get('periodo')));
      if (p === '/dashboard/clientes') {
        return ok(DB.clientes.map((c) => {
          const suyas = DB.ordenes.filter((o) => o.usuario_id === c.id && PAGADAS.includes(o.estado));
          return { ...c, ordenes: suyas.length, gastado: +suyas.reduce((s, o) => s + num(o.total), 0).toFixed(2) };
        }).sort((a, b) => b.gastado - a.gastado));
      }
      if (p === '/dashboard/config') {
        const esSecreto = (k) => /(token|secret|_sk|api_key|cuenta|routing|password|client)/i.test(k);
        const mask = (v) => { v = String(v || ''); return !v ? '' : (v.length <= 4 ? '••••••••' : '••••••••' + v.slice(-4)); };
        if (method === 'PUT') {
          Object.keys(body || {}).forEach((k) => {
            const v = String(body[k] == null ? '' : body[k]);
            if (esSecreto(k) && (v === '' || v.includes('•'))) return; // no pisar secreto con la máscara
            DB.config[k] = v;
          });
          save(DB); return ok({ ok: true });
        }
        return ok(Object.entries(DB.config).map(([clave, valor]) => (
          esSecreto(clave)
            ? { clave, valor: mask(valor), es_secreto: true, tiene_valor: !!valor }
            : { clave, valor: String(valor) }
        )));
      }

      /* PRODUCTOS */
      if (p === '/productos/admin/todos') {
        return ok(DB.productos.map((p2) => ({
          id: p2.id, nombre: p2.nombre, slug: p2.slug, imagen: p2.imagen, categoria: p2.categoria, subcategoria: p2.subcategoria,
          precio_base: p2.precio_base, precio_oferta: p2.precio_oferta,
          stock_total: p2.variantes.reduce((s, v) => s + v.stock, 0), num_variantes: p2.variantes.length, activo: p2.activo,
        })));
      }
      if (p === '/productos/admin/upload') {
        const files = opts.form && opts.form.getAll ? opts.form.getAll('imagenes') : [];
        const urls = files.map((f) => { try { return URL.createObjectURL(f); } catch (e) { return IMG.tee; } });
        return ok({ urls });
      }
      if (seg[0] === 'productos' && seg[1] === 'admin' && seg[2]) {
        const id = parseInt(seg[2], 10);
        const idx = DB.productos.findIndex((x) => x.id === id);
        if (method === 'DELETE') { if (idx >= 0) DB.productos.splice(idx, 1); save(DB); return ok({ ok: true }); }
        if (method === 'PUT') { if (idx < 0) return err('No encontrado'); DB.productos[idx] = { ...DB.productos[idx], ...body, id, imagen: (body.imagenes && body.imagenes[0] && body.imagenes[0].url) || DB.productos[idx].imagen }; save(DB); return ok({ ok: true }); }
        if (idx < 0) return err('No encontrado');
        return ok(DB.productos[idx]);
      }
      if (p === '/productos/admin' && method === 'POST') {
        const id = Math.max(0, ...DB.productos.map((x) => x.id)) + 1;
        const slug = (body.nombre || 'producto').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        let vidn = Math.max(0, ...DB.productos.flatMap((x) => x.variantes.map((v) => v.id))) + 1;
        const variantes = (body.variantes || []).map((v) => ({ id: v.id || vidn++, sku: v.sku || (slug.slice(0, 3).toUpperCase() + '-' + (v.talla || 'U')), talla: v.talla, color: v.color, color_hex: v.color_hex, precio_ajuste: 0, stock: parseInt(v.stock, 10) || 0, stock_minimo: v.stock_minimo || 5, activo: true }));
        DB.productos.push({ id, slug, imagen: (body.imagenes && body.imagenes[0] && body.imagenes[0].url) || '', ...body, variantes });
        save(DB); return ok({ ok: true, id });
      }

      /* INVENTARIO */
      if (p === '/inventario') {
        const filas = [];
        DB.productos.forEach((p2) => p2.variantes.forEach((v) => filas.push({ variante_id: v.id, producto: p2.nombre, sku: v.sku, talla: v.talla, color: v.color, stock: v.stock, stock_minimo: v.stock_minimo })));
        return ok(filas);
      }
      if (p === '/inventario/resumen') {
        let u = 0, vc = 0, vr = 0, bajas = 0, agot = 0;
        DB.productos.forEach((p2) => p2.variantes.forEach((v) => { u += v.stock; vc += v.stock * num(p2.costo); vr += v.stock * num(p2.precio_base); if (v.stock <= v.stock_minimo) bajas++; if (v.stock === 0) agot++; }));
        return ok({ unidades_total: u, valor_costo: +vc.toFixed(2), valor_retail: +vr.toFixed(2), variantes_bajas: bajas, variantes_agotadas: agot });
      }
      if (seg[0] === 'inventario' && seg[1] && method === 'PUT') {
        const vid2 = parseInt(seg[1], 10);
        DB.productos.forEach((p2) => p2.variantes.forEach((v) => { if (v.id === vid2) { v.stock = parseInt(body.stock, 10); v.stock_minimo = parseInt(body.stock_minimo, 10); } }));
        save(DB); return ok({ ok: true });
      }

      /* ÓRDENES */
      if (p === '/ordenes/admin') {
        const qq = (q.get('q') || '').toLowerCase();
        let lista = DB.ordenes;
        if (qq) lista = lista.filter((o) => o.numero_orden.toLowerCase().includes(qq) || (o.nombre || '').toLowerCase().includes(qq) || o.email.toLowerCase().includes(qq));
        return ok(lista.map((o) => ({ id: o.id, numero_orden: o.numero_orden, nombre: o.nombre, email: o.email, creado_en: o.creado_en, num_items: o.items.reduce((s, it) => s + it.cantidad, 0), total: o.total, estado: o.estado })));
      }
      if (seg[0] === 'ordenes' && seg[1] === 'admin' && seg[2]) {
        const id = parseInt(seg[2], 10);
        const o = DB.ordenes.find((x) => x.id === id);
        if (!o) return err('Orden no encontrada');
        if (seg[3] === 'estado' && method === 'PUT') { o.estado = body.estado; save(DB); return ok({ ok: true }); }
        return ok(o);
      }

      /* ENVÍOS */
      if (p === '/envios/pendientes') {
        return ok(DB.ordenes.filter((o) => ['pagada', 'procesando'].includes(o.estado)).map((o) => ({ id: o.id, numero_orden: o.numero_orden, nombre: o.nombre, email: o.email, direccion_envio: o.direccion_envio, total: o.total })));
      }
      if (seg[0] === 'envios' && seg[1] && seg[2] === 'tracking' && method === 'PUT') {
        const o = DB.ordenes.find((x) => x.id === parseInt(seg[1], 10));
        if (o) { o.transportista = body.transportista; o.tracking = body.tracking; if (body.marcar_enviada) o.estado = 'enviada'; save(DB); }
        return ok({ ok: true });
      }

      /* PAGOS */
      if (p === '/pagos/admin/manual' && method === 'POST') {
        const o = DB.ordenes.find((x) => x.id === body.orden_id);
        if (o) { o.estado = 'pagada'; DB.movimientos.unshift({ id: Math.max(0, ...DB.movimientos.map((m) => m.id)) + 1, fecha: iso(new Date()).slice(0, 10), tipo: 'ingreso', categoria: 'venta', descripcion: 'Pago manual ' + o.numero_orden, monto: o.total, orden_id: o.id }); save(DB); }
        return ok({ ok: true });
      }

      /* CONTABILIDAD */
      if (p === '/contabilidad/resumen') {
        const ing = DB.movimientos.filter((m) => m.tipo === 'ingreso').reduce((s, m) => s + num(m.monto), 0);
        const gas = DB.movimientos.filter((m) => m.tipo === 'gasto').reduce((s, m) => s + num(m.monto), 0);
        const ventasIng = DB.movimientos.filter((m) => m.tipo === 'ingreso' && m.categoria === 'venta').reduce((s, m) => s + num(m.monto), 0);
        let cogs = 0;
        ordPagadas().forEach((o) => o.items.forEach((it) => { cogs += (it.costo_unitario || 0) * it.cantidad; }));
        return ok({ ingresos: +ing.toFixed(2), gastos: +gas.toFixed(2), utilidad_neta: +(ing - gas).toFixed(2), costo_productos_vendidos: +cogs.toFixed(2), margen_bruto: +(ventasIng - cogs).toFixed(2) });
      }
      if (p === '/contabilidad/movimientos') {
        if (method === 'POST') { DB.movimientos.unshift({ id: Math.max(0, ...DB.movimientos.map((m) => m.id)) + 1, tipo: body.tipo, categoria: body.categoria, descripcion: body.descripcion, monto: num(body.monto), fecha: body.fecha, orden_id: null }); save(DB); return ok({ ok: true }); }
        return ok(DB.movimientos);
      }
      if (seg[0] === 'contabilidad' && seg[1] === 'movimientos' && seg[2] && method === 'DELETE') {
        DB.movimientos = DB.movimientos.filter((m) => m.id !== parseInt(seg[2], 10)); save(DB); return ok({ ok: true });
      }
      if (p === '/contabilidad/export.csv') return ok(csv(['Fecha', 'Tipo', 'Categoria', 'Descripcion', 'Monto'], DB.movimientos.map((m) => [m.fecha, m.tipo, m.categoria, m.descripcion, m.monto])));

      /* CLIENTES (alias) */

      /* CUPONES (con métricas para incentivos por referido) */
      if (p === '/cupones/admin') {
        if (method === 'POST') {
          DB.cupones.push({
            id: Math.max(0, ...DB.cupones.map((c) => c.id)) + 1,
            codigo: (body.codigo || '').toUpperCase(), tipo: body.tipo, valor: num(body.valor),
            minimo_compra: num(body.minimo_compra), usos_actuales: 0, usos_max: body.usos_max,
            activo: true, expira_en: body.expira_en,
            es_referido: !!body.es_referido, comision_pct: num(body.comision_pct) || 0, referido_nombre: body.referido_nombre || null,
          });
          save(DB); return ok({ ok: true });
        }
        const pag = ordPagadas();
        return ok(DB.cupones.map((c) => {
          const usadas = pag.filter((o) => o.cupon === c.codigo);
          const compras = usadas.length;
          const vendido = +usadas.reduce((s, o) => s + num(o.total), 0).toFixed(2);
          const descuento_total = +usadas.reduce((s, o) => s + num(o.descuento), 0).toFixed(2);
          const clientes_unicos = new Set(usadas.map((o) => o.usuario_id)).size;
          const comision_pagar = +(vendido * (num(c.comision_pct) / 100)).toFixed(2);
          return { ...c, usos_actuales: compras, compras, clientes_unicos, vendido, descuento_total, comision_pagar };
        }));
      }
      if (seg[0] === 'cupones' && seg[1] === 'admin' && seg[2] && method === 'DELETE') { DB.cupones = DB.cupones.filter((c) => c.id !== parseInt(seg[2], 10)); save(DB); return ok({ ok: true }); }

      /* RESEÑAS */
      if (p === '/reviews/admin') return ok(DB.reviews);
      if (seg[0] === 'reviews' && seg[1] === 'admin' && seg[2]) {
        const id = parseInt(seg[2], 10);
        if (method === 'PUT') { const r = DB.reviews.find((x) => x.id === id); if (r) r.aprobado = body.aprobado; save(DB); return ok({ ok: true }); }
        if (method === 'DELETE') { DB.reviews = DB.reviews.filter((x) => x.id !== id); save(DB); return ok({ ok: true }); }
      }

      /* LEADS */
      if (p === '/leads/admin') return ok(DB.leads);
      if (p === '/leads/admin/export.csv') return ok(csv(['Email', 'Nombre', 'Origen', 'Fecha'], DB.leads.map((l) => [l.email, l.nombre || '', l.origen, l.creado_en.slice(0, 10)])));

      return err('Demo: endpoint no soportado (' + method + ' ' + p + ')');
    },
  };

  function csv(cab, filas) {
    const esc = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
    return [cab.map(esc).join(','), ...filas.map((f) => f.map(esc).join(','))].join('\n');
  }

  /* ---------- Detección de modo ----------
     Probamos la API real. Si NO devuelve JSON (deploy estático
     sirve HTML como fallback) o falla, activamos el modo demo. */
  function activarDemo() {
    if (DEMO.activo) return;
    DEMO.activo = true;
    window.DEMO_MODE = true;
    // Prefijar credenciales para que solo haya que pulsar "Entrar"
    const e = document.getElementById('lg-email'); if (e && !e.value) e.value = 'admin@gymrillas.com';
    const pw = document.getElementById('lg-pass'); if (pw && !pw.value) pw.value = 'gymrillas123';
    // Aviso visible
    const card = document.querySelector('#login .card');
    if (card && !document.getElementById('demo-nota')) {
      const n = document.createElement('p'); n.id = 'demo-nota';
      n.style.cssText = 'margin-top:16px;font-size:12.5px;color:var(--volt);text-align:center;line-height:1.5';
      n.innerHTML = 'Modo demostración · datos de ejemplo locales.<br>Pulsa <b>Entrar</b> para explorar el panel completo.';
      card.appendChild(n);
    }
  }
  window.GR_activarDemo = activarDemo;

  (function probar() {
    let done = false;
    const fin = (demo) => { if (done) return; done = true; if (demo) activarDemo(); };
    const t = setTimeout(() => fin(true), 2500);
    try {
      fetch('/api/dashboard', { headers: { Accept: 'application/json' } })
        .then((r) => { clearTimeout(t); const ct = r.headers.get('content-type') || ''; fin(!ct.includes('json')); })
        .catch(() => { clearTimeout(t); fin(true); });
    } catch (e) { clearTimeout(t); fin(true); }
  })();
})();
