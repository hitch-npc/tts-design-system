# TTS Design System — Справочник для Claude

> Этот файл — сжатый источник истины по дизайн-системе TTS (Ticket to Show).
> Читай его в начале каждой сессии вместо полных CSS-файлов.
> **Актуальная версия: DS TTS R14** — `ds-core-r14.css` (тёмная), `ds-core-r14-light.css` (светлая).
> Всё, что относится к R11 и более ранним версиям, лежит в `_archive/` и не редактируется.

---

## Файлы проекта (корень — рабочая зона)

| Файл | Назначение |
|------|-----------|
| `ds-core-r14.css` | **Актуальная** — токены + компоненты (тёмная тема, R14) |
| `ds-core-r14-light.css` | **Актуальная** — токены + компоненты (светлая тема, R14) |
| `ds-doc.css` | Стили для гайда-документации (утилита, при необходимости подключай к новому R14-гайду) |
| `ds-doc-light.css` | То же для светлой темы |
| `tts-logo.svg` | Текущий SVG логотипа TTS |
| `tokens.json` | **Единый источник истины** токенов сайта (global + dark + light). Блоки `:root` в CSS генерируются отсюда. |
| `smm.tokens.json` | Токены SMM-слоя (соц-форматы, типошкала), ссылаются на те же примитивы. |
| `ds-smm.css` | **Генерируется** из `smm.tokens.json` — соц-шаблоны (story/post/square). Руками не править. |
| `package.json` | Скрипты: `npm run build` / `check` / `lint` / `security`. Версия — здесь, в `package-lock.json` и `VERSION`. |
| `README.md`, `CHANGELOG.md` | Лицо публичного репозитория и история версий. |
| `DECISIONS.md` | **Решения системы**: причина, дата, условие пересмотра. Меняешь решение — меняешь запись. |
| `index.html` | Витрина для GitHub Pages — ссылки на все страницы. Не демо, а навигация. |
| `.gitignore` | **Белый список** публикации (см. «Git и публикация»). |
| `.github/`, `.githooks/` | CI (`npm run check:strict` + `security`) и pre-push хук. |
| `tooling/` | Сборка и страж: `build-tokens.mjs`, `build-smm.mjs`, `guardrail.mjs`, `README.md` (как менять X), `backup/`, `examples/`. |
| `uploads/` | Пользовательские ассеты (логотипы, скриншоты, исходные материалы) |
| `_archive/` | Историческое — R11 CSS, гайды v10/v11, портфолио, демо-компоненты, письма. См. `_archive/README.md`. Не править. |

### Папки-разделы (наведён порядок 2026-09-09)

| Папка | Что внутри |
|-------|-----------|
| `site/` | Продуктовые сборки: `case-r14.html` (кейс системы для портфолио, публичный), `redesign-v2-dark.html` / `-light.html` (оффлайн, всё внутри одного файла), `Схема зала - десктоп (для теста).html` (новая схема зала, тест), `behance-hero-blocks.html` (только локально), `cookie-banner/`, `partner-program/` (актуальный html + `handoff/` — пакет для передачи), `handoff/` — передача фронтенду: `frontend-changes.html` и `redesign-changes.html` («было / стало» с 8 сентября) |
| `concepts/` | Ранние концепты DS (март 2026): Cobalt, CobaltFog, AcidLime, Stone v3, Horizon, Light in Darkness, мобильные v1/v2. Историческая витрина, не эталон — эталон R14. В публичный репо не входит |
| `emails/` | Транзакционные письма на R14: `email-1-payment-confirmation.html`, `email-2-reminder.html`, `emails-all.html`. Кампании v3 — в `_archive/emails/` |
| `docs/` | `audits/` (SEO, UX, redesign v1/v2, рынок), `council/` (репорты и транскрипты советов), `refs/` (референсы, скриншоты интерфейса), `metrika-goals.pdf`, `skills-review.html` |
| `smm/` | SMM-система и контент-планы (md + pdf), борд email-кампаний |
| `brand/` | `logo/` — все варианты логотипа (png/svg), `source/` — исходники градиентов и рассылки (.ai) |
| `decks/` | Питч-деки (pptx), презентации и демо (pdf) |
| `figma/` | `DS R14.fig` + Scripter-скрипты: `figma-script.js` (переменные и стили, запускать первым), затем `figma-button.js`, `figma-components-2.js`, `figma-ds-all.js` |
| `tg-emoji/` | Telegram custom emoji: сэндбокс, рендер, `packs/<вариант>/<лента>/` — ленты-склейки, `packs/reactions/<вариант>/` — одиночные реакции. См. `tg-emoji/README.md` |

**Правила по папкам:** новые файлы кладутся в свой раздел, не в корень. В корне остаются только
CSS-ядро, токены, `tooling/`, `package.json`, `VERSION`, `CLAUDE.md`, `DECISIONS.md`, `tts-logo.svg` и служебные файлы
репозитория (`README.md`, `CHANGELOG.md`, `index.html`, `.gitignore`, `.gitattributes`, `.nojekyll`, `.github/`, `.githooks/`).
Переехавшие HTML ссылаются на CSS относительно: из `site/` — `../ds-core-r14.css`, из `site/cookie-banner/` — `../../ds-core-r14.css`.

