// Usage: node sheet.mjs <out.png> <cols> <cellW> <cellMaxH> file1.png[:label] file2.png ...
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const [out, colsS, cwS, chS, ...items] = process.argv.slice(2);
const cols = Number(colsS), cw = Number(cwS), ch = Number(chS);
const cells = items.map((it) => { const [f, ...l] = it.split('::'); return { f, label: l.join('::') || f.split('/').slice(-2).join('/').replace('.png', '') }; });
const CROP = process.env.CROP ? process.env.CROP.split(':').map(Number) : null; // x:width of source to keep
const sc = CROP ? cw / CROP[1] : 0;
const imgCss = CROP ? `.c img{width:${Math.round(1440*sc)}px;max-width:none;max-height:none;margin-left:-${Math.round(CROP[0]*sc)}px;object-fit:unset}.c{height:${ch+18}px}` : '';
const html = `<!doctype html><meta charset=utf-8><style>body{margin:0;background:#888;font:12px/1.3 system-ui}.g{display:grid;grid-template-columns:repeat(${cols},${cw}px);gap:6px;padding:6px}.c{background:#fff;overflow:hidden;max-height:${ch + 18}px}.c b{display:block;padding:2px 6px;background:#222;color:#fff;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.c img{display:block;width:${cw}px;max-height:${ch}px;object-fit:cover;object-position:top}${imgCss}</style><div class=g>${cells.map((c) => `<div class=c><b>${c.label}</b><img src="file://${c.f}"></div>`).join('')}</div>`;
fs.writeFileSync('/tmp/sheet.html', html);
const port = 9000 + Math.floor(Math.random() * 90);
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${port}`, '--no-first-run', '--disable-gpu', '--allow-file-access-from-files', `--user-data-dir=/tmp/sh-${port}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let t; for (let i = 0; i < 50; i++) { try { t = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (t.length) break; } catch (e) {} await sleep(200); }
const ws = new WebSocket(t.find((x) => x.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.enable');
const W = cols * (cw + 6) + 6;
await send('Emulation.setDeviceMetricsOverride', { width: W, height: 800, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'file:///tmp/sheet.html' }); await sleep(1500);
const dim = (await send('Runtime.evaluate', { expression: 'document.documentElement.scrollHeight', returnByValue: true })).result.result.value;
const s = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: W, height: Math.min(dim, 6000), scale: 1 } });
fs.writeFileSync(out, Buffer.from(s.result.data, 'base64')); ws.close(); chrome.kill(); console.log('sheet', out, W, dim);
