#!/usr/bin/env node
/**
 * TTS DS R14 — сторож расхождений (drift check)
 * ───────────────────────────────────────────────
 * Сверяет эталон (tokens.json → :root ядра ds-core-r14*.css) со всеми местами,
 * где система живёт копией: страницы со своим CSS, сборки редизайна, CLAUDE.md,
 * DECISIONS.md, Figma-скрипты, витрина index.html, офлайн-копии редизайна в ~/Downloads.
 *
 *   node tooling/drift-check.mjs           # отчёт; выход 1, если есть ошибки
 *   node tooling/drift-check.mjs --json    # то же в JSON (для агента ds-drift-watcher)
 *   node tooling/drift-check.mjs --all     # показать и сводку по hex вне палитры в редизайне
 *
 * Только читает. Ничего не правит. Зависимостей нет — только Node и git.
 *
 * Уровни:
 *   ОШИБКА        значение расходится с эталоном, битая ссылка, копии не совпадают
 *   ПРЕДУПРЕЖДЕНИЕ похоже на расхождение, но может быть осознанным (локальные переменные страницы,
 *                 чужая тема в сборке, устаревшая копия в «Загрузках», страница без ссылки в витрине)
 */
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, posix } from 'node:path';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JSON_OUT = process.argv.includes('--json');
const SHOW_ALL = process.argv.includes('--all');

const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;
const HEX = (v) => (/^#[0-9a-f]{3,8}$/i.test(v.trim()) ? norm(v.trim()) : null);
function norm(h) {
  h = h.toUpperCase();
  if (h.length === 4) h = '#' + [...h.slice(1)].map((c) => c + c).join('');
  return h;
}

const findings = [];
function add(level, check, file, line, what, ref, fix) {
  findings.push({ level, check, file, line: line || null, what, ref: ref || '', fix: fix || '' });
}

/* ═════════════ Эталон: :root ядра (сверен с tokens.json через build-tokens --check) ═════════════ */
function rootVars(css) {
  const m = /:root\s*\{([^}]*)\}/.exec(css);
  const out = {};
  if (!m) return out;
  for (const d of m[1].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) out[d[1]] = d[2].trim();
  return out;
}
const CORE = { dark: rootVars(read('ds-core-r14.css')), light: rootVars(read('ds-core-r14-light.css')) };
const CORE_FILE = { dark: 'ds-core-r14.css', light: 'ds-core-r14-light.css' };
const PALETTE = {};
for (const th of ['dark', 'light']) {
  PALETTE[th] = new Map();
  for (const [k, v] of Object.entries(CORE[th])) {
    const h = HEX(v);
    if (h) { if (!PALETTE[th].has(h)) PALETTE[th].set(h, []); PALETTE[th].get(h).push(k); }
  }
}
const other = (th) => (th === 'dark' ? 'light' : 'dark');
/* цвета вне токенов, названные в CLAUDE.md */
const KNOWN = { '#808174': 'stone лого', '#2D2D2D': 'разделитель лого' };
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
/* ближайший токен темы, если цвет почти совпадает (на глаз неотличим) */
function nearest(th, h) {
  if (KNOWN[h]) return KNOWN[h];
  const a = rgb(h); let best = null, bd = 1e9;
  for (const [v, names] of PALETTE[th]) {
    if (v.length !== 7) continue;
    const b = rgb(v), d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    if (d < bd) { bd = d; best = names[0]; }
  }
  return bd <= 10 ? `≈${best}` : '';
}
const fmtHex = (th, list) => list.map(([v, n]) => { const near = nearest(th, v); return `${v}×${n}${near ? ` (${near})` : ''}`; }).join(' ');

/* 0. tokens.json ↔ :root ядра — штатная проверка сборки */
try {
  execFileSync(process.execPath, [join(ROOT, 'tooling/build-tokens.mjs'), '--check'], { stdio: 'pipe' });
} catch (e) {
  add('error', 'tokens', 'tokens.json', null, ':root ядра не совпадает с tokens.json (build-tokens --check упал)',
    'tokens.json', 'npm run build, затем npm run check');
}

