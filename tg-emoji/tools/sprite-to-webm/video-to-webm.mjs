#!/usr/bin/env node
/* Видео → Telegram custom emoji (.webm VP9 + альфа, 100×100, 2.967 с, ≤64 KB, без звука).
 *
 *   node tools/sprite-to-webm/video-to-webm.mjs <видео> <forward|pingpong> <выход.webm>
 *        [--from 0] [--to 5.2] [--float 4.5] [--tilt 8] [--zoom 0.05]
 *
 * Снимает фон, стабилизирует объект и добавляет плавное парение. Подробности в README.md.
 */
import { chromeSession, sleep } from './chrome.mjs';
import { writeFileSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { dirname, resolve, join, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const LIMIT = 64000, TARGET = 61000;
const LADDER = [[260000,90000],[200000,72000],[160000,58000],[130000,46000],
                [105000,38000],[85000,30000],[68000,24000],[54000,19000]];

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i < 0 ? d : Number(argv[i + 1]); };
const pos = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
const [srcArg, mode = 'forward', outArg] = pos;
if (!srcArg || !outArg) { console.error('нужно: <видео> <forward|pingpong> <выход.webm> [--from N --to N --float N]'); process.exit(1); }
const src = resolve(srcArg);
if (!existsSync(src)) { console.error('нет файла: ' + src); process.exit(1); }

const tmpName = `.vin-${process.pid}${extname(src) || '.mp4'}`;
copyFileSync(src, join(HERE, tmpName));

const c = await chromeSession();
try {
  await c.send('Page.navigate', { url: pathToFileURL(join(HERE, 'video.html')).href }, c.sessionId);
  await sleep(900);
  const extra = { from: flag('from', undefined), to: flag('to', undefined),
                  floatY: flag('float', undefined), floatRot: flag('tilt', undefined), floatZoom: flag('zoom', undefined) };
  const opts = Object.entries(extra).filter(([, v]) => v !== undefined && !Number.isNaN(v))
                     .map(([k, v]) => `${k}:${v}`).join(',');
  let best = null;
  for (const [cc, aa] of LADDER) {
    const r = await c.ev(`buildFromVideo({src:'${tmpName}',mode:'${mode}',bitrate:{c:${cc},a:${aa}}${opts ? ',' + opts : ''}})`);
    if (!best) console.log(`  исходник ${r.videoW}x${r.videoH}, ${r.duration} с → ${r.uniqueFrames} кадров, альфа: ${r.withAlpha ? 'да' : 'НЕТ'}`);
    console.log(`  ${cc/1000}k+${aa/1000}k → ${(r.size/1024).toFixed(1)} KB  (цвет ${(r.split.color/1024).toFixed(1)} + альфа ${(r.split.alpha/1024).toFixed(1)})`);
    best = { ...r, cc, aa };
    if (r.size <= TARGET) break;
  }
  if (best.size > LIMIT) console.log(`  ! ${(best.size/1024).toFixed(1)} KB — лимит 64 KB не взят`);
  writeFileSync(resolve(outArg), Buffer.from(best.b64, 'base64'));
  console.log(`  → ${outArg}  ${(best.size/1024).toFixed(1)} KB`);
} finally { c.close(); rmSync(join(HERE, tmpName), { force: true }); }
