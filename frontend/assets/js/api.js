/* ============================================================
   GYMRILLAS — capa de conexión storefront ↔ API
   Carga después de main.js. Mejora progresiva: si la API
   responde, conecta funciones reales; si no, el sitio sigue
   funcionando como demo estático.
============================================================ */
(function () {
  'use strict';
  var API = (location.origin || '') + '/api';

  // SDK global reutilizable por todas las páginas
  var GR = window.GR = {
    token: localStorage.getItem('gr_cliente_token') || '',
    user: JSON.parse(localStorage.getItem('gr_cliente') || 'null'),

    async req(path, opts) {
      opts = opts || {};
      var headers = {};
      if (GR.token) headers['Authorization'] = 'Bearer ' + GR.token;
      var body;
      if (opts.body) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(opts.body); }
      var r = await fetch(API + path, { method: opts.method || 'GET', headers: headers, body: body });
      var ct = r.headers.get('content-type') || '';
      var data = ct.indexOf('json') >= 0 ? await r.json() : await r.text();
      if (!r.ok) throw new Error((data && data.error) || ('Error ' + r.status));
      return data;
    },

    productos(params) {
      var q = new URLSearchParams(params || {}).toString();
      return GR.req('/productos' + (q ? '?' + q : ''));
    },
    producto(slug) { return GR.req('/productos/' + slug); },
    lead(email, origen) { return GR.req('/leads', { method: 'POST', body: { email: email, origen: origen || 'footer' } }); },
    cotizarEnvio(payload) { return GR.req('/envios/cotizar', { method: 'POST', body: payload }); },
    validarCupon(codigo, subtotal) { return GR.req('/cupones/validar', { method: 'POST', body: { codigo: codigo, subtotal: subtotal } }); },
    crearOrden(payload) { return GR.req('/ordenes', { method: 'POST', body: payload }); },

    async login(email, password) {
      var r = await GR.req('/auth/login', { method: 'POST', body: { email: email, password: password } });
      GR.token = r.token; GR.user = r.usuario;
      localStorage.setItem('gr_cliente_token', r.token);
      localStorage.setItem('gr_cliente', JSON.stringify(r.usuario));
      return r;
    },
    async registro(datos) {
      var r = await GR.req('/auth/registro', { method: 'POST', body: datos });
      GR.token = r.token; GR.user = r.usuario;
      localStorage.setItem('gr_cliente_token', r.token);
      localStorage.setItem('gr_cliente', JSON.stringify(r.usuario));
      return r;
    },
    logout() { GR.token = ''; GR.user = null; localStorage.removeItem('gr_cliente_token'); localStorage.removeItem('gr_cliente'); },
  };

  var toast = window.grToast || function (m) { alert(m); };

  // ¿El error indica que no hay backend? (sitio estático sin API).
  // En ese caso degradamos a modo demo en vez de mostrar un error.
  function backendCaido(err) {
    if (err instanceof TypeError) return true; // fetch falló (red/CORS/sin API)
    var m = (err && err.message || '').toLowerCase();
    return /failed to fetch|networkerror|load failed|error 404|error 405|error 501|<!doctype/.test(m);
  }

  // ---------- 1) Lista de espera / lead (form #form-lead) ----------
  document.querySelectorAll('#form-lead').forEach(function (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var input = form.querySelector('input[type=email]');
      var email = (input && input.value || '').trim();
      if (!email || email.indexOf('@') < 0) { toast('Escribe un email válido'); return; }
      var btn = form.querySelector('button');
      var txt = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = '...'; }
      try {
        await GR.lead(email, 'footer');
        toast('¡Listo! Estás en la lista. 10% en tu primer drop.');
        form.reset();
      } catch (err) {
        if (backendCaido(err)) {
          // Sin backend: guardamos el email localmente y confirmamos igual.
          try {
            var ls = JSON.parse(localStorage.getItem('gr_leads_demo') || '[]');
            if (ls.indexOf(email) < 0) ls.push(email);
            localStorage.setItem('gr_leads_demo', JSON.stringify(ls));
          } catch (e2) {}
          toast('¡Listo! Estás en la lista. 10% en tu primer drop.');
          form.reset();
        } else {
          toast(err.message || 'No se pudo registrar, intenta luego');
        }
      } finally { if (btn) { btn.disabled = false; btn.textContent = txt; } }
    });
  });

  // ---------- 2) Auth real en login.html ----------
  // Reemplaza los botones placeholder si existe el panel de login.
  (function wireAuth() {
    var paneles = document.querySelector('[data-mostrar="entrar"]');
    if (!paneles) return;
    // localizar inputs por contenedor
    var grupos = document.querySelectorAll('.form-grupo');
    if (grupos.length < 2) return;

    // Botón Entrar (primer botón btn-bloque con texto Entrar)
    document.querySelectorAll('.btn-bloque').forEach(function (btn) {
      var t = btn.textContent.trim().toLowerCase();
      if (t === 'entrar') {
        btn.removeAttribute('onclick');
        btn.addEventListener('click', async function () {
          var box = btn.closest('div') || document;
          var emails = box.querySelectorAll('input[type=email]');
          var pass = box.querySelectorAll('input[type=password]');
          var email = emails.length ? emails[emails.length - 1].value.trim() : '';
          var pwd = pass.length ? pass[pass.length - 1].value : '';
          if (!email || !pwd) return toast('Completa email y contraseña');
          btn.disabled = true;
          try {
            await GR.login(email, pwd);
            toast('¡Bienvenido de vuelta!');
            setTimeout(function () { location.href = 'cuenta.html'; }, 700);
          } catch (e) {
            toast(backendCaido(e) ? 'Las cuentas se activan muy pronto' : e.message);
            btn.disabled = false;
          }
        });
      } else if (t === 'crear cuenta') {
        btn.removeAttribute('onclick');
        btn.addEventListener('click', async function () {
          var inputs = document.querySelectorAll('input');
          // heurística simple: nombre, apellido, email, password
          var nombre = '', apellido = '', email = '', pwd = '';
          inputs.forEach(function (i) {
            if (i.type === 'email') email = i.value.trim();
            else if (i.type === 'password') pwd = i.value;
          });
          var textos = document.querySelectorAll('input:not([type]),input[type=text]');
          if (textos[0]) nombre = textos[0].value.trim();
          if (textos[1]) apellido = textos[1].value.trim();
          if (!nombre || !email || !pwd) return toast('Completa nombre, email y password');
          btn.disabled = true;
          try {
            await GR.registro({ nombre: nombre, apellido: apellido, email: email, password: pwd, acepta_marketing: true });
            toast('¡Cuenta creada! Bienvenido a la tribu.');
            setTimeout(function () { location.href = 'cuenta.html'; }, 700);
          } catch (e) {
            toast(backendCaido(e) ? 'Las cuentas se activan muy pronto' : e.message);
            btn.disabled = false;
          }
        });
      }
    });
  })();

  // ---------- 3) Estado de sesión en header (opcional) ----------
  if (GR.user) {
    document.querySelectorAll('[data-cuenta-nombre]').forEach(function (el) { el.textContent = GR.user.nombre; });
  }
})();