### Сборка из токенов (важно для агента)
- **`:root` в `ds-core-r14.css` / `-light.css` генерируется** из `tokens.json` скриптом `tooling/build-tokens.mjs`. **Никогда не редактируй `:root` вручную** — меняй значения в `tokens.json`, затем `npm run build`.
- Компоненты (всё ниже `:root`) правятся руками, цвета — только через `var(--…)`.
- SMM: меняешь `smm.tokens.json` → `npm run build` пересобирает `ds-smm.css`.
- Перед фиксацией: `npm run check` (сборка `--check` + страж). Страж (`tooling/guardrail.mjs`) превращает запреты ниже в автопроверку: `font-weight:300` вне `.smap-zoom-btn`, `border-radius>8px`, сырой `#hex` вне `:root`.
- Полная инструкция — `tooling/README.md`.

### Git и публикация (репозиторий ПУБЛИЧНЫЙ)
- Репо: https://github.com/hitch-npc/tts-design-system — видят все. Публикуем только то, что не жалко показать.
- Витрина на GitHub Pages: https://hitch-npc.github.io/tts-design-system/ (ветка `main`, корень) — обновляется после каждого push.
- `.gitignore` работает как **белый список**: в корне закрыто всё, открыто только перечисленное. Новая папка
  не попадёт в git, пока её явно не откроют строкой `!/папка/` — и только если в ней нет приватного.
- **Никогда не публикуются:** `decks/`, `docs/` (аудиты, советы, референсы), `figma/*.fig` (скрипты `figma/*.js` — публичны), `smm/`
  (контент-планы), `uploads/`, `brand/source/` (.ai), `_archive/`, `tg-emoji/ref/`, `*/source/`, архивы .zip,
  `site/behance-hero-blocks.html` (кейс Behance — дизайн устарел, живёт только на Behance),
  `concepts/` (ранние концепты, дизайн устарел).
- **Никаких личных данных:** реальные почты, телефоны, имена, пути `/Users/…`. В демо — только заглушки
  (`ivan@example.com`, `+7 (999) 000-00-00`). Список разрешённых заглушек — в `tooling/security-check.mjs`.
- Перед push: `npm run check && npm run security`. Хук `.githooks/pre-push` запускает security сам
  (после клона: `git config core.hooksPath .githooks`). CI повторяет обе проверки.
- Автор коммитов — `hitch-npc <277788788+hitch-npc@users.noreply.github.com>`, не личная почта.
- Версии — SemVer, MAJOR = релиз DS. Новая версия: номер в `VERSION` + `package.json` + `package-lock.json`,
  запись в `CHANGELOG.md`, аннотированный тег `vX.Y.Z`.

### Единый стиль по эталонам (с 14.3, 2026-09-11)
Эталоны: редизайн v2 (обе темы), cookie-баннер, TTS партнёрам, Telegram-эмодзи, новая схема зала.
Если старое правило ниже спорит с этим блоком — прав этот блок. Решения приняты на сверке стиля,
причины и условия пересмотра — в `DECISIONS.md`. Меняешь решение — меняешь там запись в том же коммите.
- **Заголовки** — Cormorant обычным регистром, без разрядки: `.t-display` 500, `.t-h1` 400, `.t-h2` 500.
  Forum — `.t-h3`: плитки категорий, подзаголовки карточек. Названия событий — никогда капсом.
  Капс (`.t-caps`, `.promo-title`) — только короткие промо-надписи, до трёх слов.
- **Кнопки** — капс, разрядка .16em; заливные 700, контурные 600 со светлым текстом (`--n100`, рамка `--n700`),
  чтобы не выглядели неактивными. Контурная с акцентом `.btn-ghost-accent` — тот же текст `--n100`, кобальт только
  в рамке (`--accent`). Размеры: lg 12px, md 11px, sm 9px.
- **Главные кнопки — всегда кобальт** `.btn-primary`, включая «Перейти к оформлению» и «Купить». Зелёную кнопку
  пробовали в 14.3.0 и отменили в 14.3.1: белый текст на зелёном давал контраст 2,3 : 1 при норме 4,5 : 1.
  Зелёный остаётся только у выбранного места на схеме зала.
- **Кобальт в тексте** — только крупно (от 17px) и в ссылках. Мелкие подписи и капс до 11px — серые. Светлого кобальта нет.
- **Надзаголовок** — строка `.t-eyebrow` (10px, 600, .22em, `--n300`), без плашки и рамки.
- **Серые подписи капсом** — один стиль: 10px, 500, .14em, `--n500` (`.t-caption`, `.form-label`, подписи к цифрам и полям).
- **Меню** — капс, Manrope 500, 11px, .16em; неактивные пункты `--n300`, активный `--n100`.
- **Активный чип / фильтр** — `--accent-ghost` + рамка `--accent` + текст `--n100`; жирность та же, что у неактивного (500) — выбор показывают рамка и фон, не толщина.
- **Иконки** — точка в восклицательном и информационном знаке рисуется отрезком нулевой длины, поэтому у таких `svg` обязателен `stroke-linecap="round"`: с торцом по умолчанию точка не рисуется вообще.
- **Штрихкод** — всегда тёмные полосы на светлой плашке, даже в тёмной теме. Инверсию читают не все сканеры.
- **Сглаживание шрифта** — `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale` на `body` — в ядре обеих тем,
  на страницах и в редизайне. Без него Mac утолщает светлый текст на тёмном, и макет в браузере жирнее, чем в Figma.
