#!/usr/bin/env node
/**
 * TTS DS R14 — спецификации handoff-пакетов
 * ─────────────────────────────────────────
 * README.md пакета — источник. Из него собирается spec.html: та же спецификация,
 * оформленная в стиле DS R14 (Pages отдаёт .md сырым текстом). Сам README остаётся
 * рядом и скачивается кнопкой «Скачать README.md».
 *
 *   node tooling/build-specs.mjs           # пересобрать spec.html
 *   node tooling/build-specs.mjs --check   # ничего не пишет; выход 1, если spec.html отстал от README
 *
 * spec.html руками не правится — правится README.md, затем npm run build.
 * Поддержано то, что встречается в README: # и ## заголовки, абзацы, списки «- »
 * (с продолжением строк отступом), таблицы (в том числе внутри пункта списка),
 * **жирный**, *курсив*, `код`, [ссылки](url). Зависимостей нет — только Node.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* readme — источник; css — путь к ядру из папки пакета; mockup — живой макет; back — витрина пакета */
export const SPECS = [
  { dir: 'site/handoff/account', css: '../../../ds-core-r14.css', mockup: '../../account.html', back: 'index.html', eyebrow: 'Handoff · спецификация' },
];

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(src) {
  const codes = [];
  let s = src.replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(esc(c)) - 1}\u0000`);
  s = esc(s)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `<a class="t-link" href="${u}"${/^https?:/.test(u) ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(«])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
}

const cells = line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
const isSep = line => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);

function table(rows) {
  const [head, ...body] = rows;
  return `<div class="sp-table"><table>
<thead><tr>${head.map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead>
<tbody>${body.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('\n')}</tbody>
</table></div>`;
}

