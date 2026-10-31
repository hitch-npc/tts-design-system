#!/usr/bin/env node
/**
 * TTS DS R14 — пересмотр решений
 * ───────────────────────────────
 * Читает таблицу «Принятые решения» в DECISIONS.md и показывает решения, условие пересмотра
 * которых пора проверить. Ритм — 1, 3, 6 и 12 месяцев с даты решения: при запуске раз в месяц
 * каждое решение всплывает четыре раза за год, без отдельного файла состояния.
 *
 *   node tooling/decisions-review.mjs                # решения, у которых веха наступила в последние 30 дней
 *   node tooling/decisions-review.mjs --all          # все решения с возрастом и следующей вехой
 *   node tooling/decisions-review.mjs --date 2026-12-01   # как будто сегодня эта дата
 *   node tooling/decisions-review.mjs --json
 *
 * Только читает. Выход всегда 0 — это напоминание, не проверка.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const ALL = process.argv.includes('--all');
const JSON_OUT = process.argv.includes('--json');
const today = arg('--date') ? new Date(arg('--date') + 'T12:00:00') : new Date();
const DAY = 864e5;
const MILESTONES = [1, 3, 6, 12]; // месяцы
const WINDOW = 30; // дней: веха, наступившая за это время, попадает в отчёт

/* как проверить условие: по словам в нём */
const KINDS = [
  ['замер', /контраст|кегл|сканер|экран|Figma|ширин|радиус|толщин|шрифт/i, 'замер в репозитории: npm run contrast, страж, снимки страниц'],
  ['данные', /Метрик|трафик|данн|конверс|жалоб|отказ|клик|аналитик/i, 'нужны данные Метрики или поддержки'],
  ['продукт', /появлен|выход|сервис|бэкенд|API|прод|город|задач|кабинет|профил/i, 'событие продукта — уточнить у владельца и команды'],
];

const md = readFileSync(join(ROOT, 'DECISIONS.md'), 'utf8');
const start = md.indexOf('## Принятые решения');
const end = md.indexOf('\n## ', start + 5);
const rows = [];
for (const line of md.slice(start, end < 0 ? undefined : end).split('\n')) {
  if (!/^\|\s*\d+\s*\|/.test(line)) continue;
  const c = line.split('|').slice(1, -1).map((x) => x.trim());
  const [num, decision, , dateS, cond] = c;
  const m = /(\d{2})\.(\d{2})\.(\d{4})/.exec(dateS || '');
  if (!m) continue;
  const date = new Date(`${m[3]}-${m[2]}-${m[1]}T12:00:00`);
  const age = Math.floor((today - date) / DAY);
  const addMonths = (n) => { const d = new Date(date); d.setMonth(d.getMonth() + n); return d; };
  const passed = MILESTONES.map((n) => ({ n, at: addMonths(n) })).filter((x) => x.at <= today);
  const last = passed.pop();
  const next = MILESTONES.map((n) => ({ n, at: addMonths(n) })).find((x) => x.at > today);
  const noCond = !cond || /^[—–-]$/.test(cond);
  const due = !noCond && !!last && (today - last.at) / DAY < WINDOW;
  const kind = noCond ? ['без условия', null, 'условие пересмотра не записано'] : KINDS.find(([, re]) => re.test(cond)) || ['владелец', null, 'решает владелец'];
  const short = (s, n) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s);
  rows.push({
    num: +num, date: dateS, age, due, milestone: last ? last.n : null,
    next: next ? next.at.toISOString().slice(0, 10) : null,
    decision: short(decision.replace(/`/g, ''), 110), condition: cond, kind: kind[0], how: kind[2],
  });
}

const list = ALL ? rows : rows.filter((r) => r.due);
const fmt = (d) => d.split('-').reverse().join('.');
if (JSON_OUT) process.stdout.write(JSON.stringify({ today: today.toISOString().slice(0, 10), due: rows.filter((r) => r.due).length, decisions: list }, null, 2) + '\n');
else {
  const head = `Пересмотр решений на ${today.toLocaleDateString('ru-RU')}: пора проверить ${rows.filter((r) => r.due).length} из ${rows.length}.`;
  console.log(head + '\n');
  for (const r of list) {
    console.log(`${r.due ? '●' : '·'} №${r.num} от ${r.date} (${r.age} дн.${r.milestone ? `, веха ${r.milestone} мес.` : ''}) — ${r.decision}`);
    console.log(`    пересмотреть, если: ${r.condition}`);
    console.log(`    как проверить: ${r.how}${r.next ? ` · следующая веха ${fmt(r.next)}` : ''}`);
  }
  if (!list.length) {
    const soon = rows.filter((r) => r.next).sort((a, b) => a.next.localeCompare(b.next))[0];
    console.log(`Ничего не наступило.${soon ? ` Ближайшая веха — №${soon.num}, ${fmt(soon.next)}.` : ''}`);
  }
}
