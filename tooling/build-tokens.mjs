#!/usr/bin/env node
/**
 * TTS DS R14 — генератор :root из tokens.json
 * ───────────────────────────────────────────────
 * Единый источник истины — tokens.json. Этот скрипт собирает из него
 * блок :root и ВСТАВЛЯЕТ его в начало ds-core-r14.css (dark) и
 * ds-core-r14-light.css (light), не трогая правила компонентов ниже.
 * Также кладёт автономные tooling/build/ds-tokens-{dark,light}.css.
 *
 * Запуск:
 *   node tooling/build-tokens.mjs --check   # ничего не пишет, сверяет значения со старым :root
 *   node tooling/build-tokens.mjs           # генерирует и записывает
 *
 * Зависимостей нет — только Node (тестировалось на v22).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const TOOLING = dirname(fileURLToPath(import.meta.url));
const ROOT = join(TOOLING, '..');
const tokens = JSON.parse(readFileSync(join(ROOT, 'tokens.json'), 'utf8'));
const g = tokens.global;
const CHECK = process.argv.includes('--check');

/* разрешить алиас {a.b.c} в литерал */
function resolve(v) {
  let guard = 0;
  while (typeof v === 'string' && v.startsWith('{') && v.endsWith('}')) {
    let node = tokens;
    for (const p of v.slice(1, -1).split('.')) node = node && node[p];
    v = node && node.value;
    if (++guard > 10) throw new Error('Зацикленный алиас: ' + v);
  }
  return v;
}
const px = (v) => `${v}px`;
const col = (theme, key) => resolve(tokens[theme].color[key].value);

/* карта --переменная → значение для темы */
function valueMap(theme) {
  const c = (k) => col(theme, k);
  const m = {
    '--black': resolve(g.primitives.neutral.black.value),
    '--ink': c('ink'),
    '--accent': c('accent'),
    '--accent-hover': c('accent-hover'),
    '--accent-dim': c('accent-dim'),
    '--accent-ghost': c('accent-ghost'),
    '--accent-border': c('accent-border'),
  };
  for (const n of ['n100','n200','n300','n400','n500','n600','n700','n800','n900','n950']) m[`--${n}`] = c(n);
  for (const b of ['blob-core','blob-mid','blob-purple','blob-faint',
                   'blob-core-warm','blob-mid-warm','blob-core-cool','blob-mid-cool','blob-core-green','blob-mid-green'])
    m[`--${b}`] = c(b);
  for (const s of ['success','success-bg','success-border','danger','danger-bg','danger-border','danger-text']) m[`--${s}`] = c(s);
  m['--font']   = resolve(g.font.stack.ui.value);
  m['--f-head'] = resolve(g.font.stack.heading.value);
  m['--f-thin'] = resolve(g.font.stack.display.value);
  for (const k of ['n850','seat-sel','seat-sold','seat-check','zone-1','zone-2','zone-3','zone-4','zone-5']) m[`--${k}`] = c(k);
  m['--f-num']  = resolve(g.font.stack.number.value);
  for (const k of ['sp-1','sp-2','sp-3','sp-4','sp-5','sp-6','sp-8','sp-10','sp-12','sp-16','sp-20']) m[`--${k}`] = px(g.spacing[k].value);
  m['--section-gap-sm'] = px(g.spacing['section-sm'].value);
  m['--section-gap-md'] = px(g.spacing['section-md'].value);
  m['--section-gap-lg'] = px(g.spacing['section-lg'].value);
  m['--ease-out']    = g.animation['ease-out'].value;
  m['--ease-bounce'] = g.animation['ease-bounce'].value;
  m['--dur-fast']    = g.animation['dur-fast'].value;
  m['--dur-base']    = g.animation['dur-base'].value;
  m['--dur-slow']    = g.animation['dur-slow'].value;
  m['--r-sm']   = px(g.radius.sm.value);
  m['--r-md']   = px(g.radius.md.value);
  m['--r-lg']   = px(g.radius.lg.value);
  m['--r-full'] = px(g.radius.full.value);
  m['--content-max'] = g.layout['content-max'].value;
  m['--page-pad']    = g.layout['page-pad'].value;
  m['--col-gap']     = g.layout['col-gap'].value;
  return m;
}

