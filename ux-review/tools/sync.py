#!/usr/bin/env python3
"""Keeps the shared parts of the back-office screens identical everywhere.

  python3 ux-review/tools/sync.py [Page ...] regenerate the sidebar and section navigation on every back-office page,
                                             and the whole template of every list screen
  python3 ux-review/tools/sync.py convert    one-time: move list screens from the old per-page engine to list-engine.js

Pages stay self-contained files. What is regenerated:
  * the sidebar (one definition, the current page highlighted)
  * the section navigation (Accounts, Operations, Reports, Settings): one definition for the whole product
  * list screens: the entire markup, from a single template. The page keeps its own CFG (columns, fields, rows, text).
Edit the definitions below, run this, and every screen follows.
"""
import glob, json, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
os.chdir(ROOT)

# ---------------------------------------------------------------- navigation definitions
# Sidebar groups. Purchasing is an operations task, so it sits with Operations.
SIDEBAR_GROUPS = [
    ('Your work', ['Notifications', 'Approvals']),
    ('Operations', ['Production', 'Distribution', 'In-flight catering', 'Inventory', 'Purchasing']),
    ('Finance', ['Accounts', 'Reports']),
    ('Admin', ['Settings']),
]
SIDEBAR_HREF = {'Settings': 'ItemsPrices.dc.html'}  # where "Settings" lands

# Section navigation: label -> list of (group label, [(page label, page file name)]).
# One page in a group = a plain tab. Several pages = a tab plus a quiet second row.
ACCOUNTS = [('Overview', [('Overview', 'AccountsHome')]), ('Journals', [('Journals', 'Journals')]),
            ('Banking', [('Bank reconciliation', 'BankRec'), ('Payments', 'Payments')]),
            ('Books', [('Ledger', 'Ledger'), ('Trial balance', 'TrialBalance'), ('Receivables and payables', 'ReceivablesPayables'), ('Statements', 'Statements')]),
            ('Month-end', [('Month-end', 'Periods')]), ('Setup', [('Chart of accounts', 'ChartOfAccounts'), ('Tax and assets', 'Accounts')])]
SETTINGS = [('Sales', [('Items and prices', 'ItemsPrices'), ('Price rates', 'PriceRates'), ('Sales rules', 'SalesRules'), ('Units', 'Units')]),
            ('Locations', [('Locations and devices', 'Locations'), ('Cash point accounts', 'CashPointAccounts'), ('States', 'States'), ('Sync status', 'SyncStatus')]),
            ('People', [('Users and roles', 'UsersRoles'), ('Roles and access', 'RoleAccess'), ('Approvers', 'ApproverSettings'), ('Notifications', 'NotificationRules')]),
            ('Money', [('Payment provider', 'PaymentProvider'), ('Tax and currency', 'TaxCurrency')])]
REPORTS = [(l, [(l, p)]) for l, p in [('Sales', 'Reports'), ('Location view', 'LocationView'), ('End of day', 'EndOfDay'), ('Counter approvals', 'CounterApprovals'), ('VAT and WHT', 'VatWht'), ('Audit trail', 'AuditTrail')]]
def flat(pairs): return [(l, [(l, p)]) for l, p in pairs]
SECTIONS = {
    'Accounts sections': ACCOUNTS, 'Settings sections': SETTINGS, 'Report sections': REPORTS,
    'Production sections': flat([('Record production', 'Production'), ('Production records', 'ProductionRecords')]),
    'Distribution sections': flat([('Dispatches', 'Distribution'), ('Sent by day', 'SupplyByDay')]),
    'In-flight sections': flat([('Deliveries and invoices', 'Inflight'), ('Airline accounts', 'AirlineAccounts')]),
    'Inventory sections': flat([('Stock', 'Inventory'), ('Item movements', 'ItemMovements'), ('Stock alerts', 'StockAlerts')]),
    'Purchasing sections': flat([('Requests', 'Purchasing'), ('Suppliers', 'Suppliers')]),
}
ALIAS = {'VatRates': 'TaxCurrency'}  # a sub-page highlights its parent
# Which sidebar item is lit for pages outside the section definitions (detail pages)
EXTRA_SIDEBAR = {'ReceiveStock': 'Purchasing', 'AirlineInvoice': 'In-flight catering', 'LayoutRules': None}

