/* ============================================================
   GYMRILLAS ADMIN — lógica del panel (vanilla JS)
   La API vive en el mismo origen (server.js sirve /admin y /api)
============================================================ */
const API = '/api';
let TOKEN = localStorage.getItem('gr_token') || '';
let USER = JSON.parse(localStorage.getItem('gr_user') || 'null');
let VISTA = 'dashboard';

/* ---------- API helper ----------
   Si no hay backend (deploy estático) delega en el MODO DEMO
   definido en admin-demo.js, que devuelve datos locales. */
async function api(path, { method = 'GET', body, form } = {}) {
  if (window.DEMO_MODE && window.DEMO) return window.DEMO.handle(path, { method, body, form });
  const headers = {};
  if (TOKEN) headers['Authorization'] = 'Bearer ' + TOKEN;
  let payload;
  if (form) { payload = form; }
  else if (body) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  try {
    const r = await fetch(API + path, { method, headers, body: payload });
    if (r.status === 401) { logout(); throw new Error('Sesión expirada'); }
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('json')) {
      // El backend no respondió JSON (estático sirve HTML) -> demo
      if (window.DEMO) { window.GR_activarDemo && window.GR_activarDemo(); return window.DEMO.handle(path, { method, body, form }); }
      throw new Error('Respuesta no válida del servidor');
    }
    const data = await r.json();
    if (!r.ok) throw new Error((data && data.error) || 'Error ' + r.status);
    return data;
  } catch (e) {
    if (window.DEMO && (e instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(e.message || ''))) {
      window.GR_activarDemo && window.GR_activarDemo();
      return window.DEMO.handle(path, { method, body, form });
    }
    throw e;
  }
}

/* ---------- Helpers UI ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// Escapa para insertar de forma segura dentro de un string JS en un atributo (onclick="fn('...')").
const escJs = (s) => esc(String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, '\\u0027'));
const money = (n) => '$' + (parseFloat(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fecha = (s) => s ? new Date(s).toLocaleDateString('es-PR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fechaHora = (s) => s ? new Date(s).toLocaleString('es-PR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

function toast(msg, tipo = 'ok') {
  const t = document.createElement('div');
  t.className = 'toast' + (tipo === 'err' ? ' err' : '');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

const modal = {
  abrir(titulo, bodyHTML, footHTML) {
    $('#modal-titulo').innerHTML = titulo;
    $('#modal-body').innerHTML = bodyHTML;
    $('#modal-foot').innerHTML = footHTML || '';
    $('#modal').classList.add('activo');
  },
  cerrar() { $('#modal').classList.remove('activo'); },
};
$('#modal-x').onclick = modal.cerrar;
$('#modal').onclick = (e) => { if (e.target.id === 'modal') modal.cerrar(); };

/* ---------- Iconos SVG ---------- */
const IC = {
  dash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
  prod: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>',
  inv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><line x1="3.27" y1="6.96" x2="12" y2="12.01"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
  orden: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 2L7 6H4a2 2 0 00-2 2v11a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-3l-2-4z"/><path d="M9 11a3 3 0 006 0"/></svg>',
  envio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
  conta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',
  cliente: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/></svg>',
  cupon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 12a2 2 0 010-4V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 010 4v2a2 2 0 010 4v0a2 2 0 002 2h12a2 2 0 002-2v0a2 2 0 010-4v-2z"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="15" x2="15.01" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>',
  estrella: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  lead: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
  config: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
  add: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  buscar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  caja: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>',
  dinero: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',
  pago: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
};

/* ---------- Navegación ---------- */
const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: IC.dash },
  { id: 'productos', label: 'Productos', icon: IC.prod },
  { id: 'inventario', label: 'Inventario', icon: IC.inv },
  { id: 'ordenes', label: 'Órdenes', icon: IC.orden },
  { id: 'envios', label: 'Envíos', icon: IC.envio },
  { id: 'contabilidad', label: 'Contabilidad', icon: IC.conta },
  { id: 'pagos', label: 'Pagos', icon: IC.pago },
  { id: 'clientes', label: 'Clientes', icon: IC.cliente },
  { id: 'cupones', label: 'Cupones', icon: IC.cupon },
  { id: 'resenas', label: 'Reseñas', icon: IC.estrella },
  { id: 'leads', label: 'Leads', icon: IC.lead },
  { id: 'config', label: 'Configuración', icon: IC.config },
];

function pintarNav() {
  $('#nav').innerHTML = NAV.map(n =>
    `<a data-vista="${n.id}" class="${n.id === VISTA ? 'activo' : ''}">${n.icon}<span>${n.label}</span><span class="badge" id="badge-${n.id}" style="display:none"></span></a>`
  ).join('');
  $$('#nav a').forEach(a => a.onclick = () => irA(a.dataset.vista));
}

function irA(vista) {
  VISTA = vista;
  pintarNav();
  $('#titulo').textContent = NAV.find(n => n.id === vista)?.label || '';
  $('#topbar-acciones').innerHTML = '';
  $('#contenido').innerHTML = '<div class="cargando"><div class="spinner"></div>Cargando…</div>';
  $('#sidebar').classList.remove('abierto');
  $('#overlay').classList.remove('activo');
  (VISTAS[vista] || (() => {}))();
}

/* ---------- Auth ---------- */
async function login() {
  const email = $('#lg-email').value.trim();
  const pass = $('#lg-pass').value;
  $('#lg-err').style.display = 'none';
  if (!email || !pass) { $('#lg-err').textContent = 'Completa email y contraseña'; $('#lg-err').style.display = 'block'; return; }
  $('#lg-btn').textContent = 'Entrando…';
  try {
    const r = await api('/auth/login', { method: 'POST', body: { email, password: pass } });
    if (r.usuario.rol !== 'admin') throw new Error('Esta cuenta no es de administrador');
    TOKEN = r.token; USER = r.usuario;
    localStorage.setItem('gr_token', TOKEN);
    localStorage.setItem('gr_user', JSON.stringify(USER));
    arrancarApp();
  } catch (e) {
    $('#lg-err').textContent = e.message; $('#lg-err').style.display = 'block';
    $('#lg-btn').textContent = 'Entrar';
  }
}
function logout() {
  TOKEN = ''; USER = null;
  localStorage.removeItem('gr_token'); localStorage.removeItem('gr_user');
  $('#app').classList.remove('activo');
  $('#login').style.display = 'flex';
}
function arrancarApp() {
  $('#login').style.display = 'none';
  $('#app').classList.add('activo');
  $('#pie-user').textContent = USER?.nombre || USER?.email || 'Admin';
  pintarNav();
  irA('dashboard');
  refrescarBadges();
}

async function refrescarBadges() {
  try {
    const d = await api('/dashboard');
    const setBadge = (id, n) => { const b = $('#badge-' + id); if (b) { if (n > 0) { b.textContent = n; b.style.display = ''; } else b.style.display = 'none'; } };
    setBadge('ordenes', d.ordenes_pendientes);
    setBadge('inventario', d.inventario_bajas);
  } catch {}
}

/* eventos login */
$('#lg-btn').onclick = login;
$('#lg-pass').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
$('#salir').onclick = logout;
$('#hamb').onclick = () => { $('#sidebar').classList.toggle('abierto'); $('#overlay').classList.toggle('activo'); };
$('#overlay').onclick = () => { $('#sidebar').classList.remove('abierto'); $('#overlay').classList.remove('activo'); };

/* Las vistas se definen en admin-vistas.js */
window.VISTAS = window.VISTAS || {};

/* arranque */
if (TOKEN && USER) arrancarApp();
