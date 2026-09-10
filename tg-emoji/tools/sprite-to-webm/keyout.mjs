#!/usr/bin/env node
/* Убирает фон из спрайт-листа масок и делает сквозными отверстия маски.
 *
 *   node tools/sprite-to-webm/keyout.mjs <спрайт.jpg|png> <выход.png>
 *
 * Что делает и почему именно так:
 *
 * 1. Фон ищется ЗАЛИВКОЙ ОТ КРАЁВ, а не порогом яркости. Кожа маски — почти белый
 *    ivory, и любой порог по «белизне» съедает её вместе с фоном: маска превращается
 *    в контрастный металл. Заливка трогает только то, что связано с краем кадра.
 *
 * 2. Прорези глаз и открытый светлый рот заливкой от края недостижимы — они замкнуты.
 *    Берутся вторым проходом: замкнутые области фонового цвета крупнее MIN_HOLE.
 *    Порог по площади обязателен, иначе блики на коже тоже станут дырками.
 *
 * 3. Тёмная полость рта (генератор иногда рисует внутрь тень) снимается третьим
 *    проходом. Тени резьбы и золото на маске тоже тёмные, поэтому кандидат обязан
 *    быть замкнутым, широким (w > h), в нижней половине кадра и в пределах площади.
 *    Скрипт печатает, что именно вырезал, — это стоит просматривать.
 *
 * 4. Край съедается на пиксель: в JPEG вдоль контура сидит светлая кайма от сжатия,
 *    и без эрозии она остаётся ореолом на тёмном фоне чата.
 *
 * Подписи под кадрами (номера) убирать не нужно: они отсекаются при нарезке —
 * полосы короче 60 px не считаются рядами кадров.
 */
import { chromeSession, sleep } from './chrome.mjs';
import { writeFileSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const [srcArg, outArg] = process.argv.slice(2);
if (!srcArg || !outArg) { console.error('нужно: <спрайт> <выход.png>'); process.exit(1); }
const src = resolve(srcArg);
if (!existsSync(src)) { console.error('нет файла: ' + src); process.exit(1); }

const ext = src.toLowerCase().endsWith('.png') ? '.png' : '.jpg';
const tmpName = `.keyin-${process.pid}${ext}`;
copyFileSync(src, join(HERE, tmpName));

const c = await chromeSession();
try {
  await c.send('Page.navigate', { url: pathToFileURL(join(HERE, 'keyout.html')).href }, c.sessionId);
  await sleep(800);
  const r = await c.ev(`processSheet('${tmpName}')`);
  writeFileSync(resolve(outArg), Buffer.from(r.sheet, 'base64'));
  console.log(`${r.W}x${r.H} · сетка ${r.cols.length}x${r.rows.length} = ${r.cells} кадров`);
  console.log(`сквозных отверстий (глаза, светлый рот): ${r.holeCount} шт, ${r.holePixels} px`);
  console.log(`тёмных полостей вырезано: ${r.darkCount} шт, ${r.darkPixels} px`);
  (r.darkList || []).forEach(a => console.log(`   ${a.n} px  ${a.w}x${a.h} @ ${a.x},${a.y}`));
  console.log(`→ ${outArg}`);
} finally { c.close(); rmSync(join(HERE, tmpName), { force: true }); }
