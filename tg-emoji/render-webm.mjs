#!/usr/bin/env node
/**
 * TTS — рендер лент из tts-tg-emoji-sandbox.html в Telegram custom emoji (.webm)
 *
 *   node render-webm.mjs                          все ленты, тёмная тема → ./packs/plate-dark
 *   node render-webm.mjs --plates off             без подложек, с альфой → ./packs/alpha-dark
 *   node render-webm.mjs --plates off --theme light          → ./packs/alpha-light
 *   node render-webm.mjs --out my-dir             своя папка вместо packs/<вариант>
 *
 * Раскладка: packs/<вариант>/<NN-лента>/<файлы + manifest.txt> — папку строки
 * целиком перетаскиваешь в @Stickers, ничего выбирать руками не надо.
 * Реакции (15–21, kind:'react') — одиночные эмодзи, им папка на штуку не нужна:
 * они складываются плоско в packs/reactions/<вариант>/ и грузятся одной пачкой.
 *   node render-webm.mjs premiere like            только эти ленты
 *   node render-webm.mjs --accent "#0047FF"       принудительный акцент
 *
 * Скрипт открывает сам сэндбокс в режиме ?stage=<ключ>, снимает 89 кадров через
 * headless-Chrome (CDP), режет их на квадраты 100×100 и кодирует в VP9.
 * Кодируется ровно то, что видно в сэндбоксе — включая твой текст и цвета.
 *
 * Нужны: Node 18+, Google Chrome, ffmpeg.
 *   ffmpeg: в PATH, либо `npm i ffmpeg-static` в этой папке, либо FFMPEG=/путь/к/ffmpeg
 *   Chrome: стандартный путь macOS/Windows/Linux, либо CHROME_PATH=/путь
 */
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE = join(HERE, 'tts-tg-emoji-sandbox.html');
const FPS = 30, DUR = 3.0, SCALE = 2, LIMIT = 48000;   /* лимит Telegram 64 KB — держим запас, но не душим качество */
/* 89 кадров, а не FPS*DUR=90: при 90 длительность выходит ровно 3.000 с, и @Stickers
   отвечает «This video is too long». 89/30 = 2.967 с — запас 33 мс при тех же 30 fps. */
const FRAMES = 89;
const NOISE = new Set(['spot', 'premiere', 'neon', 'rspot', 'rspotl', 'rspotr', 'reye', 'rmask']);   // мягкие градиенты → дизеринг против бандинга

/* ── аргументы ── */
const argv = process.argv.slice(2);
const flag = (name, def) => { const i = argv.indexOf('--' + name); return i < 0 ? def : argv[i + 1]; };
const THEME = flag('theme', 'dark');
const PLATES = flag('plates', 'on') === 'off' ? '0' : '1';
/* вариант = имя папки набора: plate-dark | plate-light | alpha-dark | alpha-light */
const VARIANT = `${PLATES === '0' ? 'alpha' : 'plate'}-${THEME}`;
const VARIANT_RU = `${PLATES === '0' ? 'без фона (альфа)' : 'с фоном (подложки)'}, ${THEME === 'light' ? 'светлая' : 'тёмная'} тема`;
const OUT = resolve(HERE, flag('out', join('packs', VARIANT)));
const OUT_FORCED = argv.includes('--out');                 /* явный --out отменяет разводку по видам */
const REACT_OUT = resolve(HERE, 'packs', 'reactions', VARIANT);
const ACCENT = flag('accent', null);
const HEART = flag('heart', null);
const only = argv.filter(a => !a.startsWith('--') && !argv.includes('--' + a) &&
  !['dark', 'light', 'on', 'off'].includes(a) && !a.startsWith('#') && a !== flag('out', null));

/* ── бинарники ── */
function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const cands = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'
  ];
  const hit = cands.find(p => existsSync(p));
  if (!hit) throw new Error('Chrome не найден. Укажи CHROME_PATH=/путь/к/chrome');
  return hit;
}
function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  const which = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['ffmpeg'], { encoding: 'utf8' });
  if (which.status === 0 && which.stdout.trim()) return which.stdout.trim().split('\n')[0];
  const local = join(HERE, 'node_modules', 'ffmpeg-static', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
  if (existsSync(local)) return local;
  throw new Error('ffmpeg не найден. Поставь его в PATH, или `npm i ffmpeg-static` в этой папке, или FFMPEG=/путь');
}
const CHROME = findChrome(), FF = findFfmpeg();
const TMP = join(tmpdir(), 'tts-tg-emoji-render');
try { rmSync(TMP, { recursive: true, force: true, maxRetries: 6, retryDelay: 250 }); } catch {}
mkdirSync(TMP, { recursive: true });
mkdirSync(OUT, { recursive: true });

