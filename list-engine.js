/* Things Remembered back office: the shared engine for list screens (a table with filters, row actions and a form).
   A page supplies only its configuration: class Component extends ListPage { constructor() { super(CFG, HOOK); } }
   Everything else (forms, validation, dialogs, empty states, persistence) lives here, once.

   Field kinds in CFG.fields / CFG.efields, chosen from the field's settings:
     text (default)  list+strict with up to 6 options -> choice (chips)   multi:1 -> several chips   date:1 -> date picker
     area:1 -> multi-line text   num:1 -> number   list (not strict) -> text with suggestions
   A form with one or two fields opens as a centred dialog; more than that opens as a drawer. */
(function () {
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function toIso(s) { var m = /^(\d{1,2}) (\w{3}) (\d{4})$/.exec(String(s || '').trim()); if (!m) return /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) ? s : ''; var mi = MON.indexOf(m[2]); return mi < 0 ? '' : m[3] + '-' + String(mi + 1).padStart(2, '0') + '-' + m[1].padStart(2, '0'); }
  function toDisplay(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '')); return m ? Number(m[3]) + ' ' + MON[Number(m[2]) - 1] + ' ' + m[1] : ''; }
  function esc(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function parseMulti(value, list, sep) { var s = String(value || ''), b = esc((sep || ', ').trim()) + '\\s*'; return list.filter(function (it) { return new RegExp('(^|' + b + ')' + esc(it) + '(\\s*' + esc((sep || ', ').trim()) + '|$)').test(s); }); }
  function first(s) { return String(s).split('|')[0]; }
  function lower(s) { return String(s || '').toLowerCase(); }

  class ListPage extends DCLogic {
    constructor(cfg, hook) { super(); this.CFG = cfg; this.HOOK = typeof hook === 'function' ? hook : null; }

    renderVals() {
      var self = this, CFG = this.CFG, HOOK = this.HOOK, st = this.state || {};
      var baseRows = st.rows || (CFG.persist && window.trLoad ? window.trLoad('rows:' + CFG.persist, CFG.rows) : CFG.rows);
      var extraRows = (CFG.merge && window.trLoad && !st.rows) ? window.trLoad(CFG.merge, []).filter(function (x) { return !baseRows.some(function (b) { return b.id === x.id; }); }) : [];
      var rowsData = extraRows.concat(baseRows);
      var f = st.f || {}, errs = st.errs || {};
      var dflt = function (c) { return c && c.values.indexOf('All') < 0 ? c.values[0] : 'All'; };
      var chipV = st.chip || dflt(CFG.chips), chip2V = st.chip2 || dflt(CFG.chips2);
      var filtered = chipV !== dflt(CFG.chips) || (CFG.chips2 && chip2V !== dflt(CFG.chips2));
      // {key} is the first part of a "main|sub" value; {key.1} is the second part
      var tpl = function (s, row) { return String(s || '').replace(/\{(\w+)(?:\.(\d))?\}/g, function (m, k, i) { var v = row && row[k] !== undefined ? row[k] : (f[k] !== undefined ? f[k] : ''); var p = String(v).split('|'); return p[i ? Number(i) : 0] || ''; }); };
      var visible = rowsData.filter(function (r) { return (!CFG.chips || chipV === 'All' || r[CFG.chips.field] === chipV) && (!CFG.chips2 || chip2V === 'All' || r[CFG.chips2.field] === chip2V); });
      var mode = st.mode || '';
      var sel = rowsData.filter(function (r) { return r.id === st.sel; })[0];
      var fdef = function (k) {
        var e = (CFG.efields || []).filter(function (x) { return x.k === k; })[0], a = (CFG.fields || []).filter(function (x) { return x.k === k; })[0];
        return (mode === 'edit' ? e || a : a || e);
      };
      var setRows = function (next, done) { if (CFG.persist && window.trSave) window.trSave('rows:' + CFG.persist, next); self.setState({ rows: next, mode: '', sel: '', f: {}, errs: {}, msg: '', done: done || '' }); };

      /* ---- table ---- */
      var mkCell = function (c, r) {
        var raw = r[c.k] === undefined ? '' : String(r[c.k]);
        var parts = c.t === 'two' ? raw.split('|') : [raw];
        var lk = (CFG.pills || {})[parts[0]];
        return { l: c.l, cls: c.t === 'num' ? 'num' : '', align: c.t === 'num' ? 'flex-end' : 'flex-start', isPill: c.t === 'pill', isText: c.t !== 'pill', main: parts[0], w: (c.t === 'two' || c.t === 'strong') ? 700 : (c.t === 'num' ? 600 : 400), hasSub: parts.length > 1 && !!parts[1], sub: parts[1] || '', bg: lk ? lk[0] : 'var(--border)', color: lk ? lk[1] : 'var(--neutral-fg)' };
      };
      var openForm = function (m, r, keys) {
        var init = {};
        keys.forEach(function (k) {
          var d = fdef(k) || {}; var v = m === 'edit' ? ((CFG.edit.blank || []).indexOf(k) >= 0 ? '' : String(r[k] === undefined ? '' : r[k])) : String((CFG.prefill || {})[k] === undefined ? '' : (CFG.prefill || {})[k]);
          init[k] = d.date ? toIso(v) : v;
        });
        self.setState({ mode: m, sel: r ? r.id : '', f: init, errs: {}, msg: '', done: '' });
      };
      var acts = function (r) {
        return (CFG.acts || []).filter(function (a) { return !a.when || r[a.when.k] === a.when.v; }).map(function (a) {
          if (a.kind === 'link') return { isLink: true, isBtn: false, label: a.label, href: a.href, aria: a.label + ': ' + first(r[CFG.cols[0].k] || '') };
          var label = a.label, cls = 'btn sm' + (a.danger ? ' danger' : ''), run;
          if (a.kind === 'toggle') {
            var on = r[a.field] === a.a;
            label = on ? a.labelA : a.labelB; cls = 'btn sm' + (on && a.danger ? ' danger' : '');
            run = function () { setRows(rowsData.map(function (x) { return x.id === r.id ? Object.assign({}, x, { [a.field]: on ? a.b : a.a }) : x; }), tpl(on ? a.doneA : a.doneB, r)); };
          } else if (a.kind === 'edit') { run = function () { openForm('edit', r, CFG.edit.keys); }; }
          else if (a.kind === 'detail') { run = function () { self.setState({ mode: 'detail', sel: r.id, errs: {}, msg: '', done: '' }); }; }
          else if (a.kind === 'msg') { run = function () { self.setState({ done: tpl(a.text, r), mode: '', msg: '' }); }; }
          else if (a.kind === 'set') { run = function () { setRows(rowsData.map(function (x) { return x.id === r.id ? Object.assign({}, x, a.set) : x; }), tpl(a.text, r)); }; }
          return { isLink: false, isBtn: true, label: label, cls: cls, run: run, aria: label + ': ' + first(r[CFG.cols[0].k] || '') };
        });
      };
      var rows = visible.map(function (r) { return { cells: CFG.cols.map(function (c) { return mkCell(c, r); }), acts: acts(r) }; });

      /* ---- form ---- */
      var keys = mode === 'add' ? (CFG.fields || []).map(function (x) { return x.k; }) : (mode === 'edit' ? CFG.edit.keys : []);
      var clean = function (s) { return String(s === undefined ? '' : s).trim(); };
      var kindOf = function (d) { return d.multi ? 'multi' : d.date ? 'date' : d.area ? 'area' : (d.list && d.strict && d.list.length <= 6 && !d.free) ? 'choice' : 'text'; };
      var setField = function (k, v) { var ne = Object.assign({}, errs); delete ne[k]; self.setState({ f: Object.assign({}, f, { [k]: v }), errs: ne, msg: '' }); };
      var mkField = function (k) {
        var d = fdef(k) || { l: k }, kind = kindOf(d), err = errs[k] || '', val = f[k] === undefined ? '' : f[k], req = mode === 'add' ? !!d.req : (CFG.edit.optional || []).indexOf(k) < 0;
        var o = { k: k, id: 'f-' + k, errId: 'e-' + k, l: d.l, opt: req ? '' : ' (optional)', ph: d.ph || '', val: val, hasErr: !!err, err: err, invalid: err ? 'true' : 'false', hint: d.hint || '', hasHint: !!d.hint,
          isText: kind === 'text' || kind === 'date', isNum: !!d.num, isChoice: kind === 'choice', isMulti: kind === 'multi', isArea: kind === 'area', isDate: kind === 'date',
          type: kind === 'date' ? 'date' : 'text', inputmode: d.num ? 'decimal' : 'text', hasList: kind === 'text' && !!d.list, listId: 'dl-' + k, opts: [], list: (d.list || []).map(function (v) { return { v: v }; }),
          on: function (e) { setField(k, e.target.value); } };
        if (kind === 'choice' || kind === 'multi') {
          var chosen = kind === 'multi' ? parseMulti(val, d.list, d.sep) : [val];
          o.opts = d.list.map(function (v) {
            var on = chosen.indexOf(v) >= 0;
            return { t: v, on: on, cls: on ? 'chip on' : 'chip', pick: function () {
              if (kind === 'choice') { setField(k, v); return; }
              var next = on ? chosen.filter(function (x) { return x !== v; }) : chosen.concat([v]);
              if (!on && d.exclusive === v) next = [v]; else if (!on && d.exclusive) next = next.filter(function (x) { return x !== d.exclusive; });
              setField(k, d.list.filter(function (x) { return next.indexOf(x) >= 0; }).join(d.sep || ', '));
            } };
          });
        }
        return o;
      };
      var validate = function () {
        var e = {};
        keys.forEach(function (k) {
          var d = fdef(k) || {}, kind = kindOf(d), v = clean(f[k]), req = mode === 'add' ? !!d.req : (CFG.edit.optional || []).indexOf(k) < 0;
          if (!v) { if (req) e[k] = d.err || ((kind === 'choice' || kind === 'multi' ? 'Choose ' : kind === 'date' ? 'Choose ' : 'Enter ') + lower(d.l.replace(/\s*\(.*?\)\s*/g, ' ').trim()) + '.'); return; }
          if (kind === 'text' && d.list && d.strict && d.list.indexOf(v) < 0) e[k] = 'Pick ' + lower(d.l) + ' from the list.';
          else if (d.num && !/^\d+(\.\d+)?$/.test(v.replace(/,/g, ''))) e[k] = d.l.replace(/\s*\(.*?\)\s*/g, ' ').trim() + ' must be a number.';
          else if (kind === 'date' && !toDisplay(v)) e[k] = 'Choose a valid date.';
          else if (d.forbid && d.forbid.indexOf(v) >= 0) e[k] = d.forbidMsg;
        });
        return e;
      };
      var save = function () {
        var e = validate();
        if (Object.keys(e).length) { self.setState({ errs: e, msg: '' }); setTimeout(function () { var el = document.querySelector('.drawer [aria-invalid="true"]'); if (el && el.focus) el.focus(); }, 0); return; }
        var val = function (k) { var d = fdef(k) || {}, v = clean(f[k]); return d.date ? toDisplay(v) : (d.num ? v.replace(/,/g, '') : v); };
        var fail = function (h) { var ne = {}; if (h.field) ne[h.field] = h.error; self.setState({ errs: ne, msg: h.field ? '' : h.error }); setTimeout(function () { var el = document.querySelector('.drawer [aria-invalid="true"]'); if (el && el.focus) el.focus(); }, 0); };
        if (mode === 'add') {
          var row = Object.assign({ id: 'n' + rowsData.length + '-' + Date.now() }, CFG.defaults || {});
          keys.forEach(function (k) { row[k] = val(k); });
          if (HOOK) { var h = HOOK(row, f, rowsData); if (h && h.error) { fail(h); return; } if (h && h.row) row = h.row; if (h && h.rows) { setRows(h.rows(row), tpl(CFG.doneAdd, row)); return; } }
          setRows([row].concat(rowsData), tpl(CFG.doneAdd, row));
        } else {
          var patch = {}; keys.forEach(function (k) { patch[k] = val(k); });
          var row2 = Object.assign({}, sel, patch);
          if (CFG.edit.after) Object.keys(CFG.edit.after).forEach(function (k) { row2[k] = tpl(CFG.edit.after[k], Object.assign({}, sel, patch, f)); });
          setRows(rowsData.map(function (x) { return x.id === sel.id ? row2 : x; }), tpl(CFG.edit.done, row2));
        }
      };
      var dFields = keys.map(mkField);
      var nErr = Object.keys(errs).length;
      var dLines = (mode === 'detail' && sel) ? (sel.detail || []).map(function (x) { return { s: x[0], t: x[1] }; }) : [];
      var closeDrawer = function () { self.setState({ mode: '', sel: '', f: {}, errs: {}, msg: '' }); };

      /* ---- the grid: columns come from the config, so every list screen shares one template ---- */
      var hasActs = !!(CFG.acts && CFG.acts.length);
      // the action column is as wide as its actions need (label length, padding, chevron), never narrower than 204px
      var actsW = hasActs ? Math.max(204, Math.ceil(CFG.acts.reduce(function (n, a) { var l = Math.max((a.label || '').length, (a.labelA || '').length, (a.labelB || '').length); return n + l * 7.6 + (a.kind === 'link' ? 40 : 38); }, 0))) : 0;
      var gridCols = CFG.cols.map(function (c) { return 'minmax(0, ' + (c.w || '1fr') + ')'; }).concat(hasActs ? ['minmax(' + actsW + 'px, 1.6fr)'] : []).join(' ');
      var emptyAll = rowsData.length === 0;

      return {
        title: CFG.title, sub: CFG.sub, links: CFG.links || [], hasLinks: !!(CFG.links && CFG.links.length), hasAdd: !!CFG.fields && !CFG.noAdd, addLabel: CFG.addLabel,
        openAdd: function () { openForm('add', null, (CFG.fields || []).map(function (x) { return x.k; })); },
        hasDone: !!st.done, doneText: st.done || '', dismissDone: function () { self.setState({ done: '' }); },
        hasExp: !!CFG.export,
        xopts: [['PDF', 'pdf'], ['Excel (.xlsx)', 'xlsx'], ['CSV', 'csv']].map(function (o) { return { label: o[0], pick: function () { self.setState({ xd: 'Prepared ' + CFG.export + '.' + o[1] }); } }; }), xHas: !!st.xd, xText: st.xd || '',
        hasStats: !!(CFG.stats && CFG.stats.length),
        stats: (CFG.stats || []).map(function (s) { return { l: s.l, v: s.count ? String(rowsData.filter(function (r) { return r[s.count.k] === s.count.v; }).length) : s.v, c: s.c || 'var(--text)', hasSub: !!s.sub, sub: s.sub || '', hasHref: !!s.href, href: s.href || '', hrefLabel: s.hrefLabel || '' }; }),
        labelChips: !!CFG.chips2, chipLabel: (CFG.chips && (CFG.chips.label || CFG.chips.field)) || '', chip2Label: (CFG.chips2 && (CFG.chips2.label || CFG.chips2.field)) || '',
        hasChips: !!CFG.chips, chips: CFG.chips ? CFG.chips.values.map(function (v) { return { label: v, on: v === chipV, pick: function () { self.setState({ chip: v, done: '' }); }, bg: v === chipV ? 'var(--brand)' : 'var(--bg-surface)', color: v === chipV ? 'var(--bg-surface)' : 'var(--text)', border: v === chipV ? 'var(--brand)' : 'var(--border-strong)' }; }) : [],
        hasChips2: !!CFG.chips2, chips2: CFG.chips2 ? CFG.chips2.values.map(function (v) { return { label: v, on: v === chip2V, pick: function () { self.setState({ chip2: v, done: '' }); }, bg: v === chip2V ? 'var(--brand)' : 'var(--bg-surface)', color: v === chip2V ? 'var(--bg-surface)' : 'var(--text)', border: v === chip2V ? 'var(--brand)' : 'var(--border-strong)' }; }) : [],
        gridCols: gridCols, minW: ((CFG.minW || (CFG.cols.length * 130 + (hasActs ? 204 : 0))) + Math.max(0, actsW - 204)) + 'px',
        heads: CFG.cols.map(function (c) { return { l: c.l, cls: c.t === 'num' ? 'num' : '' }; }).concat(hasActs ? [{ l: '', cls: '' }] : []),
        rows: rows, noRows: rows.length === 0, hasActs: hasActs, note: CFG.note || '',
        emptyTitle: emptyAll ? ((CFG.empty && CFG.empty.title) || 'Nothing here yet') : 'Nothing matches these filters',
        emptyText: emptyAll ? ((CFG.empty && CFG.empty.text) || '') : 'Try another filter, or show everything.', hasEmptyText: emptyAll ? !!(CFG.empty && CFG.empty.text) : true,
        canClear: !emptyAll && filtered, clearFilters: function () { self.setState({ chip: '', chip2: '' }); },
        drawerOpen: !!mode && (mode === 'add' || !!sel), closeDrawer: closeDrawer,
        dClass: (mode === 'add' || mode === 'edit') && keys.length <= 2 ? 'dlg' : '',
        dTitle: mode === 'add' ? CFG.addTitle : (mode === 'edit' ? tpl(CFG.edit.title, sel) : (mode === 'detail' && sel ? tpl(CFG.detailTitle, sel) : '')),
        hasDSub: mode !== 'add' && !!sel, dSub: sel ? tpl(CFG.subTitle || '{name}', sel) : '', dSub2: sel ? tpl(CFG.subLine || '', sel) : '',
        dFields: dFields, dLines: dLines,
        hasDNote: mode === 'add' ? !!CFG.addNote : (mode === 'edit' ? !!CFG.edit.note : false), dNote: mode === 'add' ? (CFG.addNote || '') : (CFG.edit ? (CFG.edit.note || '') : ''),
        hasMsg: !!st.msg, msg: st.msg || '', hasErrs: nErr > 0, errSummary: nErr === 1 ? 'One thing needs fixing before this can be saved.' : nErr + ' things need fixing before this can be saved.',
        hasSave: mode !== 'detail', save: save, saveLabel: mode === 'add' ? CFG.addSave : (CFG.edit ? CFG.edit.save : ''), closeLabel: mode === 'detail' ? 'Close' : 'Cancel'
      };
    }
  }
  window.ListPage = ListPage;
})();
