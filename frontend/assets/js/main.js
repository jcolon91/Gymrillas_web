/* GYMRILLAS — main.js (compartido) */
// Helper de idioma GLOBAL (accesible a todos los IIFE; usa el motor i18n si está cargado)
function T(es, en){ return (window.GYM_I18N ? GYM_I18N.t(es, en) : es); }
(function(){

  // Drawer móvil
  var drawer = document.getElementById('drawer');
  var btnMenu = document.getElementById('btn-menu');
  if (btnMenu && drawer) {
    btnMenu.addEventListener('click', function(){ drawer.classList.add('abierto'); });
    drawer.querySelectorAll('[data-cerrar]').forEach(function(el){
      el.addEventListener('click', function(){ drawer.classList.remove('abierto'); });
    });
  }

  // Reveal on scroll
  if ('IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add('visible'); obs.unobserve(e.target); } });
    }, { threshold: .12 });
    document.querySelectorAll('.reveal').forEach(function(el){ obs.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function(el){ el.classList.add('visible'); });
  }

  // Toast global
  var toast = document.createElement('div');
  toast.className = 'toast';
  document.body.appendChild(toast);
  var tTimer;
  window.grToast = function(msg){
    toast.textContent = msg;
    toast.classList.add('ver');
    clearTimeout(tTimer);
    tTimer = setTimeout(function(){ toast.classList.remove('ver'); }, 2200);
  };

  // Contador de carrito (persistente si el browser lo permite)
  function leerCart(){ try { return parseInt(localStorage.getItem('gr_cart') || '0', 10); } catch(e){ return window.__grCart || 0; } }
  function guardarCart(n){ try { localStorage.setItem('gr_cart', String(n)); } catch(e){ window.__grCart = n; } pintarCart(); }
  function pintarCart(){
    var n = leerCart();
    document.querySelectorAll('[data-cart-count]').forEach(function(el){ el.textContent = n; });
  }
  pintarCart();

  // Botones añadir al carrito (demo frontend — Fase 3 conecta API)
  document.querySelectorAll('[data-add]').forEach(function(btn){
    btn.addEventListener('click', function(ev){
      ev.preventDefault();
      guardarCart(leerCart() + 1);
      grToast(T('Añadido al carrito', 'Added to cart'));
    });
  });

  // Filtros de productos por categoría (chips)
  var chips = document.querySelectorAll('.chip[data-cat]');
  var prods = document.querySelectorAll('.grid-prod [data-categoria]');
  function filtrar(cat){
    chips.forEach(function(c){ c.classList.toggle('activo', c.dataset.cat === cat); });
    prods.forEach(function(p){
      p.style.display = (cat === 'todos' || p.dataset.categoria === cat) ? '' : 'none';
    });
  }
  if (chips.length) {
    chips.forEach(function(c){ c.addEventListener('click', function(){ filtrar(c.dataset.cat); }); });
    var param = new URLSearchParams(location.search).get('cat');
    filtrar(param && document.querySelector('.chip[data-cat="'+param+'"]') ? param : 'todos');
  }

  // Selectores genéricos (tallas, colores, métodos de pago, tabs)
  document.querySelectorAll('[data-grupo]').forEach(function(grupo){
    grupo.querySelectorAll('button').forEach(function(b){
      b.addEventListener('click', function(){
        if (b.disabled) return;
        grupo.querySelectorAll('button').forEach(function(x){ x.classList.remove('activo'); });
        b.classList.add('activo');
        var mostrar = b.dataset.mostrar;
        if (mostrar) {
          document.querySelectorAll('[data-panel]').forEach(function(p){
            p.style.display = (p.dataset.panel === mostrar) ? '' : 'none';
          });
        }
      });
    });
  });

  // Radio cards (envío)
  document.querySelectorAll('.radio-card').forEach(function(rc){
    rc.addEventListener('click', function(){
      rc.parentElement.querySelectorAll('.radio-card').forEach(function(x){ x.classList.remove('activo'); });
      rc.classList.add('activo');
    });
  });

  // Cantidad +/-
  document.querySelectorAll('.cantidad').forEach(function(c){
    var span = c.querySelector('span');
    c.querySelectorAll('button').forEach(function(b){
      b.addEventListener('click', function(){
        var n = parseInt(span.textContent, 10) + (b.dataset.dir === '+' ? 1 : -1);
        span.textContent = Math.max(1, n);
      });
    });
  });

  // ===== Página del carrito: eliminar items + recalcular resumen =====
  (function(){
    var grid = document.querySelector('.carrito-grid');
    if (!grid) return;
    var colItems = grid.querySelector('div');          // primera columna = items
    var resumen = grid.querySelector('.resumen');
    var IVU = 0.115, UMBRAL = 150;
    function money(n){ return '$' + n.toFixed(2); }
    function num(txt){ return parseFloat(String(txt).replace(/[^0-9.]/g, '')) || 0; }

    function recompute(){
      var items = colItems.querySelectorAll('.carrito-item');
      var subtotal = 0, totalQty = 0;
      items.forEach(function(it){
        var precioEl = it.querySelector('.precio');
        var qEl = it.querySelector('.cantidad span');
        var q = qEl ? (parseInt(qEl.textContent, 10) || 1) : 1;
        subtotal += num(precioEl ? precioEl.textContent : 0) * q;
        totalQty += q;
      });
      var ivu = subtotal * IVU;
      var lineas = resumen ? resumen.querySelectorAll('.linea') : [];
      if (lineas[0]) lineas[0].querySelector('b').textContent = money(subtotal);
      if (lineas[2]) lineas[2].querySelector('b').textContent = money(ivu);
      if (lineas[3]) lineas[3].querySelector('b').textContent = money(subtotal + ivu);

      // Barra de envío gratis (umbral $150)
      var bar = document.querySelector('.envio-bar');
      if (bar){
        var track = bar.querySelector('.track i'), pMsg = bar.querySelector('p');
        if (subtotal >= UMBRAL){
          if (track) track.style.width = '100%';
          if (pMsg) pMsg.textContent = T('Envío gratis desbloqueado', 'Free shipping unlocked');
        } else {
          if (track) track.style.width = Math.min(100, subtotal / UMBRAL * 100) + '%';
          var falta = (UMBRAL - subtotal).toFixed(2);
          if (pMsg) pMsg.textContent = T('Te faltan $' + falta + ' para envío gratis', '$' + falta + ' away from free shipping');
        }
      }

      // Carrito vacío
      if (items.length === 0){
        colItems.innerHTML = '<p style="padding:2.2rem 0;color:var(--gris)">' +
          T('Tu carrito está vacío.', 'Your cart is empty.') + ' <a href="tienda.html" style="color:var(--volt);font-weight:500">' +
          T('Ir a la tienda', 'Go to the shop') + '</a></p>';
        var goCheckout = resumen && resumen.querySelector('a.btn');
        if (goCheckout){ goCheckout.setAttribute('aria-disabled', 'true'); goCheckout.style.pointerEvents = 'none'; goCheckout.style.opacity = '.45'; }
      }

      // Contador del header
      try { localStorage.setItem('gr_cart', String(totalQty)); } catch(e){}
      document.querySelectorAll('[data-cart-count]').forEach(function(el){ el.textContent = totalQty; });
    }

    // Eliminar item / cambiar cantidad (delegación)
    colItems.addEventListener('click', function(e){
      var quitar = e.target.closest('.quitar');
      if (quitar){
        e.preventDefault();
        var it = quitar.closest('.carrito-item');
        if (it){ it.remove(); recompute(); }
        return;
      }
      if (e.target.closest('.cantidad button')) setTimeout(recompute, 0); // main.js ya actualizó el número
    });

    document.addEventListener('gym:langchange', recompute);
    recompute();
  })();

  // Galería PDP
  var principal = document.querySelector('.galeria .principal img');
  document.querySelectorAll('.galeria .thumbs button').forEach(function(t){
    t.addEventListener('click', function(){
      document.querySelectorAll('.galeria .thumbs button').forEach(function(x){ x.classList.remove('activo'); });
      t.classList.add('activo');
      var img = t.querySelector('img');
      if (img && principal) principal.src = img.src;
    });
  });

  // El form de leads (#form-lead) lo maneja api.js (capa de conexión),
  // que hace POST a /api/leads cuando hay backend y degrada a demo cuando no.
})();

