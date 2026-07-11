/* ==========================================================================
   GYMRILLAS · Motor bilingüe ES/EN
   --------------------------------------------------------------------------
   Cómo se traduce el contenido ESTÁTICO (HTML):
     <h2 data-en="Jungle strength">Fuerza de la jungla</h2>
       -> textContent se intercambia. El español actual queda como default.
     <p data-en-html="Made in <b>PR</b>">Hecho en <b>PR</b></p>
       -> se intercambia innerHTML (para textos con etiquetas internas).
     <input data-en-ph="Search products…" placeholder="Buscar productos…">
       -> se intercambia el placeholder.
     <img data-en-alt="Gorilla" alt="Gorila">
       -> se intercambia el alt.
   El español visible en el HTML es el idioma por defecto; solo se añade el
   inglés en los atributos data-en*. El motor captura el ES en el primer pase.

   Cómo se traduce el contenido DINÁMICO (JS que inyecta texto):
     - Usa GYM_I18N.t('texto ES','English text') para escoger el idioma actual.
     - Escucha el evento 'gym:langchange' para re-renderizar lo que pintaste.
   ========================================================================== */
(function () {
  'use strict';
  var KEY = 'gymrillas_lang';
  var LANGS = ['es', 'en'];

  function getLang() {
    var l = localStorage.getItem(KEY);
    return LANGS.indexOf(l) >= 0 ? l : 'es';
  }

  function swapText(el, en) {
    if (el.getAttribute('data-es') === null) el.setAttribute('data-es', el.textContent);
    el.textContent = en ? (el.getAttribute('data-en') || el.getAttribute('data-es')) : el.getAttribute('data-es');
  }
  function swapHTML(el, en) {
    if (el.getAttribute('data-es-html') === null) el.setAttribute('data-es-html', el.innerHTML);
    el.innerHTML = en ? (el.getAttribute('data-en-html') || el.getAttribute('data-es-html')) : el.getAttribute('data-es-html');
  }
  function swapAttr(el, en, attr, esData, enData) {
    if (el.getAttribute(esData) === null) el.setAttribute(esData, el.getAttribute(attr) || '');
    el.setAttribute(attr, en ? (el.getAttribute(enData) || el.getAttribute(esData)) : el.getAttribute(esData));
  }

  function apply(root) {
    var en = getLang() === 'en';
    root = root || document;
    // textContent
    var t = root.querySelectorAll('[data-en]');
    for (var i = 0; i < t.length; i++) swapText(t[i], en);
    // innerHTML
    var h = root.querySelectorAll('[data-en-html]');
    for (var j = 0; j < h.length; j++) swapHTML(h[j], en);
    // placeholder
    var p = root.querySelectorAll('[data-en-ph]');
    for (var k = 0; k < p.length; k++) swapAttr(p[k], en, 'placeholder', 'data-es-ph', 'data-en-ph');
    // alt
    var a = root.querySelectorAll('[data-en-alt]');
    for (var m = 0; m < a.length; m++) swapAttr(a[m], en, 'alt', 'data-es-alt', 'data-en-alt');
    // aria-label
    var al = root.querySelectorAll('[data-en-aria]');
    for (var n = 0; n < al.length; n++) swapAttr(al[n], en, 'aria-label', 'data-es-aria', 'data-en-aria');
  }

  function setLang(lang) {
    if (LANGS.indexOf(lang) < 0) lang = 'es';
    localStorage.setItem(KEY, lang);
    document.documentElement.setAttribute('lang', lang);
    apply(document);
    paintSwitcher();
    document.dispatchEvent(new CustomEvent('gym:langchange', { detail: { lang: lang } }));
  }

  /* --- Selector de idioma inyectado en el header (no hay que tocar el HTML) --- */
  function buildSwitcher() {
    var wrap = document.createElement('div');
    wrap.className = 'lang-switch';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Idioma / Language');
    LANGS.forEach(function (l) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'lang-btn';
      b.setAttribute('data-lang', l);
      b.textContent = l.toUpperCase();
      b.addEventListener('click', function () { setLang(l); });
      wrap.appendChild(b);
    });
    return wrap;
  }
  function paintSwitcher() {
    var cur = getLang();
    var btns = document.querySelectorAll('.lang-switch .lang-btn');
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute('data-lang') === cur;
      btns[i].classList.toggle('is-on', on);
      btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }
  function injectSwitcher() {
    if (document.querySelector('.lang-switch')) return;
    var host = document.querySelector('.header .iconos');
    if (host) { host.insertBefore(buildSwitcher(), host.firstChild); paintSwitcher(); }
  }

  /* --- Contenido inyectado dinámicamente: traducir subárboles nuevos --- */
  function observe() {
    if (!window.MutationObserver) return;
    var obs = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var added = muts[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          if (added[j].nodeType === 1) {
            var el = added[j];
            if (el.matches && (el.matches('[data-en],[data-en-html],[data-en-ph],[data-en-alt],[data-en-aria]'))) apply(el.parentNode || el);
            else if (el.querySelector && el.querySelector('[data-en],[data-en-html],[data-en-ph],[data-en-alt],[data-en-aria]')) apply(el);
          }
        }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  /* --- Tema claro / oscuro (persistente, toggle sol/luna en el header) --- */
  var THEME_KEY = 'gymrillas_theme';
  function getTheme() { return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'; }
  function applyTheme() { document.documentElement.setAttribute('data-theme', getTheme()); }
  function setTheme(t) { localStorage.setItem(THEME_KEY, t === 'light' ? 'light' : 'dark'); applyTheme(); }
  var SUN = '<svg class="ico-sol" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4l1.4-1.4M18 6l1.4-1.4"/></svg>';
  var MOON = '<svg class="ico-luna" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8z"/></svg>';
  function injectThemeToggle() {
    if (document.querySelector('.theme-toggle')) return;
    var host = document.querySelector('.header .iconos');
    if (!host) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'theme-toggle';
    b.setAttribute('aria-label', 'Cambiar tema / Toggle theme');
    b.innerHTML = SUN + MOON;
    b.addEventListener('click', function () { setTheme(getTheme() === 'light' ? 'dark' : 'light'); });
    host.insertBefore(b, host.firstChild);
  }

  // API pública para los scripts de página
  window.GYM_I18N = {
    getLang: getLang,
    setLang: setLang,
    apply: apply,
    t: function (es, en) { return getLang() === 'en' ? en : es; },
    getTheme: getTheme,
    setTheme: setTheme
  };

  function boot() {
    applyTheme();
    document.documentElement.setAttribute('lang', getLang());
    injectThemeToggle();
    injectSwitcher();
    apply(document);
    observe();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