/* Плоские правила CSS «selector { body }» — линейный проход (регулярка ([^{}]+)\{ квадратична на длинном тексте) */
function cssRules(text) {
  const out = [];
  let prev = 0; // позиция после последней { или }
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === 125) { prev = i + 1; continue; } // }
    if (c !== 123) continue; // {
    const close = text.indexOf('}', i + 1), nextOpen = text.indexOf('{', i + 1);
    if (close < 0) break;
    if (nextOpen >= 0 && nextOpen < close) { prev = i + 1; continue; } // вложенный блок (@media) — заходим внутрь
    const selRaw = text.slice(prev, i);
    out.push({ sel: selRaw.trim().split('\n').pop().replace(/\/\*[\s\S]*?\*\//g, '').trim(), body: text.slice(i + 1, close), index: prev, bodyStart: i + 1, end: close + 1 });
    i = close; prev = close + 1;
  }
  return out;
}

/* ═════════════ Разбор CSS страниц: переменные по темам ═════════════ */
function styleBlocks(html) {
  const out = [];
  const re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = re.exec(html))) out.push({ css: m[1], offset: m.index + m[0].indexOf('>') + 1 });
  return out;
}
/* selector → тема; null — не тематический блок */
function themeOfSelector(sel, map) {
  const s = sel.replace(/\s+/g, ' ').trim();
  for (const [re, th] of map) if (re.test(s)) return th;
  return null;
}
function themedVars(html, map) {
  const res = []; // {theme, name, value, idx}
  for (const { css, offset } of styleBlocks(html)) {
    for (const r of cssRules(css)) {
      const parts = r.sel.split(',').map((x) => x.trim());
      const themes = new Set(parts.map((p) => themeOfSelector(p, map)).filter(Boolean));
      if (themes.size !== 1 || parts.some((p) => !themeOfSelector(p, map))) continue;
      const th = [...themes][0];
      for (const d of r.body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
        res.push({ theme: th, name: d[1], value: d[2].trim(), idx: offset + r.bodyStart + d.index });
      }
    }
  }
  return res;
}

/* Страницы со своим CSS. map — какой селектор какой теме соответствует. */
const PAGES = [
  { file: 'site/partner-program/partner-program-r14.html', map: [[/^\.th-d$/, 'dark'], [/^\.th-l$/, 'light']] },
  { file: 'site/account.html', map: [[/^:root$/, 'dark'], [/^:root\[data-theme="light"\]$/, 'light']] },
  { file: 'site/cookie-banner/cookie-banner-handoff-standalone.html', map: [[/^:root$/, 'dark'], [/^\.theme-dark$/, 'dark'], [/^\.theme-light$/, 'light']] },
];
/* Локальные переменные, общие для нескольких страниц: эталон — страница партнёров (CLAUDE.md, «Футер») */
const SHARED_LOCAL_REF = 'site/partner-program/partner-program-r14.html';
const SHARED_LOCAL = /^--(foot-[a-z]+|logo)$/;

