#!/usr/bin/env node
/**
 * TTS DS R14 — генератор SMM-слоя из smm.tokens.json (+ tokens.json)
 * ─────────────────────────────────────────────────────────────────
 * SMM — НЕ вторая система, а ещё один потребитель тех же примитивов.
 * Алиасы вида {dark.color.ink} / {global.primitives.blue.cobalt} тянутся
 * из основного tokens.json. Результат — ds-smm.css (генерируется целиком).
 *
 *   node tooling/build-smm.mjs           # генерирует ds-smm.css
 *   node tooling/build-smm.mjs --check    # печатает :root, не пишет
 *
 * Правила слоя (решение №34): на картинке — надзаголовок, название и одна строка
 * «дата · время · площадка»; поле 112; кобальт только у активной палочки; метка статуса —
 * инверсия; свечение одним цветом жанра. Зависимостей нет — только Node.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');

const base = JSON.parse(readFileSync(join(ROOT, 'tokens.json'), 'utf8'));
const smmFile = JSON.parse(readFileSync(join(ROOT, 'smm.tokens.json'), 'utf8'));
const tree = { ...base, smm: smmFile.smm };   // объединённое дерево для разрешения ссылок
const s = smmFile.smm;

function resolve(v) {
  let guard = 0;
  while (typeof v === 'string' && v.startsWith('{') && v.endsWith('}')) {
    const path = v;
    let node = tree;
    for (const p of v.slice(1, -1).split('.')) node = node && node[p];
    v = node && node.value;
    if (v === undefined) throw new Error('Нет токена: ' + path);
    if (++guard > 10) throw new Error('Зацикленный алиас: ' + path);
  }
  return v;
}
const px = (v) => `${v}px`;
const c = s.canvas, t = s.type, col = s.color;

const ROWS = [
  ['Холсты (соц-форматы)', [
    ['--smm-w',            px(c.w.value)],
    ['--smm-post-h',       px(c['post-h'].value)],
    ['--smm-story-h',      px(c['story-h'].value)],
    ['--smm-square-h',     px(c['square-h'].value)],
    ['--smm-margin',       px(c.margin.value)],
    ['--smm-margin-tight', px(c['margin-tight'].value)],
    ['--smm-gutter',       px(c.gutter.value)],
    ['--smm-story-top',    px(c['story-top'].value)],
    ['--smm-story-bottom', px(c['story-bottom'].value)],
    ['--smm-logo-w',       px(c['logo-w'].value)],
    ['--smm-image-min',    `${c['image-min'].value}%`],
  ]],
  ['Типошкала (под 1080px холст)', [
    ['--smm-fs-hero',       px(t.hero.value)],
    ['--smm-fs-display',    px(t.display.value)],
    ['--smm-fs-display-md', px(t['display-md'].value)],
    ['--smm-fs-display-sm', px(t['display-sm'].value)],
    ['--smm-fs-item',       px(t.item.value)],
    ['--smm-fs-meta',       px(t.meta.value)],
    ['--smm-fs-caption',    px(t.caption.value)],
    ['--smm-fs-mark',       px(t.mark.value)],
    ['--smm-fs-num-xl',     px(t['num-xl'].value)],
    ['--smm-fs-num',        px(t.num.value)],
  ]],
  ['Цвета: акцент — только активная палочка слайдов', [
    ['--smm-accent',  resolve(col.accent.value)],
    ['--smm-premium', resolve(col.premium.value)],
  ]],
  ['Тёмная тема', Object.keys(col.dark).map((k) => ['--smm-dark-' + k, resolve(col.dark[k].value)])],
  ['Светлая тема', Object.keys(col.light).map((k) => ['--smm-light-' + k, resolve(col.light[k].value)])],
  ['Шрифты', [
    ['--smm-f-display', resolve(s.font.display.value)],
    ['--smm-f-head',    resolve(s.font.head.value)],
    ['--smm-f-ui',      resolve(s.font.ui.value)],
    // ₽ в Oranienbaum нет — знак берётся из Manrope
    ['--smm-f-num',     resolve(s.font.num.value).replace(/,\s*serif$/, ", 'Manrope', serif")],
  ]],
];

function renderRoot() {
  const out = [':root {'];
  ROWS.forEach(([title, rows], i) => {
    if (i > 0) out.push('');
    out.push(`  /* ${title} */`);
    for (const [k, v] of rows) out.push('  ' + (k + ':').padEnd(22) + ' ' + v + ';');
  });
  out.push('}');
  return out.join('\n');
}

/* Компоненты слоя — потребляют только токены выше. Разметка — tooling/examples/smm-example.html */
const TEMPLATES = String.raw`
/* ───── Холст: формат × тема × жанр ───── */
.smm-canvas {
  --smm-x: var(--smm-margin);
  --smm-pt: var(--smm-margin); --smm-pb: var(--smm-margin);
  --smm-bg: var(--smm-dark-bg); --smm-fg: var(--smm-dark-fg); --smm-muted: var(--smm-dark-muted);
  --smm-label: var(--smm-dark-label); --smm-line: var(--smm-dark-line);
  --smm-hue: var(--smm-dark-hue-cool);
  --smm-bar-off: color-mix(in srgb, var(--smm-fg) 30%, transparent);
  position: relative; overflow: hidden; box-sizing: border-box; flex: none;
  width: var(--smm-w); background: var(--smm-bg); color: var(--smm-fg);
  font-family: var(--smm-f-ui); display: flex; flex-direction: column;
  -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
}
.smm-canvas *, .smm-canvas *::before, .smm-canvas *::after { box-sizing: border-box; }
.smm-canvas--post   { height: var(--smm-post-h); }
.smm-canvas--square { height: var(--smm-square-h); }
.smm-canvas--story  { height: var(--smm-story-h); --smm-pt: var(--smm-story-top); --smm-pb: var(--smm-story-bottom); }
/* узкое поле — по необходимости, стандарт — 112 */
.smm-canvas--tight { --smm-x: var(--smm-margin-tight); }
.smm-canvas--tight.smm-canvas--post, .smm-canvas--tight.smm-canvas--square { --smm-pt: var(--smm-margin-tight); --smm-pb: var(--smm-margin-tight); }

