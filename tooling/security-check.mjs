#!/usr/bin/env node
/**
 * TTS DS — проверка перед публикацией (security-check)
 * ────────────────────────────────────────────────────
 * Репозиторий ПУБЛИЧНЫЙ. Скрипт проверяет всё, что уйдёт в git: отслеживаемые файлы
 * и новые, не закрытые .gitignore. Выход 1, если нашлось хоть одно:
 *   • запрещённый путь или формат: decks/ docs/ smm/ uploads/ _archive/ brand/source/ concepts/, в figma/ — всё, кроме .js,
 *     .fig .ai .psd .pptx .key .pdf .zip .mp4 .bak .pem, .env, .DS_Store
 *   • секрет: приватный ключ, токены GitHub / OpenAI / Anthropic / AWS / Google / Slack / Telegram
 *   • личные данные: e-mail не из списка заглушек, путь /Users/…, имя автора
 *   • файл крупнее 25 МБ
 * Предупреждение (выход не валит): телефон, похожий на настоящий.
 *
 * Бандлы (site/redesign-v2-*.html) хранят страницы в gzip+base64 внутри JSON —
 * их ресурсы распаковываются и проверяются так же, как обычные файлы.
 *
 *   node tooling/security-check.mjs      # или npm run security
 *
 * Зависимостей нет — только Node и git. Запускается pre-push хуком (.githooks/) и в CI.
 */
import { readFileSync, statSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, relative } from 'node:path';

const SELF = fileURLToPath(import.meta.url);
const ROOT = join(dirname(SELF), '..');
const SELF_REL = relative(ROOT, SELF);

const FORBIDDEN_DIR = /^(decks|docs|smm|uploads|_archive|brand\/source|concepts|node_modules)\//;
const FIGMA_OK = /^figma\/[^/]+\.js$/; // Scripter-скрипты публичны, макеты — нет
const FORBIDDEN_FILE = /(^|\/)(\.DS_Store|\.env[^/]*)$/;
const FORBIDDEN_EXT = new Set(['.fig', '.ai', '.psd', '.sketch', '.pptx', '.key', '.pdf', '.zip', '.mp4', '.mov', '.bak', '.pem', '.p12']);
const TEXT_EXT = new Set(['', '.html', '.css', '.js', '.mjs', '.json', '.md', '.txt', '.svg', '.yml', '.yaml']);
const MAX_MB = 25;

const SECRETS = [
  ['приватный ключ', /-----BEGIN [A-Z ]*PRIVATE KEY-----/g],
  ['GitHub-токен', /\b(?:gh[pousr]_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{50,})/g],
  ['OpenAI/Anthropic-ключ', /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}/g],
  ['AWS-ключ', /\bAKIA[0-9A-Z]{16}\b/g],
  ['Google API-ключ', /\bAIza[0-9A-Za-z_-]{35}(?![A-Za-z0-9+/])/g],
  ['Slack-токен', /\bxox[abprs]-[A-Za-z0-9-]{10,}/g],
  ['Telegram bot-токен', /\b\d{8,10}:AA[A-Za-z0-9_-]{33}\b/g],
];

/* e-mail, которые можно показывать: домены-примеры, noreply GitHub и известные заглушки */
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const EMAIL_OK_DOMAIN = /@(?:example\.(?:com|org|net|ru)|domain\.com|email\.com|users\.noreply\.github\.com)$/i;
const EMAIL_OK = new Set(['support@tickettoshow.ru', 'ivan@mail.ru', 'ivan@mail.es']);
const NOT_EMAIL = /\.(?:png|jpe?g|svg|webp|gif|css|m?js|woff2?|ttf|html)$/i; // logo@2x.png и т. п.

