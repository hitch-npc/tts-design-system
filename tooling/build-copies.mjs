#!/usr/bin/env node
/**
 * TTS DS R14 — сборка копий
 * ──────────────────────────
 * Некоторые файлы живут в двух местах: рабочая версия и копия для передачи (handoff).
 * Копия руками не правится — её пишет этот скрипт из рабочей версии.
 *
 *   node tooling/build-copies.mjs           # перезаписать копии из источников
 *   node tooling/build-copies.mjs --check   # ничего не пишет; выход 1, если копия отстала
 *
 * Список пар — COPIES ниже. Его же читает сторож расхождений (drift-check.mjs).
 * Зависимостей нет — только Node.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* [источник, копия] — копия всегда равна источнику байт в байт */
export const COPIES = [
  ['site/partner-program/partner-program-r14.html', 'site/partner-program/handoff/partner-program.html'],
];

function main() {
  const CHECK = process.argv.includes('--check');
  let stale = 0;
  for (const [src, dst] of COPIES) {
    const a = readFileSync(join(ROOT, src));
    const same = existsSync(join(ROOT, dst)) && a.equals(readFileSync(join(ROOT, dst)));
    if (same) { console.log(`  ✓ ${dst}`); continue; }
    if (CHECK) {
      stale++;
      console.log(`  ✗ ${dst} отстаёт от ${src} — npm run build`);
    } else {
      writeFileSync(join(ROOT, dst), a);
      console.log(`  → ${dst} обновлена из ${src}`);
    }
  }
  if (stale) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
