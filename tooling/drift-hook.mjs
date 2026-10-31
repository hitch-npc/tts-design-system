#!/usr/bin/env node
/**
 * TTS DS R14 — хук сторожа для Claude Code (PostToolUse на Edit / Write)
 * ──────────────────────────────────────────────────────────────────────
 * Читает из stdin JSON события и запускает только те проверки сторожа, которые задевает
 * правленый файл (drift-check.mjs --files). Без Claude и без токенов: только node.
 *
 *   ошибки сторожа           → выход 2, список в разговор (Claude должен донести правку по копиям)
 *   правка tokens.json/ядра  → одна строка итога + число правил ниже APCA-минимума
 *   всё чисто                → тишина
 * Файл, который не задевает ни одной проверки, — тихий выход 0.
 * Подключение — .claude/settings.json, описание — tooling/README.md.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, basename } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CORE = /^(tokens\.json|ds-core-r14(-light)?\.css)$/;

let raw = '';
process.stdin.on('data', (d) => (raw += d)).on('end', () => {
  let file = '';
  try { const e = JSON.parse(raw || '{}'); file = e.tool_input?.file_path || e.tool_response?.filePath || ''; } catch { /* не JSON — не наш случай */ }
  if (!file || !file.startsWith(ROOT + '/')) process.exit(0);
  const rel = relative(ROOT, file);

  const run = (script, args) => {
    try { return execFileSync(process.execPath, [join(ROOT, 'tooling', script), ...args, '--json'], { cwd: ROOT, encoding: 'utf8' }); }
    catch (e) { return e.stdout || ''; }
  };
  const parse = (s, dflt) => { try { return JSON.parse(s); } catch { return dflt; } };
  const drift = parse(run('drift-check.mjs', ['--files', rel]), { errors: 0, warnings: 0, checks: [], findings: [] });
  if (!drift.checks?.length) process.exit(0);

  const core = CORE.test(basename(rel)) && !rel.includes('/');
  if (drift.errors) {
    const lines = [`Сторож после правки ${rel} (${drift.checks.join(', ')}): ошибок ${drift.errors}.`];
    for (const f of drift.findings.filter((x) => x.level === 'error').slice(0, 12)) {
      lines.push(`✗ ${f.file}${f.line ? ':' + f.line : ''} — ${f.what}; эталон: ${f.ref}; правка: ${f.fix}`);
    }
    lines.push('Правка не дошла до копий. Донести её по списку выше (или откатить), затем npm run check.');
    process.stderr.write(lines.join('\n') + '\n');
    process.exit(2);
  }
  if (!core) process.exit(0); // чисто и не ядро — молчим, контекст не тратим

  const apca = parse(run('contrast-check.mjs', []), { errors: 0 });
  const msg = `Сторож после правки ${rel}: ошибок 0, предупреждений ${drift.warnings}; APCA ниже минимума — ${apca.errors} правил (npm run contrast).`;
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: msg } }));
  process.exit(0);
});