.smm-canvas--light {
  --smm-bg: var(--smm-light-bg); --smm-fg: var(--smm-light-fg); --smm-muted: var(--smm-light-muted);
  --smm-label: var(--smm-light-label); --smm-line: var(--smm-light-line);
  --smm-hue: var(--smm-light-hue-cool);
  --smm-bar-off: color-mix(in srgb, var(--smm-fg) 20%, transparent);
}
/* свечение одним цветом жанра: театр и классика — синий, опера — тёплый, мюзикл — зелёный */
.smm-canvas--warm  { --smm-hue: var(--smm-dark-hue-warm); }
.smm-canvas--green { --smm-hue: var(--smm-dark-hue-green); }
.smm-canvas--light.smm-canvas--warm  { --smm-hue: var(--smm-light-hue-warm); }
.smm-canvas--light.smm-canvas--green { --smm-hue: var(--smm-light-hue-green); }
.smm-canvas > :where(:not(.smm-fx)) { position: relative; z-index: 1; }

/* ───── Шапка: логотип, возраст, палочки ───── */
.smm-grid, .smm-head { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); column-gap: var(--smm-gutter); }
.smm-head { align-items: center; }
.smm-logo { grid-column: 1 / 3; width: var(--smm-logo-w); color: var(--smm-fg); display: block; }
.smm-logo svg { display: block; width: 100%; height: auto; }
.smm-meta { grid-column: 4 / 7; justify-self: end; display: flex; align-items: center; gap: 32px; }
.smm-age { font-size: var(--smm-fs-caption); font-weight: 600; letter-spacing: .14em; color: var(--smm-muted); }
.smm-dots { display: flex; gap: 14px; }
.smm-dot { width: 58px; height: 4px; border-radius: 2px; background: var(--smm-bar-off); }
.smm-dot--active { background: var(--smm-accent); }