- **Подсказки в поиске** — группы «События» и «Площадки». Строка события: превью 56px в цвете жанра, название Forum,
  дата умным форматом и место, цена Oranienbaum; совпадение — цветом (`--n100` на `--n400`), не жирным; латиница
  исправляется раскладкой. Все состояния — раздел «Поиск по афише — подсказки» в редизайне (макет, в экраны не встроен).
- **Футер** — один на весь сайт, `site-footer` со страницы партнёров: бренд и 4 документа / 5 соцсетей и отдел продаж /
  помощь (возврат, поддержка) и техподдержка; сверху линия кобальтом с растворением, снизу копирайт и дисклеймер.
  Фон темнее страницы: тёмная `#080808` (кнопки и соцсети `#111318`, рамки `#1F222A`), светлая `--n900` (кнопки `#FAFAF7`).
  На странице партнёров это переменные темы `--foot-bg`, `--foot-surface`, `--foot-line`, `--foot-hover`.
  В публичных файлах почта сотрудника — только заглушка `partners@example.com`.
- **Вход в фильтры (десктоп)** — кнопка внутри строки поиска справа, `aria-label`; слово «Фильтры» выезжает при наведении
  и остаётся, пока окно открыто. Окно — не модальное по центру: разворачивается из-под строки поиска в 6px, той же ширины;
  появление 420 мс `cubic-bezier(.16,1,.3,1)`, уход 252 мс, строки проявляются по очереди; лёгкое затемнение ниже меню;
  при `prefers-reduced-motion` без анимации. Мобильная версия — иконка и нижняя шторка.
- **Кнопка темы** — `.theme-toggle`: квадрат с иконкой текущей темы (луна — тёмная, солнце — светлая), без подписи.
  Десктоп — между полем поиска и городом; мобильная шапка — `.theme-toggle-bare` без рамки, перед бургером.
  Состояние — атрибут `data-mode="dark|light"`; смена: луна уходит с поворотом, солнце входит с лёгким перелётом,
  лучи выходят по очереди (520 мс, `--ease-bounce`); при `prefers-reduced-motion` без анимации.
  В макете редизайна кнопка меняет только иконку — темы там в двух отдельных файлах.
- **Теги** — цвет по смыслу (оранжевый, зелёный, ivory); «Премьера» — фон `--accent-ghost`, рамка и текст кобальтом.
  «Премьера» сейчас не используется в редизайне (убрана после правок Азамата), но остаётся в системе — понадобится позже.
- **Схема зала** — зоны `--zone-1…5` (ложа, партер, амфитеатр, бельэтаж, балкон) — `.smap-t-vip / partet / amphi / belet / balkon`;
  выбранное место — зелёное с галочкой (`--seat-sel`), проданное — `--seat-sold`. На зелёной зоне (балкон) выбранное —
  инверсия: светлое место, зелёная галочка. Новые зоны не делать в оттенках, близких к `--seat-sel`.
- **Исключение:** первый экран страницы партнёров остаётся капсом — по решению владельца, как было до 14.3.0.
- **Исключение:** название спектакля капсом на билетах, мобильной схеме зала и строке мобильного события — по решению владельца (15.09.2026).
- **Cormorant — только от 22px** (до 25pt — 500). Мельче — Forum 400: карточки афиши, горизонтальные карточки.
  Страж (`npm run lint`) ловит Cormorant мельче 22px как ошибку.

### Что нового в R14 (2026-05-30)
- **Cormorant Garamond ≤ 25pt** → толщина не меньше **Medium (500)**.
- **Cormorant Garamond > 25pt** → толщина не меньше **Regular (400)**.
- **Caption / синий мелкий uppercase** → не меньше **Medium (500)**.
- **Серый малозначимый caption** → допускается **Regular (400)**.
- В Google Fonts вместо `Cormorant+Garamond:wght@300;400` грузим `Cormorant+Garamond:wght@400;500`.

Карта изменений толщин Cormorant (R11 → R14):

| Класс | Размер | R11 | R14 |
|------|--------|-----|-----|
| `.t-display` | clamp(2.8rem, 8vw, 5rem) | 300 | **400** |
| `.t-h3` | clamp(1.3rem, 3vw, 1.8rem) | 300 | **500** |
| `.event-card-title` | 1.3rem | 300 | **500** → с 14.3 Forum 400 |
| `.card-h-title` | 1rem | 300 | **500** → с 14.3 Forum 400 |
| `.empty-title` | 1.5rem | 300 | **500** |
| `.hero-title` | clamp(2.2rem, 7vw, 4rem) | 300 | **400** |
| `.promo-title` | clamp(1.8rem, 5vw, 2.8rem) | 300 | **500** |
| `.ev-title` | clamp(2rem, 6vw, 3.6rem) | 300 | **500** |
| `.success-title` | clamp(1.8rem, 5vw, 2.6rem) | 300 | **500** |
| `.postsale-title` | clamp(1.6rem, 4vw, 2.2rem) | 300 | **500** |

