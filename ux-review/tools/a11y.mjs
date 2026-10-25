// Automated accessibility and layout checks over every screen.
// Usage: node a11y.mjs [width] [height] [Page1,Page2]   (default 1440x900, all pages)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const ROOT = '/Users/daniel/Documents/Personal/ThingsRemembered-demo/';
const width = Number(process.argv[2] || 1440), height = Number(process.argv[3] || 900);
const only = process.argv[4] ? process.argv[4].split(',') : null;
const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith('.dc.html')).map((f) => f.slice(0, -8)).sort().filter((p) => !only || only.includes(p));
const port = 9500 + Math.floor(Math.random() * 400);
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${port}`, '--no-first-run', '--disable-gpu', `--user-data-dir=/tmp/a1-${port}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let t; for (let i = 0; i < 60; i++) { try { t = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (t.length) break; } catch (e) {} await sleep(200); }
const ws = new WebSocket(t.find((x) => x.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result.result.value;
await send('Page.enable'); await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 });
const CHECK = `(()=>{
const out=[];const add=(t,el,d)=>out.push({t,e:(el&&(el.tagName.toLowerCase()+(el.className&&typeof el.className==='string'?'.'+el.className.trim().split(/\\s+/)[0]:'')))||'',d:(d||(el&&(el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,40)))||''});
const vis=e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&!e.closest('[hidden]')};
const name=e=>(e.getAttribute('aria-label')||e.getAttribute('aria-labelledby')&&document.getElementById(e.getAttribute('aria-labelledby'))?.textContent||e.textContent||e.getAttribute('title')||e.value||'').trim();
// 1. controls without a name
document.querySelectorAll('button,a[href],summary,[role=button]').forEach(e=>{if(vis(e)&&!name(e))add('control-no-name',e)});
// 2. inputs without a label
document.querySelectorAll('input:not([type=hidden]):not([type=checkbox].sbt),textarea,select').forEach(e=>{if(!vis(e)&&!e.classList.contains('sbt'))return;const lab=e.closest('label')||(e.id&&document.querySelector('label[for="'+e.id+'"]'));if(!lab&&!e.getAttribute('aria-label')&&!e.getAttribute('aria-labelledby'))add('input-no-label',e,e.placeholder||e.type)});
// 3. duplicate ids
const ids={};document.querySelectorAll('[id]').forEach(e=>{ids[e.id]=(ids[e.id]||0)+1});Object.keys(ids).forEach(k=>{if(ids[k]>1)add('duplicate-id',null,k+' x'+ids[k])});
// 4. headings
const hs=[...document.querySelectorAll('h1,h2,h3,h4')].filter(vis);const h1=hs.filter(h=>h.tagName==='H1').length;if(h1!==1)add('h1-count',null,String(h1));let prev=0;hs.forEach(h=>{const l=Number(h.tagName[1]);if(prev&&l>prev+1)add('heading-skip',h,'h'+prev+' -> h'+l);prev=l});
// 5. landmarks
if(!document.querySelector('main'))add('no-main',null,'');
// 6. small text and small targets
const tiny=new Set();
document.querySelectorAll('body *').forEach(e=>{if(!vis(e))return;const hasText=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());if(!hasText)return;const fs=parseFloat(getComputedStyle(e).fontSize);if(fs<12)tiny.add(fs+'px:'+e.tagName.toLowerCase()+'.'+(typeof e.className==='string'?e.className.split(' ')[0]:'')+':'+e.textContent.trim().slice(0,24))});
tiny.forEach(x=>add('text-under-12px',null,x));
document.querySelectorAll('button,a[href],summary,input:not([type=hidden]),select,[role=button]').forEach(e=>{if(!vis(e)||e.classList.contains('sbt')||e.classList.contains('rlb')||e.classList.contains('skip'))return;const r=e.getBoundingClientRect();if(r.height<24||r.width<24){if(e.matches('a')&&e.closest('p,span,li')&&r.height>=16)return;add('target-under-24px',e,Math.round(r.width)+'x'+Math.round(r.height)+' '+name(e).slice(0,24))}});
// 7. colour contrast
const parse=c=>{const m=c.match(/rgba?\\(([^)]+)\\)/);if(!m)return null;const p=m[1].split(',').map(Number);return{r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}};
const lum=c=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b)};
const bgOf=e=>{let n=e;const stack=[];while(n&&n.nodeType===1){const c=parse(getComputedStyle(n).backgroundColor);if(c&&c.a>0){stack.push(c);if(c.a>=1)break}n=n.parentElement}let base={r:255,g:255,b:255,a:1};if(stack.length&&stack[stack.length-1].a>=1)base=stack.pop();for(let i=stack.length-1;i>=0;i--){const c=stack[i];base={r:c.r*c.a+base.r*(1-c.a),g:c.g*c.a+base.g*(1-c.a),b:c.b*c.a+base.b*(1-c.a),a:1}}return base};
const seen=new Set();
document.querySelectorAll('body *').forEach(e=>{if(!vis(e))return;if(![...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))return;if(e.closest('.scrim')||e.disabled||e.closest('[disabled]'))return;const cs=getComputedStyle(e);const fg=parse(cs.color);if(!fg)return;const bg=bgOf(e);const f2={r:fg.r*fg.a+bg.r*(1-fg.a),g:fg.g*fg.a+bg.g*(1-fg.a),b:fg.b*fg.a+bg.b*(1-fg.a)};const L1=lum(f2),L2=lum(bg);const ratio=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);const size=parseFloat(cs.fontSize),bold=parseInt(cs.fontWeight)>=700;const large=size>=24||(size>=18.66&&bold);const need=large?3:4.5;if(ratio<need){const k=cs.color+'|'+cs.backgroundColor+'|'+e.className;if(seen.has(k))return;seen.add(k);add('contrast',e,ratio.toFixed(2)+' (need '+need+') '+cs.color+' on rgb('+Math.round(bg.r)+','+Math.round(bg.g)+','+Math.round(bg.b)+') "'+e.textContent.trim().slice(0,20)+'"')}});
// 8. layout: horizontal page scroll and clipped content
if(document.documentElement.scrollWidth>innerWidth+1)add('page-hscroll',null,document.documentElement.scrollWidth+' > '+innerWidth);
document.querySelectorAll('.pg *').forEach(e=>{if(!vis(e))return;const s=getComputedStyle(e);if(e.scrollWidth>e.clientWidth+2&&(s.overflowX==='hidden'||s.textOverflow==='ellipsis')&&!e.closest('.tbl')&&e.tagName!=='INPUT')add('content-clipped',e,e.textContent.trim().slice(0,30))});
return JSON.stringify(out)})()`;
const results = {};
for (const p of pages) {
  await send('Page.navigate', { url: 'file://' + ROOT + p + '.dc.html' }); await sleep(900);
  await ev('try{localStorage.clear()}catch(e){}');
  try { results[p] = JSON.parse(await ev(CHECK)); } catch (e) { results[p] = [{ t: 'script-error', e: String(e.message || e).slice(0, 80) }]; }
}
fs.writeFileSync(`/tmp/a11y-${width}.json`, JSON.stringify(results, null, 1));
const byType = {};
for (const [p, list] of Object.entries(results)) for (const it of list) { (byType[it.t] = byType[it.t] || []).push(p + ': ' + (it.e ? it.e + ' ' : '') + it.d); }
console.log(`${width}px: ${pages.length} pages`);
const tiny = {}; for (const list of Object.values(results)) for (const it of list) if (it.t === 'text-under-12px') { const k = it.d.split(':').slice(0, 2).join(':'); tiny[k] = (tiny[k] || 0) + 1; }
console.log('\ntext under 12px by selector:', JSON.stringify(Object.entries(tiny).sort((a, b) => b[1] - a[1]).slice(0, 14)));
for (const [k, v] of Object.entries(byType).sort((a, b) => b[1].length - a[1].length)) { const pagesWith = new Set(v.map((x) => x.split(':')[0])).size; console.log(`\n## ${k}: ${v.length} in ${pagesWith} pages`); v.slice(0, 5).forEach((x) => console.log('   ' + x.slice(0, 140))); }
ws.close(); chrome.kill();
