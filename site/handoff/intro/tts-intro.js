/*!
 * TTS Intro — заставка главной Ticket to Show. DS TTS R14.
 *
 * Один файл: сам добавляет стили и разметку, зависимостей нет. Цвета и шрифты берёт из токенов ядра
 * (ds-core-r14.css), поэтому подключается на страницах, где ядро уже есть.
 * Шрифты: Cormorant Garamond italic 400 и Manrope 200 (строка Google Fonts — в документации).
 *
 * Подключение — сразу после <body>, до остальной разметки, чтобы заставка закрыла первый кадр:
 *   <script src="tts-intro.js"></script>
 *   <script>TTSIntro.start({ images: [...], poster: '.hero-poster', tickets: '#afisha' })</script>
 *
 * Когда играет (решение принимается при загрузке страницы):
 *   первый визит в браузере          → длинная версия (колода не быстрее 2,2 с);
 *   новый визит (новая сессия вкладки) → обычная: идёт вслед за реальной загрузкой;
 *   повторные загрузки в той же сессии → не играет, страница показывается сразу.
 *   ?intro=0 — не играть, ?intro=long / ?intro=short — сыграть нужную версию (для проверки).
 *
 * Документация и живой пример: index.html рядом с этим файлом.
 */
(function () {
  'use strict';
  var KEY_SESSION = 'tts-intro-shown';   // sessionStorage: заставка уже была в этой сессии
  var KEY_SEEN = 'tts-intro-seen';       // localStorage: человек хоть раз видел заставку целиком

  /* ─────────── стили ─────────── */
  var CSS = `
html.tts-intro-lock, html.tts-intro-lock body { overflow: hidden; }
.tts-intro { --lb: clamp(52px, 9vh, 84px); --ti-expo: cubic-bezier(.16,1,.3,1); --ti-io: cubic-bezier(.65,0,.35,1);
  position: fixed; inset: 0; z-index: 1000; overflow: hidden; overscroll-behavior: none; touch-action: none;
  background: var(--ink); color: var(--n100); cursor: pointer; transition: background-color 700ms var(--ease-out) 350ms; }
.tts-intro.is-out { background-color: transparent; pointer-events: none; }
.tts-intro *, .tts-intro *::before, .tts-intro *::after { box-sizing: border-box; }

/* свет «Рампа»: снизу от края кадра — светлая сердцевина, кобальт и фиолетовый к краям, как разделитель над футером */
.ti-light { position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 1800ms var(--ease-out); }
.tts-intro.is-run .ti-light { opacity: .85; }
.tts-intro.is-out .ti-light { opacity: 0; transition-duration: 800ms; }
.ti-ramp { position: absolute; left: 0; right: 0; bottom: var(--lb); height: 75vh; transform: translate3d(calc(var(--px, 0) * 6px), calc(var(--py, 0) * 4px), 0); }
.ti-ramp::before { content: ''; position: absolute; left: -10%; right: -10%; bottom: -10vh; height: 85vh; filter: blur(30px);
  background: radial-gradient(ellipse 48% 62% at 50% 100%, color-mix(in srgb, var(--n100) 30%, transparent) 0%, color-mix(in srgb, var(--accent) 30%, transparent) 30%, color-mix(in srgb, var(--rampa-violet) 14%, transparent) 55%, transparent 76%);
  animation: ti-breathe 9s ease-in-out infinite alternate; }
.ti-ramp::after { content: ''; position: absolute; left: 12%; right: 12%; bottom: 0; height: 1px;
  background: linear-gradient(90deg, transparent, var(--rampa-violet) 15%, var(--accent) 32%, var(--n100) 50%, var(--accent) 68%, var(--rampa-violet) 85%, transparent);
  box-shadow: 0 0 18px 2px color-mix(in srgb, var(--accent) 45%, transparent); }
@keyframes ti-breathe { from { opacity: .82; } to { opacity: 1; } }

/* колода: новая афиша поднимается снизу на верхнее место, предыдущие мягко переезжают глубже */
.ti-deck { position: absolute; inset: 0; pointer-events: none; transform: translate3d(calc(var(--px, 0) * -5px), calc(var(--py, 0) * -4px), 0); }
.ti-card { position: absolute; left: 50%; top: 50%; height: min(60vh, 580px, 116vw); aspect-ratio: 3 / 4; margin: 0; overflow: hidden;
  background: var(--n950); border: 1px solid var(--n800); border-radius: var(--r-sm); box-shadow: 0 50px 90px -30px var(--shadow-color);
  opacity: 0; will-change: transform, opacity; transform: translate(-50%, -50%) translate3d(0, 64px, 0) rotate(-1.5deg) scale(.97);
  transition: transform 1700ms var(--ti-expo), opacity 1000ms var(--ease-out), filter 1500ms var(--ease-out); }
.ti-card img { display: block; width: 100%; height: 100%; object-fit: cover; transform: scale(1.08); transition: transform 4500ms var(--ti-expo); }
.ti-card[data-d] img { transform: none; }
.ti-card[data-d="0"] { opacity: 1; transform: translate(-50%, -50%) rotate(-1.5deg); filter: none; }
.ti-card[data-d="1"] { opacity: 1; transform: translate(-50%, -50%) translate3d(3.4vw, -1%, 0) rotate(3deg) scale(.97); filter: brightness(.5); }
.ti-card[data-d="2"] { opacity: 1; transform: translate(-50%, -50%) translate3d(-3.6vw, -2%, 0) rotate(-4deg) scale(.94); filter: brightness(.28); }
.ti-card[data-d="3"] { opacity: 0; transform: translate(-50%, -50%) translate3d(0, -3%, 0) scale(.9); filter: brightness(.2); }
.tts-intro.is-out .ti-card:not(.is-hero) { opacity: 0; transition: opacity 700ms var(--ease-out); }
/* кобальтовая рамка появляется только у афиши, которая летит в постер, — к концу полёта */
.ti-card.is-hero { border-color: var(--accent); transition: transform 1300ms var(--ti-io), height 1300ms var(--ti-io), filter 700ms var(--ease-out), border-color 900ms var(--ease-out) 450ms; }

/* фон под надписью тише: затемнение между колодой и текстом, уходит, когда афиша летит в постер */
.ti-dim { position: absolute; inset: 0; pointer-events: none; transition: opacity 700ms var(--ease-out);
  background: radial-gradient(ellipse 75% 65% at 50% 50%, color-mix(in srgb, var(--ink) 44%, transparent) 0%, color-mix(in srgb, var(--ink) 34%, transparent) 60%, color-mix(in srgb, var(--ink) 20%, transparent) 100%); }
.ti-vig { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse 85% 75% at 50% 50%, transparent 55%, color-mix(in srgb, var(--ink) 85%, transparent) 100%); }
.ti-grain { position: absolute; inset: 0; pointer-events: none; opacity: .06; background-image: url(data:image/png;base64,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); }
.tts-intro.is-out .ti-dim, .tts-intro.is-out .ti-vig, .tts-intro.is-out .ti-grain { opacity: 0; transition: opacity 500ms var(--ease-out); }

/* Надпись. Размер считает браузер от окна: самая длинная строка во всю колонку, все строки — между рамками.
   9.36 — ширина самой длинной строки в em, 3.3 — высота набора строк в em (узкий экран: 5.62 и 5.55).
   Колонка задаётся отступами слева и справа, без ширины через переменную: Safari такую ширину не применял,
   и надпись уезжала вправо. */
.ti-head { position: absolute; top: 50%; left: var(--page-pad, 20px); right: var(--page-pad, 20px); max-width: 1320px; margin: 0 auto;
  font-size: max(12px, min(calc(min(1320px, 100vw - 2 * var(--page-pad, 20px)) / 9.36), calc((100vh - 2 * var(--lb) - 48px) / 3.3)));
  color: var(--n100); text-transform: uppercase; pointer-events: none;
  transform: translateY(-50%) translate3d(calc(var(--px, 0) * 8px), calc(var(--py, 0) * 5px), 0); }
.ti-set { display: block; }
.ti-narrow { display: none; }
.ti-line { display: block; width: max-content; white-space: nowrap; line-height: .98; overflow: hidden; padding: .08em .06em .18em 0; margin: -.08em -.06em -.18em 0; }
.ti-in { display: inline-block; transform: translateY(112%); will-change: transform; }
.ti-in.in { transform: none; transition: transform 1400ms var(--ti-expo); }
.ti-in.out { transform: translateY(-24%); opacity: 0; transition: transform 800ms var(--ease-out), opacity 600ms var(--ease-out); }
.ti-s { font-family: var(--f-thin); font-weight: 400; font-style: italic; font-size: 1.12em; letter-spacing: 0; }
.ti-n { font-family: var(--font); font-weight: 200; letter-spacing: -.02em; }
/* «расшифровка»: буква остаётся на месте прозрачной, подменный знак рисуется поверх и обрезан по её ширине */
.ti-dc { position: relative; display: inline-block; }
.ti-dc.on { color: transparent; }
.ti-dc.on::after { content: attr(data-g); position: absolute; left: 0; right: 0; top: 0; text-align: center; color: var(--n100); clip-path: inset(-.5em 0 -.5em 0); }

/* кинорамка: логотип сверху, отсчёт загрузки и «К билетам» снизу */
.ti-bar { position: absolute; z-index: 2; left: 0; right: 0; height: var(--lb); display: flex; align-items: center; padding: 0 var(--page-pad, 20px); background: var(--ink);
  transition: transform 1100ms var(--ti-io) 150ms; }
.ti-bar-t { top: 0; justify-content: center; border-bottom: 1px solid var(--n850); }
.ti-bar-b { bottom: 0; justify-content: space-between; gap: 16px; border-top: 1px solid var(--n850); padding-bottom: env(safe-area-inset-bottom); height: calc(var(--lb) + env(safe-area-inset-bottom)); }
.tts-intro.is-out .ti-bar-t { transform: translateY(-101%); }
.tts-intro.is-out .ti-bar-b { transform: translateY(101%); }
.ti-logo { display: block; width: 96px; height: auto; color: var(--n100); overflow: visible; }
.ti-eye { transform-box: fill-box; transform-origin: center; transform: scaleY(0); animation: ti-eye 900ms var(--ti-expo) 150ms forwards; }
.ti-div { transform-box: fill-box; transform-origin: center; transform: scaleY(0); animation: ti-grow 700ms var(--ti-expo) 380ms forwards; }
.ti-l1, .ti-l2 { opacity: 0; transform: translateY(24px); animation: ti-up 800ms var(--ti-expo) forwards; }
.ti-l1 { animation-delay: 480ms; }
.ti-l2 { animation-delay: 580ms; }
@keyframes ti-eye { 0% { transform: scaleY(0); } 60% { transform: scaleY(1.08); } 100% { transform: scaleY(1); } }
@keyframes ti-grow { to { transform: scaleY(1); } }
@keyframes ti-up { to { opacity: 1; transform: none; } }
.ti-count { display: flex; align-items: baseline; gap: 10px; min-width: 120px; }
.ti-num { font-family: var(--f-num); font-size: 22px; line-height: 1; font-variant-numeric: tabular-nums; color: var(--n100); }
.ti-prog { position: relative; width: 64px; height: 1px; background: var(--n800); overflow: hidden; align-self: center; }
.ti-prog i { position: absolute; inset: 0; background: var(--n100); transform-origin: left; transform: scaleX(var(--p, 0)); }
.ti-meta { min-width: 120px; text-align: right; font-size: 10px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; color: var(--n500); }
.ti-go { display: inline-flex; align-items: center; gap: 10px; padding: 10px 4px; background: none; border: 0; font: 500 13px var(--font); letter-spacing: .16em; text-transform: uppercase;
  color: var(--n100); cursor: pointer; opacity: 0; transform: translateY(8px); transition: opacity 600ms var(--ease-out), transform 800ms var(--ti-expo); }
.tts-intro.is-ready .ti-go { opacity: 1; transform: none; }
.ti-go:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

@media (max-width: 767px) {
  .ti-head { font-size: max(12px, min(calc((100vw - 2 * var(--page-pad, 20px)) / 5.62), calc((100vh - 2 * var(--lb) - 48px) / 5.55))); }
  .ti-wide { display: none; }
  .ti-narrow { display: block; }
  .ti-meta { display: none; }
  .ti-count { min-width: 0; }
  .ti-prog { width: 40px; }
  .ti-go { font-size: 11px; }
}
@media (prefers-reduced-motion: reduce) {
  .tts-intro, .tts-intro * { animation: none !important; transition: none !important; }
  .tts-intro { transition: opacity 240ms linear !important; }
  .tts-intro.is-out { opacity: 0; }
  .ti-eye, .ti-div, .ti-l1, .ti-l2 { transform: none !important; opacity: 1 !important; }
}`;

  /* логотип по частям: глаз открывается, черта вырастает, строки поднимаются */
  var LOGO = '<svg class="ti-logo" viewBox="0 0 676 194" fill="none" role="img" aria-label="Ticket to Show"><defs><mask id="ti-mask" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="0" y="33" width="242" height="124"><path d="M241.43 33.8628H0V156.732H241.43V33.8628Z" fill="white"/></mask></defs><g class="ti-eye" mask="url(#ti-mask)"><path d="M120.717 33.877C187.382 33.8789 241.427 95.3157 241.427 95.3157C240.957 95.8482 187.094 156.746 120.717 156.748C54.2542 156.748 0.333887 95.6944 0 95.3157C0 95.3157 54.0501 33.877 120.717 33.877ZM120.633 49.6928C95.4466 49.6928 75.0306 70.1087 75.0306 95.2949C75.0306 120.481 95.4459 140.897 120.633 140.897C145.818 140.896 166.234 120.481 166.234 95.2949C166.234 70.109 145.818 49.6933 120.633 49.6928ZM120.639 68.0628C135.682 68.0646 147.879 80.2592 147.879 95.3021C147.878 110.344 135.681 122.539 120.639 122.541C105.596 122.541 93.3945 110.345 93.393 95.3021C93.393 80.2577 105.596 68.0628 120.639 68.0628Z" fill="currentColor"/></g><g class="ti-div"><path d="M300.178 3.59277V185.521" stroke="currentColor" stroke-opacity="0.45" stroke-width="7.18518" stroke-linecap="square"/></g><g class="ti-l1"><path d="M415.013 85.8721C412.48 86.3456 409.995 86.5467 407.557 86.4756C405.143 86.4282 402.978 85.9906 401.061 85.1622C399.144 84.31 397.688 82.9728 396.694 81.1507C395.818 79.4938 395.356 77.8017 395.31 76.0736C395.262 74.3456 395.238 72.3934 395.238 70.216V36.8804H403.759V69.719C403.759 71.2573 403.77 72.606 403.794 73.7657C403.841 74.9261 404.09 75.8724 404.54 76.606C405.392 78.0266 406.753 78.8191 408.622 78.9851C410.492 79.1503 412.622 79.0555 415.013 78.7005V85.8721ZM388.28 54.2404V47.5307H415.013V54.2404H388.28Z" fill="currentColor"/><path d="M423.968 41.7086V33.8628H432.524V41.7086H423.968ZM423.968 85.8721V47.5307H432.524V85.8721H423.968Z" fill="currentColor"/><path d="M459.806 86.9365C455.853 86.9365 452.481 86.0607 449.688 84.3096C446.895 82.5342 444.753 80.1207 443.262 77.0677C441.795 74.014 441.049 70.5588 441.025 66.701C441.049 62.7722 441.819 59.293 443.333 56.2636C444.872 53.2105 447.049 50.8201 449.865 49.0924C452.682 47.341 456.031 46.4653 459.912 46.4653C464.267 46.4653 467.948 47.5658 470.953 49.7669C473.982 51.9443 475.959 54.9264 476.882 58.7132L468.361 61.0208C467.699 58.9617 466.598 57.3642 465.06 56.2281C463.521 55.0684 461.77 54.4886 459.806 54.4886C457.581 54.4886 455.747 55.0211 454.303 56.0862C452.859 57.1275 451.795 58.5712 451.108 60.4172C450.421 62.2633 450.079 64.3579 450.079 66.701C450.079 70.3458 450.895 73.2926 452.528 75.5408C454.161 77.7891 456.587 78.9136 459.806 78.9136C462.078 78.9136 463.865 78.3926 465.166 77.3515C466.492 76.3096 467.486 74.8072 468.149 72.8428L476.882 74.795C475.698 78.7002 473.627 81.7064 470.669 83.8124C467.71 85.8954 464.09 86.9365 459.806 86.9365Z" fill="currentColor"/><path d="M483.954 85.8739L484.025 34.4946H492.731V65.893L506.825 47.3394H517.565L502.615 66.6067L518.849 85.8739H507.467L492.731 67.3203V85.8739H483.954Z" fill="currentColor"/><path d="M539.246 86.944C535.344 86.944 531.919 86.0991 528.97 84.4105C526.02 82.7213 523.713 80.3789 522.048 77.3813C520.406 74.3843 519.586 70.9353 519.586 67.0343C519.586 62.8241 520.395 59.1728 522.012 56.0806C523.63 52.9645 525.878 50.5501 528.756 48.8375C531.634 47.1249 534.964 46.2686 538.746 46.2686C542.742 46.2686 546.132 47.2081 548.915 49.0872C551.722 50.9426 553.803 53.5711 555.159 56.9725C556.515 60.374 557.026 64.3821 556.693 68.9967H548.166V65.8569C548.142 61.6704 547.405 58.6139 545.953 56.6871C544.503 54.7604 542.219 53.797 539.103 53.797C535.582 53.797 532.966 54.8912 531.253 57.0796C529.541 59.2442 528.685 62.4197 528.685 66.6061C528.685 70.5072 529.541 73.5279 531.253 75.669C532.966 77.8095 535.464 78.8801 538.746 78.8801C540.863 78.8801 542.683 78.4159 544.205 77.4883C545.752 76.537 546.941 75.1697 547.773 73.3856L556.265 75.9543C554.79 79.4269 552.507 82.1271 549.414 84.0534C546.346 85.9805 542.956 86.944 539.246 86.944ZM525.973 68.9967V62.503H552.483V68.9967H525.973Z" fill="currentColor"/><path d="M587.235 85.8733C584.689 86.3489 582.191 86.5508 579.741 86.4797C577.316 86.4323 575.139 85.9918 573.212 85.1598C571.286 84.3033 569.823 82.9597 568.823 81.1274C567.943 79.4626 567.48 77.7619 567.432 76.0252C567.384 74.2893 567.361 72.327 567.361 70.1383V36.6348H575.924V69.6388C575.924 71.1849 575.936 72.5404 575.96 73.7066C576.007 74.872 576.257 75.8233 576.709 76.5605C577.565 77.9882 578.933 78.7851 580.812 78.9511C582.692 79.1177 584.832 79.0229 587.235 78.6658V85.8733ZM560.367 54.0823V47.3388H587.235V54.0823H560.367Z" fill="currentColor"/><path d="M632.395 85.8733C629.849 86.3489 627.352 86.5508 624.902 86.4797C622.476 86.4323 620.299 85.9918 618.372 85.1598C616.446 84.3033 614.983 82.9597 613.984 81.1274C613.103 79.4626 612.64 77.7619 612.593 76.0252C612.544 74.2893 612.521 72.327 612.521 70.1383V36.6348H621.084V69.6388C621.084 71.1849 621.096 72.5404 621.12 73.7066C621.167 74.872 621.417 75.8233 621.869 76.5605C622.725 77.9882 624.093 78.7851 625.972 78.9511C627.852 79.1177 629.992 79.0229 632.395 78.6658V85.8733ZM605.527 54.0823V47.3388H632.395V54.0823H605.527Z" fill="currentColor"/><path d="M655.751 86.944C651.897 86.944 648.532 86.0753 645.654 84.3394C642.775 82.6027 640.539 80.2122 638.945 77.1672C637.375 74.0991 636.591 70.5785 636.591 66.6061C636.591 62.5624 637.399 59.0182 639.017 55.9735C640.635 52.9288 642.882 50.5501 645.761 48.8375C648.639 47.1249 651.969 46.2686 655.751 46.2686C659.628 46.2686 663.006 47.1367 665.884 48.8732C668.763 50.6096 670.999 53.0121 672.592 56.0806C674.186 59.1252 674.983 62.6337 674.983 66.6061C674.983 70.6023 674.174 74.1343 672.556 77.2031C670.963 80.2482 668.727 82.6387 665.848 84.3746C662.971 86.0876 659.604 86.944 655.751 86.944ZM655.751 78.8801C659.176 78.8801 661.721 77.7384 663.387 75.4549C665.051 73.1715 665.884 70.2217 665.884 66.6061C665.884 62.8716 665.04 59.8983 663.351 57.6862C661.662 55.4502 659.129 54.3322 655.751 54.3322C653.444 54.3322 651.54 54.8555 650.042 55.9022C648.567 56.925 647.473 58.3641 646.759 60.2195C646.046 62.051 645.689 64.1799 645.689 66.6061C645.689 70.3406 646.534 73.326 648.222 75.562C649.935 77.7743 652.444 78.8801 655.751 78.8801Z" fill="currentColor"/></g><g class="ti-l2"><path d="M407.348 158.388C402.615 158.388 398.769 157.323 395.81 155.193C392.852 153.063 391.054 150.069 390.414 146.211L399.148 144.862C399.597 146.755 400.591 148.246 402.13 149.335C403.668 150.424 405.609 150.968 407.952 150.968C410.011 150.968 411.597 150.566 412.709 149.761C413.845 148.933 414.413 147.809 414.413 146.389C414.413 145.513 414.2 144.815 413.774 144.294C413.371 143.75 412.473 143.229 411.076 142.732C409.68 142.235 407.538 141.608 404.65 140.851C401.431 139.999 398.875 139.087 396.982 138.117C395.089 137.123 393.728 135.951 392.899 134.602C392.071 133.253 391.656 131.62 391.656 129.703C391.656 127.312 392.284 125.23 393.538 123.455C394.793 121.68 396.544 120.319 398.793 119.372C401.041 118.402 403.692 117.917 406.745 117.917C409.727 117.917 412.366 118.378 414.661 119.302C416.981 120.224 418.851 121.538 420.271 123.242C421.69 124.946 422.566 126.946 422.898 129.242L414.165 130.804C413.951 129.17 413.206 127.881 411.928 126.934C410.673 125.987 408.993 125.455 406.887 125.336C404.875 125.218 403.254 125.526 402.023 126.26C400.792 126.97 400.177 127.976 400.177 129.277C400.177 130.011 400.425 130.638 400.922 131.159C401.42 131.68 402.413 132.2 403.905 132.721C405.42 133.242 407.668 133.88 410.65 134.638C413.703 135.419 416.141 136.318 417.963 137.336C419.809 138.33 421.134 139.525 421.939 140.922C422.768 142.318 423.182 144.01 423.182 145.998C423.182 149.856 421.774 152.885 418.957 155.087C416.164 157.288 412.294 158.388 407.348 158.388Z" fill="currentColor"/><path d="M457.477 157.32V138.86C457.477 137.653 457.394 136.316 457.228 134.849C457.063 133.381 456.672 131.973 456.057 130.624C455.465 129.251 454.566 128.127 453.359 127.251C452.176 126.375 450.566 125.938 448.531 125.938C447.442 125.938 446.365 126.115 445.3 126.47C444.235 126.825 443.265 127.441 442.389 128.316C441.537 129.168 440.85 130.351 440.33 131.866C439.809 133.357 439.549 135.275 439.549 137.618L434.472 135.452C434.472 132.186 435.099 129.228 436.354 126.576C437.632 123.926 439.502 121.82 441.963 120.258C444.424 118.672 447.454 117.879 451.051 117.879C453.892 117.879 456.235 118.352 458.08 119.299C459.926 120.246 461.394 121.453 462.483 122.92C463.571 124.387 464.376 125.949 464.897 127.606C465.417 129.263 465.748 130.836 465.891 132.328C466.057 133.795 466.139 134.99 466.139 135.914V157.32H457.477ZM430.887 157.32V106.199H438.52V133.109H439.549V157.32H430.887Z" fill="currentColor"/><path d="M492.442 158.393C488.589 158.393 485.223 157.525 482.345 155.788C479.467 154.051 477.23 151.661 475.637 148.616C474.067 145.548 473.282 142.028 473.282 138.055C473.282 134.011 474.091 130.467 475.708 127.422C477.325 124.378 479.574 121.999 482.452 120.287C485.33 118.574 488.66 117.717 492.442 117.717C496.319 117.717 499.697 118.586 502.576 120.322C505.453 122.059 507.689 124.461 509.283 127.529C510.877 130.574 511.673 134.083 511.673 138.055C511.673 142.051 510.865 145.584 509.248 148.652C507.654 151.697 505.418 154.087 502.54 155.824C499.661 157.536 496.296 158.393 492.442 158.393ZM492.442 150.329C495.867 150.329 498.412 149.187 500.078 146.903C501.743 144.62 502.576 141.671 502.576 138.055C502.576 134.321 501.731 131.348 500.042 129.135C498.353 126.899 495.82 125.781 492.442 125.781C490.135 125.781 488.232 126.304 486.734 127.351C485.258 128.374 484.164 129.813 483.451 131.669C482.737 133.5 482.38 135.629 482.38 138.055C482.38 141.79 483.225 144.775 484.914 147.011C486.627 149.223 489.136 150.329 492.442 150.329Z" fill="currentColor"/><path d="M526.35 157.322L514.576 118.717L522.996 118.788L530.525 143.514L538.161 118.788H545.403L553.003 143.514L560.568 118.788H568.988L557.214 157.322H550.506L541.764 130.812L533.059 157.322H526.35Z" fill="currentColor"/></g></svg>';

  /* Надпись: «Ticket to Show» — Cormorant italic 400, остальное — Manrope 200.
     Два набора строк, нужный выбирает CSS по ширине окна. */
  var SETS = {
    wide:   [['TICKET TO SHOW', '&nbsp;—'], ['', 'БИЛЕТЫ БЕЗ'], ['', 'КАССОВЫХ СБОРОВ']],
    narrow: [['TICKET TO', ''], ['SHOW', '&nbsp;—'], ['', 'БИЛЕТЫ БЕЗ'], ['', 'КАССОВЫХ'], ['', 'СБОРОВ']]
  };
  var GLYPHS = Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZÆŒØАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЭЮЯ');

  function store(kind, k, v) { try { var s = window[kind]; if (v === undefined) return s.getItem(k); s.setItem(k, v); } catch (e) { return null; } }

  /* Какую версию играть: 'long' | 'short' | 'skip' */
  function decide() {
    var q = new URLSearchParams(location.search).get('intro');
    if (q === '0') return 'skip';
    if (q === 'long' || q === '1') return 'long';
    if (q === 'short') return 'short';
    if (store('sessionStorage', KEY_SESSION) === '1') return 'skip';
    return store('localStorage', KEY_SEEN) === '1' ? 'short' : 'long';
  }

  var running = null;

  function start(opts) {
    opts = opts || {};
    var html = document.documentElement;
    var mode = opts.mode || decide();
    var cb = function (name) { try { if (typeof opts[name] === 'function') opts[name](); } catch (e) { setTimeout(function () { throw e; }); } };
    if (running) running.kill();
    if (mode === 'skip') { cb('onReveal'); cb('onPoster'); cb('onDone'); return mode; }

    var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fine = matchMedia('(pointer: fine)').matches;
    var images = (opts.images || []).slice(0, 60), fallbacks = opts.fallbacks || [];
    var LONG = mode === 'long';
    /* колода листается за DEAL мс при любом числе афиш: шаг между афишами не больше GAP */
    var DEAL = LONG ? 3200 : 1500;
    var MIN = LONG ? 2200 : 0, GAP = Math.min(LONG ? 520 : 220, DEAL / Math.max(1, images.length)), HOLD = LONG ? 900 : 250;
    var STEP = LONG ? 110 : 70, RISE = LONG ? 1400 : 950;   // шаг между строками и время подъёма строки, мс

    /* сессия отмечается сразу: перезагрузка во время заставки её не повторит */
    store('sessionStorage', KEY_SESSION, '1');

    if (!document.getElementById('tts-intro-css')) {
      var st = document.createElement('style'); st.id = 'tts-intro-css'; st.textContent = CSS; document.head.appendChild(st);
    }
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    scrollTo(0, 0);
    html.classList.add('tts-intro-lock');

    var wrap = function (t) {
      return t.split(/(&nbsp;)/).map(function (part) {
        return part === '&nbsp;' ? part : Array.from(part).map(function (ch) {
          return ch !== ' ' && ch !== '—' && Math.random() < .22 ? '<span class="ti-dc">' + ch + '</span>' : ch;
        }).join('');
      }).join('');
    };
    var head = Object.keys(SETS).map(function (k) {
      return '<span class="ti-set ti-' + k + '">' + SETS[k].map(function (l, i) {
        return '<span class="ti-line"><span class="ti-in" data-i="' + i + '">' + (l[0] ? '<span class="ti-s">' + wrap(l[0]) + '</span>' : '') + (l[1] ? '<span class="ti-n">' + wrap(l[1]) + '</span>' : '') + '</span></span>';
      }).join('') + '</span>';
    }).join('');

    var box = document.createElement('div');
    box.className = 'tts-intro';
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Ticket to Show — билеты без кассовых сборов');
    box.tabIndex = -1;
    box.innerHTML =
      '<div class="ti-light" aria-hidden="true"><span class="ti-ramp"></span></div>' +
      '<div class="ti-deck" aria-hidden="true">' + images.map(function (src) { return '<figure class="ti-card"><img src="' + src + '" alt="" decoding="async" referrerpolicy="no-referrer"></figure>'; }).join('') + '</div>' +
      '<div class="ti-dim" aria-hidden="true"></div>' +
      '<p class="ti-head" aria-hidden="true">' + head + '</p>' +
      '<div class="ti-vig" aria-hidden="true"></div>' +
      '<div class="ti-bar ti-bar-t">' + LOGO + '</div>' +
      '<div class="ti-bar ti-bar-b"><span class="ti-count" aria-hidden="true"><span class="ti-num">000</span><span class="ti-prog"><i></i></span></span>' +
      '<button class="ti-go" type="button">' + (opts.goLabel || 'К билетам') + ' <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v16M6 14l6 6 6-6"/></svg></button>' +
      '<span class="ti-meta">' + (opts.meta || '') + '</span></div>' +
      '<div class="ti-grain" aria-hidden="true"></div>';
    (document.body || document.documentElement).appendChild(box);

    var cards = Array.prototype.slice.call(box.querySelectorAll('.ti-card'));
    cards.forEach(function (c, i) {
      c.firstChild.addEventListener('error', function (e) { var fb = fallbacks.length && fallbacks[i % fallbacks.length]; if (!e.target.dataset.fb && fb) { e.target.dataset.fb = 1; e.target.src = fb; } });
    });
    var topCard = cards[cards.length - 1];
    var inners = Array.prototype.slice.call(box.querySelectorAll('.ti-in'));
    var dcs = Array.prototype.slice.call(box.querySelectorAll('.ti-dc'));
    var num = box.querySelector('.ti-num'), prog = box.querySelector('.ti-prog');

    var run = running = { done: false, timers: [], raf: 0 };
    var at = function (ms, fn) { run.timers.push(setTimeout(fn, ms)); };
    run.kill = function () { run.done = true; run.timers.forEach(clearTimeout); cancelAnimationFrame(run.raf); };

    /* реальная загрузка: картинки колоды, шрифты заставки и сама страница (не дольше 4 с) */
    var fontsReady = document.fonts ? Promise.all([
      document.fonts.load('italic 400 100px "Cormorant Garamond"', 'TICKET'),
      document.fonts.load('200 100px "Manrope"', 'БИЛЕТЫ')
    ]) : Promise.resolve();
    var pageReady = new Promise(function (r) { if (document.readyState === 'complete') r(); else addEventListener('load', function () { r(); }, { once: true }); });
    var assets = [fontsReady, pageReady].concat(cards.map(function (c) { var im = c.querySelector('img'); return im.decode ? im.decode() : Promise.resolve(); }));
    var loaded = 0;
    assets.forEach(function (p) { p.then(function () { loaded++; }, function () { loaded++; }); });

    /* параллакс: курсор на десктопе, медленный дрейф на телефоне */
    var P = { x: 0, y: 0, tx: 0, ty: 0 };
    var onMove = function (e) { P.tx = e.clientX / innerWidth * 2 - 1; P.ty = e.clientY / innerHeight * 2 - 1; };
    if (fine) addEventListener('pointermove', onMove);
    (function loop(t) {
      if (run.done) return;
      if (!fine) { P.tx = Math.sin(t * .00025) * .3; P.ty = Math.cos(t * .0002) * .2; }
      P.x += (P.tx - P.x) * .04; P.y += (P.ty - P.y) * .04;
      box.style.setProperty('--px', P.x.toFixed(4)); box.style.setProperty('--py', P.y.toFixed(4));
      run.raf = requestAnimationFrame(loop);
    })(0);

    /* на iOS overflow: hidden не держит прокрутку под слоем — гасим жесты на самой заставке */
    var noScroll = function (e) { e.preventDefault(); };
    box.addEventListener('touchmove', noScroll, { passive: false });
    box.addEventListener('wheel', noScroll, { passive: false });

    var n = 0, lastDeal = -1e9;
    function deal() { cards.forEach(function (c, i) { if (i <= n) c.dataset.d = String(Math.min(n - i, 3)); }); n++; lastDeal = performance.now(); }

    function decrypt(d, startMs) {
      var end = startMs + 260 + Math.random() * 300;
      at(startMs, function () {
        var tEnd = performance.now() + (end - startMs);
        (function tick() {
          if (run.done || performance.now() >= tEnd) { d.classList.remove('on'); return; }
          d.dataset.g = GLYPHS[Math.random() * GLYPHS.length | 0];
          d.classList.add('on');
          run.timers.push(setTimeout(tick, 55));
        })();
      });
    }
    /* надпись выдвигается сразу, пока ложатся афиши: ждёт только шрифты */
    function revealText() {
      if (run.done || run.textEnd) return;
      var t = LONG ? 150 : 60;
      inners.forEach(function (x) { x.style.transitionDelay = (t + x.dataset.i * STEP) + 'ms'; x.style.transitionDuration = RISE + 'ms'; });
      requestAnimationFrame(function () { inners.forEach(function (x) { x.classList.add('in'); }); });
      if (!RM) dcs.forEach(function (d) { decrypt(d, t + d.closest('.ti-in').dataset.i * STEP + 120 + Math.random() * 200); });
      run.textEnd = performance.now() + t + 4 * STEP + RISE;
    }
    function show() {
      if (run.done) return;
      box.classList.add('is-ready');
      revealText();
      if (RM) { n = cards.length - 1; deal(); at(1200, function () { finish(); }); return; }
      at(Math.max(0, run.textEnd - performance.now()) + HOLD, function () { finish(); });
    }
    function begin() {
      if (run.done) return;
      box.classList.add('is-run');
      fontsReady.then(revealText, revealText);
      var t0 = performance.now(), p = 0;
      (function count(t) {
        if (run.done) return;
        var el = t - t0, real = el > 4000 ? 1 : loaded / assets.length;
        var goal = MIN ? Math.min(real, el / MIN) : real;
        p += (goal - p) * (RM ? 1 : .2);
        if (p > .985 && goal === 1) p = 1;
        num.textContent = String(Math.round(p * 100)).padStart(3, '0');
        prog.style.setProperty('--p', p.toFixed(3));
        /* сколько афиш уже положено — по доле загрузки; новая не чаще раза в GAP мс */
        var due = Math.min(cards.length, Math.max(1, Math.ceil(p * cards.length)));
        if (!RM && n < due && t - lastDeal >= GAP) deal();
        if (p < 1 || (!RM && n < cards.length)) requestAnimationFrame(count); else show();
      })(t0);
    }

    function finish(toTickets) {
      if (run.done) return;
      run.kill();
      removeEventListener('pointermove', onMove);
      store('localStorage', KEY_SEEN, '1');
      box.style.setProperty('--px', 0); box.style.setProperty('--py', 0);
      box.classList.add('is-ready');
      /* страница под заставкой — всегда с самого верха */
      if (!toTickets) scrollTo(0, 0);
      inners.forEach(function (x) { x.style.transitionDelay = (x.dataset.i * 40) + 'ms'; x.style.transitionDuration = ''; x.classList.remove('in'); x.classList.add('out'); });
      var poster = opts.poster && document.querySelector(opts.poster);
      var pr = poster && poster.getBoundingClientRect();
      var fly = !RM && !toTickets && topCard && topCard.dataset.d === '0' && pr && pr.width > 0 && pr.bottom > 0 && pr.top < innerHeight;
      if (fly) {
        topCard.classList.add('is-hero');
        /* постер бывает горизонтальным: карточка по пути принимает его пропорции, картинка внутри кадрируется сама */
        var w0 = topCard.offsetWidth, h1 = w0 * pr.height / pr.width;
        if (Math.abs(h1 - topCard.offsetHeight) > 2) { topCard.style.width = w0 + 'px'; topCard.style.aspectRatio = 'auto'; topCard.style.height = topCard.offsetHeight + 'px'; void topCard.offsetHeight; topCard.style.height = h1 + 'px'; }
        var s = pr.width / w0;
        topCard.style.transform = 'translate(-50%, -50%) translate3d(' + (pr.left + pr.width / 2 - innerWidth / 2) + 'px, ' + (pr.top + pr.height / 2 - innerHeight / 2) + 'px, 0) rotate(0deg) scale(' + s + ')';
      }
      setTimeout(function () { box.classList.add('is-out'); }, RM ? 0 : 250);
      setTimeout(function () { cb('onReveal'); }, RM ? 0 : 600);
      var end = RM ? 300 : fly ? 1550 : 1200;
      setTimeout(function () { cb('onPoster'); }, fly ? end - 150 : 500);
      setTimeout(function () {
        box.remove();
        html.classList.remove('tts-intro-lock');
        if (!toTickets) scrollTo(0, 0);
        else { var tg = opts.tickets && document.querySelector(opts.tickets); if (tg) tg.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' }); }
        if (running === run) running = null;
        cb('onDone');
      }, end);
    }

    box.querySelector('.ti-go').addEventListener('click', function (e) { e.stopPropagation(); finish(true); });
    box.addEventListener('click', function () { finish(); });
    var onKey = function (e) { if (run.done) { removeEventListener('keydown', onKey); return; } if (['Escape', 'Enter', ' '].indexOf(e.key) > -1) { e.preventDefault(); finish(); } };
    addEventListener('keydown', onKey);
    box.focus({ preventScroll: true });

    /* старт — когда вкладку действительно видно */
    var go = function () { requestAnimationFrame(begin); };
    if (document.visibilityState === 'visible') go();
    else document.addEventListener('visibilitychange', function h() { if (document.visibilityState === 'visible') { document.removeEventListener('visibilitychange', h); go(); } });
    return mode;
  }

  window.TTSIntro = {
    start: start,
    decide: decide,
    /* сбросить отметки (для проверки): следующая загрузка сыграет как первый визит */
    reset: function () { try { sessionStorage.removeItem(KEY_SESSION); localStorage.removeItem(KEY_SEEN); } catch (e) {} },
    keys: { session: KEY_SESSION, seen: KEY_SEEN }
  };
})();