---

## Логотип (обязательно)

Актуальный логотип хранится в `tts-logo.svg` (рядом с CSS-файлами) или в `uploads/Logo Stone.svg`.
**Всегда** используй этот SVG, когда нужно поставить лого TTS / Ticket to Show / tickettoshow в любом виде. Никогда не верстай лого текстом (`TICKET TO SHOW` буквами) вместо настоящего SVG.

- Цвет лого по умолчанию — `#808174` (stone); вертикальный разделитель `#2D2D2D`.
- На тёмном фоне меняй заливку на `--n100` / `#D6D6D2`.
- На светлом фоне оставляй stone или `--n100`.
- ViewBox `0 0 676 194`. В письмах/хедерах высота 28–36px.

---

## Принципы системы

1. **Тёмная атмосфера** — фон `#0D0D0D` (--ink) имитирует театральный зал
2. **Serif + Sans** — Forum/Cormorant для контента, Manrope для UI
3. **Cobalt + Inversion** — единственный акцент `#0047FF`; Premium = ivory `#F5F4EE` + чёрный текст на тёмном фоне
4. **Blob = жанр** — декоративные свечения кодируют жанр (cool=синий, warm=оранжевый, green=зелёный)

---

## Цветовые токены

### Тёмная тема (ds-core.css)
```
--ink:          #0D0D0D   /* Фон страницы */
--black:        #111111
--accent:       #0047FF   /* Единственный акцент — Cobalt */
--accent-hover: #0038CC
--accent-dim:   #0436B6
--accent-ghost: #0B142A   /* Фон hover на ghost-элементах */
--accent-border:#091E56

/* Нейтральная шкала (тёмная → светлая) */
--n950: #111318   /* Карточки, инпуты */
--n900: #191C22   /* Разделители, поверхности */
--n800: #262930   /* Borders */
--n700: #4A4A48
--n600: #626260   /* Плейсхолдеры */
--n500: #7A7A78   /* Подписи, метки */
--n400: #8A8A88
--n300: #A6A6A2   /* Второстепенный текст */
--n200: #C0C0BC   /* Вторичный текст */
--n100: #D6D6D2   /* Основной текст */

/* Blob-атмосфера */
--blob-core:   #06277F
--blob-mid:    #15092A
--blob-purple: #200840
--blob-faint:  #08133D

/* Жанровые пресеты blob */
--blob-core-warm:  #4A1F00   /* тёплый / опера */
--blob-mid-warm:   #2A1200
--blob-core-cool:  #06277F   /* классика / театр */
--blob-mid-cool:   #15092A
--blob-core-green: #0A2A0A   /* мюзикл */
--blob-mid-green:  #051205

/* Premium */
--premium: #F5F4EE   /* Ivory — только для Premium-блоков */

/* Семантика */
--success:        #22C55E
--success-bg:     #0A2210
--success-border: #1A4428
--danger:         #E53E3E
--danger-bg:      #2D1010
--danger-border:  #7A2020
--danger-text:    #FF8080
/* Добавлены в 14.3–14.4: места, зоны, теги, формы, затемнение */
--n850:               #1F222A
--zone-2:             #3F73E3
--zone-3:             #2BA7B8
--zone-4:             #7E6FD0
--zone-5:             #33B978
--seat-check:         #FFFFFF
--accent-soft:        #7A9FFF
--on-accent:          #FFFFFF
--premium-bg:         #F5F4EE
--premium-ink:        #0D0D0D
--tag-o-bg:           #221408
--tag-o-fg:           #FB923C
--tag-o-bd:           #442810
--tag-g-bg:           #0A2210
--tag-g-fg:           #4ADE80
--tag-g-bd:           #1A4428
--tag-r-bg:           #220A0A
--tag-r-fg:           #F87171
--tag-r-bd:           #441414
--info:               #60A5FA
--error-fg:           #FF6B6B
--error-bd:           #FF4444
--input-focus-bg:     #0D0D1A
--danger-hover-bg:    #3D1212
--scrim:              #000000
--overlay:            #00000088
--shadow-color:       #000000AA
```