const sharedRef = {};
for (const pg of PAGES) {
  if (!existsSync(join(ROOT, pg.file))) { add('warn', 'pages', pg.file, null, 'файл не найден', '', 'убрать из PAGES в drift-check.mjs'); continue; }
  const html = read(pg.file);
  const vars = themedVars(html, pg.map);
  const seen = new Set();
  for (const v of vars) {
    const key = v.theme + v.name;
    if (seen.has(key)) continue; seen.add(key);
    const line = lineOf(html, v.idx);
    const core = CORE[v.theme][v.name];
    if (core !== undefined) {
      const a = HEX(v.value), b = HEX(core);
      if (a && b && a !== b) {
        add('error', 'pages', pg.file, line, `${v.name} (${v.theme}) = ${a}`, `${CORE_FILE[v.theme]}: ${v.name} = ${b}`,
          `заменить на ${b}`);
      } else if (!a && v.value.replace(/\s+/g, '') !== core.replace(/\s+/g, '') && !/var\(/.test(v.value)) {
        add('warn', 'pages', pg.file, line, `${v.name} (${v.theme}) = ${v.value}`, `${CORE_FILE[v.theme]}: ${core}`, 'сверить значение');
      }
    } else if (SHARED_LOCAL.test(v.name)) {
      if (pg.file === SHARED_LOCAL_REF) sharedRef[key] = v.value;
      else if (sharedRef[key] !== undefined && sharedRef[key].toUpperCase() !== v.value.toUpperCase()) {
        add('error', 'pages', pg.file, line, `${v.name} (${v.theme}) = ${v.value}`,
          `${SHARED_LOCAL_REF}: ${sharedRef[key]}`, `взять значение со страницы партнёров`);
      }
    } else {
      const h = HEX(v.value);
      if (h) {
        const hit = PALETTE[v.theme].get(h);
        // локальная переменная с hex, которого нет в палитре темы, — кандидат в токены
        if (!hit) add('warn', 'pages', pg.file, line, `локальная ${v.name} (${v.theme}) = ${h} — такого цвета нет в палитре темы`,
          `${CORE_FILE[v.theme]}`, 'вынести в tokens.json или взять существующий токен');
      }
    }
  }
}

/* 1a. Правила компонентов: тот же селектор в ядре и на странице — сверка ключевых свойств */
const COMPONENT = /^\.(btn|tag|form-|theme-toggle|t-|tt-|filter-chip|venue-chip|event-card|toast|badge)/;
const PROPS = ['color', 'background', 'background-color', 'border-color', 'font-family', 'font-size', 'font-weight', 'letter-spacing', 'text-transform', 'border-radius'];
function declMap(body) {
  const out = {};
  for (const d of body.replace(/\/\*[\s\S]*?\*\//g, '').split(';')) {
    const i = d.indexOf(':'); if (i < 0) continue;
    const k = d.slice(0, i).trim().toLowerCase(), v = d.slice(i + 1).trim().replace(/\s+/g, ' ');
    if (k === 'border' || /^border-(top|bottom|left|right)$/.test(k)) {
      const c = /(var\([^)]+\)|#[0-9a-f]{3,8}\b)/i.exec(v); if (c) out['border-color'] = c[1];
    } else out[k] = v;
  }
  return out;
}
function resolveVal(v, vars) {
  let guard = 0;
  while (/var\(--[a-z0-9-]+\)/i.test(v) && guard++ < 6) v = v.replace(/var\((--[a-z0-9-]+)\)/gi, (m, n) => vars[n] ?? m);
  v = v.replace(/#[0-9a-f]{3,8}\b/gi, (h) => norm(h)).replace(/(^|[\s(,])0\./g, '$1.').replace(/['"]/g, '').trim();
  if (/^transparent$/i.test(v)) v = 'transparent';
  return v;
}
for (const pg of PAGES) {
  if (!existsSync(join(ROOT, pg.file))) continue;
  const html = read(pg.file);
  const coreRules = new Map();
  for (const r of cssRules(read('ds-core-r14.css'))) if (!coreRules.has(r.sel.replace(/\s+/g, ' '))) coreRules.set(r.sel.replace(/\s+/g, ' '), r.body);
  const vars = { ...CORE.dark };
  for (const v of themedVars(html, pg.map)) if (v.theme === 'dark') vars[v.name] = v.value;
  for (const { css, offset } of styleBlocks(html)) {
    for (const r of cssRules(css)) {
      const sel = r.sel.replace(/\s+/g, ' ');
      if (!COMPONENT.test(sel) || !coreRules.has(sel)) continue;
      const a = declMap(r.body), b = declMap(coreRules.get(sel));
      const diff = [];
      for (const k of PROPS) {
        if (a[k] === undefined || b[k] === undefined) continue;
        const va = resolveVal(a[k], vars), vb = resolveVal(b[k], CORE.dark);
        if (k === 'font-family' ? va.split(',')[0] !== vb.split(',')[0] : va !== vb) diff.push(`${k}: ${a[k]} ≠ ${b[k]}`);
      }
      if (diff.length) add('warn', 'components', pg.file, lineOf(html, offset + r.bodyStart), `${sel} — ${diff.join('; ')}`,
        `ds-core-r14.css ${sel}`, 'перенести значения из ядра (правило на странице копируется руками, в обе копии)');
    }
  }
}

/* 1b. Байтовые копии */
const COPIES = [
  ['site/partner-program/partner-program-r14.html', 'site/partner-program/handoff/partner-program.html'],
];
for (const [a, b] of COPIES) {
  if (!existsSync(join(ROOT, a)) || !existsSync(join(ROOT, b))) continue;
  const A = readFileSync(join(ROOT, a)), B = readFileSync(join(ROOT, b));
  if (!A.equals(B)) {
    const la = A.toString('utf8').split('\n'), lb = B.toString('utf8').split('\n');
    let i = 0; while (i < la.length && la[i] === lb[i]) i++;
    add('error', 'copies', b, i + 1, `копия расходится с эталоном с строки ${i + 1} (${A.length} → ${B.length} байт)`,
      a, `cp "${a}" "${b}"`);
  }
}

/* ═════════════ 2. Сборки редизайна (разметка — JSON-строка в __bundler/template) ═════════════ */
function bundleTemplate(file) {
  const s = read(file);
  const m = /<script type="__bundler\/template"[^>]*>([\s\S]*?)<\/script>/.exec(s);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}
/* экраны и блоки, где цвета другой темы стоят намеренно */
const EXPECTED_FOREIGN = /Билет|tts-tk2/;
const BUNDLES = [['site/redesign-v2-dark.html', 'dark'], ['site/redesign-v2-light.html', 'light']];
for (const [file, th] of BUNDLES) {
  if (!existsSync(join(ROOT, file))) continue;
  const tpl = bundleTemplate(file);
  if (typeof tpl !== 'string') { add('error', 'redesign', file, null, 'не читается __bundler/template как JSON-строка', '', 'проверить сборку'); continue; }
  const tokenRanges = [];
  // блоки токенов: :root {…} — тёмная, [data-theme="light"] {…} — светлая
  const blockMap = [[/^:root$/, 'dark'], [/^\[data-theme="light"\]$/, 'light']];
  const rules = cssRules(tpl);
  for (const r of rules) {
    const t = themeOfSelector(r.sel, blockMap);
    if (!t) continue;
    tokenRanges.push([r.index, r.end]);
    for (const d of r.body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
      const core = CORE[t][d[1]];
      const a = HEX(d[2]), b = core && HEX(core);
      if (a && b && a !== b) {
        add('error', 'redesign', file, null, `блок токенов ${t === 'dark' ? ':root' : '[data-theme="light"]'}: ${d[1]} = ${a}`,
          `${CORE_FILE[t]}: ${d[1]} = ${b}`, `заменить на ${b} (правка через json.loads шаблона)`);
      }
    }
  }
  // селектор, внутри которого стоит позиция, — для контекста в отчёте
  const ruleAt = (i) => rules.find((x) => i >= x.bodyStart && i < x.end);
  const selAt = (i) => {
    const r = ruleAt(i);
    if (r) return r.sel.replace(/\s+/g, ' ').slice(0, 60);
    const k = tpl.lastIndexOf('data-screen-label="', i);
    const screen = k >= 0 ? tpl.slice(k + 19, tpl.indexOf('"', k + 19)) : '';
    return screen ? `экран «${screen}», inline` : 'inline-стиль';
  };
  // hex вне блоков токенов: цвет другой темы — подозрение на недонесённую правку
  const inTokens = (i) => tokenRanges.some(([s, e]) => i >= s && i < e);
  const foreign = new Map(), outside = new Map(), where = new Map();
  let expected = 0;
  for (const h of tpl.matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-fA-F-])/g)) {
    if (inTokens(h.index)) continue;
    const ctx = tpl.slice(Math.max(0, h.index - 2), h.index);
    if (/[&\w]$/.test(ctx)) continue; // &#123; и т. п.
    const v = norm(h[0]);
    const r = ruleAt(h.index);
    // правила под [data-theme="light"] / [data-theme="dark"] сверяются с палитрой своей темы
    const t = r && /\[data-theme="(light|dark)"\]/.exec(r.sel)?.[1] || th;
    if (PALETTE[t].has(v)) continue;
    if (t !== th) { outside.set(v, (outside.get(v) || 0) + 1); continue; }
    // билет — светлая плашка в обеих темах (CLAUDE.md, «Штрихкод»): чужие цвета там ожидаемы
    if (PALETTE[other(th)].has(v) && EXPECTED_FOREIGN.test(selAt(h.index))) { expected++; continue; }
    if (PALETTE[other(th)].has(v)) {
      foreign.set(v, (foreign.get(v) || 0) + 1);
      const w = where.get(v) || new Set(); if (w.size < 3) w.add(selAt(h.index)); where.set(v, w);
    }
    else outside.set(v, (outside.get(v) || 0) + 1);
  }
  for (const [v, n] of [...foreign].sort((a, b) => b[1] - a[1])) {
    const names = PALETTE[other(th)].get(v).join(', ');
    add('warn', 'redesign', file, null, `${v} ×${n} — цвет ${other(th) === 'dark' ? 'тёмной' : 'светлой'} темы (${names}), в палитре ${th === 'dark' ? 'тёмной' : 'светлой'} его нет`,
      `${CORE_FILE[th]}: ${names.split(', ').map((n2) => `${n2} = ${CORE[th][n2] || '—'}`).join('; ')}`,
      `где: ${[...where.get(v)].join(' | ')} — если это не светлая плашка/инверсия, взять цвет своей темы`);
  }
  if (expected) add('info', 'redesign', file, null, `${expected} вхождений цветов другой темы на билете — ожидаемо (светлая плашка)`, 'CLAUDE.md, «Штрихкод»', '');
  if (outside.size) {
    const top = [...outside].sort((a, b) => b[1] - a[1]);
    const total = top.reduce((s, x) => s + x[1], 0);
    if (SHOW_ALL) {
      add('info', 'redesign', file, null, `${outside.size} hex вне палитры (${total} вхождений): ${fmtHex(th, top)}`,
        CORE_FILE[th], 'жанровые обложки и иллюстрации допустимы; UI-цвета — кандидаты в токены');
    } else {
      add('info', 'redesign', file, null, `${outside.size} hex вне палитры темы (${total} вхождений), чаще всего: ${fmtHex(th, top.slice(0, 6))}`,
        CORE_FILE[th], 'полный список — с флагом --all');
    }
  }
}