const PERSONAL = [
  ['локальный путь', /\/Users\/[A-Za-z0-9._-]+/g],
  ['имя автора', /eldar|dalov|эльдар|далов/gi],
];
const PHONE = /\+7[\s(-]*\d{3}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/g;
const PHONE_OK = /000[\s-]*00[\s-]*00$|123[\s-]*45[\s-]*67$/;

/* длинные base64-блоки (шрифты, картинки) — шум: заменяем пробелами той же длины, чтобы не сбить номера строк */
const BASE64_RUN = /[A-Za-z0-9+/=]{200,}/g;
const BUNDLE_ASSET = /"([0-9a-f-]{36})":\{"mime":"([^"]+)","compressed":(true|false),"data":"([^"]*)"/g;

const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;
const errors = [], warnings = [];

function scanText(where, raw) {
  const t = raw.replace(BASE64_RUN, (m) => ' '.repeat(m.length));
  const at = (i) => `${where}:${lineOf(t, i)}`;
  for (const [name, re] of SECRETS)
    for (const m of t.matchAll(re)) errors.push(`${at(m.index)}  ${name}: ${m[0].slice(0, 8)}…`);
  for (const m of t.matchAll(EMAIL)) {
    const e = m[0].toLowerCase();
    if (NOT_EMAIL.test(e) || EMAIL_OK.has(e) || EMAIL_OK_DOMAIN.test(e)) continue;
    errors.push(`${at(m.index)}  e-mail не из списка заглушек: ${m[0]}`);
  }
  for (const [name, re] of PERSONAL)
    for (const m of t.matchAll(re)) errors.push(`${at(m.index)}  ${name}: ${m[0]}`);
  for (const m of t.matchAll(PHONE))
    if (!PHONE_OK.test(m[0])) warnings.push(`${at(m.index)}  телефон похож на настоящий: ${m[0]}`);
}

let files;
try {
  files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' })
    .split('\0').filter(Boolean);
} catch {
  console.error('✗ Не git-репозиторий: security-check проверяет то, что уйдёт в git.');
  process.exit(1);
}
files = [...new Set(files)].filter((f) => existsSync(join(ROOT, f)));

let scanned = 0, assets = 0;
for (const file of files) {
  const ext = extname(file).toLowerCase();
  if (FORBIDDEN_DIR.test(file) || FORBIDDEN_FILE.test(file) || FORBIDDEN_EXT.has(ext) || (file.startsWith('figma/') && !FIGMA_OK.test(file))) {
    errors.push(`${file}  приватный путь или формат — не для публичного репозитория`);
    continue;
  }
  const size = statSync(join(ROOT, file)).size;
  if (size > MAX_MB * 1024 * 1024) errors.push(`${file}  ${(size / 1048576).toFixed(1)} МБ — больше ${MAX_MB} МБ`);
  if (!TEXT_EXT.has(ext) || file === SELF_REL) continue;

  const raw = readFileSync(join(ROOT, file), 'utf8');
  scanned++;
  scanText(file, raw);
  for (const m of raw.matchAll(BUNDLE_ASSET)) {
    const [, id, mime, compressed, data] = m;
    if (!/text|javascript|json|svg|css|html/.test(mime)) continue;
    try {
      let buf = Buffer.from(data, 'base64');
      if (compressed === 'true') buf = gunzipSync(buf);
      assets++;
      scanText(`${file} → ${mime} ${id.slice(0, 8)}`, buf.toString('utf8'));
    } catch {
      errors.push(`${file} → ${id.slice(0, 8)}  ресурс бандла не распаковывается — проверить нельзя`);
    }
  }
}

console.log(`security-check: файлов ${files.length}, текстовых проверено ${scanned}, ресурсов бандлов ${assets}.`);
for (const w of warnings) console.log(`  ⚠ ПРЕДУПР  ${w}`);
for (const e of errors) console.log(`  ✗ ОШИБКА   ${e}`);
if (errors.length) {
  console.log(`\nИтого: ошибок ${errors.length}. Публиковать нельзя.`);
  process.exit(1);
}
console.log(`\n✓ Можно публиковать (предупреждений: ${warnings.length}).`);
