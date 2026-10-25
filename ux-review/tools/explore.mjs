// Interaction-state explorer. Usage: node explore.mjs <baseDir> <outDir> <pageNamesCsv> [width] [height]
// For each page: full-page baseline, then click every distinct control on a fresh load and capture what happens.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const [baseDir, outDir, namesCsv, W, H] = process.argv.slice(2);
const names = namesCsv.split(',').filter(Boolean);
const port = 9100 + Math.floor(Math.random() * 800);
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${port}`, '--no-first-run', '--disable-gpu', '--hide-scrollbars', `--user-data-dir=/tmp/ex-${port}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets; for (let i = 0; i < 60; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets.length) break; } catch (e) {} await sleep(200); }
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result && r.result.result ? r.result.result.value : undefined; };
await send('Page.enable');
const width = Number(W || 1440), height = Number(H || 900);
await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 });
const mouse = async (x, y) => { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }); };
const shot = async (file, full) => { let clip; if (full) { const d = JSON.parse(await ev('JSON.stringify({w:Math.max(document.documentElement.scrollWidth,innerWidth),h:Math.max(document.documentElement.scrollHeight,innerHeight)})')); clip = { x: 0, y: 0, width: d.w, height: Math.min(d.h, 3500), scale: 1 }; } const s = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: !!full, ...(clip ? { clip } : {}) }); fs.writeFileSync(file, Buffer.from(s.result.data, 'base64')); };
const load = async (page) => { await send('Page.navigate', { url: 'file://' + baseDir + page + '.dc.html' }); await sleep(700); await ev('try{localStorage.clear();sessionStorage.clear()}catch(e){}'); await send('Page.navigate', { url: 'file://' + baseDir + page + '.dc.html' }); await sleep(800); };
const LIST = `(()=>{const vis=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'};
const all=[...document.querySelectorAll('button,summary,a[href]')].filter(e=>vis(e)&&!e.closest('.side')&&!e.closest('nav.tabs')&&!e.closest('nav.subtabs')&&!e.disabled&&!e.closest('.xmenu'));
return all.map((e,i)=>({i,tag:e.tagName,label:(e.getAttribute('aria-label')||e.textContent||'').trim().replace(/\\s+/g,' ').slice(0,48),href:e.getAttribute('href')||''}))})()`;
const FACTS = `(()=>{const d=document.querySelector('.drawer');const m=document.querySelector('[role=dialog]:not(.drawer),.modal');const r=d?d.getBoundingClientRect():null;const sc=document.querySelector('.scrim');
const al=[...document.querySelectorAll('[role=alert],.alert')].map(e=>e.innerText.trim()).filter(Boolean).slice(0,2);
const st=[...document.querySelectorAll('[role=status],.ok')].map(e=>e.innerText.trim().replace(/\\s+/g,' ').slice(0,120)).filter(Boolean).slice(0,2);
return JSON.stringify({drawer:!!d,drawerW:r?Math.round(r.width):0,drawerH:r?Math.round(r.height):0,modal:!!m,scrim:!!sc,alerts:al,status:st,hscroll:document.documentElement.scrollWidth>innerWidth+1,url:location.pathname.split('/').pop()+location.search})})()`;
const out = {};
for (const page of names) {
  const dir = `${outDir}/${page}`; fs.mkdirSync(dir, { recursive: true });
  const rec = { states: [] };
  try {
    await load(page);
    await shot(`${dir}/00-base.png`, true);
    rec.base = JSON.parse(await ev(FACTS));
    const list = await ev(LIST);
    const seen = {}; const pick = [];
    for (const c of list) { seen[c.label] = (seen[c.label] || 0) + 1; if (seen[c.label] <= 2 && c.label) pick.push(c); }
    rec.controls = list.length; rec.distinct = pick.length;
    let n = 0;
    for (const c of pick.slice(0, 40)) {
      n++; const slug = c.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 28);
      await load(page);
      const pos = JSON.parse(await ev(`(()=>{const vis=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'};const all=[...document.querySelectorAll('button,summary,a[href]')].filter(e=>vis(e)&&!e.closest('.side')&&!e.closest('nav.tabs')&&!e.closest('nav.subtabs')&&!e.disabled&&!e.closest('.xmenu'));const e=all[${c.i}];if(!e)return 'null';e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return JSON.stringify({x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height})})()`));
      if (!pos) { rec.states.push({ n, label: c.label, error: 'not found' }); continue; }
      await mouse(pos.x, pos.y); await sleep(550);
      const f = JSON.parse(await ev(FACTS));
      const st = { n, label: c.label, tag: c.tag, href: c.href, size: [Math.round(pos.w), Math.round(pos.h)], ...f };
      if (f.url.split('?')[0] !== page + '.dc.html') { st.navigated = f.url; }
      else { const file = `${String(n).padStart(2, '0')}-${slug}.png`; await shot(`${dir}/${file}`, false); st.file = file;
        if (f.drawer) { // try the primary action with nothing filled in: shows validation
          const ok = await ev(`(()=>{const b=document.querySelector('.drawer .btnp, .drawer .btnd');if(!b)return false;b.click();return true})()`);
          if (ok) { await sleep(450); const f2 = JSON.parse(await ev(FACTS)); const file2 = `${String(n).padStart(2, '0')}-${slug}-submit.png`; await shot(`${dir}/${file2}`, false); st.submit = { file: file2, alerts: f2.alerts, status: f2.status, drawerStill: f2.drawer }; }
        } }
      rec.states.push(st);
    }
  } catch (e) { rec.error = String(e.message || e); }
  out[page] = rec; console.log(page, 'controls', rec.controls, 'states', rec.states.length, rec.error || '');
  fs.writeFileSync(`${outDir}/_${names[0]}-states.json`, JSON.stringify(out, null, 1));
}
ws.close(); chrome.kill();
