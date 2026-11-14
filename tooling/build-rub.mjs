#!/usr/bin/env node
/**
 * TTS DS — знак ₽ шрифтом Source Serif 4, вшитый в файлы (решение №40)
 * ─────────────────────────────────────────────────────────────────────
 * В Oranienbaum и Forum знака ₽ нет. Без собственного глифа браузер берёт запасной шрифт — ₽ получается жирным и
 * чужим. Раньше Source Serif 4 подгружался из Google: ломалось без сети, при блокировке и в каждой новой выгрузке
 * сборки редизайна (внешний инструмент пересобирает файл целиком и затирает правки).
 * Теперь глиф (1 КБ) вшит base64 прямо в файл. Скрипт ставит его туда, где он нужен, и проверяет, что он не пропал.
 *
 *   node tooling/build-rub.mjs           # расставить блок везде, где нужен
 *   node tooling/build-rub.mjs --check   # ничего не пишет; выход 1, если где-то блока нет или он устарел
 *
 * Куда ставится:
 *   · ядро обеих тем и ds-smm.css — блок CSS на месте старого @import из Google;
 *   · любая страница со знаком ₽, которая не подключает ядро, — <style data-tts-rub> сразу после <head>;
 *   · сборки редизайна site/redesign-v2-*.html — в шаблон и в каждый встроенный HTML-ресурс (схема зала);
 *   · письма emails/ — тем же <style>: Apple Mail, iOS Mail и Thunderbird берут вшитый ₽ (цифры у них тоже Oranienbaum). Gmail и Outlook
 *     веб-шрифты не грузят — там и цифры, и ₽ рисует Georgia/Times, они совпадают. Письма пересобирает tooling/build-emails.py,
 *     после него `npm run build:emails` сам вызывает этот скрипт.
 * Пришла новая выгрузка редизайна — `npm run build`: блок встанет заново.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { gunzipSync, gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CSS_BLOCK, BLOCK_RE } from './rub/index.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');

const RUB_CHAR = /₽|&#8381;|&#x20bd;|\\u20bd|\\\\u20bd/i;
const CORE_LINK = /<link[^>]+href=["'][^"']*ds-core-r14(?:-light)?\.css/i;
const STYLE_RE = /<style data-tts-rub>[\s\S]*?<\/style>/;
const STYLE = `<style data-tts-rub>${CSS_BLOCK}</style>`;
const GOOGLE_LINK_ONLY = /[ \t]*<link[^>]+href=["']https:\/\/fonts\.googleapis\.com\/css2\?family=Source\+Serif\+4[^"']*["'][^>]*>\r?\n?/g;
const GOOGLE_PARAM = /&family=Source\+Serif\+4[^&"']*/g;

const CORES = ['ds-core-r14.css', 'ds-core-r14-light.css'];
const BUNDLES = /^site\/redesign-v2-(?:dark|light)\.html$/;

/* ── CSS: ядра и ds-smm.css ── */
const LEGACY_CORE = /\/\* Знак ₽:[\s\S]*?@import url\('https:\/\/fonts\.googleapis\.com\/css2\?family=Source\+Serif\+4[^']*'\);/;
const CORE_INTRO =
  '/* Знак ₽ (решение №40): в Oranienbaum и Forum его нет, поэтому глиф из Source Serif 4 вшит ниже base64 — без сети.\n' +
  '   Не подключай Source Serif 4 через Google ради ₽: так оно и ломалось. */\n';
function patchCss(text) {
  if (BLOCK_RE.test(text)) return text.replace(BLOCK_RE, () => CSS_BLOCK);
  if (LEGACY_CORE.test(text)) return text.replace(LEGACY_CORE, () => CORE_INTRO + CSS_BLOCK);
  const i = text.search(/^:root\b/m);
  if (i < 0) throw new Error('нет :root, некуда вставить блок ₽');
  return text.slice(0, i) + CSS_BLOCK + '\n\n' + text.slice(i);
}

/* ── HTML со своим CSS ── */
function patchHtml(text) {
  let t = text.replace(GOOGLE_LINK_ONLY, '').replace(GOOGLE_PARAM, '');
  if (STYLE_RE.test(t)) return t.replace(STYLE_RE, () => STYLE);
  const m = /<head[^>]*>/i.exec(t);
  if (!m) throw new Error('нет <head>');
  const i = m.index + m[0].length;
  return t.slice(0, i) + '\n' + STYLE + t.slice(i);
}