/* ───── Текст: надзаголовок · название · одна строка ───── */
.smm-text { display: flex; flex-direction: column; align-items: flex-start; }
.smm-eyebrow { font-size: var(--smm-fs-caption); font-weight: 600; letter-spacing: .22em; text-transform: uppercase; color: var(--smm-muted); }
.smm-mark {
  display: inline-flex; align-items: center; font-size: var(--smm-fs-mark); font-weight: 700; letter-spacing: .16em;
  text-transform: uppercase; padding: 12px 18px; border-radius: 2px; background: var(--smm-fg); color: var(--smm-bg); line-height: 1;
}
.smm-title {
  margin: 20px 0 0; font-family: var(--smm-f-display); font-weight: 500; font-size: var(--smm-fs-display);
  line-height: 1; overflow-wrap: anywhere; text-wrap: balance;
}
.smm-title:first-child { margin-top: 0; }
.smm-mark + .smm-title { margin-top: 28px; }
.smm-title--md { font-size: var(--smm-fs-display-md); }
.smm-title--sm { font-size: var(--smm-fs-display-sm); }
/* исключение по решению владельца — капс названия */
.smm-title--caps { text-transform: uppercase; letter-spacing: .02em; }
.smm-line { margin: 30px 0 0; font-size: var(--smm-fs-meta); font-weight: 500; line-height: 1.3; color: var(--smm-fg); }
.smm-lead { margin: 24px 0 0; font-size: var(--smm-fs-meta); font-weight: 500; line-height: 1.4; color: var(--smm-muted); text-wrap: pretty; }
.smm-num { font-family: var(--smm-f-num); font-weight: 400; }
.smm-big { margin-top: 44px; font-family: var(--smm-f-num); font-size: var(--smm-fs-num-xl); line-height: 1; }
.smm-sub { margin: 16px 0 0; font-size: var(--smm-fs-meta); font-weight: 500; color: var(--smm-muted); }
.smm-note { align-self: stretch; margin: 40px 0 0; padding-top: 28px; border-top: 2px solid var(--smm-line); font-size: var(--smm-fs-meta); font-weight: 500; line-height: 1.35; }
.smm-was { color: var(--smm-muted); text-decoration: line-through; text-decoration-thickness: 2px; }

/* ───── Картинка: не меньше 30 % высоты холста ───── */
.smm-img { position: relative; overflow: hidden; background: var(--smm-line); min-height: var(--smm-image-min); }
.smm-img img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }

/* ───── Макеты ───── */
/* «Картинка в поле» */
.smm-frame { padding: var(--smm-pt) var(--smm-x) var(--smm-pb); }
.smm-frame > .smm-img  { flex: 1 1 0; margin-top: 48px; }
.smm-frame > .smm-text { flex: 0 0 auto; margin-top: 56px; }

