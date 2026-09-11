<p align="center"><img src="tts-logo.svg" alt="Ticket to Show" height="48"></p>

# TTS Design System · R14

Дизайн-система билетного сервиса **Ticket to Show**: токены, CSS-ядро в тёмной и светлой темах, редизайн сайта, партнёрская страница, cookie-баннер, письма и набор Telegram-эмодзи.

**Версия `14.1.0`** · [история изменений](CHANGELOG.md) · [правила системы](CLAUDE.md) · [как менять токены](tooling/README.md)

## Что внутри

| Раздел | Где | Что это |
|---|---|---|
| Ядро | `ds-core-r14.css`, `ds-core-r14-light.css` | Токены и компоненты. Классы в темах одинаковые, отличаются только переменные |
| Токены | `tokens.json`, `smm.tokens.json` | Единый источник истины: блоки `:root` в CSS собираются отсюда |
| SMM-слой | `ds-smm.css`, `tooling/examples/smm-example.html` | Соцформаты story / post / square на тех же токенах |
| Стили гайдов | `ds-doc.css`, `ds-doc-light.css` | Для страниц документации |
| Сборка | `tooling/` | `build-tokens`, `build-smm`, `guardrail`, `security-check` |
| Редизайн сайта v2 | `site/redesign-v2-dark.html`, `site/redesign-v2-light.html` | Сайт в тёмной и светлой теме. Каждый файл самодостаточен: шрифты и скрипты внутри, работает офлайн |
| Партнёрская программа | `site/partner-program/` | Страница и пакет для передачи в разработку (`handoff/`) |
| Cookie-баннер | `site/cookie-banner/` | Компонент, превью и спецификация для разработки |
| Behance | `site/behance-hero-blocks.html` | Hero-блоки для презентации |
| Telegram-эмодзи | `tg-emoji/` | 14 анимированных лент и 11 реакций, сэндбокс и рендер в `.webm`. Подробно в [tg-emoji/README.md](tg-emoji/README.md) |
| Письма | `emails/` | Шаблоны почтовых кампаний v3, десктоп и мобильная версия |
| Концепты | `concepts/` | Ранние направления DS, март 2026. Эталон — R14 |
| Бренд | `tts-logo.svg`, `brand/` | Логотип в SVG и PNG |
| Figma | `figma/*.js` | Скрипты для плагина Scripter: собирают в Figma переменные, стили и компоненты R14. Первым запускается `figma-script.js` |

## Посмотреть в браузере

Скачайте репозиторий и откройте [`index.html`](index.html): там ссылки на все страницы. После включения GitHub Pages (Settings → Pages → ветка `main`, папка `/ (root)`) та же витрина будет доступна по адресу `https://hitch-npc.github.io/tts-design-system/`.

## Подключение

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=Oranienbaum&family=Forum&family=Manrope:wght@300;400;500;600;700&display=swap" rel="stylesheet">

<!-- тёмная тема, по умолчанию -->
<link rel="stylesheet" href="ds-core-r14.css">
<!-- светлая: тот же набор классов, другой файл -->
<link rel="stylesheet" href="ds-core-r14-light.css">
```

```html
<button class="btn btn-primary btn-md">Купить билеты</button>
<span class="tag tag-accent">Премьера</span>
```

## Как менять систему

Нужен Node 18 или новее. Для сборки и проверок зависимости не нужны.

```bash
npm run build      # пересобрать CSS из tokens.json и smm.tokens.json
npm run check      # проверить без записи: сборка --check + страж правил
npm run security   # перед публикацией: секреты, личные данные, приватные файлы
```

Блоки `:root` в CSS руками не правятся: меняете значение в `tokens.json` и запускаете `npm run build`. Компоненты ниже `:root` правятся вручную, цвета задаются только через `var(--…)`. Пошагово — в [tooling/README.md](tooling/README.md).

Рендеру эмодзи в `.webm` нужен `ffmpeg`: его ставит `npm install` (пакет `ffmpeg-static`).

## Версии

Семантическое версионирование, `MAJOR.MINOR.PATCH`:

- **MAJOR** — номер релиза дизайн-системы (R14 → `14`). Меняется, когда ломаются токены или классы.
- **MINOR** — новые компоненты, страницы, наборы.
- **PATCH** — исправления без новых возможностей.

Каждая версия отмечена git-тегом `vX.Y.Z`. Номер хранится в `VERSION`, `package.json` и `package-lock.json` и меняется во всех трёх сразу. Что вошло в версию — в [CHANGELOG.md](CHANGELOG.md).

## Публикация

Репозиторий публичный. `.gitignore` работает как белый список: в git попадают только явно открытые файлы и папки, всё новое по умолчанию закрыто. Внутренние материалы (презентации, аудиты, исходники макетов, контент-планы) хранятся отдельно и сюда не попадают.

Перед каждым push `tooling/security-check.mjs` ищет ключи и токены, реальные e-mail и телефоны, локальные пути и приватные форматы. Та же проверка идёт в CI. Хук включается один раз после клонирования:

```bash
git config core.hooksPath .githooks
```

## Права

Лицензия не выдаётся: материалы открыты для просмотра, права на бренд Ticket to Show, логотип и дизайн сохраняются за правообладателем.
