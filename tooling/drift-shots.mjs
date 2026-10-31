#!/usr/bin/env node
/**
 * TTS DS R14 — снимки находок сторожа: «Сейчас» и «Правка — макет» рядом
 * ──────────────────────────────────────────────────────────────────────
 * Открывает страницу в headless-Chrome, снимает проблемный блок, затем подмешивает правку
 * (CSS / JS только в память браузера — файлы не меняются) и снимает тот же блок ещё раз.
 * Обе картинки склеиваются в одну PNG с подписями. Для находок в тексте (CLAUDE.md и т. п.)
 * вид `code` рисует «было / стало» строками.
 *
 *   node tooling/drift-shots.mjs spec.json                 # PNG в $TMPDIR/drift-shots
 *   node tooling/drift-shots.mjs spec.json --out папка
 *
 * spec.json — массив находок:
 *   { "id": "partner-premium", "title": "…", "where": "файл:строка", "note": "…",
 *     "kind": "page", "file": "site/…html", "selector": "#f2 .case-panel",
 *     "width": 1440, "pad": 24, "labels": ["Было", "Стало"],   // подписи колонок, по умолчанию «Сейчас» / «Правка — макет»
 *     "before": { "css": "…", "js": "…" },     // необязательно: привести страницу в нужное состояние
 *     "after":  { "css": "…", "js": "…" } }     // правка-макет
 *   { "id": "claude-premium", "title": "…", "where": "CLAUDE.md:720", "kind": "code",
 *     "before": "строки как сейчас", "after": "строки после правки" }
 *
 * Нужны Node 18+ и Google Chrome (или CHROME_PATH). Исходники только читает; пишет только PNG в --out.
 */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname, resolve, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const specPath = argv.find((a) => !a.startsWith('--'));
const outIdx = argv.indexOf('--out');
const OUT = resolve(outIdx >= 0 ? argv[outIdx + 1] : join(tmpdir(), 'drift-shots'));
if (!specPath) { console.error('Нужен spec.json — см. описание в начале файла.'); process.exit(2); }
const SPEC = JSON.parse(readFileSync(specPath, 'utf8'));

function findChrome() {
  const list = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean);
  const hit = list.find((p) => existsSync(p));
  if (!hit) throw new Error('Chrome не найден. Укажи CHROME_PATH=/путь/к/chrome');
  return hit;
}