/* «Картинка полосой» и обложка альбома: картинка во всю ширину, под ней панель */
.smm-band > .smm-img, .smm-cover > .smm-img { flex: 0 1 var(--smm-img-h, 60%); }
.smm-band > .smm-scrim {
  position: absolute; top: 0; left: 0; right: 0; height: calc(var(--smm-pt) + 170px); z-index: 1;
  background: linear-gradient(180deg, color-mix(in srgb, var(--smm-scrim) 45%, transparent) 0%, transparent 100%);
}
.smm-band > .smm-head { position: absolute; top: var(--smm-pt); left: var(--smm-x); right: var(--smm-x); z-index: 2; }
/* логотип на картинке: светлый на тёмной афише, тёмный на светлой */
.smm-band--on-dark  { --smm-scrim: var(--smm-dark-bg); }
.smm-band--on-dark > .smm-head  { --smm-fg: var(--smm-dark-fg); --smm-muted: var(--smm-dark-fg); --smm-bar-off: color-mix(in srgb, var(--smm-dark-fg) 30%, transparent); }
.smm-band--on-light { --smm-scrim: var(--smm-light-bg); }
.smm-band--on-light > .smm-head { --smm-fg: var(--smm-light-fg); --smm-muted: var(--smm-light-fg); --smm-bar-off: color-mix(in srgb, var(--smm-light-fg) 30%, transparent); }
.smm-panel { position: relative; overflow: hidden; flex: 1 0 auto; display: flex; flex-direction: column; justify-content: space-between; padding: 72px var(--smm-x) var(--smm-pb); }
.smm-band > .smm-panel { justify-content: flex-end; }
.smm-panel > :where(:not(.smm-fx)) { position: relative; z-index: 1; }
.smm-cover > .smm-panel { padding-top: 64px; }

/* лист без картинки: детали альбома, перенос, отмена, подборка, «Типографика» */
.smm-sheet { padding: var(--smm-pt) var(--smm-x) var(--smm-pb); justify-content: space-between; }
/* воздух под шапкой: содержимое не подходит к логотипу ближе 96 px */
.smm-sheet > .smm-head { margin-bottom: 96px; }
.smm-sheet .smm-span { grid-column: 1 / -1; }
.smm-sheet .smm-grid > .smm-lead { grid-column: 1 / 6; }
.smm-gap { grid-column: 1 / -1; height: 56px; }
.smm-type .smm-title { font-size: var(--smm-fs-hero); line-height: .98; }

/* таблица деталей: пункт в одну строку */
.smm-rule { grid-column: 1 / -1; height: 2px; background: var(--smm-line); }
.smm-row-label { grid-column: 1 / 3; padding: 28px 0; font-size: var(--smm-fs-caption); font-weight: 500; letter-spacing: .14em; text-transform: uppercase; color: var(--smm-label); line-height: 1.3; }
.smm-row-val { grid-column: 3 / 7; padding: 28px 0; font-size: var(--smm-fs-meta); font-weight: 500; line-height: 1.3; text-wrap: pretty; }

/* подборка: дата · событие · площадка; превью 4:5 — по желанию */
.smm-dg-when { grid-column: 1 / 3; padding: 26px 0; display: flex; flex-direction: column; gap: 6px; }
.smm-dg-when .smm-num { font-size: var(--smm-fs-num); line-height: 1; }
.smm-label { font-size: var(--smm-fs-caption); font-weight: 500; letter-spacing: .14em; text-transform: uppercase; color: var(--smm-label); }
.smm-dg-what { grid-column: 3 / 7; padding: 26px 0; min-width: 0; }
.smm-dg-title { font-family: var(--smm-f-display); font-weight: 500; font-size: var(--smm-fs-item); line-height: 1.05; text-wrap: balance; }
.smm-dg-meta { margin-top: 10px; font-size: var(--smm-fs-meta); font-weight: 500; line-height: 1.3; color: var(--smm-muted); }
.smm-dg-thumb { grid-column: 1 / 2; margin: 24px 0; aspect-ratio: 4 / 5; position: relative; overflow: hidden; background: var(--smm-line); align-self: start; }
.smm-dg-thumb img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.smm-dg-thumbs .smm-dg-when { grid-column: 2 / 4; }
.smm-dg-thumbs .smm-dg-what { grid-column: 4 / 7; }
.smm-dg-thumbs .smm-dg-title { font-size: 46px; }

