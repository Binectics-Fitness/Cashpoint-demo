// Stand-in runtime for local rendering only. Mimics the design component format closely enough to check layout and flows.
(function () {
  class DCLogic {
    constructor() { this.state = undefined; }
    setState(p) { this.state = Object.assign({}, this.state || {}, p); window.__dcRender && window.__dcRender(); }
  }
  window.DCLogic = DCLogic;
  function lookup(scope, path) {
    path = path.trim();
    if (path === 'true') return true; if (path === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    let v = scope;
    for (const k of path.split('.')) { if (v == null) return undefined; v = v[k]; }
    return v;
  }
  const HOLE = /\{\{([^}]*)\}\}/g;
  function interp(str, scope) { return str.replace(HOLE, (_, e) => { const v = lookup(scope, e); return v == null ? '' : String(v); }); }
  function single(str) { const m = str.trim().match(/^\{\{([^}]*)\}\}$/); return m ? m[1] : null; }
  function build(node, scope, out) {
    if (node.nodeType === 3) { out.appendChild(document.createTextNode(interp(node.nodeValue, scope))); return; }
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();
    if (tag === 'sc-if') { const e = single(node.getAttribute('value') || ''); if (lookup(scope, e)) kids(node, scope, out); return; }
    if (tag === 'sc-for') {
      const list = lookup(scope, single(node.getAttribute('list')) || '') || []; const as = node.getAttribute('as');
      list.forEach((item) => { const s = Object.create(scope); s[as] = item; kids(node, s, out); }); return;
    }
    if (tag === 'helmet') return;
    const el = document.createElement(tag);
    for (const a of node.attributes) {
      if (a.name.startsWith('hint-')) continue;
      const s = single(a.value);
      if (/^on[a-z]+$/i.test(a.name) && s) { const fn = lookup(scope, s); const ev = a.name.slice(2).toLowerCase(); if (fn) el.addEventListener(ev, fn); continue; }
      if (s !== null && a.name === 'value') { const v = lookup(scope, s); el.value = v == null ? '' : v; el.setAttribute('value', v == null ? '' : v); continue; }
      el.setAttribute(a.name, interp(a.value, scope));
    }
    kids(node, scope, el); out.appendChild(el);
  }
  function kids(node, scope, out) { const src = node.content ? node.content.childNodes : node.childNodes; src.forEach((c) => build(c, scope, out)); }
  window.addEventListener('DOMContentLoaded', () => {
    const xdc = document.querySelector('x-dc');
    const helmet = xdc.querySelector('helmet');
    helmet.querySelectorAll('style,link').forEach((n) => document.head.appendChild(n.cloneNode(true)));
    const tpl = document.createElement('div'); xdc.childNodes.forEach((c) => tpl.appendChild(c.cloneNode(true)));
    const src = document.querySelector('script[data-dc-script]').textContent;
    const Comp = new Function(src + '\nreturn Component;')();
    const inst = new Comp();
    const mount = document.createElement('div'); mount.id = 'dc-mount'; xdc.replaceWith(mount);
    window.__dcInst = inst;
    // The page is rebuilt on every state change. Remember which control had focus (and the caret) and put it back,
    // otherwise typing in a field loses focus after one character and keyboard users lose their place.
    const FOCUSABLE = 'input,textarea,select,button,a[href],summary,[tabindex]';
    const sig = (el) => [el.tagName, el.type || '', el.getAttribute('placeholder') || '', el.getAttribute('aria-label') || '', el.getAttribute('name') || '', el.id || '', el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ? '' : (el.textContent || '').trim().slice(0, 40), el.getAttribute('href') || ''].join('|');
    window.__dcRender = () => {
      const a = document.activeElement;
      let keep = null;
      if (a && a !== document.body && mount.contains(a) && a.matches(FOCUSABLE)) {
        const s = sig(a);
        const same = [...mount.querySelectorAll(FOCUSABLE)].filter((e) => sig(e) === s);
        let sel = null;
        try { if (a.selectionStart != null) sel = [a.selectionStart, a.selectionEnd, a.selectionDirection]; } catch (e) {}
        keep = { s, n: same.indexOf(a), sel };
      }
      const vals = inst.renderVals();
      const out = document.createDocumentFragment(); kids(tpl, vals, out);
      mount.replaceChildren(out);
      if (keep) {
        const same = [...mount.querySelectorAll(FOCUSABLE)].filter((e) => sig(e) === keep.s);
        const el = same[keep.n] || same[same.length - 1];
        if (el) {
          try { el.focus({ preventScroll: true }); } catch (e) {}
          if (keep.sel) { try { el.setSelectionRange(keep.sel[0], keep.sel[1], keep.sel[2] || 'none'); } catch (e) {} }
        }
      }
    };
    window.__dcRender();
  });
})();