/* ── CDP поверх встроенного WebSocket (тот же приём, что в tg-emoji/render-webm.mjs) ── */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TMP = join(tmpdir(), 'tts-drift-shots-profile');
try { rmSync(TMP, { recursive: true, force: true }); } catch {}
mkdirSync(OUT, { recursive: true });
const PORT = 9531 + Math.floor(Math.random() * 120);
const chrome = spawn(findChrome(), ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${TMP}`,
  '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--force-color-profile=srgb',
  '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' });
let wsUrl = null;
for (let i = 0; i < 80 && !wsUrl; i++) {
  await sleep(250);
  try { wsUrl = (await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()).webSocketDebuggerUrl; } catch {}
}
if (!wsUrl) { chrome.kill(); throw new Error('Chrome не поднялся'); }
const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pending = new Map(); const waiters = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
  else if (m.method) for (let i = waiters.length - 1; i >= 0; i--) if (waiters[i].method === m.method) { waiters[i].res(m.params); waiters.splice(i, 1); }
};
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const msg = { id: ++id, method, params, ...(sessionId ? { sessionId } : {}) };
  pending.set(msg.id, { res, rej }); ws.send(JSON.stringify(msg));
});
const waitEvent = (method) => new Promise((res) => waiters.push({ method, res }));
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId: S } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, S);
await send('Runtime.enable', {}, S);
const evalJS = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, S);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
async function open(url, width, height = 900, scale = 1) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false }, S);
  const loaded = waitEvent('Page.loadEventFired');
  await send('Page.navigate', { url }, S);
  await loaded;
  await evalJS('document.fonts ? document.fonts.ready.then(() => true) : true');
  await sleep(700);
}
/* убрать анимации и «появление при прокрутке», чтобы блок снимался в покое */
const SETTLE = `*,*::before,*::after{transition:none!important;animation:none!important}
.reveal,[class*="reveal"]{opacity:1!important;transform:none!important}`;
const addCss = (css) => evalJS(`(()=>{const s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.append(s);return true})()`);
async function shoot(sel, pad) {
  const r = await evalJS(`(()=>{const el=document.querySelector(${JSON.stringify(sel)});if(!el)return null;
    el.scrollIntoView({block:'center'});const b=el.getBoundingClientRect();
    return {x:b.left+scrollX,y:b.top+scrollY,w:b.width,h:b.height}})()`);
  if (!r) throw new Error('не найден селектор ' + sel);
  await sleep(150);
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, fromSurface: true,
    clip: { x: Math.max(0, r.x - pad), y: Math.max(0, r.y - pad), width: r.w + pad * 2, height: r.h + pad * 2, scale: 1 } }, S);
  return shot.data;
}

/* ── склейка: «Сейчас» и «Правка — макет» ── */
const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const SHEET = `<style>
:root{--bg:#F2F1EB;--card:#FFFFFF;--ink:#0D0D0D;--mute:#6A6A68;--line:#E2E1DA;--bad:#DC2626;--good:#16A34A;--bad-bg:#FEF2F2;--good-bg:#F0FDF4}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 -apple-system,"Helvetica Neue",Arial,sans-serif}
.w{padding:28px;display:inline-block;min-width:100%}
.h{font-size:18px;font-weight:600;margin:0 0 4px}.where{font:12px/1.4 ui-monospace,Menlo,monospace;color:var(--mute)}
.note{font-size:13px;color:var(--mute);margin:8px 0 0;max-width:1100px}
.g{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px;align-items:start}
.c{background:var(--card);border:1px solid var(--line);border-radius:2px;padding:14px}
.l{font-size:10px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;margin-bottom:10px}
.bad .l{color:var(--bad)}.good .l{color:var(--good)}
img{display:block;max-width:100%;height:auto;border:1px solid var(--line)}
pre{margin:0;white-space:pre-wrap;word-break:break-word;font:12.5px/1.6 ui-monospace,Menlo,monospace;padding:10px;border-radius:2px}
.bad pre{background:var(--bad-bg)}.good pre{background:var(--good-bg)}
</style>`;
function sheet(f, left, right) {
  return `<!doctype html><meta charset="utf-8">${SHEET}<div class="w" id="w"><div class="h">${esc(f.title)}</div>
<div class="where">${esc(f.where || f.file || '')}</div>${f.note ? `<div class="note">${esc(f.note)}</div>` : ''}
<div class="g"><div class="c bad"><div class="l">${esc(f.labels?.[0] || 'Сейчас')}</div>${left}</div>
<div class="c good"><div class="l">${esc(f.labels?.[1] || 'Правка — макет')}</div>${right}</div></div></div>`;
}
async function renderSheet(html, name) {
  const p = join(OUT, `.${name}.html`);
  writeFileSync(p, html);
  await open(pathToFileURL(p).href, 1240, 600, 2);
  const r = await evalJS(`(()=>{const b=document.getElementById('w').getBoundingClientRect();return {w:Math.ceil(b.width),h:Math.ceil(b.height)}})()`);
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: r.w, height: r.h, scale: 1 } }, S);
  const out = join(OUT, `${name}.png`);
  writeFileSync(out, Buffer.from(shot.data, 'base64'));
  rmSync(p, { force: true });
  return out;
}

const made = [];
for (const f of SPEC) {
  try {
    let left, right;
    if (f.kind === 'code') {
      left = `<pre>${esc(f.before)}</pre>`; right = `<pre>${esc(f.after)}</pre>`;
    } else {
      const url = pathToFileURL(isAbsolute(f.file) ? f.file : join(ROOT, f.file)).href;
      const pad = f.pad ?? 24, width = f.width ?? 1440;
      await open(url, width, 900, 2);
      await addCss(SETTLE + (f.before?.css || ''));
      if (f.before?.js) await evalJS(f.before.js);
      const a = await shoot(f.selector, pad);
      await addCss(f.after?.css || '');
      if (f.after?.js) await evalJS(f.after.js);
      const b = await shoot(f.selector, pad);
      left = `<img src="data:image/png;base64,${a}">`; right = `<img src="data:image/png;base64,${b}">`;
    }
    made.push(await renderSheet(sheet(f, left, right), f.id));
    console.log(`✓ ${f.id}`);
  } catch (e) { console.log(`✗ ${f.id}: ${e.message}`); }
}
chrome.kill();
console.log(`\nСнимки: ${OUT}\n${made.map((m) => '  ' + m).join('\n')}`);
process.exit(0);