/* ───── Свечение: один цвет жанра. Слой .smm-fx — первым в холсте или панели ───── */
.smm-fx { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.smm-fx::before, .smm-fx::after { content: ""; position: absolute; pointer-events: none; }
/* «Рампа» — для постов с картинкой: тихий свет снизу и тонкая кромка */
.smm-fx--footlight::before {
  left: -20%; right: -20%; bottom: -18%; height: 62%;
  background: radial-gradient(50% 46% at 50% 100%, color-mix(in srgb, var(--smm-hue) 80%, var(--smm-fg)) 0%, var(--smm-hue) 24%, color-mix(in srgb, var(--smm-hue) 40%, transparent) 56%, transparent 80%);
  filter: blur(12px);
}
.smm-fx--footlight::after {
  left: 14%; right: 14%; bottom: 0; height: 4px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--smm-hue) 55%, var(--smm-fg)) 50%, transparent);
  filter: blur(2px); opacity: .8;
}
/* «Луч» — свет падает сверху наискось, внизу пятно, как на сцене */
.smm-fx--beam::before {
  left: -30%; top: -20%; width: 160%; height: 150%;
  background: conic-gradient(from 146deg at 22% 0%, transparent 0deg, color-mix(in srgb, var(--smm-hue) 85%, transparent) 8deg, color-mix(in srgb, var(--smm-hue) 45%, transparent) 19deg, transparent 30deg);
  filter: blur(28px);
  -webkit-mask-image: linear-gradient(180deg, transparent 8%, black 45%); mask-image: linear-gradient(180deg, transparent 8%, black 45%);
}
.smm-fx--beam::after {
  left: 30%; width: 90%; bottom: -14%; height: 36%;
  background: radial-gradient(50% 50% at 50% 50%, var(--smm-hue) 0%, color-mix(in srgb, var(--smm-hue) 35%, transparent) 45%, transparent 72%);
  filter: blur(16px);
}
/* «Глубина» — вытянутая полоса и дымка разной силы */
.smm-fx--depth::before {
  inset: -14%;
  background:
    radial-gradient(48% 14% at 62% 84%, var(--smm-hue) 0%, transparent 72%),
    radial-gradient(28% 24% at 94% 94%, var(--smm-hue) 0%, transparent 70%),
    radial-gradient(52% 40% at 104% 58%, color-mix(in srgb, var(--smm-hue) 55%, transparent) 0%, transparent 72%),
    radial-gradient(34% 22% at 14% 104%, color-mix(in srgb, var(--smm-hue) 45%, transparent) 0%, transparent 72%);
  transform: rotate(-9deg);
  filter: blur(24px);
}
/* «Ореол» — светящееся кольцо у края, как пятно прожектора */
.smm-fx--halo::before, .smm-fx--halo::after { right: -38%; bottom: -46%; width: 100%; aspect-ratio: 1; border-radius: 9999px; }
.smm-fx--halo::before {
  background: radial-gradient(circle at 50% 50%, transparent 50%, color-mix(in srgb, var(--smm-hue) 70%, transparent) 57%, color-mix(in srgb, var(--smm-hue) 82%, var(--smm-fg)) 61%, color-mix(in srgb, var(--smm-hue) 50%, transparent) 65%, transparent 73%);
  filter: blur(10px);
}
.smm-fx--halo::after {
  background: radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--smm-hue) 35%, transparent) 0%, transparent 58%);
  filter: blur(18px);
}

.smm-premium { color: var(--smm-premium); }
`;

const header = '/* ═══ GENERATED FROM smm.tokens.json + tokens.json — НЕ РЕДАКТИРОВАТЬ ВРУЧНУЮ ═══ */\n';
const root = renderRoot();
const count = ROWS.reduce((n, [, r]) => n + r.length, 0);

if (CHECK) {
  console.log(root);
  console.log(`\n✓ (--check) разрешено переменных: ${count}; файл не записан`);
} else {
  writeFileSync(join(ROOT, 'ds-smm.css'), header + root + '\n' + TEMPLATES);
  console.log(`✓ ds-smm.css сгенерирован (${count} переменных + шаблоны слоя).`);
}