/* ── CDP поверх встроенного WebSocket ── */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PORT = 9411 + Math.floor(Math.random() * 120);
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(TMP, 'profile')}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars',
  '--force-color-profile=srgb', '--allow-file-access-from-files', 'about:blank'
], { stdio: 'ignore' });

let wsUrl = null;
for (let i = 0; i < 80 && !wsUrl; i++) {
  await sleep(250);
  try { wsUrl = (await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()).webSocketDebuggerUrl; } catch {}
}
if (!wsUrl) { chrome.kill(); throw new Error('Chrome не поднялся'); }

const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pending = new Map(); const waiters = [];
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id); pending.delete(m.id);
    m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
  } else if (m.method) {
    for (let i = waiters.length - 1; i >= 0; i--)
      if (waiters[i].method === m.method) { waiters[i].res(m.params); waiters.splice(i, 1); }
  }
};
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const msg = { id: ++id, method, params, ...(sessionId ? { sessionId } : {}) };
  pending.set(msg.id, { res, rej }); ws.send(JSON.stringify(msg));
});
const waitEvent = method => new Promise(res => waiters.push({ method, res }));

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);

const url = extra => pathToFileURL(PAGE).href + '?' + new URLSearchParams({
  theme: THEME, plates: PLATES, ...(ACCENT ? { accent: ACCENT } : {}), ...(HEART ? { heart: HEART } : {}), ...extra
}).toString();

async function open(u) {
  const loaded = waitEvent('Page.loadEventFired');
  await send('Page.navigate', { url: u }, sessionId);
  await loaded;
  /* прозрачный фон снимка: иначе Chrome подложит белый и альфа пропадёт */
  if (PLATES === '0') await send('Emulation.setDefaultBackgroundColorOverride',
    { color: { r: 0, g: 0, b: 0, a: 0 } }, sessionId);
  for (let i = 0; i < 60; i++) {
    const r = await send('Runtime.evaluate', { expression: 'window.__ready === true', returnByValue: true }, sessionId);
    if (r.result.value) return;
    await sleep(120);
  }
  throw new Error('страница не готова: ' + u);
}
const evalJS = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sessionId)).result.value;

/* ── список лент ── */
await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 400, deviceScaleFactor: 1, mobile: false }, sessionId);
const loaded = waitEvent('Page.loadEventFired');
await send('Page.navigate', { url: pathToFileURL(PAGE).href }, sessionId);
await loaded;
await sleep(800);
const list = await evalJS('JSON.stringify(window.FXLIST)').then(s => JSON.parse(s));
const targets = only.length ? list.filter(f => only.includes(f.key)) : list;
if (!targets.length) { chrome.kill(); throw new Error('нечего рендерить: ' + only.join(', ')); }

