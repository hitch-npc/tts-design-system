#!/usr/bin/env node
/* TTS — Telegram custom emoji · подгонка длительности под лимит @Stickers
 *
 * Зачем: наборы, собранные до 2026-09-09, содержат 90 кадров при 30 fps.
 * Последний кадр начинается на 2967 мс и длится 33.3 мс, то есть файл кончается
 * на 3000.3 мс. Telegram считает именно конец последнего кадра и отвечает
 * «This video is too long» — поле Duration при этом честно показывает 3000.000,
 * поэтому на глаз и в ffprobe файл выглядит укладывающимся в лимит.
 *
 * Что делает: выкидывает последний кадр (остаётся 89 → 2966.7 мс, запас 33 мс)
 * и переписывает поле Duration. Байты не сдвигаются: освободившееся место
 * занимает Void — глобальный элемент, который демуксеры пропускают. Поэтому
 * размеры Cluster/Segment, позиции в SeekHead и Cues остаются верными,
 * а файл не нужно перекодировать: качество и вес те же.
 *
 * Использование:
 *   node tools/fix-duration.mjs packs/reactions            # папка, рекурсивно
 *   node tools/fix-duration.mjs packs/custom/15-rlike-1of1.webm
 *   node tools/fix-duration.mjs packs --dry                # только показать
 */
import fs from 'node:fs';
import path from 'node:path';

const FPS = 30;
const FRAME_MS = 1000 / FPS;
const LIMIT_MS = 3000;

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const roots = args.filter(a => !a.startsWith('--'));
if (!roots.length) { console.error('укажи файл или папку'); process.exit(1); }

/* ── EBML ── */
function readVint(b, p, strip) {
  const first = b[p];
  if (first === undefined) return null;
  let len = 1, mask = 0x80;
  while (len <= 8 && !(first & mask)) { mask >>= 1; len++; }
  if (len > 8) return null;
  let val = strip ? (first & (mask - 1)) : first;
  for (let i = 1; i < len; i++) val = val * 256 + b[p + i];
  return { val, len };
}
const hexAt = (b, p, n) => { let s = ''; for (let i = 0; i < n; i++) s += b[p + i].toString(16).padStart(2, '0'); return s; };

/* дети мастер-элемента: [{hex, start, headLen, size, end}] */
function children(buf, start, end) {
  const out = [];
  let p = start;
  while (p < end) {
    const id = readVint(buf, p, false);
    if (!id) break;
    const hex = hexAt(buf, p, id.len);
    const sz = readVint(buf, p + id.len, true);
    if (!sz) break;
    const head = id.len + sz.len;
    const size = Math.min(sz.val, end - p - head);
    out.push({ hex, start: p, headLen: head, size, end: p + head + size });
    p += head + size;
  }
  return out;
}
function find(buf, start, end, hex) {
  for (const c of children(buf, start, end)) if (c.hex === hex) return c;
  return null;
}
/* Void ровно на L байт: id(1) + size(8) + payload(L-9) */
function writeVoid(buf, at, len) {
  if (len < 9) throw new Error(`блок ${len} B — слишком мал под Void`);
  buf[at] = 0xEC;
  buf[at + 1] = 0x01;                                   /* vint длиной 8 */
  const payload = len - 9;
  /* деление, а не >>: сдвиг в JS считается по модулю 32 и портит старшие байты */
  for (let i = 0; i < 7; i++) buf[at + 8 - i] = Math.floor(payload / 2 ** (8 * i)) & 0xFF;
  buf.fill(0, at + 9, at + len);
}

function fixFile(file) {
  const buf = fs.readFileSync(file);
  const seg = find(buf, 0, buf.length, '18538067');
  if (!seg) return { file, skip: 'нет Segment' };
  const segStart = seg.start + seg.headLen;
  const top = children(buf, segStart, seg.end);

  const info = top.find(c => c.hex === '1549a966');
  const clusters = top.filter(c => c.hex === '1f43b675');
  if (!info || !clusters.length) return { file, skip: 'нет Info/Cluster' };
  if (clusters.length > 1) return { file, skip: `${clusters.length} кластеров — руками` };
  const cl = clusters[0];

  /* TimecodeScale (по умолчанию 1 000 000 нс = 1 мс) */
  const tsEl = find(buf, info.start + info.headLen, info.end, '2ad7b1');
  let scaleNs = 1000000;
  if (tsEl) { scaleNs = 0; for (let i = 0; i < tsEl.size; i++) scaleNs = scaleNs * 256 + buf[tsEl.start + tsEl.headLen + i]; }
  const tickMs = scaleNs / 1e6;

  const clKids = children(buf, cl.start + cl.headLen, cl.end);
  const tcEl = clKids.find(c => c.hex === 'e7');
  let clusterTC = 0;
  if (tcEl) { for (let i = 0; i < tcEl.size; i++) clusterTC = clusterTC * 256 + buf[tcEl.start + tcEl.headLen + i]; }

  /* блоки: SimpleBlock напрямую или Block внутри BlockGroup */
  const blocks = [];
  for (const k of clKids) {
    let bodyAt = null;
    if (k.hex === 'a3') bodyAt = k.start + k.headLen;
    else if (k.hex === 'a0') { const b = find(buf, k.start + k.headLen, k.end, 'a1'); if (b) bodyAt = b.start + b.headLen; }
    if (bodyAt === null) continue;
    const tn = readVint(buf, bodyAt, true);
    blocks.push({ el: k, tc: clusterTC + buf.readInt16BE(bodyAt + tn.len) });
  }
  if (blocks.length < 2) return { file, skip: 'меньше двух кадров' };

  const endMs = Math.max(...blocks.map(b => b.tc)) * tickMs + FRAME_MS;
  if (endMs <= LIMIT_MS) return { file, skip: `уже ${endMs.toFixed(1)} мс — ок` };

  /* выкидываем кадр с самым поздним таймкодом */
  const last = blocks.reduce((a, b) => (b.tc > a.tc ? b : a));
  const kept = blocks.filter(b => b !== last);
  const newEnd = Math.max(...kept.map(b => b.tc)) * tickMs + FRAME_MS;
  const newDurMs = kept.length * FRAME_MS;

  if (!dry) {
    writeVoid(buf, last.el.start, last.el.end - last.el.start);
    const durEl = find(buf, info.start + info.headLen, info.end, '4489');
    if (durEl) {
      const at = durEl.start + durEl.headLen;
      const ticks = newDurMs / tickMs;
      if (durEl.size === 4) buf.writeFloatBE(ticks, at); else buf.writeDoubleBE(ticks, at);
    }
    fs.writeFileSync(file, buf);
  }
  return { file, from: blocks.length, to: kept.length, endMs, newEnd, newDurMs };
}

/* ── обход ── */
const files = [];
for (const r of roots) {
  const st = fs.statSync(r);
  if (st.isDirectory()) {
    const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else if (e.name.endsWith('.webm')) files.push(p);
    } };
    walk(r);
  } else files.push(r);
}
files.sort();

let fixed = 0, skipped = 0;
for (const f of files) {
  const r = fixFile(f);
  if (r.skip) { skipped++; console.log(`·  ${f} — ${r.skip}`); }
  else { fixed++; console.log(`${dry ? '≈' : '✓'}  ${f}  ${r.from}→${r.to} кадров, ${r.endMs.toFixed(1)} → ${r.newEnd.toFixed(1)} мс (Duration ${r.newDurMs.toFixed(1)})`); }
}
console.log(`\n${dry ? 'нашлось к правке' : 'исправлено'}: ${fixed}   пропущено: ${skipped}   всего: ${files.length}`);
