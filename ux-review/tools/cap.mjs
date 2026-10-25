// Usage: node cap.mjs <outdir> <spec.json>
// spec: [{name, url, width, height, steps:[{js:"..."}|{wait:ms}], full:true|false, text:true}]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const [outDir, specPath] = process.argv.slice(2);
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${port}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', `--user-data-dir=/tmp/cap-profile-${port}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 50; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets.length) break; } catch (e) {} await sleep(200); }
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result && r.result.result ? r.result.result.value : undefined; };
await send('Page.enable');
const results = {};
for (const s of spec) {
  const w = s.width || 1440, h = s.height || 900;
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 700 });
  await send('Page.navigate', { url: s.url });
  await sleep(s.settle || 1200);
  if (s.clear) await ev('try{localStorage.clear();sessionStorage.clear()}catch(e){}');
  for (const st of s.steps || []) { if (st.js) results[s.name + ':js'] = await ev(st.js); if (st.wait) await sleep(st.wait); }
  let clip;
  if (s.full) { const dim = await ev('JSON.stringify({w:Math.max(document.documentElement.scrollWidth,innerWidth),h:Math.max(document.documentElement.scrollHeight,innerHeight)})'); const d = JSON.parse(dim); clip = { x: 0, y: 0, width: d.w, height: Math.min(d.h, 4000), scale: 1 }; }
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: !!s.full, ...(clip ? { clip } : {}) });
  fs.writeFileSync(`${outDir}/${s.name}.png`, Buffer.from(shot.result.data, 'base64'));
  if (s.text) results[s.name + ':text'] = await ev('document.body.innerText');
  console.log('saved', s.name);
}
fs.writeFileSync(`${outDir}/_results.json`, JSON.stringify(results, null, 1));
ws.close(); chrome.kill();