def section_of(page):
    for label, groups in SECTIONS.items():
        for g in groups:
            if any(p == page or ALIAS.get(page) == p for _, p in g[1]): return label
    return None

def sidebar_of(page):
    sec = section_of(page)
    if page in EXTRA_SIDEBAR: return EXTRA_SIDEBAR[page]
    if page in ('Notifications', 'Approvals'): return page
    if sec == 'Accounts sections': return 'Accounts'
    if sec == 'Report sections': return 'Reports'
    if sec == 'Settings sections': return 'Settings'
    return {'Production sections': 'Production', 'Distribution sections': 'Distribution', 'In-flight sections': 'In-flight catering', 'Inventory sections': 'Inventory', 'Purchasing sections': 'Purchasing'}.get(sec)

def page_label(page):
    for groups in SECTIONS.values():
        for g in groups:
            for l, p in g[1]:
                if p == page: return l
    return None

# ---------------------------------------------------------------- generators
SB = json.load(open(os.path.join(os.path.dirname(__file__), 'sidebar.json'), encoding='utf-8'))

def sidebar_html(page):
    active = sidebar_of(page)
    out = ['<aside class="side" aria-label="Main">', SB['top'], '<nav class="navs" aria-label="Sections">']
    for g, labels in SIDEBAR_GROUPS:
        out.append('<div class="grp">%s</div>' % g)
        for lab in labels:
            it = SB['items'][lab]; on = lab == active
            href = SIDEBAR_HREF.get(lab, it['href'])
            out.append('<a class="nav%s" href="%s" title="%s"%s>%s<span class="nl">%s</span>%s</a>' % (' on' if on else '', href, it['title'], ' aria-current="page"' if on else '', it['icon'], lab, it['badge']))
    out.append('</nav>' + SB['bot'] + '</aside>')
    return '\n'.join(out)

def tabs_html(label, page):
    groups = SECTIONS[label]; page = ALIAS.get(page, page)
    act = next((g for g in groups if any(p == page for _, p in g[1])), None)
    top = ''.join('<a class="tab%s" href="%s.dc.html"%s>%s</a>' % (' on' if g is act else '', g[1][0][1], ' aria-current="page"' if g is act and len(g[1]) == 1 else '', g[0]) for g in groups)
    out = '<nav class="tabs" aria-label="%s">%s</nav>' % (label, top)
    if act and len(act[1]) > 1:
        subs = ''.join('<a href="%s.dc.html"%s>%s</a>' % (p, ' aria-current="page"' if p == page else '', l) for l, p in act[1])
        out += '<nav class="subtabs" aria-label="%s pages">%s</nav>' % (act[0], subs)
    return out

TABS_RE = re.compile(r'<nav class="tabs" aria-label="([^"]+)">.*?</nav>(?:<nav class="subtabs"[^>]*>.*?</nav>)?', re.S)
ASIDE_RE = re.compile(r'<aside class="side"[^>]*>.*?</aside>', re.S)