/* порядок и группировка вывода (комментарии = как в исходнике) */
const GROUPS = [
  ['Цвет', ['--black','--ink','--accent','--accent-hover','--accent-dim','--accent-ghost','--accent-border']],
  [null, ['--n100','--n200','--n300','--n400','--n500','--n600','--n700','--n800','--n850','--n900','--n950']],
  ['Блоб-атмосфера (solid)', ['--blob-core','--blob-mid','--blob-purple','--blob-faint']],
  ['Blob presets для событий', ['--blob-core-warm','--blob-mid-warm','--blob-core-cool','--blob-mid-cool','--blob-core-green','--blob-mid-green']],
  ['Семантические цвета', ['--success','--success-bg','--success-border','--danger','--danger-bg','--danger-border','--danger-text']],
  ['Схема зала', ['--seat-sel','--seat-sold','--seat-check','--zone-1','--zone-2','--zone-3','--zone-4','--zone-5']],
  ['Шрифты', ['--font','--f-head','--f-thin','--f-num']],
  ['Отступы', ['--sp-1','--sp-2','--sp-3','--sp-4','--sp-5','--sp-6','--sp-8','--sp-10','--sp-12','--sp-16','--sp-20']],
  ['Межсекционные отступы', ['--section-gap-sm','--section-gap-md','--section-gap-lg']],
  ['Анимации', ['--ease-out','--ease-bounce','--dur-fast','--dur-base','--dur-slow']],
  ['Радиус', ['--r-sm','--r-md','--r-lg','--r-full']],
  ['Контент', ['--content-max']],
  ['Режим по умолчанию — mobile', ['--page-pad','--col-gap']],
];

function renderRoot(theme) {
  const m = valueMap(theme);
  const lines = ['/* ───────── GENERATED FROM tokens.json — НЕ РЕДАКТИРОВАТЬ ВРУЧНУЮ ───────── */', ':root {'];
  GROUPS.forEach(([title, vars], gi) => {
    if (gi > 0) lines.push('');
    if (title) lines.push(`  /* ${title} */`);
    for (const v of vars) {
      if (!(v in m)) throw new Error(`Нет значения для ${v} (${theme})`);
      lines.push('  ' + (v + ':').padEnd(18) + ' ' + m[v] + ';');
    }
  });
  lines.push('}');
  return lines.join('\n');
}

/* разобрать объявления --x: y; из текста :root */
function decls(block) {
  const map = {};
  const re = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let mm;
  while ((mm = re.exec(block))) map[mm[1]] = mm[2].trim();
  return map;
}

/* найти первый блок :root { ... } по балансу скобок */
function findRoot(css) {
  const start = css.indexOf(':root');
  if (start < 0) throw new Error(':root не найден');
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return { start, end: i };
  }
  throw new Error('Не закрыт :root');
}

const FILES = [
  { theme: 'dark',  file: join(ROOT, 'ds-core-r14.css') },
  { theme: 'light', file: join(ROOT, 'ds-core-r14-light.css') },
];

let problems = 0;
mkdirSync(join(TOOLING, 'build'), { recursive: true });

for (const { theme, file } of FILES) {
  const css = readFileSync(file, 'utf8');
  const { start, end } = findRoot(css);
  const oldBlock = css.slice(start, end + 1);
  const newRoot = renderRoot(theme);
  const newBlock = newRoot.slice(newRoot.indexOf(':root'));

  // сверка значений старого и нового :root
  const oldD = decls(oldBlock), newD = decls(newBlock);
  const allKeys = new Set([...Object.keys(oldD), ...Object.keys(newD)]);
  const diffs = [];
  for (const k of allKeys) {
    if (!(k in oldD)) diffs.push(`  + ${k} (новая, не было в CSS)`);
    else if (!(k in newD)) diffs.push(`  - ${k} (есть в CSS, нет в токенах!)`);
    else if (oldD[k] !== newD[k]) diffs.push(`  ~ ${k}: было "${oldD[k]}" → стало "${newD[k]}"`);
  }
  console.log(`\n[${theme}] ${file.split('/').pop()} — переменных: старых ${Object.keys(oldD).length}, новых ${Object.keys(newD).length}`);
  if (diffs.length) { problems += diffs.length; console.log('  Расхождения:\n' + diffs.join('\n')); }
  else console.log('  ✓ значения идентичны исходному :root');

  // автономный файл токенов
  writeFileSync(join(TOOLING, 'build', `ds-tokens-${theme}.css`), newRoot + '\n');

  if (!CHECK) {
    writeFileSync(file, css.slice(0, start) + newBlock + css.slice(end + 1));
  }
}

if (CHECK) {
  console.log(`\n${problems ? '✗ есть расхождения (' + problems + ') — НЕ записывал' : '✓ проверка пройдена, расхождений нет'} (режим --check, файлы не менялись)`);
  process.exit(problems ? 1 : 0);
} else {
  console.log(`\n✓ Сгенерировано и записано. Расхождений значений: ${problems}.`);
  process.exit(problems ? 1 : 0);
}
