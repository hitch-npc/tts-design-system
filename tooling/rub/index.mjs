/**
 * Знак ₽ — единый источник.
 * Глиф U+20BD из Source Serif 4 (SIL OFL 1.1, Adobe), подмножество из одного символа, 1 КБ: `rub.woff2`.
 * Причина: в Oranienbaum (цены, --f-num) и в Forum знака ₽ нет, браузер берёт запасной шрифт — ₽ получается
 * жирным и чужим. Блок объявляет U+20BD для этих семейств, поэтому правильный ₽ получается без правки font-family.
 * Вес строго 400, как у Google-версий Oranienbaum и Forum: браузер объединяет только описания с одинаковым весом —
 * с другим весом (например 100 900) глиф игнорируется там, где шрифты объявлены скриптом (сборки редизайна, песочница эмодзи).
 * Вшивается base64 — сети нет, Google не нужен. Расставляет и проверяет tooling/build-rub.mjs.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIR = dirname(fileURLToPath(import.meta.url));
export const B64 = readFileSync(join(DIR, 'rub.woff2')).toString('base64');
export const FAMILIES = ['Oranienbaum', 'Forum', 'Source Serif 4'];
export const START = '/* tts-rub:start';
export const END = '/* tts-rub:end */';

const face = (f) =>
  `@font-face{font-family:'${f}';font-style:normal;font-weight:400;font-display:block;` +
  `src:url(data:font/woff2;base64,${B64}) format('woff2');unicode-range:U+20BD}`;

export const CSS_BLOCK =
  `${START} — знак ₽ вшит в файл (Source Serif 4, OFL), сеть не нужна. Расставляет tooling/build-rub.mjs, руками не править */\n` +
  FAMILIES.map(face).join('\n') + `\n${END}`;

/* регулярка блока в обычном CSS/HTML */
export const BLOCK_RE = /\/\* tts-rub:start[\s\S]*?\/\* tts-rub:end \*\//;
