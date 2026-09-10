/* Пересобирает preview.html по содержимому packs/. Запуск: node tools/build-preview.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'tts-tg-emoji-sandbox.html'), 'utf8');
const meta = {};
for (const m of html.matchAll(/\{ (?:kind:'[a-z]+', )?key:'([a-zA-Z0-9]+)', num:'(\d+)', title:'([^']+)', sub:'([^']+)'/g))
  meta[m[1]] = { num:m[2], title:m[3], sub:m[4] };

const SETS = [
  { dir:'packs/plate-dark',  label:'С фоном · тёмная',   note:'Подложка впечатана цветом тёмной темы — для тёмного чата.' },
  { dir:'packs/alpha-dark',  label:'Без фона · тёмная',  note:'Альфа-канал, светлая графика: тёмный чат.' },
  { dir:'packs/alpha-light', label:'Без фона · светлая', note:'Альфа-канал, чёрная графика: светлый чат.' }
];
const strips = {};
for (const s of SETS) {
  const p = path.join(ROOT, s.dir);
  if (!fs.existsSync(p)) { s.missing = true; continue; }
  /* packs/<вариант>/<NN-лента>/<файлы> — собираем пути относительно папки набора */
  const files = fs.readdirSync(p, { withFileTypes:true })
    .filter(d => d.isDirectory())
    .flatMap(d => fs.readdirSync(path.join(p, d.name))
      .filter(f => f.endsWith('.webm'))
      .map(f => d.name + '/' + f))
    .sort();
  s.files = files;
  for (const f of files) {
    const m = path.basename(f).match(/^(\d+)-([a-zA-Z0-9]+)-(\d+)of(\d+)\.webm$/);
    if (!m) continue;
    strips[m[2]] = { num:m[1], key:m[2], n:+m[4] };
  }
}
const order = Object.values(strips).sort((a, b) => a.num.localeCompare(b.num));

/* реакции лежат плоско в packs/reactions/<вариант>/ — набор берём из первого, что есть */
const reactDir = SETS.map(s => path.join(ROOT, 'packs', 'reactions', path.basename(s.dir)))
  .find(d => fs.existsSync(d));
const reacts = !reactDir ? [] : fs.readdirSync(reactDir)
  .filter(f => /^\d+-[a-zA-Z0-9]+\.webm$/.test(f)).sort()
  .map(f => { const m = f.match(/^(\d+)-([a-zA-Z0-9]+)\.webm$/); return { file:f, num:m[1], key:m[2] }; });
const rows = order.map(st => {
  const mt = meta[st.key] || { title:st.key, sub:'' };
  const vids = Array.from({ length:st.n }, (_, i) =>
    `<video data-src="${st.num}-${st.key}/${st.num}-${st.key}-${i + 1}of${st.n}.webm" autoplay loop muted playsinline></video>`).join('');
  return `<section>
  <h2>${st.num} · ${mt.title}</h2>
  <div class="meta">${mt.sub} · ${st.n} × 100×100</div>
  <div class="row">${vids}</div>
  <div class="chat"><div class="bub">Пример строки в канале<div class="row mini">${vids}</div>от 1 500 ₽</div></div>
  <div class="files">${st.num}-${st.key}/ — ${st.n} шт. + manifest.txt</div>
</section>`;
}).join('\n');

const reactRow = !reacts.length ? '' : `<section>
  <h2>15–${reacts[reacts.length - 1].num} · Реакции</h2>
  <div class="meta">по одному слоту, без склеек · ${reacts.length} × 100×100 · packs/reactions/&lt;вариант&gt;/</div>
  <div class="row">${reacts.map(r => `<video data-root="react" data-src="${r.file}" autoplay loop muted playsinline></video>`).join('')}</div>
  <div class="chat"><div class="bub">Пример поста в канале<div class="row mini">${reacts.map(r => `<video data-root="react" data-src="${r.file}" autoplay loop muted playsinline></video>`).join('')}</div>реакции под текстом</div></div>
  <div class="files">${reacts.map(r => r.file).join(' · ')}</div>
</section>`;

const out = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TTS — TG emoji · превью наборов</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=Forum&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--ink:#0D0D0D;--n950:#111318;--n900:#191C22;--n800:#262930;--n500:#7A7A78;--n300:#A6A6A2;--n100:#D6D6D2;--accent:#0047FF;--r-sm:2px;--r-lg:8px;
 --font:'Manrope',system-ui,sans-serif;--f-thin:'Cormorant Garamond',Georgia,serif;--gap:0px;--tile:100px;--pane:#0D0D0D;--fg:#D6D6D2;--tint:none}
