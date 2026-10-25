/* Back-office shell behaviour: remembers the menu preference, and makes drawers behave as modal dialogs.
   Works whether the page is re-rendered wholesale or patched. Plain browser APIs only. */
(function () {
  function q(sel) { var l = document.querySelectorAll(sel); for (var i = 0; i < l.length; i++) { if (!l[i].closest('sc-if,sc-for,template,helmet')) return l[i]; } return null; }
  var KEY = 'tr-sb';
  function read() {
    try { var v = localStorage.getItem(KEY); if (v) return v; } catch (e) {}
    var m = /(?:^|;)tr-sb=([ce])/.exec(window.name || ''); return m ? m[1] : '';
  }
  function write(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
    window.name = (window.name || '').replace(/(?:^|;)tr-sb=[ce]/, '') + ';tr-sb=' + v;
  }
  var menuOpen = false; // mobile menu: temporary, never stored
  function mode() { var w = window.innerWidth; return w <= 768 ? 'mobile' : (w < 1100 ? 'mid' : 'wide'); }
  function wanted() {
    var m = mode(), p = read();
    if (m === 'mobile') return menuOpen;
    return m === 'wide' ? p === 'c' : p === 'e';
  }
  function syncMenu() {
    var cb = q('.sbt'); if (!cb) return;
    var w = wanted(); if (cb.checked !== w) cb.checked = w;
    var l = q('.sbtl');
    if (l) { l.setAttribute('role', 'button'); l.setAttribute('tabindex', '0'); l.setAttribute('aria-label', mode() === 'mobile' ? 'Open or close the menu' : 'Collapse or expand the menu'); l.setAttribute('aria-expanded', String(mode() === 'mobile' ? w : (mode() === 'wide' ? !w : w))); }
  }
  document.addEventListener('change', function (e) {
    var t = e.target; if (!t || !t.classList || !t.classList.contains('sbt')) return;
    if (mode() === 'mobile') menuOpen = t.checked;
    else write(mode() === 'wide' ? (t.checked ? 'c' : 'e') : (t.checked ? 'e' : 'c'));
    syncMenu();
  }, true);
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (t && t.classList && t.classList.contains('sbtl') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); t.click(); }
  }, true);

  /* ---- drawers as modal dialogs ---- */
  var FOC = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  var open = false, opener = null, openerSig = null, lastIdx = 0;
  function drawer() { return q('.drawer'); }
  function focusables(d) { return Array.prototype.filter.call(d.querySelectorAll(FOC), function (n) { return n.offsetParent !== null; }); }
  function sig(n) {
    if (!n) return null; var tx = (n.textContent || '').trim().slice(0, 40), tag = n.tagName;
    var same = Array.prototype.filter.call(document.querySelectorAll(tag), function (x) { return (x.textContent || '').trim().slice(0, 40) === tx; });
    return { tag: tag, tx: tx, i: same.indexOf(n) };
  }
  function find(s) {
    if (!s) return null;
    var same = Array.prototype.filter.call(document.querySelectorAll(s.tag), function (x) { return (x.textContent || '').trim().slice(0, 40) === s.tx && !x.closest('.drawer'); });
    return same[Math.min(s.i, same.length - 1)] || same[0] || null;
  }
  function setInert(on) {
    var sh = q('.shell'); if (sh) { if (on) sh.setAttribute('inert', ''); else sh.removeAttribute('inert'); }
  }
  document.addEventListener('focusin', function (e) {
    var d = drawer(); if (!d || !d.contains(e.target)) return;
    var f = focusables(d), i = f.indexOf(e.target); if (i >= 0) lastIdx = i;
  }, true);
  document.addEventListener('click', function (e) {
    if (open) return; var b = e.target.closest && e.target.closest('button,a'); if (b) { opener = b; openerSig = sig(b); }
  }, true);
  document.addEventListener('keydown', function (e) {
    var d = drawer(); if (!d) return;
    if (e.key === 'Escape') {
      var c = d.querySelector('.dh button'); if (c) { e.preventDefault(); c.click(); } return;
    }
    if (e.key === 'Tab') {
      var f = focusables(d); if (!f.length) return;
      var i = f.indexOf(document.activeElement);
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && (i === -1 || i === f.length - 1)) { e.preventDefault(); f[0].focus(); }
    }
  }, true);
  function sync() {
    syncMenu();
    var d = drawer();
    if (d) {
      d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
      setInert(true);
      var f = focusables(d);
      if (!open) { open = true; lastIdx = 0; var first = d.querySelector('input,select,textarea') || f[0]; if (first) first.focus(); }
      else if (!d.contains(document.activeElement) && f.length) { (f[Math.min(lastIdx, f.length - 1)] || f[0]).focus(); }
    } else if (open) {
      open = false; setInert(false);
      var t = (opener && document.contains(opener)) ? opener : find(openerSig);
      if (t) t.focus();
    }
  }
  var pending = false;
  function schedule() { if (pending) return; pending = true; Promise.resolve().then(function () { pending = false; sync(); }); }
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('resize', syncMenu);
  schedule();
})();

