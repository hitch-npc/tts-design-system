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
 * Зависимостей нет — только Node.
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
    let node = tree;
    for (const p of v.slice(1, -1).split('.')) node = node && node[p];
    v = node && node.value;
    if (++guard > 10) throw new Error('Зацикленный алиас: ' + v);
  }
  return v;
}
const px = (v) => `${v}px`;

const ROWS = [
  ['Холсты (соц-форматы)', [
    ['--smm-story-w', px(s.canvas['story-w'].value)],
    ['--smm-story-h', px(s.canvas['story-h'].value)],
    ['--smm-post-w',  px(s.canvas['post-w'].value)],
    ['--smm-post-h',  px(s.canvas['post-h'].value)],
    ['--smm-square',  px(s.canvas['square'].value)],
    ['--smm-margin',  px(s.canvas['margin'].value)],
    ['--smm-gutter',  px(s.canvas['gutter'].value)],
    ['--smm-safe-top', px(s.canvas['safe-top'].value)],
  ]],
  ['Типошкала (под 1080px холст)', [
    ['--smm-fs-display',  px(s.type.display.value)],
    ['--smm-fs-title',    px(s.type.title.value)],
    ['--smm-fs-subtitle', px(s.type.subtitle.value)],
    ['--smm-fs-meta',     px(s.type.meta.value)],
    ['--smm-fs-caption',  px(s.type.caption.value)],
  ]],
  ['Цвета (из брендовых примитивов)', [
    ['--smm-bg',        resolve(s.color.bg.value)],
    ['--smm-fg',        resolve(s.color.fg.value)],
    ['--smm-muted',     resolve(s.color.muted.value)],
    ['--smm-accent',    resolve(s.color.accent.value)],
    ['--smm-premium',   resolve(s.color.premium.value)],
    ['--smm-blob-cool', resolve(s.color['blob-cool'].value)],
    ['--smm-blob-warm', resolve(s.color['blob-warm'].value)],
    ['--smm-blob-green', resolve(s.color['blob-green'].value)],
  ]],
  ['Шрифты', [
    ['--smm-f-display', resolve(s.font.display.value)],
    ['--smm-f-head',    resolve(s.font.head.value)],
    ['--smm-f-ui',      resolve(s.font.ui.value)],
    ['--smm-f-num',     resolve(s.font.num.value)],
  ]],
];

function renderRoot() {
  const out = [':root {'];
  ROWS.forEach(([title, rows], i) => {
    if (i > 0) out.push('');
    out.push(`  /* ${title} */`);
    for (const [k, v] of rows) out.push('  ' + (k + ':').padEnd(20) + ' ' + v + ';');
  });
  out.push('}');
  return out.join('\n');
}

