#!/usr/bin/env node
/**
 * TTS DS R14 — страж правил (guardrail)
 * ──────────────────────────────────────
 * Превращает запреты из CLAUDE.md в автопроверку. Запускать перед коммитом.
 *
 *   node tooling/guardrail.mjs            # ошибки = выход 1; сырые hex = предупреждения
 *   node tooling/guardrail.mjs --strict   # сырые hex тоже становятся ошибками
 *
 * Проверяет ds-core-r14.css и ds-core-r14-light.css.
 * ОШИБКИ:
 *   • font-weight:300 вне разрешённого .smap-zoom-btn (R14: Cormorant ≥400/500; Light только для smap)
 *   • border-radius > 8px (система угловатая, потолок --r-lg = 8px; 9999/--r-full и % допустимы)
 * ПРЕДУПРЕЖДЕНИЯ (ошибки при --strict):
 *   • сырой #hex вне :root (CLAUDE.md: цвета только через переменные)
 *
 * Зависимостей нет — только Node.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STRICT = process.argv.includes('--strict');
const FILES = ['ds-core-r14.css', 'ds-core-r14-light.css', 'ds-smm.css'];

/* selectors, которым разрешён font-weight:300 (документированное исключение R14 — Manrope) */
const WEIGHT300_ALLOW = [/\.smap-zoom-btn/];

const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;

let errors = 0, warnings = 0;

for (const name of FILES) {
  const css = readFileSync(join(ROOT, name), 'utf8');
  const fileMsgs = [];

  // перебор плоских правил: selector { body }
  const rule = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = rule.exec(css))) {
    const selector = m[1].trim().split('\n').pop().trim();
    const body = m[2];
    const bodyStart = m.index + m[1].length + 1;
    const isRoot = /(^|[\s,]):root\b/.test(m[1]);

    // 1) font-weight:300
    const fw = /font-weight:\s*300\b/.exec(body);
    if (fw) {
      const allowed = WEIGHT300_ALLOW.some((re) => re.test(selector));
      if (!allowed) {
        errors++;
        fileMsgs.push(`  ✗ ОШИБКА  стр.${lineOf(css, bodyStart + fw.index)}  font-weight:300 в "${selector}" — запрещено (R14: Cormorant ≥400/500)`);
      }
    }

    // 2) border-radius > 8px
    let br; const brRe = /border-radius:\s*([^;]+);/g;
    while ((br = brRe.exec(body))) {
      const pxs = [...br[1].matchAll(/(\d+)px/g)].map((x) => +x[1]);
      const bad = pxs.find((n) => n > 8 && n !== 9999);
      if (bad !== undefined) {
        errors++;
        fileMsgs.push(`  ✗ ОШИБКА  стр.${lineOf(css, bodyStart + br.index)}  border-radius ${bad}px в "${selector}" — потолок 8px (--r-lg)`);
      }
    }

    // 3) сырой #hex вне :root
    if (!isRoot) {
      let hx; const hxRe = /#[0-9a-fA-F]{3,8}\b/g;
      while ((hx = hxRe.exec(body))) {
        warnings++;
        fileMsgs.push(`  ${STRICT ? '✗ ОШИБКА' : '⚠ ПРЕДУПР'}  стр.${lineOf(css, bodyStart + hx.index)}  сырой ${hx[0]} в "${selector}" — используй var(--…)`);
      }
    }
  }

  console.log(`\n[${name}]`);
  if (fileMsgs.length) console.log(fileMsgs.join('\n'));
  else console.log('  ✓ чисто');
}

const hardFail = errors + (STRICT ? warnings : 0);
console.log(`\nИтого: ошибок ${errors}, предупреждений ${warnings}${STRICT ? ' (strict: предупреждения = ошибки)' : ''}.`);
console.log(hardFail ? `✗ Страж не пройден (${hardFail}).` : '✓ Страж пройден.');
process.exit(hardFail ? 1 : 0);
