#!/usr/bin/env node
/**
 * TTS DS R14 — контраст по APCA
 * ──────────────────────────────
 * Считает Lc (APCA-W3 0.0.98G) для пар «текст — фон» во всех правилах ядра обеих тем
 * и сравнивает с минимумом APCA Bronze для кегля и жирности правила.
 *
 *   node tooling/contrast-check.mjs          # отчёт; выход 1, если есть пары ниже минимума
 *   node tooling/contrast-check.mjs --all    # показать и прошедшие пары
 *   node tooling/contrast-check.mjs --json
 *
 * Фон пары — background правила; если его нет, фон страницы --ink (помечается «фон страницы»).
 * Цвет, кегль и жирность, которых нет в правиле, берутся у базового селектора
 * (.btn-primary:hover → .btn-primary → .btn). Кнопки без размера считаются по самому мелкому, .btn-sm.
 * Не проверяются: disabled, проданные места, плейсхолдеры (минимум 30), декоративные слои.
 *
 * Минимумы (APCA Bronze, Simple Mode) по роли текста:
 *   Lc 75 — основной текст: описания, абзацы, подсказки, тосты (BODY)
 *   Lc 60 — остальной текст, который нужно прочесть: подписи, метки, цены, кнопки
 *   Lc 45 — крупный текст от 36px/400 или от 24px/700
 *   Lc 30 — служебный: копирайт, дисклеймер, разделители, плейсхолдер, disabled (INCIDENTAL)
 * Отчёт сгруппирован по паре «цвет текста — фон»: обычно правится токен, а не каждое правило.
 * Зависимостей нет — только Node.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ALL = process.argv.includes('--all');
const JSON_OUT = process.argv.includes('--json');

/* ── APCA-W3 0.0.98G ── */
const lin = (c) => Math.pow(c / 255, 2.4);
function Y([r, g, b]) {
  let y = 0.2126729 * lin(r) + 0.7151522 * lin(g) + 0.072175 * lin(b);
  return y < 0.022 ? y + Math.pow(0.022 - y, 1.414) : y;
}
export function apca(txt, bg) {
  const yt = Y(txt), yb = Y(bg);
  if (Math.abs(yb - yt) < 0.0005) return 0;
  if (yb > yt) { const s = (Math.pow(yb, 0.56) - Math.pow(yt, 0.57)) * 1.14; return s < 0.1 ? 0 : (s - 0.027) * 100; }
  const s = (Math.pow(yb, 0.65) - Math.pow(yt, 0.62)) * 1.14; return s > -0.1 ? 0 : (s + 0.027) * 100;
}
const BODY = /body|desc|lead|helper|empty|message|toast(?!-close)|-text\b|-sub\b|paragraph/;
const INCIDENTAL = /-sep\b|copy|disclaimer|legal|placeholder|disabled|-note\b|close/;
function required(px, w, sel) {
  if (INCIDENTAL.test(sel)) return 30;
  if ((px >= 36 && w >= 400) || (px >= 24 && w >= 700)) return 45;
  return BODY.test(sel) ? 75 : 60;
}
/* ── разбор CSS ── */
function rootVars(css) {
  const m = /:root\s*\{([^}]*)\}/.exec(css); const out = {};
  if (m) for (const d of m[1].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) out[d[1]] = d[2].trim();
  return out;
}
function cssRules(text) {
  const out = []; const at = []; let prev = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === 125) { at.pop(); prev = i + 1; continue; }
    if (c !== 123) continue;
    const close = text.indexOf('}', i + 1), nextOpen = text.indexOf('{', i + 1);
    if (close < 0) break;
    if (nextOpen >= 0 && nextOpen < close) { at.push(text.slice(prev, i).replace(/\/\*[\s\S]*?\*\//g, '').trim()); prev = i + 1; continue; }
    out.push({ sel: text.slice(prev, i).replace(/\/\*[\s\S]*?\*\//g, '').trim().replace(/\s+/g, ' '), body: text.slice(i + 1, close), at: at.join(' '), idx: i });
    i = close; prev = close + 1;
  }
  return out;
}
const lineOf = (t, i) => t.slice(0, i).split('\n').length;
function decls(body) {
  const o = {};
  for (const d of body.replace(/\/\*[\s\S]*?\*\//g, '').split(';')) {
    const i = d.indexOf(':'); if (i < 0) continue;
    o[d.slice(0, i).trim().toLowerCase()] = d.slice(i + 1).trim().replace(/\s*!important$/, '');
  }
  return o;
}
function resolve(v, vars, depth = 0) {
  if (v == null || depth > 8) return null;
  v = v.trim();
  const m = /^var\((--[a-z0-9-]+)(?:\s*,\s*(.+))?\)$/i.exec(v);
  if (m) return resolve(vars[m[1]] ?? m[2], vars, depth + 1);
  return v;
}
/* цвет → [r,g,b,a]; null, если не сплошной цвет */
function parseColor(v) {
  if (!v) return null;
  v = v.trim();
  if (/^transparent$/i.test(v)) return [0, 0, 0, 0];
  let m = /^#([0-9a-f]{3,8})$/i.exec(v);
  if (m) {
    let h = m[1]; if (h.length <= 4) h = [...h].map((c) => c + c).join('');
    const n = (i) => parseInt(h.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
  }
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i.exec(v);
  if (m) { const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : +m[4]; return [+m[1], +m[2], +m[3], a]; }
  return null;
}
const over = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3]));
const hex = (c) => '#' + c.slice(0, 3).map((x) => Math.round(x).toString(16).padStart(2, '0')).join('').toUpperCase();
function px(v, vars) {
  v = resolve(v, vars); if (!v) return null;
  const c = /^clamp\(\s*([^,]+),/.exec(v); if (c) v = c[1].trim();
  const m = /^([\d.]+)(px|rem|em)$/.exec(v); if (!m) return null;
  return m[2] === 'px' ? +m[1] : +m[1] * 16;
}

/* классы самого гайда (витрина ядра) — не продукт */
const GUIDE = /^\.(ds-|color-swatch|type-|spacing-|mode-btn|btn-row-label|token-|swatch)/;
const SKIP = /:disabled|\.disabled|\[disabled\]|-disabled|-sold|placeholder|blob|skeleton|scrim|overlay|::selection|smap-dot|seat|grain|::before|::after|\.tt-|svg|icon|logo|-ico\b|stroke|hero-bg|cover-/;

function main() {
const findings = [];
for (const [theme, file] of [['dark', 'ds-core-r14.css'], ['light', 'ds-core-r14-light.css']]) {
  const css = readFileSync(join(ROOT, file), 'utf8');
  const vars = rootVars(css);
  const rules = cssRules(css).filter((r) => !/:root/.test(r.sel) && !r.at.startsWith('@keyframes'));
  const bySel = new Map();
  for (const r of rules) for (const s of r.sel.split(',').map((x) => x.trim())) {
    const d = decls(r.body); bySel.set(s, { ...(bySel.get(s) || {}), ...d });
  }
  // значение свойства у селектора или его базы: .btn-primary:hover → .btn-primary → .btn
  const bases = (s) => {
    const out = [s];
    const noPseudo = s.replace(/(:{1,2}[a-z-]+(\([^)]*\))?)+$/i, '');
    if (noPseudo !== s) out.push(noPseudo);
    const last = noPseudo.split(' ').pop();
    const fam = /^\.([a-z]+)-/.exec(last);
    if (fam && noPseudo === last) out.push('.' + fam[1]);
    return out;
  };
  const prop = (s, keys) => { for (const b of bases(s)) { const d = bySel.get(b); if (!d) continue; for (const k of keys) if (d[k] !== undefined) return d[k]; } return undefined; };
  const page = parseColor(resolve('var(--ink)', vars));
  const seen = new Set();
  for (const r of rules) {
    for (const s of r.sel.split(',').map((x) => x.trim())) {
      if (SKIP.test(s) || GUIDE.test(s) || seen.has(s)) continue;
      const own = decls(r.body);
      if (own.color === undefined && own.background === undefined && own['background-color'] === undefined) continue;
      seen.add(s);
      const tRaw = resolve(prop(s, ['color']), vars);
      const fg = parseColor(tRaw); if (!fg || fg[3] === 0) continue;
      let bgRaw = resolve(own['background-color'] ?? own.background ?? prop(s, ['background-color', 'background']), vars);
      let bg = parseColor(bgRaw), assumed = false;
      if (!bg || bg[3] === 0) { if (bgRaw && !parseColor(bgRaw) && !/^transparent|none$/i.test(bgRaw)) continue; bg = page; assumed = true; }
      const bgSolid = bg[3] < 1 ? over(bg, page) : bg;
      const fgSolid = fg[3] < 1 ? over(fg, bgSolid) : fg;
      let size = px(prop(s, ['font-size']), vars);
      if (size === null && /^\.btn/.test(s)) size = px(bySel.get('.btn-sm')?.['font-size'], vars);
      const wRaw = resolve(prop(s, ['font-weight']), vars);
      const w = wRaw ? (wRaw === 'bold' ? 700 : wRaw === 'normal' ? 400 : +wRaw || 400) : 400;
      const need = required(size ?? 14, w, s);
      const lc = Math.abs(apca(fgSolid, bgSolid));
      const ok = lc >= need;
      if (!ok || ALL) findings.push({
        level: ok ? 'ok' : 'error', theme, file, line: lineOf(css, r.idx), sel: (r.at ? r.at + ' ' : '') + s,
        text: `${hex(fgSolid)}${tRaw?.startsWith('#') ? '' : ` (${prop(s, ['color'])})`}`,
        bg: `${hex(bgSolid)}${assumed ? ' (фон страницы)' : ''}`,
        size: size ?? '?', weight: w, lc: Math.round(lc * 10) / 10, need,
      });
    }
  }
}

/* группы по паре цветов и теме */
const groups = new Map();
for (const f of findings) {
  const k = `${f.level}|${f.theme}|${f.text.split(' ')[0]}|${f.bg.split(' ')[0]}`;
  if (!groups.has(k)) groups.set(k, { level: f.level, theme: f.theme, file: f.file, text: f.text, bg: f.bg, lc: f.lc, items: [] });
  groups.get(k).items.push(f);
}
const list = [...groups.values()].sort((a, b) => (a.level === b.level ? b.items.length - a.items.length : a.level === 'error' ? -1 : 1));
const errors = findings.filter((f) => f.level === 'error').length;
if (JSON_OUT) process.stdout.write(JSON.stringify({ errors, groups: list }, null, 2) + '\n');
else {
  for (const g of list) {
    console.log(`${g.level === 'error' ? '✗' : '✓'} ${g.theme === 'dark' ? 'тёмная' : 'светлая'} · текст ${g.text} на ${g.bg} · Lc ${g.lc} · правил: ${g.items.length}`);
    for (const f of g.items.slice(0, ALL ? 99 : 6)) console.log(`    ${f.file}:${f.line}  ${f.sel}  (${f.size}px/${f.weight}, нужно ${f.need})`);
    if (!ALL && g.items.length > 6) console.log(`    … ещё ${g.items.length - 6} (--all)`);
  }
  console.log(`\nИтог APCA: ниже минимума ${errors} правил в ${list.filter((g) => g.level === 'error').length} парах цветов.`);
}
process.exit(errors ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