/* README → { title, toc, html } */
export function render(md) {
  const lines = md.replace(/\r/g, '').split('\n');
  const out = [], toc = [];
  let title = '', para = [], items = null, n = 0;
  const flushPara = () => { if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`); para = []; };
  const flushList = () => { if (items) out.push(`<ul>\n${items.map(t => `<li>${inline(t)}</li>`).join('\n')}\n</ul>`); items = null; };
  const flush = () => { flushPara(); flushList(); };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) { flushPara(); if (items && !/^\s+\S/.test(lines[i + 1] || '') && !/^\s*- /.test(lines[i + 1] || '')) flushList(); continue; }
    let m;
    if ((m = line.match(/^# (.+)/))) { flush(); title = m[1].trim(); continue; }
    if ((m = line.match(/^##+ (.+)/))) {
      flush();
      const text = m[1].trim(), num = text.match(/^(\d+)\./);
      const id = 's-' + (num ? num[1] : ++n);
      toc.push([id, text]);
      out.push(`<h2 class="t-h2" id="${id}"><a class="sp-anchor" href="#${id}">${inline(text)}</a></h2>`);
      continue;
    }
    if (/^\s*\|/.test(line) && isSep(lines[i + 1] || '')) {
      flush();
      const rows = [cells(line)];
      i += 2;
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(cells(lines[i++]));
      i--;
      out.push(table(rows));
      continue;
    }
    if ((m = line.match(/^\s*- (.*)/))) { flushPara(); (items = items || []).push(m[1]); continue; }
    if (items && /^\s+\S/.test(line)) { items[items.length - 1] += ' ' + line.trim(); continue; }
    flushList();
    para.push(line.trim());
  }
  flush();
  return { title, toc, html: out.join('\n') };
}

function page(spec, md) {
  const { title, toc, html } = render(md);
  // «TTS — личный кабинет (профиль): пакет для …» → заголовок «Личный кабинет (профиль)» и подзаголовок «Пакет для …»
  const [h, ...rest] = title.replace(/^TTS\s*—\s*/, '').split(':');
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
  const name = cap(h.trim()), sub = rest.length ? cap(rest.join(':').trim()) : '';
  return `<!doctype html>
<!-- Собрано из README.md скриптом tooling/build-specs.mjs. Руками не править: правка README → npm run build. -->
<html lang="ru" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} — спецификация</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=Oranienbaum&family=Forum&family=Manrope:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${spec.css}">
<style>
*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
body { margin: 0; background: var(--ink); color: var(--n100); font-family: var(--font); -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
.wrap { max-width: var(--content-max); margin: 0 auto; padding: var(--sp-12) var(--page-pad) var(--sp-20); }
.sp-top h1 { margin: var(--sp-2) 0 var(--sp-4); }
.sp-sub { margin: 0; font-size: 15px; line-height: 1.6; color: var(--n300); }
.sp-links { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin: var(--sp-6) 0 0; }
.sp-dl { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; margin-left: 4px; }
.sp-dl svg { flex: none; }
.sp-grid { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: var(--sp-12); margin-top: var(--sp-12); align-items: start; }
.sp-toc { position: sticky; top: var(--sp-6); display: flex; flex-direction: column; gap: 2px; padding-left: 0; border-left: 1px solid var(--n850); }
.sp-toc .t-caption { padding: 0 0 var(--sp-3) var(--sp-4); }
.sp-toc a { display: block; padding: 6px var(--sp-4); margin-left: -1px; border-left: 1px solid transparent; font-size: 13px; line-height: 1.45; color: var(--n300); text-decoration: none; transition: color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out); }
.sp-toc a:hover { color: var(--n100); }
.sp-toc a.is-act { color: var(--n100); border-left-color: var(--accent); }
.sp-toc-m { display: none; }
.sp { max-width: 820px; min-width: 0; font-size: 15px; line-height: 1.75; color: var(--n200); }
.sp h2 { margin: var(--sp-16) 0 var(--sp-4); padding-bottom: var(--sp-3); border-bottom: 1px solid var(--n850); color: var(--n100); scroll-margin-top: var(--sp-6); }
.sp > :first-child { margin-top: 0; }
.sp-anchor { color: inherit; text-decoration: none; }
.sp p { margin: 0 0 var(--sp-4); }
.sp ul { margin: 0 0 var(--sp-5); padding-left: 20px; display: flex; flex-direction: column; gap: var(--sp-2); }
.sp li::marker { color: var(--n600); }
.sp strong { font-weight: 600; color: var(--n100); }
.sp code { padding: 1px 5px; border-radius: var(--r-sm); background: var(--n900); border: 1px solid var(--n850); color: var(--n100); font-size: .86em; word-break: break-word; }
.sp-table { margin: var(--sp-2) 0 var(--sp-6); overflow-x: auto; border: 1px solid var(--n800); border-radius: var(--r-sm); background: var(--n950); }
.sp table { width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.6; }
.sp th { text-align: left; padding: 12px 16px; font-size: 10px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; color: var(--n500); border-bottom: 1px solid var(--n800); white-space: nowrap; }
.sp td { padding: 12px 16px; vertical-align: top; color: var(--n200); border-top: 1px solid var(--n850); min-width: 140px; }
.sp tr:first-child td { border-top: 0; }
.sp td:first-child { color: var(--n100); }
@media (max-width: 1023px) {
  .sp-grid { grid-template-columns: minmax(0, 1fr); gap: 0; margin-top: var(--sp-8); }
  .sp-toc { display: none; }
  .sp-toc-m { display: block; margin-bottom: var(--sp-8); border: 1px solid var(--n800); border-radius: var(--r-sm); background: var(--n950); }
  .sp-toc-m summary { padding: 14px var(--sp-4); cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center; }
  .sp-toc-m summary::-webkit-details-marker { display: none; }
  .sp-toc-m summary svg { transition: transform var(--dur-base) var(--ease-out); }
  .sp-toc-m[open] summary svg { transform: rotate(180deg); }
  .sp-toc-m nav { display: flex; flex-direction: column; padding: 0 var(--sp-4) var(--sp-3); }
  .sp-toc-m a { padding: 8px 0; font-size: 14px; color: var(--n200); text-decoration: none; border-top: 1px solid var(--n850); }
  .sp { font-size: 14px; }
  .sp h2 { margin-top: var(--sp-12); }
}
</style>
</head>
<body>
<main class="wrap">
  <header class="sp-top">
    <div class="t-eyebrow">${esc(spec.eyebrow)}</div>
    <h1 class="t-display">${esc(name)}</h1>
${sub ? `    <p class="sp-sub">${esc(sub)}</p>\n` : ''}    <div class="sp-links">
      <a class="btn btn-ghost btn-md" href="${spec.back}">← Кадры и сценарии</a>
      <a class="btn btn-primary btn-md" href="${spec.mockup}">Открыть живой макет</a>
      <a class="t-link sp-dl" href="README.md" download><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg>Скачать README.md</a>
    </div>
  </header>
  <div class="sp-grid">
    <nav class="sp-toc" aria-label="Разделы спецификации">
      <span class="t-caption">Разделы</span>
${toc.map(([id, t]) => `      <a href="#${id}">${inline(t)}</a>`).join('\n')}
    </nav>
    <article class="sp">
      <details class="sp-toc-m">
        <summary><span class="t-caption">Разделы</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></summary>
        <nav aria-label="Разделы спецификации">
${toc.map(([id, t]) => `          <a href="#${id}">${inline(t)}</a>`).join('\n')}
        </nav>
      </details>
${html}
    </article>
  </div>
</main>
<script>
/* оглавление: подсветка текущего раздела, на телефоне — свернуть после выбора */
(() => {
  const links = [...document.querySelectorAll('.sp-toc a')];
  const heads = links.map(a => document.getElementById(a.hash.slice(1)));
  const mark = () => {
    let k = 0;
    heads.forEach((h, i) => { if (h.getBoundingClientRect().top < 120) k = i; });
    links.forEach((a, i) => a.classList.toggle('is-act', i === k));
  };
  addEventListener('scroll', mark, { passive: true }); mark();
  document.querySelectorAll('.sp-toc-m a').forEach(a => a.addEventListener('click', () => a.closest('details').open = false));
})();
</script>
</body>
</html>
`;
}

function main() {
  const CHECK = process.argv.includes('--check');
  let stale = 0;
  for (const spec of SPECS) {
    const src = join(ROOT, spec.dir, 'README.md'), dst = join(ROOT, spec.dir, 'spec.html');
    const html = page(spec, readFileSync(src, 'utf8'));
    const rel = `${spec.dir}/spec.html`;
    if (existsSync(dst) && readFileSync(dst, 'utf8') === html) { console.log(`  ✓ ${rel}`); continue; }
    if (CHECK) { stale++; console.log(`  ✗ ${rel} отстаёт от README.md — npm run build`); }
    else { writeFileSync(dst, html); console.log(`  → ${rel} собрана из README.md`); }
  }
  if (stale) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