// Scroll a sección por parámetro ?cat=
(function(){
  var pcat = new URLSearchParams(location.search).get('cat');
  if (!pcat) return;
  var sec = document.getElementById('sec-'+pcat);
  if (sec) setTimeout(function(){ sec.scrollIntoView({behavior:'smooth'}); }, 200);
})();

// Tienda: sidebar de categorías, filtros y orden
(function(){
  var lat = document.getElementById('lateral');
  if (!lat) return;
  var fondo = document.getElementById('lateral-fondo');
  var btn = document.getElementById('btn-cats');
  var bc = document.getElementById('cerrar-cats');
  function abrir(){ lat.classList.add('abierta'); fondo.classList.add('ver'); }
  function cerrar(){ lat.classList.remove('abierta'); fondo.classList.remove('ver'); }
  if (btn) btn.addEventListener('click', abrir);
  if (fondo) fondo.addEventListener('click', cerrar);
  if (bc) bc.addEventListener('click', cerrar);

  var enlaces = lat.querySelectorAll('[data-filtro]');
  var grid = document.getElementById('grid-tienda');
  var items = Array.prototype.slice.call(grid.querySelectorAll('.prod'));
  var tt = document.getElementById('tienda-titulo');
  var tc = document.getElementById('tienda-count');

  function aplicar(filtro, label){
    var p = filtro.split(':'), tipo = p[0], val = p[1], n = 0;
    items.forEach(function(it){
      var ok = tipo === 'todos'
        || (tipo === 'cat' && it.dataset.categoria === val)
        || (tipo === 'sub' && it.dataset.sub === val)
        || (tipo === 'tag' && (',' + it.dataset.tags + ',').indexOf(',' + val + ',') >= 0);
      it.style.display = ok ? '' : 'none';
      if (ok) n++;
    });
    tt.textContent = label;
    tc.textContent = n + (n === 1 ? ' producto' : ' productos');
    enlaces.forEach(function(a){ a.classList.toggle('activo', a.dataset.filtro === filtro); });
    cerrar();
    window.scrollTo({ top: grid.offsetTop - 140, behavior: 'smooth' });
  }
  enlaces.forEach(function(a){
    a.addEventListener('click', function(){ aplicar(a.dataset.filtro, a.textContent.trim()); });
  });

  var sel = document.getElementById('orden-sel');
  if (sel) sel.addEventListener('change', function(){
    if (sel.value === 'rel') return;
    var asc = sel.value === 'asc';
    items.slice().sort(function(a, b){
      return (asc ? 1 : -1) * (parseFloat(a.dataset.precio) - parseFloat(b.dataset.precio));
    }).forEach(function(p){ grid.appendChild(p); });
  });

  var pcat = new URLSearchParams(location.search).get('cat');
  if (pcat) {
    var l = lat.querySelector('[data-filtro="cat:' + pcat + '"]');
    if (l) aplicar(l.dataset.filtro, l.textContent.trim());
  }
})();