/* ── рендер ── */
const total = FRAMES;
const report = [];
const reacted = [];
for (const fx of targets) {
  await open(url({ stage: fx.key }));
  const st = await evalJS('JSON.stringify(window.__stage)').then(s => JSON.parse(s));
  await send('Emulation.setDeviceMetricsOverride', { width: st.w, height: 100, deviceScaleFactor: 1, mobile: false }, sessionId);
  /* метрики сбрасывают прозрачный фон — ставим его последним */
  if (PLATES === '0') await send('Emulation.setDefaultBackgroundColorOverride',
    { color: { r: 0, g: 0, b: 0, a: 0 } }, sessionId);
  await sleep(250);

  const dir = join(TMP, fx.key);
  mkdirSync(dir, { recursive: true });
  for (let f = 0; f < total; f++) {
    /* фаза = доля цикла: полный 3-секундный луп раскладывается на FRAMES кадров */
    await evalJS(`window.seek(${(f * DUR * 1000) / total})`);
    const shot = await send('Page.captureScreenshot', {
      format: 'png', captureBeyondViewport: true, fromSurface: true,
      clip: { x: 0, y: 0, width: st.w, height: 100, scale: SCALE }
    }, sessionId);
    writeFileSync(join(dir, `f${String(f).padStart(3, '0')}.png`), Buffer.from(shot.data, 'base64'));
  }

  const vfNoise = NOISE.has(fx.key) ? ',noise=alls=2:allf=t+u' : '';
  const crfs = NOISE.has(fx.key) ? [12, 16, 22, 30, 38] : [18, 24, 30, 38, 46];
  /* лента — своя папка внутри набора (packs/<вариант>/13-count/…),
     реакция — один файл в общей папке набора реакций */
  const react = fx.kind === 'react' && !OUT_FORCED;
  const stripDir = react ? REACT_OUT : join(OUT, `${fx.num}-${fx.key}`);
  mkdirSync(stripDir, { recursive: true });
  if (react) reacted.push(fx);
  for (let i = 0; i < st.n; i++) {
    const file = join(stripDir, react ? `${fx.num}-${fx.key}.webm`
                                      : `${fx.num}-${fx.key}-${i + 1}of${st.n}.webm`);
    let size = 0, used = 0;
    for (const crf of crfs) {
      const r = spawnSync(FF, [
        '-y', '-hide_banner', '-loglevel', 'error', '-framerate', String(FPS),
        '-i', join(dir, 'f%03d.png'),
        '-vf', `crop=200:200:${i * 200}:0,scale=100:100:flags=lanczos${vfNoise}`,
        '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-auto-alt-ref', '0', '-lag-in-frames', '0',
        '-b:v', '0', '-crf', String(crf), '-deadline', 'good', '-cpu-used', '0', '-row-mt', '1',
        '-g', String(total), '-an', '-f', 'webm', file
      ], { stdio: 'inherit' });
      if (r.status !== 0) throw new Error('ffmpeg упал на ' + file);
      size = statSync(file).size; used = crf;
      if (size <= LIMIT) break;
    }
    report.push(`${fx.num}-${fx.key}${react ? '' : `-${i + 1}of${st.n}`}.webm  crf=${used}  ${size} b`);
  }
  if (react) { console.log(`✓ ${fx.num} ${fx.title} — 100×100 → reactions/${VARIANT}`); continue; }
  writeFileSync(join(stripDir, 'manifest.txt'),
    ['TTS — Telegram custom emoji',
     `лента: ${fx.num} · ${fx.title}`,
     `вариант: ${VARIANT_RU}  (${VARIANT})`,
     `файлов: ${st.n} · VP9, 100×100, 30 fps, 2.967 s`,
     ACCENT ? `акцент: ${ACCENT}` : null,
     HEART ? `сердце: ${HEART}` : null,
     '',
     'Загрузка: @Stickers → /newemojipack → перетащить .webm по порядку имён.'
    ].filter(Boolean).join('\n') + '\n');
  console.log(`✓ ${fx.num} ${fx.title} — ${st.n}×100×100 → ${VARIANT}/${fx.num}-${fx.key}`);
}

/* общий манифест набора реакций — по файлу на реакцию, порядок = порядок загрузки */
if (reacted.length) {
  writeFileSync(join(REACT_OUT, 'manifest.txt'),
    ['TTS — Telegram custom emoji · реакции',
     `вариант: ${VARIANT_RU}  (${VARIANT})`,
     `файлов: ${reacted.length} · VP9, 100×100, 30 fps, 2.967 s, по одному слоту`,
     ACCENT ? `акцент: ${ACCENT}` : null,
     HEART ? `сердце: ${HEART}` : null,
     '',
     ...reacted.map(f => `${f.num}-${f.key}.webm — ${f.title}`),
     '',
     'Загрузка: @Stickers → /newemojipack → перетащить .webm по порядку имён.'
    ].filter(Boolean).join('\n') + '\n');
}

ws.close(); chrome.kill();
await new Promise(r => setTimeout(r, 400));
try { rmSync(TMP, { recursive: true, force: true, maxRetries: 6, retryDelay: 250 }); } catch {}
console.log('\n' + report.join('\n'));
const where = [reacted.length < report.length ? OUT : null, reacted.length ? REACT_OUT : null]
  .filter(Boolean).join('\n         ');
console.log(`\nГотово: ${report.length} файлов в ${where}\nвариант: ${VARIANT_RU}  (${VARIANT})`);
