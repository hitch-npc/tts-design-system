# История изменений

Все заметные изменения дизайн-системы TTS. Формат — [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/), версии — [SemVer](https://semver.org/lang/ru/), где MAJOR = номер релиза DS (R14 → 14).

## [Unreleased]

## [14.1.1] — 2026-09-11

### Удалено
- Hero-блоки Behance (`site/behance-hero-blocks.html`): это кейс для Behance, его дизайн, включая схему зала, расходится с актуальной версией. Файл остаётся в истории под тегом `v14.1.0`.

## [14.1.0] — 2026-09-11

Первая публикация R14 и продуктовых сборок в открытом репозитории.

### Добавлено
- Редизайн сайта v2 в тёмной и светлой теме: `site/redesign-v2-dark.html`, `site/redesign-v2-light.html`. Работают офлайн.
- Партнёрская программа на R14 и пакет для передачи в разработку: `site/partner-program/`.
- Cookie-баннер: компонент, превью и спецификация: `site/cookie-banner/`.
- Hero-блоки для Behance: `site/behance-hero-blocks.html`.
- Telegram custom emoji: 14 лент и 11 реакций, сэндбокс, пакетный рендер в `.webm`, превью наборов: `tg-emoji/`.
- Скрипты для Figma (плагин Scripter): переменные, стили и компоненты R14 собираются из токенов — `figma/*.js`.
- Почтовые кампании v3 (`emails/`), ранние концепты DS (`concepts/`), логотипы (`brand/`).
- Витрина `index.html` для GitHub Pages.
- Проверка перед публикацией `tooling/security-check.mjs` (`npm run security`), pre-push хук `.githooks/pre-push`, CI `.github/workflows/check.yml`.
- `README.md`, `CHANGELOG.md`, белый список в `.gitignore`.

### Изменено
- `package.json`: версия `14.1.0`, ссылка на репозиторий, скрипт `security`, зависимость `ffmpeg-static` — раньше она была только в lock-файле.
- В демо-страницах реальные контакты заменены заглушками на `example.com`.
- В концептах `lucide@latest` закреплён на версии `0.344.0`.

### Удалено
- Гайд v9.2 из корня (`index.html`). Он остаётся в истории под тегом `v9.2.0`, его место заняла витрина R14.

## [14.0.0] — 2026-06-26

Ядро R14: правила толщин приняты 2026-05-30, сборка из токенов заморожена 2026-06-26. Отдельным тегом не публиковалось и вошло в `14.1.0`.

### Изменено
- Cormorant Garamond: до 25pt включительно — не тоньше Medium (500), крупнее 25pt — не тоньше Regular (400). Light (300) запрещён. Затронуты `.t-display`, `.t-h3`, `.event-card-title`, `.card-h-title`, `.empty-title`, `.hero-title`, `.promo-title`, `.ev-title`, `.success-title`, `.postsale-title`.
- Caption и синий мелкий uppercase — не тоньше 500, серый второстепенный caption — не тоньше 400.
- Google Fonts: `Cormorant+Garamond:wght@400;500` вместо `300;400`.

### Добавлено
- `tokens.json` — единый источник истины, `:root` в обоих CSS генерируется (`tooling/build-tokens.mjs`).
- SMM-слой: `smm.tokens.json` → `ds-smm.css` (`tooling/build-smm.mjs`).
- Страж правил `tooling/guardrail.mjs`: `font-weight: 300`, `border-radius` больше 8px, сырой hex вне `:root`.

## [9.2.0] — 2026-04-20

Первая публикация: гайд Website Design System v9.2 одним файлом `index.html`.

Версии R10–R11 в открытый репозиторий не выкладывались.

[Unreleased]: https://github.com/hitch-npc/tts-design-system/compare/v14.1.1...HEAD
[14.1.1]: https://github.com/hitch-npc/tts-design-system/compare/v14.1.0...v14.1.1
[14.1.0]: https://github.com/hitch-npc/tts-design-system/compare/v9.2.0...v14.1.0
[9.2.0]: https://github.com/hitch-npc/tts-design-system/releases/tag/v9.2.0