### Светлая тема (ds-core-light.css)
```
--ink:          #FFFFFF   /* Фон страницы */
--accent:       #0047FF   /* Тот же Cobalt */
--accent-ghost: #EAF0FF
--accent-border:#B8C9F0

/* Нейтральная шкала ИНВЕРТИРОВАНА */
--n100: #0D0D0D   /* Основной текст (тёмный) */
--n200: #2D2D2B
--n300: #4A4A48
--n400: #6A6A68
--n500: #888886
--n600: #A8A8A5
--n800: #E2E1DA
--n900: #F2F1EB
--n950: #FAFAF7   /* Карточки */

/* Blob — пастельные */
--blob-core:      #BFD0EE
--blob-mid:       #E5DAEF
--blob-core-warm: #F2D5B0
--blob-core-green:#C7E8C8
/* Добавлены в 14.3–14.4 */
--n850:               #EAE9E2
--zone-2:             #3F73E3
--zone-3:             #2BA7B8
--zone-4:             #7E6FD0
--zone-5:             #33B978
--seat-check:         #FFFFFF
--accent-soft:        #0436B6
--on-accent:          #FFFFFF
--premium-bg:         #0D0D0D
--premium-ink:        #FFFFFF
--tag-o-bg:           #FFEDD5
--tag-o-fg:           #C2410C
--tag-o-bd:           #FED7AA
--tag-g-bg:           #DCFCE7
--tag-g-fg:           #16A34A
--tag-g-bd:           #86EFAC
--tag-r-bg:           #FEE2E2
--tag-r-fg:           #DC2626
--tag-r-bd:           #FCA5A5
--info:               #2563EB
--error-fg:           #DC2626
--error-bd:           #DC2626
--input-focus-bg:     #F5F8FF
--danger-hover-bg:    #FEE2E2
--scrim:              #000000
--overlay:            #00000088
--shadow-color:       #000000AA
```

---

## Типографика

| Переменная | Шрифт | Применение |
|-----------|-------|-----------|
| `--font` | Manrope | UI-элементы, кнопки, метки |
| `--f-head` | Forum | Названия мельче 22px: карточки афиши, плитки, подзаголовки (`.t-h3`) |
| `--f-thin` | Cormorant Garamond 400/500 | Display и заголовки **от 22px** (до 25pt — 500, крупнее — 400/500) |
| `--f-num` | Oranienbaum | Числа (цены, даты) |

### Классы типографики
```
.t-display    — Cormorant 500, очень крупный, обычный регистр
.t-h1         — Cormorant 400, 1.8–2.4rem, обычный регистр
.t-h2         — Cormorant 500, 1.3–1.6rem, обычный регистр
.t-h3         — Forum 400, 1.1rem — плитки категорий, подзаголовки карточек
.t-subtitle   — Manrope 500, letter-spacing
.t-body-lg    — 15px, line-height 1.75
.t-body       — 14px, line-height 1.75
.t-body-sm    — 12px
.t-caption    — 10px, 500, uppercase, .14em, --n500 — единственный стиль серых подписей капсом
.t-eyebrow    — 10px, 600, uppercase, .22em, --n300 — надзаголовок строкой, без плашки
                (.t-label-accent — устаревший алиас; кобальта на мелком тексте больше нет)
.t-num        — Oranienbaum, числа и цены
.t-price      — Oranienbaum, крупная цена
```

---

## Отступы (spacing tokens)

```
--sp-1: 4px    --sp-2: 8px    --sp-3: 12px   --sp-4: 16px
--sp-5: 20px   --sp-6: 24px   --sp-8: 32px   --sp-10: 40px
--sp-12: 48px  --sp-16: 64px  --sp-20: 80px

--section-gap-sm: 40px
--section-gap-md: 64px
--section-gap-lg: 96px

--page-pad: 20px (mobile) → 32px (tablet) → 56px (desktop)
--col-gap: 16px
--content-max: 1200px
```

---

## Анимации и радиус

```
--ease-out:    cubic-bezier(.4, 0, .2, 1)
--ease-bounce: cubic-bezier(.34, 1.56, .64, 1)
--dur-fast:    120ms
--dur-base:    200ms
--dur-slow:    320ms

--r-sm: 2px   --r-md: 4px   --r-lg: 8px   --r-full: 9999px
```
> **Важно:** Основной радиус системы — `2px` (--r-sm). Всё угловатое, не скруглённое.

---

## Компоненты

### Кнопки
```html
<!-- Размеры: btn-lg 12px | btn-md 11px | btn-sm 9px (min 36px). Капс, разрядка .16em; заливные 700, контурные 600 -->
<button class="btn btn-primary btn-md">CTA</button>
<button class="btn btn-ghost btn-md">Вторичное</button>
<button class="btn btn-ghost-accent btn-md">Ghost с акцентом</button>   <!-- текст --n100, рамка --accent -->
<button class="btn btn-dark btn-md">Тёмная</button>
<button class="btn btn-danger btn-sm">Удалить</button>
<button class="btn btn-icon"><svg/></button>
<button class="btn btn-primary btn-full">Полная ширина</button>
```

### Формы
```html
<div class="form-group">
  <label class="form-label">Лейбл</label>
  <input class="form-input" placeholder="…">
  <!-- Модификаторы: .error | .success -->
  <div class="form-helper">Подсказка</div>
  <div class="form-error">Ошибка</div>
</div>
<select class="form-select">…</select>
```

### Теги / бейджи
```html
<span class="tag tag-default">Театр</span>
<span class="tag tag-accent">Премьера</span>   <!-- accent-ghost, рамка и текст кобальтом -->
<span class="tag tag-orange">Мало мест</span>
<span class="tag tag-green">Новинка</span>
<span class="tag tag-premium">Premium</span>   <!-- ivory inversion -->
<span class="badge badge-count">3</span>       <!-- числовой бейдж nav -->
```