/* ═════════════ 3. CLAUDE.md и DECISIONS.md ═════════════ */
{
  const file = 'CLAUDE.md';
  const md = read(file);
  const sections = [['### Тёмная тема', 'dark'], ['### Светлая тема', 'light']];
  for (const [head, th] of sections) {
    const i = md.indexOf(head);
    if (i < 0) { add('warn', 'claude-md', file, null, `нет раздела «${head}»`, '', ''); continue; }
    const s = md.indexOf('```', i), e = md.indexOf('```', s + 3);
    const block = md.slice(s, e);
    for (const d of block.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9A-Fa-f]{3,8})\b/g)) {
      const line = lineOf(md, s + d.index);
      const core = CORE[th][d[1]];
      if (core === undefined) {
        add('error', 'claude-md', file, line, `${d[1]} (${th}) описан, но в ядре такого токена нет`, CORE_FILE[th],
          'убрать строку или переименовать в токен ядра');
      } else if (HEX(core) && HEX(core) !== norm(d[2])) {
        add('error', 'claude-md', file, line, `${d[1]} (${th}) = ${norm(d[2])}`, `${CORE_FILE[th]}: ${HEX(core)}`, `заменить на ${HEX(core)}`);
      }
    }
    // токены ядра, которых нет в справочнике CLAUDE.md
    const documented = new Set([...block.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((x) => x[1]));
    const missing = Object.keys(CORE[th]).filter((k) => HEX(CORE[th][k]) && !documented.has(k));
    if (missing.length) {
      add('warn', 'claude-md', file, lineOf(md, s), `в разделе «${head.slice(4)}» нет цветовых токенов ядра: ${missing.join(', ')}`,
        CORE_FILE[th], 'дописать строки со значениями из ядра');
    }
  }
}
for (const file of ['CLAUDE.md', 'DECISIONS.md']) {
  const md = read(file);
  // «`--name` (`#HEX`)» и похожие пары в тексте: значение должно быть у токена хотя бы в одной теме
  const fence = [];
  for (const f of md.matchAll(/```[\s\S]*?```/g)) fence.push([f.index, f.index + f[0].length]);
  for (const d of md.matchAll(/`(--[a-z0-9-]+)`[^#`\n]{0,6}`?(#[0-9A-Fa-f]{6})\b/g)) {
    if (fence.some(([s, e]) => d.index >= s && d.index < e)) continue;
    const v = norm(d[2]);
    const dk = CORE.dark[d[1]], lt = CORE.light[d[1]];
    if (dk === undefined && lt === undefined) continue;
    if ((dk && HEX(dk) === v) || (lt && HEX(lt) === v)) continue;
    add('error', 'decisions', file, lineOf(md, d.index), `${d[1]} указан как ${v}`,
      `ядро: dark ${dk || '—'}, light ${lt || '—'}`, 'поправить значение в тексте');
  }
}

/* ═════════════ 4. Figma-скрипты ═════════════ */
{
  const tokens = JSON.parse(read('tokens.json'));
  const fs = 'figma/figma-script.js';
  const COLORS = new Set();
  if (existsSync(join(ROOT, fs))) {
    const js = read(fs);
    for (const r of js.matchAll(/\[\s*'([a-z0-9-]+)'\s*,\s*'(#[0-9A-Fa-f]{6,8})'\s*,\s*'(#[0-9A-Fa-f]{6,8})'\s*\]/g)) {
      COLORS.add(r[1]);
      for (const [th, val] of [['dark', r[2]], ['light', r[3]]]) {
        const core = CORE[th]['--' + r[1]];
        if (core === undefined) add('error', 'figma', fs, lineOf(js, r.index), `COLORS: ${r[1]} — такого токена нет в ядре`, CORE_FILE[th], 'убрать или переименовать');
        else if (HEX(core) !== norm(val)) add('error', 'figma', fs, lineOf(js, r.index), `COLORS ${r[1]} (${th}) = ${norm(val)}`, `${CORE_FILE[th]}: ${HEX(core)}`, `заменить на ${HEX(core)} и перезапустить скрипт в Figma`);
      }
    }
    for (const k of Object.keys(CORE.dark)) {
      if (HEX(CORE.dark[k]) && !COLORS.has(k.slice(2)) && !['--black'].includes(k)) {
        add('warn', 'figma', fs, null, `в COLORS нет токена ${k}`, `${CORE_FILE.dark}: ${CORE.dark[k]}`, 'добавить строку [name, dark, light]');
      }
    }
    const prim = tokens.global?.primitives || {};
    const flat = {};
    (function walk(o, p) { for (const [k, v] of Object.entries(o)) { if (v && typeof v === 'object' && 'value' in v) flat[p + k] = v.value; else if (v && typeof v === 'object') walk(v, p + k + '/'); } })(prim, '');
    for (const r of js.matchAll(/'([a-z]+\/[a-z0-9-]+)'\s*:\s*'(#[0-9A-Fa-f]{6})'/g)) {
      if (flat[r[1]] !== undefined && norm(flat[r[1]]) !== norm(r[2])) {
        add('error', 'figma', fs, lineOf(js, r.index), `PRIMS ${r[1]} = ${norm(r[2])}`, `tokens.json global.primitives: ${flat[r[1]]}`, `заменить на ${flat[r[1]]}`);
      }
    }
  }
  // кнопки: STYLES / BTN_ST против правил .btn-* ядра
  const core = read('ds-core-r14.css');
  const btnRule = (cls) => {
    const m = new RegExp(`^\\.${cls}\\s*\\{([^}]*)\\}`, 'm').exec(core);
    if (!m) return null;
    const v = (prop) => { const x = new RegExp(`(?:^|;|\\s)${prop}\\s*:[^;]*?var\\(--([a-z0-9-]+)\\)`).exec(m[1]); return x ? x[1] : null; };
    const bg = /background\s*:\s*transparent/.test(m[1]) ? null : v('background');
    return { bg, bd: v('border'), tx: v('color') };
  };
  const BTN = { 'Primary': 'btn-primary', 'Ghost': 'btn-ghost', 'Ghost Accent': 'btn-ghost-accent', 'Danger': 'btn-danger' };
  for (const f of ['figma/figma-button.js', 'figma/figma-ds-all.js']) {
    if (!existsSync(join(ROOT, f))) continue;
    const js = read(f);
    for (const r of js.matchAll(/\{\s*n(?:ame)?\s*:\s*'([^']+)'\s*,\s*bg\s*:\s*(null|gv\([A-Z]+\s*,\s*'([a-z0-9-]+)'\))\s*,\s*bd\s*:\s*gv\([A-Z]+\s*,\s*'([a-z0-9-]+)'\)\s*,\s*tx\s*:\s*gv\([A-Z]+\s*,\s*'([a-z0-9-]+)'\)/g)) {
      const cls = BTN[r[1]]; if (!cls) continue;
      const ref = btnRule(cls); if (!ref) continue;
      const got = { bg: r[3] || null, bd: r[4], tx: r[5] };
      for (const k of ['bg', 'bd', 'tx']) {
        if (got[k] !== ref[k]) {
          add('error', 'figma', f, lineOf(js, r.index), `кнопка «${r[1]}»: ${k} = ${got[k] ? '--' + got[k] : 'нет'}`,
            `ds-core-r14.css .${cls}: ${ref[k] ? 'var(--' + ref[k] + ')' : 'transparent'}`,
            `${k}: ${ref[k] ? `gv(D,'${ref[k]}')` : 'null'}, затем перезапустить скрипт в Figma`);
        }
      }
    }
    // имена переменных, которых нет в Color/Dark — gv вернёт null, и Figma нарисует запасной цвет
    for (const r of js.matchAll(/gv\(\s*(?:D|DARK)\s*,\s*'([a-z0-9-]+)'\s*\)/g)) {
      if (COLORS.size && !COLORS.has(r[1])) add('error', 'figma', f, lineOf(js, r.index), `gv(D,'${r[1]}') — нет такой переменной в COLORS`, 'figma/figma-script.js COLORS', 'взять имя токена из ядра');
    }
  }
  // запасные HEX в figma-new-*.js
  for (const f of readdirSync(join(ROOT, 'figma')).filter((x) => x.endsWith('.js')).map((x) => 'figma/' + x)) {
    const js = read(f);
    const m = /const HEX\s*=\s*\{([\s\S]*?)\};/.exec(js);
    if (!m) continue;
    for (const r of m[1].matchAll(/'?([a-z0-9-]+)'?\s*:\s*'(#[0-9A-Fa-f]{6})'/g)) {
      const c = CORE.dark['--' + r[1]];
      if (c && HEX(c) !== norm(r[2])) add('error', 'figma', f, lineOf(js, m.index + r.index), `HEX.${r[1]} = ${norm(r[2])}`, `ds-core-r14.css: ${HEX(c)}`, `заменить на ${HEX(c)}`);
    }
  }
}

/* ═════════════ 5. Витрина index.html ═════════════ */
{
  let published = [];
  try {
    published = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', 'site'], { cwd: ROOT, encoding: 'utf8' })
      .split('\n').filter((f) => f.endsWith('.html') && existsSync(join(ROOT, f)));
  } catch { add('warn', 'index', 'index.html', null, 'git недоступен — список публичных страниц не построен', '', ''); }
  const pub = new Set(published);
  const idx = read('index.html');
  const hrefs = (html, base) => [...html.matchAll(/href="([^"#?]+)(?:[#?][^"]*)?"/g)]
    .map((m) => m[1]).filter((h) => !/^(https?:|mailto:|tel:|data:|\/\/)/.test(h))
    .map((h) => posix.normalize(posix.join(posix.dirname(base), decodeURI(h))));
  // битые ссылки витрины
  for (const h of new Set(hrefs(idx, 'index.html'))) {
    if (!existsSync(join(ROOT, h))) add('error', 'index', 'index.html', null, `ссылка на несуществующий файл ${h}`, '', 'убрать ссылку или вернуть файл');
    else if (h.startsWith('site/') && h.endsWith('.html') && published.length && !pub.has(h)) {
      add('error', 'index', 'index.html', null, `ссылка на ${h}, а файл закрыт .gitignore — на Pages будет 404`, '.gitignore', 'убрать ссылку или открыть файл');
    }
  }
  // достижимость: прямая ссылка из витрины или со страницы, на которую она ведёт
  const reach = new Set(), queue = hrefs(idx, 'index.html').filter((h) => pub.has(h));
  while (queue.length) {
    const h = queue.shift();
    if (reach.has(h)) continue; reach.add(h);
    if (!/\.html$/.test(h) || !existsSync(join(ROOT, h))) continue;
    const html = read(h);
    if (html.length > 1_500_000) continue; // бандлы — ссылок наружу не несут
    for (const n of hrefs(html, h)) if (pub.has(n) && !reach.has(n)) queue.push(n);
  }
  const lost = published.filter((f) => !reach.has(f));
  const byDir = {};
  for (const f of lost) (byDir[posix.dirname(f)] ||= []).push(posix.basename(f));
  for (const [dir, files] of Object.entries(byDir)) {
    add('warn', 'index', 'index.html', null, `публичные страницы без ссылки в витрине (${dir}/): ${files.join(', ')}`,
      '.gitignore открывает их для Pages', 'добавить карточку в index.html или закрыть файл в .gitignore');
  }
}

/* ═════════════ 6. Офлайн-копии редизайна в ~/Downloads ═════════════ */
{
  const dl = join(homedir(), 'Downloads');
  const pairs = [
    ['TTS Redesign v2 - офлайн.html', 'site/redesign-v2-light.html'],
    ['TTS Redesign v2 - тёмная - офлайн.html', 'site/redesign-v2-dark.html'],
    ['TTS Redesign v2 - тёмная - офлайн (1).html', 'site/redesign-v2-dark.html'],
  ];
  for (const [name, src] of pairs) {
    const p = join(dl, name);
    if (!existsSync(p) || !existsSync(join(ROOT, src))) continue;
    const a = readFileSync(p), b = readFileSync(join(ROOT, src));
    if (!a.equals(b)) {
      const older = statSync(p).mtimeMs < statSync(join(ROOT, src)).mtimeMs;
      add('warn', 'downloads', `~/Downloads/${name}`, null,
        `копия отличается от ${src}${older ? ' и старше его' : ' и НОВЕЕ его — возможно, правка сделана в копии'}`,
        src, older ? `cp "${src}" "~/Downloads/${name}"` : 'сравнить вручную, прежде чем перезаписывать');
    }
  }
}

/* ═════════════ Отчёт ═════════════ */
const order = { error: 0, warn: 1, info: 2 };
findings.sort((a, b) => order[a.level] - order[b.level] || a.check.localeCompare(b.check) || a.file.localeCompare(b.file) || (a.line || 0) - (b.line || 0));
const errors = findings.filter((f) => f.level === 'error').length;
const warns = findings.filter((f) => f.level === 'warn').length;

if (JSON_OUT) {
  process.stdout.write(JSON.stringify({ errors, warnings: warns, findings }, null, 2) + '\n');
} else {
  const label = { error: '✗ ОШИБКА', warn: '! ВНИМАНИЕ', info: '· сводка' };
  let cur = '';
  for (const f of findings) {
    if (f.check !== cur) { cur = f.check; console.log(`\n── ${cur} ──`); }
    console.log(`${label[f.level]}  ${f.file}${f.line ? ':' + f.line : ''}\n    расходится: ${f.what}${f.ref ? `\n    эталон:     ${f.ref}` : ''}${f.fix ? `\n    правка:     ${f.fix}` : ''}`);
  }
  console.log(`\nИтог: ошибок ${errors}, предупреждений ${warns}.` + (errors ? '' : ' Эталон и копии сходятся.'));
}
process.exit(errors ? 1 : 0);