LIST_MAIN = r'''<main class="pg" id="main">
<div class="hd">
<div class="hdt"><h1>{{ title }}</h1><span class="sub">{{ sub }}</span></div>
<div class="hda">
<sc-for list="{{ links }}" as="l" hint-placeholder-count="1"><a class="lnkb" href="{{ l.href }}">{{ l.label }}</a></sc-for>
<sc-if value="{{ hasExp }}" hint-placeholder-val="{{ false }}"><details class="xm"><summary class="btn" role="button" aria-label="Export this report">Export</summary><div class="xmenu" role="menu"><sc-for list="{{ xopts }}" as="o" hint-placeholder-count="3"><button class="xi" role="menuitem" onClick="{{ o.pick }}">{{ o.label }}</button></sc-for></div></details></sc-if>
<sc-if value="{{ hasAdd }}" hint-placeholder-val="{{ true }}"><button class="btnp" onClick="{{ openAdd }}">{{ addLabel }}</button></sc-if>
</div>
</div>
@@TABS@@
<sc-if value="{{ xHas }}" hint-placeholder-val="{{ false }}"><div role="status" class="ok"><strong>{{ xText }}</strong><span>Sample only. Nothing is downloaded in this design. The file would carry the filters and period you have set.</span></div></sc-if>
<sc-if value="{{ hasDone }}" hint-placeholder-val="{{ false }}"><div role="status" class="ok toast"><span><strong>Done.</strong> {{ doneText }}</span><button class="lnkb" onClick="{{ dismissDone }}">Dismiss</button></div></sc-if>
<sc-if value="{{ hasStats }}" hint-placeholder-val="{{ true }}">
<div class="statrow">
<sc-for list="{{ stats }}" as="s" hint-placeholder-count="3">
<div class="stat"><span style="font-size: 12px; font-weight: 600; color: var(--text-muted)">{{ s.l }}</span><span style="font-size: 22px; font-weight: 700; color: {{ s.c }}">{{ s.v }}</span><sc-if value="{{ s.hasSub }}" hint-placeholder-val="{{ false }}"><span class="note">{{ s.sub }}</span></sc-if><sc-if value="{{ s.hasHref }}" hint-placeholder-val="{{ false }}"><a href="{{ s.href }}" style="font-size: 13px; font-weight: 600; color: var(--brand-strong)">{{ s.hrefLabel }}</a></sc-if></div>
</sc-for>
</div>
</sc-if>
<div class="band"><sc-if value="{{ hasChips }}" hint-placeholder-val="{{ true }}"><sc-if value="{{ labelChips }}" hint-placeholder-val="{{ false }}"><span class="gl">{{ chipLabel }}</span></sc-if><sc-for list="{{ chips }}" as="f" hint-placeholder-count="4"><button class="fc" onClick="{{ f.pick }}" aria-pressed="{{ f.on }}" style="border-color: {{f.border}}; background: {{f.bg}}; color: {{f.color}}">{{ f.label }}</button></sc-for></sc-if><sc-if value="{{ hasChips2 }}" hint-placeholder-val="{{ false }}"><span class="vsep" aria-hidden="true"></span><span class="gl">{{ chip2Label }}</span><sc-for list="{{ chips2 }}" as="f" hint-placeholder-count="4"><button class="fc" onClick="{{ f.pick }}" aria-pressed="{{ f.on }}" style="border-color: {{f.border}}; background: {{f.bg}}; color: {{f.color}}">{{ f.label }}</button></sc-for></sc-if></div>
<div class="card tbl cards">
<div style="min-width: {{ minW }}; display: flex; flex-direction: column">
<div class="th" style="grid-template-columns: {{ gridCols }}"><sc-for list="{{ heads }}" as="h" hint-placeholder-count="5"><span class="{{ h.cls }}">{{ h.l }}</span></sc-for></div>
<sc-if value="{{ noRows }}" hint-placeholder-val="{{ false }}"><div class="empty" role="status"><strong>{{ emptyTitle }}</strong><sc-if value="{{ hasEmptyText }}" hint-placeholder-val="{{ false }}"><span>{{ emptyText }}</span></sc-if><sc-if value="{{ canClear }}" hint-placeholder-val="{{ false }}"><button class="btn sm" onClick="{{ clearFilters }}">Show everything</button></sc-if></div></sc-if>
<sc-for list="{{ rows }}" as="r" hint-placeholder-count="5">
<div class="tr" style="grid-template-columns: {{ gridCols }}; padding-top: 10px; padding-bottom: 10px">
<sc-for list="{{ r.cells }}" as="c" hint-placeholder-count="5">
<span class="{{ c.cls }}" data-l="{{ c.l }}" style="display: flex; flex-direction: column; gap: 2px; min-width: 0; align-items: {{ c.align }}">
<sc-if value="{{ c.isPill }}" hint-placeholder-val="{{ false }}"><span class="pill" style="background: {{c.bg}}; color: {{c.color}}">{{ c.main }}</span></sc-if>
<sc-if value="{{ c.isText }}" hint-placeholder-val="{{ true }}"><span style="font-weight: {{ c.w }}">{{ c.main }}</span></sc-if>
<sc-if value="{{ c.hasSub }}" hint-placeholder-val="{{ false }}"><span style="font-size: 12px; line-height: 1.4; color: var(--text-muted)">{{ c.sub }}</span></sc-if>
</span>
</sc-for>
<sc-if value="{{ hasActs }}" hint-placeholder-val="{{ true }}"><span class="acts">
<sc-for list="{{ r.acts }}" as="a" hint-placeholder-count="2">
<sc-if value="{{ a.isLink }}" hint-placeholder-val="{{ false }}"><a class="lnkb" href="{{ a.href }}" aria-label="{{ a.aria }}">{{ a.label }} ›</a></sc-if>
<sc-if value="{{ a.isBtn }}" hint-placeholder-val="{{ true }}"><button class="{{ a.cls }}" onClick="{{ a.run }}" aria-label="{{ a.aria }}">{{ a.label }}</button></sc-if>
</sc-for>
</span></sc-if>
</div>
</sc-for>
</div>
</div>
<p class="note">{{ note }}</p>
</main>'''