### Event Card (вертикальная)
```html
<div class="event-card card-cool">        <!-- card-cool | card-warm | card-green -->
  <div class="event-card-cover">
    <div class="cover-blob cover-blob-1"></div>
    <div class="cover-blob cover-blob-2"></div>
    <div class="cover-tag"><span class="tag tag-accent">Премьера</span></div>
    <div class="cover-date"><div class="t-caption">14 июня</div></div>
  </div>
  <div class="event-card-body">
    <div class="event-card-meta">Театр · Москва</div>
    <div class="event-card-title">Название</div>           <!-- Forum 400 (мельче 22px), обычный регистр — никогда капсом -->
    <div class="event-card-sub">Площадка</div>
    <div class="event-card-footer">
      <div><span class="event-card-price-label">от</span>
           <span class="event-card-price">1 500 ₽</span></div>
      <button class="btn btn-primary btn-sm">Билеты</button>
    </div>
  </div>
</div>
```

**Правило для multi-venue / multi-show событий:** одно событие = одна карточка, без дублирования на афише.
- `cover-date` (smart-chip): подбирается агрегатом — `14 июня` (один сеанс) / `14–20 июня` (диапазон) / `5 дат` (разрозненные даты) / `2 площадки` (multi-venue) / `С 14 мая` (открытая серия).
- `event-card-meta`: расширяется хвостом `· N площадок` когда площадок >1. Пример: `Театр · Москва · 2 площадки`.
- Никогда не выводить одно и то же событие несколько раз в афише — все площадки и сеансы раскрываются только на странице события через `session-list`.

### Event Card Horizontal
```html
<div class="event-card-h">
  <div class="card-h-thumb">…blob…</div>
  <div class="card-h-body">
    <div class="card-h-title">Название</div>
    <div class="card-h-meta">Площадка · Дата · Время  <!-- или: Площадка · 6 показов · 2 площадки --></div>
  </div>
  <div class="card-h-price">
    <span class="event-card-price-label">от</span>
    <span class="event-card-price">1 500 ₽</span>
  </div>
</div>
```

### Навигация
```html
<!-- Mobile: хедер + drawer -->
<nav class="nav-mobile">
  <div class="nav-mobile-header">
    <svg><!-- logo --></svg>
    <button class="nav-icon-btn"><!-- burger --></button>
  </div>
</nav>

<!-- Desktop -->
<nav class="nav-desktop">
  <div class="nav-desktop-left"><!-- logo + links --></div>
  <div class="nav-desktop-right"><!-- search + login + cart --></div>
</nav>
<span class="nav-cart-badge">3</span>  <!-- бейдж корзины -->
```

### Кнопка темы (14.8)
```html
<!-- Иконка = текущая тема: data-mode="dark" — луна, "light" — солнце. Смена атрибута запускает анимацию.
     Десктоп: между полем поиска и городом. Мобильная шапка: class="theme-toggle theme-toggle-bare", перед бургером. -->
<button class="theme-toggle" type="button" data-mode="dark" aria-label="Включить светлую тему" title="Включить светлую тему">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
    <path class="tt-moon" d="M20 12.19A8 8 0 1 1 11.81 4A6.5 6.5 0 0 0 20 12.19Z"/>
    <g class="tt-sun"><circle cx="12" cy="12" r="4"/>
      <path class="tt-ray" style="--i:0" d="M12 2v2.25"/><path class="tt-ray" style="--i:1" d="M19.07 4.93l-1.59 1.59"/>
      <path class="tt-ray" style="--i:2" d="M22 12h-2.25"/><path class="tt-ray" style="--i:3" d="M19.07 19.07l-1.59-1.59"/>
      <path class="tt-ray" style="--i:4" d="M12 22v-2.25"/><path class="tt-ray" style="--i:5" d="M4.93 19.07l1.59-1.59"/>
      <path class="tt-ray" style="--i:6" d="M2 12h2.25"/><path class="tt-ray" style="--i:7" d="M4.93 4.93l1.59 1.59"/>
    </g>
  </svg>
</button>
<!-- По нажатию: переключить тему, затем data-mode, aria-label и title — на противоположные -->
```

### Session list — выбор сеанса (multi-venue / multi-date) ⭐ основной паттерн
Заменяет старый date-chip в большинстве случаев. Используется на странице события когда есть >1 площадка ИЛИ >1 сеанс в день ИЛИ >2 дат — то есть почти всегда.

**Анатомия:** venue-filter (фильтр площадок, pill-чипы) → счётчик `N показов` → группы сеансов по датам → строка сеанса (`время · площадка · зал · от X ₽ · ›`) → summary выбранного → CTA `Выбрать места` (disabled до выбора, активен после).