/* Export menu: close after a choice, on outside click, or Escape */
(function () {
  var closeAll = function (except) { var d = document.querySelectorAll('details.xm[open]'); for (var i = 0; i < d.length; i++) { if (d[i] !== except) d[i].removeAttribute('open'); } };
  document.addEventListener('click', function (e) {
    var t = e.target; var m = t && t.closest ? t.closest('details.xm') : null;
    if (m && t.closest('.xi')) { setTimeout(function () { closeAll(null); }, 0); return; }
    closeAll(m);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(null); });
})();

/* Shared demo state: approvals decided, notifications read, and the counts in the menu badges.
   window.trLoad(key, fallback) / window.trSave(key, value) / window.trBadge(name, count) */
(function () {
  var SK = 'tr-state', mem = null;
  function all() {
    if (mem) return mem;
    var s = null;
    try { s = localStorage.getItem(SK); } catch (e) {}
    if (!s) { var m = /(?:^|;)tr-state=([^;]*)/.exec(window.name || ''); if (m) { try { s = decodeURIComponent(m[1]); } catch (e) {} } }
    try { mem = s ? JSON.parse(s) : {}; } catch (e) { mem = {}; }
    return mem;
  }
  function put() {
    var s = JSON.stringify(mem || {});
    try { localStorage.setItem(SK, s); } catch (e) {}
    window.name = (window.name || '').replace(/(?:^|;)tr-state=[^;]*/, '') + ';tr-state=' + encodeURIComponent(s);
  }
  function paint() {
    var b = all().badges || {}, l = document.querySelectorAll('[data-badge]');
    for (var i = 0; i < l.length; i++) {
      var k = l[i].getAttribute('data-badge'); if (b[k] === undefined) continue;
      var n = b[k];
      var t = n > 99 ? '99+' : String(n); if (l[i].textContent !== t) l[i].textContent = t;
      var al = n + ' ' + (l[i].getAttribute('data-word') || ''); if (l[i].getAttribute('aria-label') !== al) l[i].setAttribute('aria-label', al);
      if (n > 0) { if (l[i].hasAttribute('hidden')) l[i].removeAttribute('hidden'); } else if (!l[i].hasAttribute('hidden')) l[i].setAttribute('hidden', '');
    }
  }
  window.trLoad = function (k, d) { var v = all()[k]; return v === undefined ? d : v; };
  window.trSave = function (k, v) { all()[k] = v; put(); };
  window.trBadge = function (k, n) { var a = all(); a.badges = a.badges || {}; a.badges[k] = n; put(); paint(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paint); else paint();
  var pend = false;
  function later() { if (pend) return; pend = true; setTimeout(function () { pend = false; paint(); }, 30); }
  try { new MutationObserver(later).observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}
  setTimeout(paint, 300); setTimeout(paint, 1200);
  var tries = 0, iv = setInterval(function () { paint(); if (++tries > 20) clearInterval(iv); }, 500);
})();

/* Accessibility layer, applied to every screen.
   1. Tables built from divs get table semantics (the screens render rows as CSS grids).
   2. A skip link to the main content.
   3. A persistent live region: this runtime rebuilds the page on every action, so a status or alert that appears is
      inserted fresh and screen readers would not announce it. Announce new ones through one region that never goes away. */
(function () {
  function roles() {
    var mount = document.getElementById('dc-mount'); if (!mount) return;
    var tbls = mount.querySelectorAll('.tbl > div');
    for (var i = 0; i < tbls.length; i++) {
      var t = tbls[i]; if (t.getAttribute('role') === 'table') continue;
      t.setAttribute('role', 'table');
      var card = t.parentElement.previousElementSibling; // an optional heading just above is not needed: name it from the page
      var h = document.querySelector('h1'); if (h && !t.getAttribute('aria-label')) t.setAttribute('aria-label', h.textContent.trim());
    }
    var rows = mount.querySelectorAll('.tbl .th, .tbl .tr');
    for (var j = 0; j < rows.length; j++) {
      var r = rows[j]; if (r.getAttribute('role') === 'row') continue;
      r.setAttribute('role', 'row');
      var head = r.classList.contains('th'), kids = r.children;
      for (var k = 0; k < kids.length; k++) { if (!kids[k].getAttribute('role')) kids[k].setAttribute('role', head ? 'columnheader' : 'cell'); }
    }
  }
  function skip() {
    if (!document.body) return;
    var m = document.querySelector('main'); if (!m) return;
    if (!m.id) m.id = 'main'; m.setAttribute('tabindex', '-1');
    if (!document.querySelector('.skip')) {
      var a = document.createElement('a'); a.className = 'skip'; a.href = '#main'; a.textContent = 'Skip to main content';
      a.addEventListener('click', function (e) { e.preventDefault(); m.focus(); });
      document.body.insertBefore(a, document.body.firstChild);
    }
  }
  var live = null, spoken = '';
  function announce() {
    if (!document.body) return;
    if (!live) { live = document.createElement('div'); live.className = 'vh'; live.setAttribute('aria-live', 'polite'); live.setAttribute('aria-atomic', 'true'); live.id = 'live'; document.body.appendChild(live); }
    var mount = document.getElementById('dc-mount'); if (!mount) return; // only the rendered page, never the unrendered template
    var els = mount.querySelectorAll('[role=status], [role=alert]'), txt = [];
    for (var i = 0; i < els.length; i++) { var s = (els[i].innerText || '').replace(/\s+/g, ' ').trim(); if (s && s.indexOf('{{') < 0) txt.push(s); }
    var now = txt.join(' | ');
    if (now !== spoken) { var fresh = txt.filter(function (x) { return spoken.indexOf(x) < 0; }).join('. '); spoken = now; if (fresh) { live.textContent = ''; setTimeout(function () { live.textContent = fresh; }, 30); } }
  }
  var pend = false;
  function run() { if (pend) return; pend = true; setTimeout(function () { pend = false; roles(); skip(); announce(); }, 0); }
  new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();

/* Section tabs scroll sideways on small screens: keep the current tab in view so people can see where they are.
   The runtime rebuilds the page, which resets the scroll position, so this checks after every render. */
(function () {
  function reveal() {
    var t = document.querySelector('nav.tabs .tab.on'); if (!t) return;
    var nav = t.parentElement; if (nav.scrollWidth <= nav.clientWidth + 1) return;
    var l = t.offsetLeft, r = l + t.offsetWidth;
    if (l >= nav.scrollLeft && r <= nav.scrollLeft + nav.clientWidth) return;
    nav.scrollLeft = Math.max(0, l - (nav.clientWidth - t.offsetWidth) / 2);
  }
  new MutationObserver(function () { setTimeout(reveal, 0); }).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', function () { setTimeout(reveal, 50); });
  window.addEventListener('resize', reveal);
})();

/* Work lists that would scroll sideways on a small screen (and hide their actions) reflow into labelled cards.
   Reference tables (ledger, statements: figures to compare) keep scrolling. Applies to any .tbl with row actions. */
(function () {
  var busy = false;
  function fit() {
    if (busy) return; busy = true;
    var mount = document.getElementById('dc-mount');
    if (mount) {
      var small = window.innerWidth <= 860, tbls = mount.querySelectorAll('.pg .tbl');
      for (var i = 0; i < tbls.length; i++) {
        var t = tbls[i]; if (t.classList.contains('cards') && !t.hasAttribute('data-auto')) continue;
        var inner = t.firstElementChild; if (!inner) continue;
        var head = inner.querySelector('.th'); var rows = inner.querySelectorAll('.tr');
        var actions = inner.querySelector('.tr button, .tr a.btn, .tr a.lnkb');
        if (!small || !head || !rows.length || !actions) { if (t.hasAttribute('data-auto')) { t.classList.remove('cards'); t.removeAttribute('data-auto'); } continue; }
        if (!t.classList.contains('cards') && t.scrollWidth <= t.clientWidth + 2) continue;
        if (!t.classList.contains('cards')) { t.classList.add('cards'); t.setAttribute('data-auto', ''); }
        var labels = [].map.call(head.children, function (c) { return c.textContent.trim(); });
        for (var r = 0; r < rows.length; r++) { var cs = rows[r].children; for (var c = 0; c < cs.length; c++) { if (labels[c] && cs[c].getAttribute('data-l') !== labels[c]) cs[c].setAttribute('data-l', labels[c]); } }
      }
    }
    busy = false;
  }
  var pend = false;
  function later() { if (pend) return; pend = true; setTimeout(function () { pend = false; fit(); }, 30); }
  new MutationObserver(later).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('resize', later); window.addEventListener('load', later);
})();

/* When a form in a drawer or dialog first shows an error, move focus to the first invalid field. */
(function () {
  var had = false;
  new MutationObserver(function () {
    setTimeout(function () {
      var bad = document.querySelector('.drawer [aria-invalid="true"]');
      if (bad && !had) { had = true; var a = document.activeElement; if (!a || a.getAttribute('aria-invalid') !== 'true') bad.focus(); }
      else if (!bad) had = false;
    }, 0);
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-invalid'] });
})();