LIST_DRAWER = r'''<sc-if value="{{ drawerOpen }}" hint-placeholder-val="{{ false }}">
<div class="scrim" onClick="{{ closeDrawer }}"></div>
<aside class="drawer {{ dClass }}" role="dialog" aria-label="{{ dTitle }}">
<div class="dh"><h2>{{ dTitle }}</h2><button class="btn" onClick="{{ closeDrawer }}">Close</button></div>
<div class="db">
<sc-if value="{{ hasDSub }}" hint-placeholder-val="{{ false }}"><div class="ctx"><strong>{{ dSub }}</strong><span class="note">{{ dSub2 }}</span></div></sc-if>
<sc-if value="{{ hasErrs }}" hint-placeholder-val="{{ false }}"><p role="alert" class="alert">{{ errSummary }}</p></sc-if>
<sc-for list="{{ dFields }}" as="f" hint-placeholder-count="3">
<div class="fld">
<sc-if value="{{ f.isText }}" hint-placeholder-val="{{ true }}"><label class="lbl">{{ f.l }}{{ f.opt }}<input class="field" id="{{ f.id }}" type="{{ f.type }}" inputmode="{{ f.inputmode }}" list="{{ f.listId }}" value="{{ f.val }}" onInput="{{ f.on }}" placeholder="{{ f.ph }}" aria-invalid="{{ f.invalid }}" aria-describedby="{{ f.errId }}" autocomplete="off"></label></sc-if>
<sc-if value="{{ f.isArea }}" hint-placeholder-val="{{ false }}"><label class="lbl">{{ f.l }}{{ f.opt }}<textarea class="field" id="{{ f.id }}" rows="3" value="{{ f.val }}" onInput="{{ f.on }}" placeholder="{{ f.ph }}" aria-invalid="{{ f.invalid }}" aria-describedby="{{ f.errId }}"></textarea></label></sc-if>
<sc-if value="{{ f.isChoice }}" hint-placeholder-val="{{ false }}"><div class="lbl" role="group" aria-label="{{ f.l }}">{{ f.l }}{{ f.opt }}<div class="seg"><sc-for list="{{ f.opts }}" as="o" hint-placeholder-count="3"><button type="button" class="{{ o.cls }}" aria-pressed="{{ o.on }}" onClick="{{ o.pick }}">{{ o.t }}</button></sc-for></div></div></sc-if>
<sc-if value="{{ f.isMulti }}" hint-placeholder-val="{{ false }}"><div class="lbl" role="group" aria-label="{{ f.l }}">{{ f.l }}{{ f.opt }}<div class="seg"><sc-for list="{{ f.opts }}" as="o" hint-placeholder-count="3"><button type="button" class="{{ o.cls }}" aria-pressed="{{ o.on }}" onClick="{{ o.pick }}">{{ o.t }}</button></sc-for></div></div></sc-if>
<sc-if value="{{ f.hasList }}" hint-placeholder-val="{{ false }}"><datalist id="{{ f.listId }}"><sc-for list="{{ f.list }}" as="o" hint-placeholder-count="3"><option value="{{ o.v }}"></option></sc-for></datalist></sc-if>
<sc-if value="{{ f.hasHint }}" hint-placeholder-val="{{ false }}"><p class="note">{{ f.hint }}</p></sc-if>
<sc-if value="{{ f.hasErr }}" hint-placeholder-val="{{ false }}"><p class="ferr" id="{{ f.errId }}">{{ f.err }}</p></sc-if>
</div>
</sc-for>
<sc-for list="{{ dLines }}" as="x" hint-placeholder-count="3">
<div class="kv"><span>{{ x.s }}</span><span>{{ x.t }}</span></div>
</sc-for>
<sc-if value="{{ hasDNote }}" hint-placeholder-val="{{ false }}"><p class="note">{{ dNote }}</p></sc-if>
<sc-if value="{{ hasMsg }}" hint-placeholder-val="{{ false }}"><p role="alert" class="alert">{{ msg }}</p></sc-if>
</div>
<div class="df"><sc-if value="{{ hasSave }}" hint-placeholder-val="{{ true }}"><button class="btnp" onClick="{{ save }}">{{ saveLabel }}</button></sc-if><button class="btn" onClick="{{ closeDrawer }}">{{ closeLabel }}</button></div>
</aside>
</sc-if>'''