// Foto de perfil (preview local — la app la subirá al backend en Fase 3)
(function(){
  var inp = document.getElementById('avatar-input');
  if (!inp) return;
  inp.addEventListener('change', function(){
    var f = inp.files && inp.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function(){
      var img = document.getElementById('avatar-img');
      img.src = r.result; img.hidden = false;
      var s = document.querySelector('#avatar span');
      if (s) s.hidden = true;
      grToast('Foto de perfil actualizada');
    };
    r.readAsDataURL(f);
  });
})();

// v4: filtros de tienda por URL (desde el dropdown del header y el footer)
(function(){
  var grid = document.getElementById('grid-tienda');
  if (!grid) return;
  var items = Array.prototype.slice.call(grid.querySelectorAll('.prod'));
  var tt = document.getElementById('tienda-titulo');
  var tc = document.getElementById('tienda-count');
  var P = new URLSearchParams(location.search);
  var f = P.get('f');
  if (!f && P.get('cat')) f = 'cat:' + P.get('cat');
  // Etiquetas de categoría/subcategoría/tag bilingües (el título del filtro
  // no debe depender del parámetro ?n= de la URL, que está en español).
  var FILTER_LABELS = {
    'cat:mujer':{es:'Mujer',en:'Women'}, 'cat:hombre':{es:'Hombre',en:'Men'}, 'cat:accesorios':{es:'Accesorios',en:'Accessories'},
    'sub:w-bodysuits':{es:'Bodysuits',en:'Bodysuits'}, 'sub:w-crops':{es:'Crop tops',en:'Crop Tops'}, 'sub:w-leggings':{es:'Leggings',en:'Leggings'}, 'sub:w-shorts':{es:'Shorts',en:'Shorts'},
    'sub:h-tanks':{es:'Tanks',en:'Tanks'},
    'sub:a-cinturones':{es:'Cinturones',en:'Belts'}, 'sub:a-straps':{es:'Straps',en:'Straps'}, 'sub:a-munequeras':{es:'Muñequeras',en:'Wrist Wraps'}, 'sub:a-rodilleras':{es:'Rodilleras',en:'Knee Sleeves'}, 'sub:a-tobilleras':{es:'Tobilleras',en:'Ankle Straps'}, 'sub:a-guantes':{es:'Guantes',en:'Gloves'}, 'sub:a-medias':{es:'Medias',en:'Socks'},
    'tag:hot':{es:'Ofertas',en:'Hot deals'}, 'tag:trending':{es:'Tendencia',en:'Trending'}, 'tag:nuevo':{es:'Nuevos',en:'New'}
  };
  function labelFor(filtro, fallback){ var m = FILTER_LABELS[filtro]; return m ? T(m.es, m.en) : fallback; }
  var curFiltro = null, curFallback = '';
  function aplicar(filtro, fallback){
    curFiltro = filtro; curFallback = fallback;
    var p = filtro.split(':'), tipo = p[0], val = p[1], n = 0;
    items.forEach(function(it){
      var ok = (tipo === 'cat' && it.dataset.categoria === val)
        || (tipo === 'sub' && it.dataset.sub === val)
        || (tipo === 'tag' && (',' + it.dataset.tags + ',').indexOf(',' + val + ',') >= 0);
      it.style.display = ok ? '' : 'none';
      if (ok) n++;
    });
    tt.textContent = labelFor(filtro, fallback);
    tc.textContent = n + (n === 1 ? T(' producto', ' product') : T(' productos', ' products'));
  }
  if (f) {
    var label = P.get('n') || (f.split(':')[1] || 'Ver todo');
    label = label.charAt(0).toUpperCase() + label.slice(1);
    aplicar(f, label);
    document.addEventListener('gym:langchange', function(){ if (curFiltro) aplicar(curFiltro, curFallback); });
  }
  var sel = document.getElementById('orden-sel');
  if (sel) sel.addEventListener('change', function(){
    if (sel.value === 'rel') return;
    var asc = sel.value === 'asc';
    items.slice().sort(function(a, b){
      return (asc ? 1 : -1) * (parseFloat(a.dataset.precio) - parseFloat(b.dataset.precio));
    }).forEach(function(p){ grid.appendChild(p); });
  });
})();

