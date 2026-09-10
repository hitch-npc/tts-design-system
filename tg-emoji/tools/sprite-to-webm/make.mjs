#!/usr/bin/env node
/* Спрайт-лист → Telegram custom emoji (.webm VP9 + альфа, 100×100, 2.967 s, ≤64 KB).
 * Кодирует Chrome через WebCodecs — ffmpeg не нужен. Подробности в README.md рядом.
 *
 *   node tools/sprite-to-webm/make.mjs <спрайт.png> <forward|pingpong> <выход.webm>
 */
import { chromeSession, sleep } from './chrome.mjs';
import { writeFileSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const LIMIT = 64000, TARGET = 61000;
/* сверху вниз, пока файл не влезет в TARGET: цвет и альфа кодируются раздельно */
const LADDER = [[260000,90000],[200000,72000],[160000,58000],[130000,46000],
                [105000,38000],[85000,30000],[68000,24000],[54000,19000]];

const [srcArg, mode = 'forward', outArg] = process.argv.slice(2);
if (!srcArg || !outArg) { console.error('нужно: <спрайт.png> <forward|pingpong> <выход.webm>'); process.exit(1); }
if (!['forward','pingpong'].includes(mode)) { console.error('режим: forward или pingpong'); process.exit(1); }
const src = resolve(srcArg);
if (!existsSync(src)) { console.error('нет файла: ' + src); process.exit(1); }

/* страница живёт на file://, поэтому спрайт кладём рядом с ней: один origin */
const tmpName = `.sprite-${process.pid}.png`;
const tmpPath = join(HERE, tmpName);
copyFileSync(src, tmpPath);

const c = await chromeSession();
try {
  await c.send('Page.navigate', { url: pathToFileURL(join(HERE,'encoder.html')).href }, c.sessionId);
  await sleep(1200);
  let best = null;
  for (const [cc, aa] of LADDER) {
    const r = await c.ev(`build({src:'${tmpName}',mode:'${mode}',bitrate:{c:${cc},a:${aa}}})`);
    console.log(`  ${cc/1000}k+${aa/1000}k → ${(r.size/1024).toFixed(1)} KB`
      + `  (цвет ${(r.split.color/1024).toFixed(1)} + альфа ${(r.split.alpha/1024).toFixed(1)})`
      + `  кадров: ${r.uniqueFrames}  альфа: ${r.withAlpha ? 'да' : 'НЕТ'}`);
    best = { ...r, cc, aa };
    if (r.size <= TARGET) break;
  }
  if (best.size > LIMIT) console.log(`  ! ${(best.size/1024).toFixed(1)} KB — лимит 64 KB не взят, добавь ступень в LADDER`);
  writeFileSync(resolve(outArg), Buffer.from(best.b64, 'base64'));
  console.log(`  → ${outArg}  ${(best.size/1024).toFixed(1)} KB, ${best.uniqueFrames} уникальных кадров`);
} finally {
  c.close();
  rmSync(tmpPath, { force: true });
}