def list_page(name, title_tag, cfg_js, hook_js, preview):
    page = name
    sec = section_of(page)
    tabs = tabs_html(sec, page) if sec else ''
    main = LIST_MAIN.replace('@@TABS@@', tabs)
    hook = (hook_js.strip() + '\n') if hook_js else ''
    return '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%s</title>
<script src="./support.js"></script>
<script src="./shell.js"></script>
<script src="./list-engine.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="./fonts/fonts.css">
<link rel="stylesheet" href="./app.css">
</helmet>
<div class="shell">
%s

%s
</div>
%s
</x-dc>
<script type="text/x-dc" data-dc-script data-props='%s'>
/* This screen is a list screen: its content is the CFG below. The behaviour is in list-engine.js, the layout in sync.py. */
const CFG = %s;
%sclass Component extends ListPage { constructor() { super(CFG, typeof HOOK === 'function' ? HOOK : null); } }
</script>
</body>
</html>
''' % (title_tag, sidebar_html(page), main, LIST_DRAWER, preview, cfg_js, ('\n' + hook + '\n') if hook else '\n')

# ---------------------------------------------------------------- reading existing pages
def read(f): return open(f, encoding='utf-8').read()
def write(f, s): open(f, 'w', encoding='utf-8').write(s)
def script_of(s):
    m = re.search(r'<script type="text/x-dc"[^>]*>(.*?)</script>', s, re.S); return m.group(1) if m else ''

def parse_list_page(s):
    """Returns (title_tag, cfg dict, hook_js or '', preview props) from a list screen, old or new format."""
    title = re.search(r'<title>([^<]*)', s).group(1)
    prev = re.search(r"data-props='([^']*)'", s).group(1)
    scr = script_of(s)
    m = re.search(r'const CFG = (\{.*?\});\n', scr, re.S)
    cfg = json.loads(m.group(1))
    hook = ''
    i = scr.find('const HOOK')
    if i >= 0:
        j = scr.find('\n\nconst baseRows', i)
        if j < 0: j = scr.find('\nclass Component', i)
        if j < 0: j = scr.find('const baseRows', i)
        hook = scr[i:j].strip()
    return title, cfg, hook, prev, scr

def is_list_page(s): return 'list-engine.js' in s or 'sc-for list="{{ r.cells }}"' in s

def cfg_js(cfg):
    return json.dumps(cfg, indent=2, ensure_ascii=False)

def convert():
    for f in sorted(glob.glob('*.dc.html')):
        s = read(f)
        if 'list-engine.js' in s or 'sc-for list="{{ r.cells }}"' not in s: continue
        name = f[:-8]
        title, cfg, hook, prev, _ = parse_list_page(s)
        mw = re.search(r'<div style="min-width: (\d+)px; display: flex; flex-direction: column">', s)
        if mw: cfg['minW'] = int(mw.group(1))
        pl = page_label(name)
        if pl and cfg.get('title') in ('Settings', 'Reports'): cfg['title'] = pl
        # the section navigation now carries these links
        cfg['links'] = [l for l in cfg.get('links', []) if not l['label'].startswith('Back to ') or name == 'VatRates']
        if name in ('ItemMovements', 'StockAlerts'): cfg['links'] = []
        write(f, list_page(name, title, cfg_js(cfg), hook, prev))
        print('converted', name)

def insert_after_header(s, html):
    """Put html right after the page header (<div class="hd">...</div>) when the page has no section navigation yet."""
    i = s.find('<div class="hd">')
    if i < 0: return None
    depth = 0
    for m in re.finditer(r'<div\b|</div>', s[i:]):
        depth += 1 if m.group(0) == '<div' else -1
        if depth == 0:
            j = i + m.end()
            return s[:j] + '\n' + html + s[j:]
    return None

def sync(only=None):
    n = 0
    for f in sorted(glob.glob('*.dc.html')):
        s = read(f); name = f[:-8]
        if only and name not in only: continue
        if 'class="side"' not in s: continue
        if 'list-engine.js' in s:
            title, cfg, hook, prev, _ = parse_list_page_new(s)
            write(f, list_page(name, title, cfg_js(cfg), hook, prev)); n += 1; continue
        s2 = ASIDE_RE.sub(lambda m: sidebar_html(name), s, count=1)
        sec = section_of(name)
        if sec:
            if TABS_RE.search(s2): s2 = TABS_RE.sub(lambda m: tabs_html(sec, name), s2, count=1)
            else:
                ins = insert_after_header(s2, tabs_html(sec, name))
                if ins: s2 = ins
        if s2 != s: write(f, s2)
        n += 1
    print('synced', n, 'pages')

def parse_list_page_new(s):
    title = re.search(r'<title>([^<]*)', s).group(1)
    prev = re.search(r"data-props='([^']*)'", s).group(1)
    scr = script_of(s)
    a = scr.index('const CFG = ') + len('const CFG = ')
    b = scr.index('\nclass Component extends ListPage')
    body = scr[a:b]
    # CFG ends at the first top-level ';' followed by newline
    depth = 0; i = 0; instr = False; esc = False
    for i, ch in enumerate(body):
        if instr:
            if esc: esc = False
            elif ch == '\\': esc = True
            elif ch == '"': instr = False
            continue
        if ch == '"': instr = True
        elif ch in '{[': depth += 1
        elif ch in '}]':
            depth -= 1
            if depth == 0: break
    cfg = json.loads(body[:i + 1]); rest = body[i + 1:].lstrip(';').strip()
    return title, cfg, rest, prev, scr

if __name__ == '__main__':
    args = sys.argv[1:]
    if args and args[0] == 'convert': convert(); sync()
    else: sync(set(args) or None)