// v6: buscador del header + búsqueda por nombre en la tienda
(function(){
  var btn = document.getElementById('btn-lupa');
  var bus = document.getElementById('buscador');
  if (btn && bus) btn.addEventListener('click', function(){
    bus.hidden = !bus.hidden;
    if (!bus.hidden) bus.querySelector('input').focus();
  });
  var grid = document.getElementById('grid-tienda');
  if (!grid) return;
  var q = new URLSearchParams(location.search).get('q');
  if (!q) return;
  var items = Array.prototype.slice.call(grid.querySelectorAll('.prod'));
  var n = 0, ql = q.toLowerCase();
  items.forEach(function(it){
    var ok = it.querySelector('h4').textContent.toLowerCase().indexOf(ql) >= 0;
    it.style.display = ok ? '' : 'none';
    if (ok) n++;
  });
  document.getElementById('tienda-titulo').textContent = T('Resultados: "', 'Results: "') + q + '"';
  document.getElementById('tienda-count').textContent = n ? n + (n === 1 ? T(' producto', ' product') : T(' productos', ' products')) : T('Sin resultados — intenta otra búsqueda', 'No results — try another search');
})();

// ===== Pre-orden del drop (edicion limitada 50/50) =====
(function(){
  var seccion = document.getElementById('preorden');
  if (!seccion) return;

  // Reservadas iniciales por estilo. Pon 0 para 100% honesto, o siembra
  // un numero para mostrar movimiento al abrir el drop.
  var SEED = { hombre: 0, mujer: 0 };
  var MAX_POR_PERSONA = 2;
  // Links de pago reales (pon aquí tus destinos). Vacío = aún sin configurar.
  //   ath    -> link de cobro de ATH Móvil de negocio
  //   stripe -> Stripe Payment Link (https://buy.stripe.com/...)
  //   paypal -> PayPal.me o botón (https://www.paypal.com/paypalme/...)
  var PAGOS = { ath: '', stripe: '', paypal: '' };
  var PAGO_NOMBRE = { ath: 'ATH Móvil', stripe: 'Stripe', paypal: 'PayPal' };
  var metodoPago = 'ath';
  var dropCerrado = false;
  var cards = {};
  var toast = window.grToast || function(m){ alert(m); };

  // Analytics simple: dataLayer + console. Mide intencion real por pieza.
  window.dataLayer = window.dataLayer || [];
  function track(evento, datos){
    try { window.dataLayer.push(Object.assign({ event: evento }, datos || {})); } catch(e){}
    try { console.info('[gr-track]', evento, datos || {}); } catch(e){}
  }

  function leer(estilo){
    try { var v = localStorage.getItem('gr_drop_' + estilo); if (v != null) return parseInt(v, 10) || 0; } catch(e){}
    return SEED[estilo] || 0;
  }
  function guardar(estilo, n){ try { localStorage.setItem('gr_drop_' + estilo, String(n)); } catch(e){} }

  // Sin mostrar cantidades disponibles. Solo "Pre-orden abierta" y, al
  // agotarse el stock, cambia a "Sold out" automático + botón deshabilitado
  // (así nunca se vende más de lo que hay).
  function pintar(estilo){
    var c = cards[estilo]; if (!c) return;
    var reservadas = Math.min(c.total, leer(estilo));
    var quedan = Math.max(0, c.total - reservadas);
    var q = c.quedanEl;
    if (quedan === 0){
      if (q){ q.textContent = 'Sold out'; q.classList.add('bajo'); }
      c.card.classList.add('agotado'); c.btn.textContent = T('Agotado', 'Sold out'); c.btn.disabled = true;
    } else {
      if (q){ q.textContent = T('Pre-orden abierta', 'Pre-order open'); q.classList.remove('bajo'); }
    }
  }

  document.querySelectorAll('.po-card').forEach(function(card){
    var estilo = card.dataset.estilo;
    cards[estilo] = {
      card: card, estilo: estilo,
      total: parseInt(card.dataset.total, 10) || 50,
      nombre: card.dataset.nombre || 'camisa', nombreEn: card.dataset.nombreEn || card.dataset.nombre || 'shirt', precio: parseFloat(card.dataset.precio) || 0,
      fill: card.querySelector('[data-po-fill]'),
      reservadasEl: card.querySelector('[data-po-reservadas]'),
      quedanEl: card.querySelector('[data-po-quedan]'),
      btn: card.querySelector('[data-po-btn]'),
    };
    cards[estilo].btn.addEventListener('click', function(){
      track('preorden_click', { pieza: estilo });
      abrirModal(estilo);
    });
    pintar(estilo);
  });

  // Al cambiar de idioma, re-pintar los estados de las tarjetas del drop
  document.addEventListener('gym:langchange', function(){
    if (dropCerrado) return;
    Object.keys(cards).forEach(function(k){ pintar(k); });
  });

  // ---- Modal de reserva ----
  var modal = document.getElementById('po-modal');
  var qtyN = modal && document.getElementById('po-qty-n');
  var estiloActivo = null, maxQty = MAX_POR_PERSONA;
  function setQty(n){ n = Math.max(1, Math.min(maxQty, n)); qtyN.textContent = n; }
  function abrirModal(estilo){
    if (dropCerrado) { toast(T('La pre-orden ya cerró', 'Pre-orders are closed')); return; }
    var c = cards[estilo]; var quedan = c.total - leer(estilo);
    if (quedan <= 0) return;
    estiloActivo = estilo; maxQty = Math.min(MAX_POR_PERSONA, quedan); setQty(1);
    document.getElementById('po-m-titulo').textContent = T('Pre-ordena tu ', 'Pre-order your ') + T(c.nombre, c.nombreEn);
    var s = document.getElementById('po-m-stock');
    s.textContent = '$' + c.precio + T(' · pago completo por adelantado', ' · full payment upfront');
    s.classList.remove('bajo');
    modal.hidden = false;
  }
  function cerrarModal(){ if (modal) modal.hidden = true; estiloActivo = null; }
  if (modal){
    modal.querySelectorAll('[data-po-cerrar]').forEach(function(el){ el.addEventListener('click', cerrarModal); });
    modal.querySelector('[data-po-menos]').addEventListener('click', function(){ setQty((parseInt(qtyN.textContent, 10) || 1) - 1); });
    modal.querySelector('[data-po-mas]').addEventListener('click', function(){ setQty((parseInt(qtyN.textContent, 10) || 1) + 1); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') cerrarModal(); });

    // Selector de método de pago (ATH Móvil / Stripe / PayPal)
    modal.querySelectorAll('.po-pago').forEach(function(chip){
      chip.addEventListener('click', function(){
        metodoPago = chip.dataset.pago || 'ath';
        modal.querySelectorAll('.po-pago').forEach(function(o){
          var on = o === chip;
          o.classList.toggle('activo', on);
          o.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      });
    });

    document.getElementById('po-form').addEventListener('submit', function(e){
      e.preventDefault();
      if (!estiloActivo) return;
      var email = document.getElementById('po-email').value.trim();
      var nombre = document.getElementById('po-nombre').value.trim();
      if (!email || email.indexOf('@') < 0){ toast(T('Escribe un email válido para tu recibo', 'Enter a valid email for your receipt')); return; }
      var qty = parseInt(qtyN.textContent, 10) || 1;
      var c = cards[estiloActivo];
      var reservadas = Math.min(c.total, leer(estiloActivo) + qty);
      guardar(estiloActivo, reservadas);
      try {
        var arr = JSON.parse(localStorage.getItem('gr_preordenes') || '[]');
        arr.push({ estilo: estiloActivo, nombre: nombre, email: email, qty: qty, metodo: metodoPago });
        localStorage.setItem('gr_preordenes', JSON.stringify(arr));
      } catch(e2){}
      if (window.GR && GR.lead) { try { GR.lead(email, 'preorden-' + estiloActivo); } catch(e3){} }
      var nom = c.nombre;
      track('preorden_confirmada', { pieza: c.estilo, cantidad: qty, metodo: metodoPago });
      pintar(estiloActivo);
      cerrarModal();
      document.getElementById('po-form').reset();
      // Llevar al pago real del método elegido
      var link = PAGOS[metodoPago];
      if (link){
        toast(T('Te llevamos a pagar por ', 'Taking you to pay with ') + PAGO_NOMBRE[metodoPago] + T(' para asegurar tu ', ' to secure your ') + T(nom, c.nombreEn) + '.');
        try { window.open(link, '_blank', 'noopener'); } catch(e4){ location.href = link; }
      } else {
        try { console.warn('[gymrillas] Falta el link de pago de ' + metodoPago + ' (PAGOS en main.js)'); } catch(e5){}
        toast(T('¡Pre-orden registrada! Completa el pago por ', 'Pre-order registered! Complete payment with ') + PAGO_NOMBRE[metodoPago] + T(' para asegurar tu ', ' to secure your ') + T(nom, c.nombreEn) + '.');
      }
    });
  }

  // ---- Countdown de cierre ----
  var reloj = seccion.querySelector('.po-reloj');
  if (reloj && reloj.dataset.poDeadline){
    var dl = new Date(reloj.dataset.poDeadline).getTime();
    var elc = { d: reloj.querySelector('[data-pc="d"]'), h: reloj.querySelector('[data-pc="h"]'), m: reloj.querySelector('[data-pc="m"]'), s: reloj.querySelector('[data-pc="s"]') };
    var dos = function(n){ return String(n).padStart(2, '0'); };
    var tick = function(){
      var t = Math.floor((dl - Date.now()) / 1000);
      if (t <= 0){
        dropCerrado = true;
        reloj.innerHTML = '<span class="po-reloj-lbl" style="color:var(--volt)">' + T('Pre-orden cerrada', 'Pre-orders closed') + '</span>';
        Object.keys(cards).forEach(function(k){ var c = cards[k]; if (!c.card.classList.contains('agotado')){ c.btn.textContent = T('Cerrada', 'Closed'); c.btn.disabled = true; } });
        clearInterval(itv);
        return;
      }
      reloj.hidden = false;
      elc.d.textContent = dos(Math.floor(t / 86400));
      elc.h.textContent = dos(Math.floor(t % 86400 / 3600));
      elc.m.textContent = dos(Math.floor(t % 3600 / 60));
      elc.s.textContent = dos(t % 60);
    };
    tick(); var itv = setInterval(tick, 1000);
  }

  // ---- Visor frente/espalda (boton "Ver espalda") ----
  document.querySelectorAll('[data-po-vista]').forEach(function(b){
    var card = b.closest('.po-card');
    var span = b.querySelector('span');
    b.addEventListener('click', function(){
      var atras = card.classList.toggle('mostrar-espalda');
      if (span) span.textContent = atras ? 'Ver frente' : 'Ver espalda';
      track('vista_flip', { pieza: card ? card.dataset.estilo : '', vista: atras ? 'espalda' : 'frente' });
    });
  });
})();