```html
<div class="session-list">
  <!-- 1. Фильтр площадок -->
  <div class="venue-filter">
    <button class="venue-chip venue-chip-active">Все площадки</button>
    <button class="venue-chip">Театр эстрады</button>
    <button class="venue-chip">Таганка</button>
  </div>

  <!-- 2. Счётчик показов -->
  <div class="session-count">6 показов</div>

  <!-- 3. Группы сеансов по датам -->
  <div class="session-groups">
    <div class="session-group">
      <div class="session-date">
        <span class="session-date-pill">14 мая</span>
        <span class="session-date-dow">среда</span>
      </div>
      <!-- Выбранный сеанс -->
      <div class="session-row session-row-selected">
        <div class="session-time">19:00</div>
        <div class="session-venue-info">
          <div class="session-venue-name">Театр эстрады</div>
          <div class="session-hall">Большой зал</div>
        </div>
        <div class="session-price">от 1 500 ₽</div>
        <div class="session-chev">›</div>
      </div>
      <!-- Обычный сеанс -->
      <div class="session-row">…</div>
      <!-- Распроданный сеанс -->
      <div class="session-row session-row-sold">
        <div class="session-time">19:00</div>
        <div class="session-venue-info">…</div>
        <div class="session-sold-badge">Продано</div>
      </div>
    </div>
  </div>

  <!-- 4. Summary выбранного сеанса (показывается только после выбора) -->
  <div class="session-summary">
    <div class="session-summary-head">14 мая · 19:00</div>
    <div class="session-summary-meta">Театр эстрады · Большой зал</div>
  </div>
  <!-- Пустое состояние до выбора: -->
  <!-- <div class="session-summary-empty">Выберите дату и время показа</div> -->
</div>

<!-- 5. CTA — disabled до выбора, активный после -->
<button class="btn btn-primary btn-md btn-full" disabled>Выбрать места</button>
<button class="btn btn-ghost btn-md btn-full">В избранное</button>
```

**Правила:**
- `venue-chip-active` и любой активный чип: фон `--accent-ghost` + рамка `--accent` + текст `--n100` — тот же принцип, что у выбранной строки сеанса
- Выбранная строка: `border --accent` + `background --accent-ghost` + цена окрашивается в `--accent`
- Кнопка `Выбрать места` — `disabled` до клика по строке. Disabled-стиль уже в `.btn:disabled` (фон `--n800`, цвет `--n600`)
- Не использовать цветные плашки цен как CTA (это разрушает принцип «один акцент»)

### Date-chip — legacy, только для одного события на одной площадке ⚠️
```html
<div class="date-chip date-chip-active">   <!-- active | date-chip-sold -->
  <div class="date-chip-day">14</div>
  <div class="date-chip-mon">Июн</div>
  <div class="date-chip-dow">Сб</div>
</div>
```
Использовать **только** когда у события одна площадка и до 4 дат. Во всех остальных случаях — `session-list`.
Выбранный чип — как любой активный: фон `--accent-ghost`, рамка `--accent`, число `--n100` (белое на светлом фоне не читается).

### Sticky Buy (мобильная фиксированная панель)
```html
<div class="sticky-buy">
  <div class="sticky-buy-price">…</div>
  <button class="btn btn-primary btn-md">Купить билеты</button>
</div>
```

### Steps (индикатор шагов чекаута)
```html
<div class="steps-bar">
  <div class="step-item step-done"><div class="step-dot"></div><div class="step-label">Места</div></div>
  <div class="step-line"></div>
  <div class="step-item step-active"><div class="step-dot"></div><div class="step-label">Данные</div></div>
  <div class="step-line"></div>
  <div class="step-item"><div class="step-dot"></div><div class="step-label">Оплата</div></div>
</div>
```

### Toast
```html
<div class="toast toast-success">Место добавлено</div>
<div class="toast toast-error">Ошибка оплаты</div>
<div class="toast toast-info">Билет отправлен</div>
```

### Seat Map
```html
<div class="smap-wrap">
  <div class="smap-scene">Сцена</div>
  <div class="smap-rows">
    <div class="smap-row">
      <button class="smap-dot smap-t-partet"></button>                    <!-- доступно: цвет зоны -->
      <button class="smap-dot smap-t-partet smap-dot-sold"></button>      <!-- продано: --seat-sold -->
      <button class="smap-dot smap-t-partet smap-dot-selected"></button>  <!-- выбрано: зелёное с галочкой -->
      <!-- зоны: .smap-t-vip (ложа) · .smap-t-partet · .smap-t-amphi · .smap-t-belet · .smap-t-balkon = --zone-1…5 -->
    </div>
  </div>
</div>
```

### Skeleton Loading
```html
<div class="skeleton skeleton-text"></div>
<div class="skeleton skeleton-card"></div>
```

---

## Раскладки экранов

### Mobile-first (< 768px)
- `--page-pad: 20px` по бокам
- Афиша: 2 колонки `.cat-grid` или `grid-template-columns: repeat(2,1fr)`
- Event hero: полная ширина, sticky buy снизу
- Checkout: 1 колонка `.checkout-grid`

### Tablet (≥ 768px)
- `--page-pad: 32px`
- Афиша: 3 колонки