/* ── сборка редизайна (Bundled Page): шаблон — JSON-строка, ресурсы — gzip+base64 ── */
const jsonEsc = (s) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/<\//g, '<\\u002F');
const STYLE_ESC = jsonEsc(STYLE);
const STYLE_ESC_RE = /<style data-tts-rub>[\s\S]*?<\\u002Fstyle>/;
function patchBundle(raw) {
  /* 1. шаблон страницы */
  const a = raw.indexOf('<script type="__bundler/template">');
  if (a < 0) throw new Error('нет __bundler/template — формат сборки изменился');
  const b = raw.indexOf('</script>', a);
  let tpl = raw.slice(a, b);
  if (STYLE_ESC_RE.test(tpl)) tpl = tpl.replace(STYLE_ESC_RE, () => STYLE_ESC);
  else {
    const m = /<head[^>]*>/i.exec(tpl);
    if (!m) throw new Error('в шаблоне сборки нет <head>');
    const i = m.index + m[0].length;
    tpl = tpl.slice(0, i) + '\\n' + STYLE_ESC + tpl.slice(i);
  }
  let out = raw.slice(0, a) + tpl + raw.slice(b);
  /* 2. встроенные HTML-ресурсы (схема зала и т. п.) */
  out = out.replace(/("mime":"text\/html","compressed":(true|false),"data":")([A-Za-z0-9+/=]*)(")/g, (all, pre, comp, data, post) => {
    let buf = Buffer.from(data, 'base64');
    if (comp === 'true') buf = gunzipSync(buf);
    let html = buf.toString('utf8');
    if (html.includes('<script type="__bundler/template">')) html = patchBundle(html.replace(new RegExp(STYLE_RE.source, 'g'), '')); // вложенная сборка (схема зала): её страница пересобирается скриптом после загрузки; хвост от прежних запусков убираем
    else if (STYLE_RE.test(html)) html = html.replace(STYLE_RE, () => STYLE);
    else {
      const m = /<head[^>]*>/i.exec(html);
      html = m ? html.slice(0, m.index + m[0].length) + '\n' + STYLE + html.slice(m.index + m[0].length) : STYLE + '\n' + html;
    }
    let enc = Buffer.from(html, 'utf8');
    if (comp === 'true') enc = gzipSync(enc, { level: 9 });
    return pre + enc.toString('base64') + post;
  });
  return out;
}

/* ── обход ── */
const files = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' })
  .split('\n').filter((f) => /\.(html|css)$/.test(f))
  .filter((f) => !/^(_archive|node_modules|tooling\/build)\//.test(f));

let changed = 0, stale = 0, checked = 0;
function apply(rel, fn, why) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) return;
  const before = readFileSync(p, 'utf8');
  let after;
  try { after = fn(before); } catch (e) { console.error(`  ✗ ${rel}: ${e.message}`); stale++; return; }
  checked++;
  if (after === before) return;
  if (CHECK) { console.error(`  ✗ ${rel} — нет актуального блока ₽ (${why}). Запусти: npm run build`); stale++; return; }
  writeFileSync(p, after); changed++;
  console.log(`  → ${rel} — блок ₽ (${why})`);
}

for (const f of CORES) apply(f, patchCss, 'ядро');
apply('ds-smm.css', patchCss, 'слой соцсетей');
for (const rel of files) {
  if (!rel.endsWith('.html')) continue;
  if (BUNDLES.test(rel)) { apply(rel, patchBundle, 'сборка редизайна'); continue; }
  const text = readFileSync(join(ROOT, rel), 'utf8');
  if (!RUB_CHAR.test(text) || CORE_LINK.test(text)) continue;
  apply(rel, patchHtml, 'страница со своим CSS');
}

if (CHECK) {
  if (stale) { console.error(`\nЗнак ₽: ${stale} файл(ов) без актуального блока. Чинится одной командой: npm run build`); process.exit(1); }
  console.log(`✓ знак ₽: вшитый Source Serif 4 на месте во всех файлах (${checked} проверено)`);
} else {
  console.log(changed ? `✓ знак ₽ расставлен: ${changed} файл(ов)` : `✓ знак ₽: всё на месте (${checked} проверено)`);
}
