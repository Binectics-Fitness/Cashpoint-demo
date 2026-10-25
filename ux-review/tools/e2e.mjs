// E2E harness: real mouse + keyboard through the DevTools protocol.
// Usage: node e2e.mjs [flowName ...]   (FLOWS=./flows-pos.mjs node e2e.mjs  to run another flow file)
// Flow files export default { 'flow name': async (c) => {...} } and use the helpers on c (go, click, type, has, check ...).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const BASE = process.env.BASE || 'file:///Users/daniel/Documents/Personal/ThingsRemembered-demo/';
const OUT = process.env.SHOTS || '';
const port = 9400 + Math.floor(Math.random() * 400);
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${port}`, '--no-first-run', '--disable-gpu', `--user-data-dir=/tmp/e2e-${port}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets; for (let i = 0; i < 60; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets.length) break; } catch (e) {} await sleep(200); }
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map();
const exc = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } else if (d.method === 'Runtime.exceptionThrown') exc.push((d.params.exceptionDetails.exception && d.params.exceptionDetails.exception.description || d.params.exceptionDetails.text || '').slice(0, 200)); };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.result.exceptionDetails.exception && r.result.exceptionDetails.exception.description)); return r.result.result.value; };
await send('Page.enable'); await send('Runtime.enable'); const VW = Number(process.env.VW || 1440), VH = Number(process.env.VH || 900);
await send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 1, mobile: VW < 700 });
const results = []; let current = '';
const check = (name, ok, extra) => { results.push({ flow: current, name, ok: !!ok, extra }); console.log((ok ? '  PASS ' : '  FAIL ') + name + (ok ? '' : '  -> ' + JSON.stringify(extra))); };
const go = async (page) => { await send('Page.navigate', { url: BASE + page }); await sleep(700); for (let i = 0; i < 40; i++) { try { if (await ev("!!document.getElementById('dc-mount')")) break; } catch (x) {} await sleep(150); } await sleep(200); };
const text = () => ev("(document.getElementById('dc-mount')||document.body).innerText");
const url = () => ev('location.pathname.split("/").pop()+location.search');
// element helpers: find visible element by text (exact trimmed) or aria-label
const FIND = `const vis=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'};
const find=(q,i)=>{const els=[...document.querySelectorAll('button,a,summary,[role=button],input,label')].filter(vis).filter(e=>(e.getAttribute('aria-label')||'')===q||(e.textContent||'').trim()===q||(e.getAttribute('aria-label')||'').startsWith(q));return els[i||0]};`;
const rect = (q, i = 0) => ev(`(()=>{${FIND}const e=find(${JSON.stringify(q)},${i});if(!e)return null;e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})()`);
const mouse = async (x, y) => { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }); await sleep(350); };
const click = async (q, i = 0) => { const r = await rect(q, i); if (!r) throw new Error('not found: ' + q); await mouse(r.x + r.w / 2, r.y + r.h / 2); };
// click the far-right area of the row that contains the element (not on the link itself) to prove the whole row works
const clickRowOf = async (q, i = 0, fx = 0.62) => { const r = await ev(`(()=>{${FIND}const e=find(${JSON.stringify(q)},${i});if(!e)return null;const row=e.closest('.tr,.ti,.fg');row.scrollIntoView({block:'center'});const b=row.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height}})()`); if (!r) throw new Error('row not found: ' + q); await mouse(r.x + r.w * fx, r.y + r.h / 2); };
const focusField = (sel, i = 0) => ev(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(sel)})][${i}];e.scrollIntoView({block:'center'});e.focus();return !!e})()`);
const type = async (s) => { for (const ch of s) { await send('Input.dispatchKeyEvent', { type: 'keyDown', text: ch, key: ch }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch }); await sleep(15); } await sleep(120); };
const shot = async (name) => { if (!OUT) return; const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${OUT}/${name}.png`, Buffer.from(s.result.data, 'base64')); };
const has = async (s) => (await text()).includes(s);
const ctx = { exc, go, text, url, click, clickRowOf, rect, mouse, focusField, type, shot, has, check, sleep, ev, FIND };
const flows = (await import(process.env.FLOWS || './flows.mjs')).default;
const only = process.argv.slice(2);
for (const [name, fn] of Object.entries(flows)) {
  if (only.length && !only.includes(name)) continue;
  current = name; console.log('\n# ' + name);
  try { await ev('try{localStorage.clear();sessionStorage.clear()}catch(e){} window.name=""'); await fn(ctx); } catch (e) { check('flow threw', false, String(e.message || e)); }
}
const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length}/${results.length} checks passed`);
fs.writeFileSync('/tmp/e2e-results.json', JSON.stringify(results, null, 1));
ws.close(); chrome.kill(); process.exit(bad.length ? 1 : 0);