*{box-sizing:border-box}
body{margin:0;background:var(--ink);color:var(--n100);font-family:var(--font);font-size:14px;padding:36px 32px 80px}
h1{font-family:var(--f-thin);font-weight:400;font-size:2.4rem;text-transform:uppercase;margin:0 0 8px}
.sub{color:var(--n300);max-width:74ch;margin:0 0 24px}
.ctl{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px}
.ctl.top{position:sticky;top:0;background:color-mix(in srgb,var(--ink) 94%,transparent);backdrop-filter:blur(8px);padding:12px 0 4px;z-index:5}
.bar{border-bottom:1px solid var(--n900);margin-bottom:32px;padding-bottom:12px}
.btn{font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:.1em;padding:9px 16px;min-height:36px;border-radius:var(--r-sm);border:1px solid var(--n800);background:transparent;color:var(--n300);cursor:pointer;font-family:var(--font)}
.btn.on{background:var(--n100);border-color:var(--n100);color:var(--ink)}
.lab{font-size:10px;text-transform:uppercase;letter-spacing:.14em;color:var(--n500);margin-right:4px}
.setnote{color:var(--n500);font-size:12px;margin:0 0 24px;max-width:74ch}
section{margin-bottom:48px;border-top:1px solid var(--n900);padding-top:22px}
h2{font-family:var(--f-thin);font-weight:500;font-size:1.4rem;margin:0 0 4px}
.meta{color:var(--n500);font-size:12px;margin-bottom:14px}
.pane{background:var(--pane);border-radius:var(--r-sm);padding:14px;display:inline-block;max-width:100%}
.row{display:flex;gap:var(--gap);flex-wrap:wrap;background:var(--pane);padding:12px;border-radius:var(--r-sm);width:max-content;max-width:100%}
video{width:var(--tile);height:var(--tile);display:block;background:transparent;filter:var(--tint)}
.chess .row,.chess .chat{background-color:#2A2A28;background-image:linear-gradient(45deg,#1B1B1A 25%,transparent 25%,transparent 75%,#1B1B1A 75%),linear-gradient(45deg,#1B1B1A 25%,transparent 25%,transparent 75%,#1B1B1A 75%);background-size:16px 16px;background-position:0 0,8px 8px}
.chat{background:var(--pane);border-radius:var(--r-lg);padding:14px;max-width:560px;margin-top:12px;color:var(--fg)}
.bub{max-width:520px}
.chat .row{margin:8px 0;padding:0;background:transparent}
.mini video{width:26px;height:26px}
.files{color:var(--n500);font-size:11px;font-family:ui-monospace,Menlo,monospace;margin-top:10px}
</style></head><body>
<h1>TG-эмодзи · превью</h1>
<p class="sub">Четыре набора одних и тех же лент плюс реакции — одиночные эмодзи на один слот. Переключи набор и фон: так видно, какой файл под какой чат. Файлы лежат рядом, в папках с теми же именами.</p>
<div class="ctl top">
  <span class="lab">Набор</span>
  ${SETS.map((s, i) => `<button class="btn setBtn${i === 1 ? ' on' : ''}" data-v="${s.dir}"${s.missing ? ' disabled' : ''}>${s.label}</button>`).join('\n  ')}
</div>
<div class="ctl bar">
  <span class="lab">Фон</span>
  <button class="btn bgBtn on" data-v="#17212B" data-fg="#E6EBF0">Чат тёмный</button>
  <button class="btn bgBtn" data-v="#EFEFEF" data-fg="#0D0D0D">Чат светлый</button>
  <button class="btn bgBtn" data-v="chess" data-fg="#D6D6D2">Шахматка</button>
  <span class="lab" style="margin-left:12px">Зазор</span>
  <button class="btn gapBtn on" data-v="0">0</button>
  <button class="btn gapBtn" data-v="2">2px</button>
  <button class="btn gapBtn" data-v="6">6px</button>
  <span class="lab" style="margin-left:12px">Размер</span>
  <button class="btn sizeBtn" data-v="34">34</button>
  <button class="btn sizeBtn on" data-v="100">100</button>
  <button class="btn sizeBtn" data-v="160">160</button>
</div>
<p class="setnote" id="setnote"></p>
${reactRow}
${rows}
<script>
const SETS = ${JSON.stringify(SETS.map(s => ({ dir:s.dir, note:s.note, missing:!!s.missing })))};
let set = 'packs/alpha-dark', bg = '#17212B', fg = '#E6EBF0';
function apply() {
  const s = SETS.find(x => x.dir === set) || SETS[0];
  document.getElementById('setnote').textContent = s.note;
  document.querySelectorAll('video').forEach(v => {
    /* реакции живут не внутри набора, а в packs/reactions/<вариант>/ */
    const base = v.dataset.root === 'react' ? 'packs/reactions/' + set.split('/')[1] : set;
    const want = base + '/' + v.dataset.src;
    if (v.getAttribute('src') !== want) { v.setAttribute('src', want); v.load(); v.play().catch(() => {}); }
  });
  const chess = bg === 'chess';
  document.body.classList.toggle('chess', chess);
  document.documentElement.style.setProperty('--pane', chess ? 'transparent' : bg);
  document.documentElement.style.setProperty('--fg', fg);
}
document.querySelectorAll('.setBtn').forEach(b => b.onclick = () => {
  document.querySelectorAll('.setBtn').forEach(x => x.classList.toggle('on', x === b)); set = b.dataset.v; apply();
});
document.querySelectorAll('.bgBtn').forEach(b => b.onclick = () => {
  document.querySelectorAll('.bgBtn').forEach(x => x.classList.toggle('on', x === b));
  bg = b.dataset.v; fg = b.dataset.fg; apply();
});
document.querySelectorAll('.gapBtn').forEach(b => b.onclick = () => {
  document.querySelectorAll('.gapBtn').forEach(x => x.classList.toggle('on', x === b));
  document.documentElement.style.setProperty('--gap', b.dataset.v + 'px');
});
document.querySelectorAll('.sizeBtn').forEach(b => b.onclick = () => {
  document.querySelectorAll('.sizeBtn').forEach(x => x.classList.toggle('on', x === b));
  document.documentElement.style.setProperty('--tile', b.dataset.v + 'px');
});
apply();
</script>
</body></html>`;
fs.writeFileSync(path.join(ROOT, 'preview.html'), out);
console.log('preview.html — лент: ' + order.length + ', реакций: ' + reacts.length +
            ', наборов: ' + SETS.filter(s => !s.missing).length);