### Desktop (≥ 1024px)
- `--page-pad: 56px`
- Hero: 2 колонки (1.4fr + 1fr)
- Afisha: 4 колонки
- Event page: 2 колонки (1.6fr + 1fr), sticky-buy справа
- Seat map: 2 колонки (1.7fr + 1fr), корзина справа
- Checkout: `.checkout-grid` с summary sidebar справа

---

## Ключевые экраны (6 mobile + 6 desktop)

1. **Главная** — hero с blob + промо-тег + кнопка CTA + 2-кол. афиша + промо-баннер + хоризонтальные карточки
2. **Событие** — ev-hero с blob + теги + título + описание + date picker chips + sticky buy
3. **Схема зала** — seatmap + легенда + sidebar корзины
4. **Чекаут** — steps-bar (3 шага) + форма + order summary
5. **E-ticket** — карточка билета с barcode + meta-сетка
6. **Socials** — Instagram story шаблон (4:5, 9:16)

---

## Правила при генерации новых экранов

- **Никогда** не задавай цвет или шрифт вручную — только через CSS-переменные
- **Никогда** не используй border-radius > 8px в UI-компонентах (система угловатая)
- Accent (`--accent`) только для интерактивных элементов и статусных тегов; в тексте — только крупно (от 17px: цифры, выбранный день, скидка) и в ссылках, на мелких подписях никогда
- Ivory (`--premium`) только для Premium-блоков, не декоративно
- Blob только через `.cover-blob-1/.cover-blob-2` или radial-gradient с blur
- Шрифт Cormorant — только названия событий и display. Для UI — Manrope
- Минимальная высота кнопки `.btn-sm` — 36px
- Подключаемые шрифты (R14): `https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=Oranienbaum&family=Forum&family=Manrope:wght@300;400;500;600;700&display=swap`

---

## Переключение тем

```html
<!-- R14 — Тёмная (по умолчанию) -->
<link rel="stylesheet" href="ds-core-r14.css">

<!-- R14 — Светлая -->
<link rel="stylesheet" href="ds-core-r14-light.css">
```

Оба CSS-файла используют одни и те же классы — только переменные разные. Переключение тем = замена одного CSS-файла на другой.

---

## Что НЕ делать (страховка от типичных ошибок)

Эти запреты собраны по итогам перехода на R14 и наведения порядка в папке. Соблюдай их без напоминания.

### Файлы и структура
- **НЕ редактируй** ничего в `_archive/`. Это историческое — R11 CSS, гайды v10/v11, портфолио, демо. Если что-то нужно — копируй в корень и работай с копией.
- **НЕ подключай** `ds-core.css` / `ds-core-light.css` в новых HTML — это R11. Только `ds-core-r14.css` / `ds-core-r14-light.css`.
- **НЕ считай** `TTS-DS-Guide-v11*.html` за актуальный гайд — он построен на R11. Если нужен живой гайд R14 — собирай новый.
- **НЕ создавай** новые standalone HTML-демо в корне (footer-component.html, icons-pack.html и т. п.) без явного запроса. Если уж нужно — складывай в подпапку по разделам (`site/`, `concepts/`, `emails/`, `docs/`), не засоряй корень.
- **НЕ создавай** новые версии файлов суффиксом `-v12`, `-v13`, `R15` и т. п. без явной просьбы пользователя зафиксировать новую версию. Текущая — R14.

### Шрифты и толщины (Cormorant Garamond)
- **НЕ ставь** `font-weight: 300` (Light) на Cormorant нигде. В R14 минимум — 400 (для >25pt) или 500 (для ≤25pt).
- **НЕ грузи** Google Fonts с `Cormorant+Garamond:wght@300;400`. Актуальная строка: `Cormorant+Garamond:wght@400;500`.
- **НЕ трогай** `font-weight: 300` у `.smap-zoom-btn` — это Manrope, не Cormorant, правило R14 на него не распространяется.
- **НЕ понижай** толщину caption / синего uppercase ниже Medium (500). Серый малозначимый caption может быть Regular (400) — но это потолок снижения.

### Логотип
- **НЕ верстай** TTS-логотип текстом (буквами «TICKET TO SHOW»). Только SVG из `tts-logo.svg` или `uploads/Logo Stone.svg`.

### Компоненты
- **НЕ дублируй** одно событие несколько раз в афише при multi-venue / multi-show. Одно событие = одна карточка. Сеансы раскрываются на странице события через `session-list`.
- **НЕ используй** `date-chip` когда у события >1 площадки или >2 разрозненных дат — для этого `session-list`.
- **НЕ задавай** `border-radius > 8px` в UI. Система угловатая, основной радиус — `2px` (`--r-sm`).
- **НЕ применяй** `--accent` (Cobalt) к декоративным элементам. Только интерактив и статусные теги.
- **НЕ применяй** `--premium` (ivory) декоративно. Только Premium-блоки.
- **НЕ хардкодь** цвета и шрифты — только через CSS-переменные.

### Версионирование
- **НЕ переписывай** R11-файлы в `_archive/` под R14. Архив фиксирует историю.
- **НЕ удаляй** `_archive/` или его подпапки.