/* стартовые шаблоны — потребляют только токены выше (расширяй под свои постеры) */
const TEMPLATES = `
/* ───── SMM: формат «обложка» как в ленте @tickettoshow.ru ───── */
.smm-canvas {
  position: relative; overflow: hidden; box-sizing: border-box;
  background: var(--smm-bg); color: var(--smm-fg);
  font-family: var(--smm-f-ui);
  display: flex; flex-direction: column; justify-content: space-between;
  padding: var(--smm-margin);
  /* тонкое монохромное зерно (feTurbulence) */
  --smm-grain: url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='140'%20height='140'%3E%3Cfilter%20id='n'%3E%3CfeTurbulence%20type='fractalNoise'%20baseFrequency='0.85'%20numOctaves='2'%20stitchTiles='stitch'/%3E%3CfeColorMatrix%20type='saturate'%20values='0'/%3E%3C/filter%3E%3Crect%20width='140'%20height='140'%20filter='url(%23n)'/%3E%3C/svg%3E");
  --smm-glow: var(--smm-blob-cool);
}
.smm-canvas--story  { width: var(--smm-story-w); height: var(--smm-story-h); padding-top: calc(var(--smm-margin) + var(--smm-safe-top)); }
.smm-canvas--post   { width: var(--smm-post-w);  height: var(--smm-post-h); }
.smm-canvas--square { width: var(--smm-square);   height: var(--smm-square); }
.smm-canvas--cool  { --smm-glow: var(--smm-blob-cool); }
.smm-canvas--warm  { --smm-glow: var(--smm-blob-warm); }
.smm-canvas--green { --smm-glow: var(--smm-blob-green); }

/* кобальтовое свечение — фирменный blob */
.smm-canvas::before {
  content: ""; position: absolute; right: -12%; bottom: -16%; z-index: 0;
  width: 86%; aspect-ratio: 1; border-radius: 9999px; pointer-events: none;
  background: radial-gradient(circle at 50% 50%, var(--smm-glow) 0%, transparent 62%);
  opacity: .8; filter: blur(8px);
}
/* лёгкое зерно по всему холсту */
.smm-canvas::after {
  content: ""; position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background-image: var(--smm-grain); opacity: .06; mix-blend-mode: overlay;
}

/* ФОТО — обложка с вылетом за верх/право, растворяется в фон (вырезанное фото) */
.smm-photo {
  position: absolute; top: 0; right: 0; z-index: 1; width: 82%; height: 62%; overflow: hidden;
  -webkit-mask-image: linear-gradient(180deg, black 50%, transparent 100%);
  mask-image: linear-gradient(180deg, black 50%, transparent 100%);
}
.smm-photo > img { width: 100%; height: 100%; object-fit: cover; object-position: center top; display: block; filter: grayscale(.12) contrast(1.02); }
.smm-photo::before { content: ""; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(90deg, var(--smm-bg) 0%, transparent 42%); }
.smm-photo::after  { content: ""; position: absolute; inset: 0; pointer-events: none; background-image: var(--smm-grain); opacity: .15; mix-blend-mode: overlay; }
.smm-photo--empty  { background: radial-gradient(120% 90% at 72% 8%, color-mix(in srgb, var(--smm-glow) 55%, transparent) 0%, transparent 60%), var(--smm-bg); box-shadow: inset 0 0 0 1px rgba(214,214,210,.07); }
.smm-photo__hint   { position: absolute; left: 50%; top: 40%; transform: translate(-50%,-50%); font-weight: 600; font-size: var(--smm-fs-caption); text-transform: uppercase; letter-spacing: .2em; color: var(--smm-fg); opacity: .3; }

/* шапка — логотип слева (вставь <svg>/<img> из tts-logo.svg, заливка --n100 на тёмном) */
.smm-head { position: relative; z-index: 3; display: flex; align-items: flex-start; }
.smm-logo { width: 232px; flex: none; }
.smm-logo svg, .smm-logo img { display: block; width: 100%; height: auto; }

/* низ — кикер · название · черта · описание · город · точки */
.smm-foot { position: relative; z-index: 3; }
.smm-kicker { font-family: var(--smm-f-ui); font-weight: 600; font-size: var(--smm-fs-caption); text-transform: uppercase; letter-spacing: .26em; color: var(--smm-accent); }
.smm-title { font-family: var(--smm-f-display); font-weight: 500; font-size: var(--smm-fs-display); line-height: .92; letter-spacing: .01em; text-transform: uppercase; margin-top: 30px; }
.smm-rule  { width: 64px; height: 2px; background: var(--smm-accent); margin-top: 38px; }
.smm-desc  { font-family: var(--smm-f-ui); font-size: var(--smm-fs-meta); line-height: 1.5; color: var(--smm-muted); margin-top: 34px; max-width: 78%; }
.smm-city  { display: inline-block; margin-top: 40px; font-family: var(--smm-f-ui); font-weight: 600; font-size: var(--smm-fs-caption); text-transform: uppercase; letter-spacing: .16em; color: var(--smm-accent); border: 2px solid var(--smm-accent); border-radius: 2px; padding: 15px 26px; }
.smm-dots  { display: flex; gap: 14px; margin-top: 46px; }
.smm-dot   { width: 58px; height: 4px; border-radius: 2px; background: var(--smm-fg); opacity: .22; }
.smm-dot--active { opacity: 1; }
.smm-premium { color: var(--smm-premium); }
`;

const header = '/* ═══ GENERATED FROM smm.tokens.json + tokens.json — НЕ РЕДАКТИРОВАТЬ ВРУЧНУЮ ═══ */\n';
const root = renderRoot();

if (CHECK) {
  console.log(root);
  console.log(`\n✓ (--check) разрешено переменных: ${ROWS.reduce((n, [, r]) => n + r.length, 0)}; файл не записан`);
} else {
  writeFileSync(join(ROOT, 'ds-smm.css'), header + root + '\n' + TEMPLATES);
  console.log(`✓ ds-smm.css сгенерирован (${ROWS.reduce((n, [, r]) => n + r.length, 0)} переменных + стартовые шаблоны).`);
}
