// ══════════════════════════════════════════════════════════
// TTS Design System R14 — НОВЫЕ ЭЛЕМЕНТЫ · октябрь 2026
// Мини-набор из стендов site/handoff/redesign-2026-10 (витрина: lab-new-elements.html)
// Запускать через Scripter ПОСЛЕ figma-script.js (нужны коллекции Color/Dark и Radius)
// Повторный запуск удаляет прошлую версию набора и собирает заново
// ══════════════════════════════════════════════════════════

const SETS = ['Плашка документа','Блок посетителя','Бейдж категории','Кнопка фильтра','Чип фильтра',
  'Кнопка фильтров (моб.)','Плитка площадки','Вкладки','Строка почты','Условия возврата','Чип билета',
  'Заголовок шага','Низ окна','Отправлено','404 · Билет'];
for (const n of [...figma.currentPage.children]) {
  if ((n.type === 'COMPONENT_SET' || n.type === 'COMPONENT') && SETS.includes(n.name)) n.remove();
  if (n.type === 'FRAME' && n.name === 'Новое · октябрь 2026') n.remove();
}

// ─── Шрифты ──────────────────────────────────
const FONTS = [['Manrope','Regular'],['Manrope','Medium'],['Manrope','SemiBold'],['Manrope','Bold'],
  ['Cormorant Garamond','Medium'],['Forum','Regular'],['Oranienbaum','Regular']];
for (const [family, style] of FONTS) await figma.loadFontAsync({ family, style });

// ─── Переменные ──────────────────────────────
const allVars  = await figma.variables.getLocalVariablesAsync();
const allColls = await figma.variables.getLocalVariableCollectionsAsync();
const byId     = Object.fromEntries(allColls.map(c => [c.id, c.name]));
const D = 'Color/Dark';
const gv = (col, name) => allVars.find(v => byId[v.variableCollectionId] === col && v.name === name) || null;
// Цвет — переменная темы, если есть; иначе значение тёмной темы из tokens.json
const HEX = { ink:'#0D0D0D', n100:'#D6D6D2', n200:'#C0C0BC', n300:'#A6A6A2', n400:'#8A8A88', n500:'#7A7A78',
  n600:'#626260', n700:'#4A4A48', n800:'#262930', n900:'#191C22', n950:'#111318', accent:'#0047FF',
  'accent-ghost':'#0B142A', 'on-accent':'#FFFFFF', success:'#22C55E', 'success-bg':'#0A2210',
  'success-border':'#1A4428', 'danger-bg':'#2D1010', 'danger-border':'#7A2020', 'danger-text':'#FF8080',
  'error-fg':'#FF6B6B', 'tag-g-bg':'#0A2210', 'tag-g-fg':'#4ADE80', 'tag-g-bd':'#1A4428',
  'tag-r-bg':'#220A0A', 'tag-r-fg':'#F87171', 'tag-r-bd':'#441414', 'tag-o-fg':'#FB923C',
  'zone-2':'#3F73E3', 'zone-4':'#7E6FD0', 'premium-bg':'#F5F4EE', 'premium-ink':'#0D0D0D', danger:'#E53E3E' };
function solid(h){ return { type:'SOLID', color:{ r:parseInt(h.slice(1,3),16)/255, g:parseInt(h.slice(3,5),16)/255, b:parseInt(h.slice(5,7),16)/255 } }; }
function paint(name){
  const v = gv(D, name);
  return v ? figma.variables.setBoundVariableForPaint(solid('#000000'), 'color', v) : solid(HEX[name] || '#FF00FF');
}
const rSm = gv('Radius','sm');
function radius(node, r = 2){ node.cornerRadius = r; try { if (rSm && r === 2) node.setBoundVariable('topLeftRadius', rSm), node.setBoundVariable('topRightRadius', rSm), node.setBoundVariable('bottomLeftRadius', rSm), node.setBoundVariable('bottomRightRadius', rSm); } catch(e){} }

// ─── Строители ───────────────────────────────
// box: автолейаут-рамка. dir H|V, gap, pad [v,h] или [t,r,b,l], fill, stroke, w (FIXED ширина), r
function box(o = {}, kind = 'FRAME'){
  const f = kind === 'COMP' ? figma.createComponent() : figma.createFrame();
  f.name = o.name || 'box';
  f.layoutMode = o.dir === 'V' ? 'VERTICAL' : 'HORIZONTAL';
  f.itemSpacing = o.gap ?? 8;
  const p = o.pad || [0,0]; const [t,r,b,l] = p.length === 2 ? [p[0],p[1],p[0],p[1]] : p;
  f.paddingTop = t; f.paddingRight = r; f.paddingBottom = b; f.paddingLeft = l;
  f.primaryAxisSizingMode = o.w ? 'FIXED' : 'AUTO'; f.counterAxisSizingMode = 'AUTO';
  if (o.w) f.resize(o.w, f.height || 10);
  f.primaryAxisAlignItems = o.justify || 'MIN';
  f.counterAxisAlignItems = o.align || 'CENTER';
  f.fills = o.fill ? [paint(o.fill)] : [];
  if (o.stroke) { f.strokes = [paint(o.stroke)]; f.strokeWeight = 1; f.strokeAlign = 'INSIDE'; }
  if (o.dash) f.dashPattern = [4, 3];
  radius(f, o.r ?? 2);
  f.clipsContent = false;
  return f;
}
// txt: текстовый слой. f — 'ui'|'ui500'|'ui600'|'ui700'|'head'|'thin'|'num'
const FM = { ui:['Manrope','Regular'], ui500:['Manrope','Medium'], ui600:['Manrope','SemiBold'], ui700:['Manrope','Bold'],
  head:['Forum','Regular'], thin:['Cormorant Garamond','Medium'], num:['Oranienbaum','Regular'] };
function txt(s, o = {}){
  const t = figma.createText();
  t.name = o.name || 'text';
  t.fontName = { family: FM[o.f || 'ui'][0], style: FM[o.f || 'ui'][1] };
  t.characters = s; t.fontSize = o.size || 13;
  if (o.caps) { t.textCase = 'UPPER'; t.letterSpacing = { unit:'PERCENT', value: o.ls ?? 14 }; }
  else if (o.ls) t.letterSpacing = { unit:'PERCENT', value: o.ls };
  t.fills = [paint(o.color || 'n100')];
  if (o.w) { t.textAutoResize = 'HEIGHT'; t.resize(o.w, t.height); }
  return t;
}
function icon(svg, color = 'n500', size = 12){
  const n = figma.createNodeFromSvg(svg); n.name = 'icon'; n.resize(size, size);
  for (const v of n.findAll(x => 'strokes' in x && x.strokes.length)) v.strokes = [paint(color)];
  return n;
}
const ICON = {
  id: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#000" stroke-width="1.3" stroke-linecap="round"><rect x="1.5" y="3" width="13" height="10" rx="1"/><circle cx="5.5" cy="7.2" r="1.6"/><path d="M3.3 11c.4-1.1 1.2-1.7 2.2-1.7s1.8.6 2.2 1.7M9.5 6.5h3M9.5 9h2"/></svg>',
  chev:'<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4l5 5 5-5"/></svg>',
  up:  '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 8l5-5 5 5"/></svg>',
  x:   '<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#000" stroke-width="1.6" stroke-linecap="round"><path d="M1 1l10 10M11 1L1 11"/></svg>',
  copy:'<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#000" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="7" height="7" rx="1"/><path d="M8 4V2a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h2"/></svg>',
  ok:  '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6.5l2.5 2.5L10 3"/></svg>',
  doc: '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#000" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 2.5h7l3.5 3.5v11.5H5z"/><path d="M12 2.5V6h3.5M7.5 10h5M7.5 13h5"/></svg>',
  slid:'<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#000" stroke-width="1.4" stroke-linecap="round"><path d="M2 4h7M13 4h1M2 12h1M7 12h7"/><circle cx="11" cy="4" r="2"/><circle cx="5" cy="12" r="2"/></svg>',
};
const tag = (s, bg, bd, fg) => { const b = box({ name:'tag', pad:[4,10], fill:bg, stroke:bd, gap:6 }); b.appendChild(txt(s, { f:'ui600', size:10, caps:true, ls:12, color:fg })); return b; };
const btn = (s, kind = 'primary', o = {}) => {
  const b = box({ name:'button', pad:[13,24], fill: kind === 'primary' ? 'accent' : null, stroke: kind === 'primary' ? 'accent' : 'n700', justify:'CENTER', w:o.w });
  b.appendChild(txt(s, { f: kind === 'primary' ? 'ui700' : 'ui600', size:11, caps:true, ls:16, color: kind === 'primary' ? 'on-accent' : 'n100' }));
  return b;
};
const input = (ph, o = {}) => { const b = box({ name:'input', pad:[12,16], fill:'n950', stroke: o.error ? 'error-fg' : 'n700', w:o.w || 200 }); b.appendChild(txt(ph, { color: o.value ? 'n100' : 'n600', size:14 })); return b; };

// ─── Сборка набора ───────────────────────────
const page = figma.currentPage;
let startX = 200;
for (const n of page.children) if (typeof n.x === 'number') startX = Math.max(startX, n.x + (n.width || 0) + 100);
let Y = 100; const GAP = 56;
function variants(name, comps){
  for (const c of comps) page.appendChild(c);
  const set = figma.combineAsVariants(comps, page); set.name = name;
  set.layoutMode = 'HORIZONTAL'; set.itemSpacing = 24; set.paddingTop = set.paddingBottom = set.paddingLeft = set.paddingRight = 24;
  set.primaryAxisSizingMode = 'AUTO'; set.counterAxisSizingMode = 'AUTO'; set.counterAxisAlignItems = 'MIN';
  set.fills = [paint('ink')]; set.x = startX; set.y = Y; Y += set.height + GAP;
  print('✓ ' + name + ' — ' + comps.length);
  return set;
}
function comp(name, o){ const c = box(o, 'COMP'); c.name = name; return c; }

// 1. Плашка документа — тег ядра с иконкой
variants('Плашка документа', ['Потребуются документы','Именные билеты'].map(s => {
  const c = comp('Текст=' + s, { pad:[4,10], fill:'n900', stroke:'n800', gap:6 });
  c.appendChild(icon(ICON.id, 'n400', 12)); c.appendChild(txt(s, { f:'ui600', size:10, caps:true, ls:12, color:'n400' })); return c;
}));

// 2. Блок посетителя — заголовок с местом и статусом
variants('Блок посетителя', [
  ['Заполнено','Петров Иван · Паспорт','tag-g-bg','tag-g-bd','tag-g-fg','Заполнено','n800'],
  ['Пусто','Данные посетителя этого места','n900','n800','n400','Заполнить','n800'],
  ['Ошибка','Данные посетителя этого места','tag-r-bg','tag-r-bd','tag-r-fg','Не заполнено','danger-border'],
].map(([st, sub, bg, bd, fg, label, stroke]) => {
  const c = comp('Состояние=' + st, { pad:[14,16], fill:'n950', stroke, w:520, justify:'SPACE_BETWEEN' });
  const left = box({ name:'title', dir:'V', gap:2, align:'MIN' });
  left.appendChild(txt('Билет 1 · Партер, ряд 7, место 12', { f:'head', size:17 }));
  left.appendChild(txt(sub, { size:12, color:'n500' }));
  const right = box({ name:'status', gap:10 }); right.appendChild(tag(label, bg, bd, fg)); right.appendChild(icon(st === 'Ошибка' ? ICON.up : ICON.chev, 'n500', 12));
  c.appendChild(left); c.appendChild(right); return c;
}));

// 3. Бейдж категории — точка цвета жанра. Только на «Всех событиях» (решение №33)
variants('Бейдж категории', [['Спектакль','zone-2'],['Концерт','tag-o-fg'],['Классика','zone-4'],['Детям','tag-g-fg']].map(([s, dot]) => {
  const c = comp('Категория=' + s, { pad:[4,9], fill:'n950', stroke:'n800', gap:6 });
  const d = figma.createEllipse(); d.name = 'dot'; d.resize(7,7); d.fills = [paint(dot)];
  c.appendChild(d); c.appendChild(txt(s, { f:'ui600', size:10, caps:true, ls:12 })); return c;
}));

// 4. Кнопка фильтра
variants('Кнопка фильтра', [['Обычная','Площадка','n950','n800','n200'],['Открыта','Площадка','accent-ghost','accent','n100'],['Применён','Дата: 1–14 ноября','accent-ghost','accent','n100']].map(([st, s, bg, bd, fg]) => {
  const c = comp('Состояние=' + st, { pad:[8,12], fill:bg, stroke:bd, gap:8 });
  c.appendChild(txt(s, { f:'ui500', size:12, color:fg })); c.appendChild(icon(ICON.chev, 'n500', 10)); return c;
}));

// 5. Чип фильтра
variants('Чип фильтра', ['1–14 ноября','Дом музыки'].map(s => {
  const c = comp('Значение=' + s, { pad:[5,6,5,10], fill:'n950', stroke:'n800', gap:6 });
  c.appendChild(txt(s, { size:11, color:'n200' })); c.appendChild(icon(ICON.x, 'n500', 9)); return c;
}));

// 6. Кнопка фильтров на телефоне
variants('Кнопка фильтров (моб.)', ['3'].map(n => {
  const c = comp('Счётчик=' + n, { pad:[8,12], fill:'accent-ghost', stroke:'accent', gap:6 });
  c.appendChild(icon(ICON.slid, 'n100', 14)); c.appendChild(txt('Фильтры', { f:'ui500', size:12 }));
  const b = box({ name:'badge', pad:[2,6], fill:'accent', r:9 }); b.appendChild(txt(n, { f:'ui700', size:10, color:'on-accent' })); c.appendChild(b); return c;
}));

// 7. Плитка площадки
variants('Плитка площадки', [['С событиями','Театр','Театр на Таганке','ул. Земляной Вал, 76/21, стр. 1','5 событий · ближайшее 27 октября','n300'],
  ['Наведение','Театр','Театр на Таганке','ул. Земляной Вал, 76/21, стр. 1','5 событий · ближайшее 27 октября','n300'],
  ['Без событий','Концертный зал','Концертный зал «Зарядье»','ул. Варварка, 6, стр. 4','Шоу ещё не анонсированы','n500']].map(([st, type, name, addr, next, nc]) => {
  const c = comp('Состояние=' + st, { pad:[16,16], fill:'n950', stroke:'n800', gap:14, w:340 });
  const logo = box({ name:'logo', pad:[16,20], fill:'n900', stroke:'n800', justify:'CENTER' }); logo.appendChild(txt(name[0], { f:'head', size:20, color:'n200' }));
  const body = box({ name:'body', dir:'V', gap:3, align:'MIN' });
  body.appendChild(txt(type, { f:'ui500', size:10, caps:true, color:'n500' })); body.appendChild(txt(name, { f:'head', size:17 }));
  body.appendChild(txt(addr, { size:12, color:'n400' })); body.appendChild(txt(next, { size:12, color:nc }));
  c.appendChild(logo); c.appendChild(body);
  if (st === 'Наведение') {
    // синий блоб справа, рамка светлее, стрелка — n100
    c.strokes = [paint('n600')];
    const g = gv(D,'blob-core'); const core = g ? null : solid('#06277F');
    c.fills = [paint('n950'), { type:'GRADIENT_RADIAL', gradientTransform:[[0.9,0,0.55],[0,1.6,-0.3]],
      gradientStops:[{ position:0, color:{ ...(core ? core.color : { r:0.024, g:0.153, b:0.498 }), a:1 } }, { position:1, color:{ r:0, g:0, b:0, a:0 } }] }];
  }
  const ch = txt('›', { size:18, color: st === 'Наведение' ? 'n100' : 'n500' }); c.appendChild(ch);
  return c;
}));

// 8. Вкладки-сегмент
variants('Вкладки', ['Поддержка','Возврат билетов'].map(active => {
  const c = comp('Активна=' + active, { pad:[0,0], stroke:'n800', gap:0, w:420 });
  for (const s of ['Поддержка','Возврат билетов']) {
    const on = s === active;
    const t = box({ name:'tab', pad:[12,16], fill: on ? 'accent-ghost' : null, stroke: on ? 'accent' : null, justify:'CENTER', w:210, r:0 });
    t.appendChild(txt(s, { f:'ui600', size:11, caps:true, ls:16, color: on ? 'n100' : 'n300' })); c.appendChild(t);
  }
  return c;
}));

// 9. Строка почты: адрес — ссылка mailto, рядом «Скопировать»
variants('Строка почты', [['Обычная','Скопировать',null,'n700','n100',ICON.copy],['Скопировано','Скопировано','success-bg','success-border','success',ICON.ok]].map(([st, s, bg, bd, fg, ic]) => {
  const c = comp('Состояние=' + st, { pad:[12,12,12,16], fill:'ink', stroke:'n800', gap:12, w:420, justify:'SPACE_BETWEEN' });
  const a = txt('support@tickettoshow.ru', { f:'ui500', size:15 }); a.textDecoration = 'UNDERLINE';
  const b = box({ name:'copy', pad:[10,12], fill:bg, stroke:bd, gap:6 }); b.appendChild(icon(ic, fg, 12)); b.appendChild(txt(s, { f:'ui600', size:9, caps:true, ls:16, color:fg }));
  c.appendChild(a); c.appendChild(b); return c;
}));

// 10. Условия возврата — свёрнутая строка
variants('Условия возврата', ['Свёрнуты'].map(st => {
  const c = comp('Состояние=' + st, { pad:[14,16], fill:'ink', stroke:'n800', gap:12, w:520, align:'MIN' });
  c.appendChild(icon(ICON.doc, 'n400', 18));
  const mid = box({ name:'text', dir:'V', gap:3, align:'MIN' });
  mid.appendChild(txt('Условия возврата билетов', { f:'head', size:16 }));
  mid.appendChild(txt('За 10 дней и более до мероприятия — до 100% стоимости. Удерживается 10% за услуги дистрибьютора.', { size:12, color:'n400', w:330 }));
  const more = box({ name:'more', gap:6 }); more.appendChild(txt('Подробнее', { f:'ui600', size:11, caps:true, ls:12, color:'n300' })); more.appendChild(icon(ICON.chev, 'n300', 12));
  c.appendChild(mid); c.appendChild(more); return c;
}));

// 11. Чип билета
variants('Чип билета', ['4612 0087 3391'].map(n => {
  const c = comp('Номер=' + n, { pad:[6,4,6,10], fill:'n900', stroke:'n800', gap:6 });
  c.appendChild(txt(n, { f:'num', size:14, ls:4 })); c.appendChild(icon(ICON.x, 'n500', 9)); return c;
}));

// 12. Заголовок шага формы
variants('Заголовок шага', [['Нет','1','Номера билетов'],['Да','2','Информация о возврате']].map(([opt, n, s]) => {
  const c = comp('По желанию=' + opt, { pad:[0,0], gap:12, align:'MAX' });
  c.appendChild(txt(n, { f:'num', size:22, color:'n500' })); c.appendChild(txt(s, { f:'head', size:18 }));
  if (opt === 'Да') c.appendChild(txt('по желанию', { size:12, color:'n500' }));
  return c;
}));

// 13. Закреплённый низ окна
variants('Низ окна', [
  ['Два действия', () => [btn('Отмена','ghost'), btn('Отправить запрос на возврат')], 'SPACE_BETWEEN', 520, 'H'],
  ['Одно действие', () => [btn('Написать письмо','primary',{ w:472 })], 'CENTER', 520, 'H'],
  ['Телефон', () => [btn('Отправить запрос на возврат','primary',{ w:304 }), btn('Отмена','ghost',{ w:304 })], 'MIN', 340, 'V'],
].map(([st, kids, justify, w, dir]) => {
  const c = comp('Тип=' + st, { pad: dir === 'V' ? [12,18] : [16,24,20,24], fill:'n950', w, justify, dir, gap:8 });
  c.strokes = [paint('n800')]; c.strokeTopWeight = 1; c.strokeBottomWeight = c.strokeLeftWeight = c.strokeRightWeight = 0;
  for (const k of kids()) c.appendChild(k);
  if (dir === 'V') { const g = c.children[1]; g.strokes = []; }
  return c;
}));

// 14. Отправлено
variants('Отправлено', ['Заявка отправлена'].map(s => {
  const c = comp('Текст=' + s, { dir:'V', pad:[8,0], gap:12, align:'MIN' });
  const ic = box({ name:'icon', pad:[14,14], fill:'success-bg', stroke:'success-border', r:24 }); ic.appendChild(icon(ICON.ok, 'success', 20));
  c.appendChild(ic); c.appendChild(txt(s, { f:'thin', size:28 })); c.appendChild(txt('Заявка принята. Мы ответим на указанную почту.', { size:14, color:'n300' }));
  return c;
}));

// 15. 404 · Билет — служебный шаблон. Корешок с 404 за перфорацией отрывается рукой
// (живое поведение — стенд lab-pages, функция tk2Init). Здесь — состояния: целый, надрыв, оторван, телефон.
const TTS_LOGO = `<svg width="676" height="194" viewBox="0 0 676 194" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M415.013 85.8721C412.48 86.3456 409.995 86.5467 407.557 86.4756C405.143 86.4282 402.978 85.9906 401.061 85.1622C399.144 84.31 397.688 82.9728 396.694 81.1507C395.818 79.4938 395.356 77.8017 395.31 76.0736C395.262 74.3456 395.238 72.3934 395.238 70.216V36.8804H403.759V69.719C403.759 71.2573 403.77 72.606 403.794 73.7657C403.841 74.9261 404.09 75.8724 404.54 76.606C405.392 78.0266 406.753 78.8191 408.622 78.9851C410.492 79.1503 412.622 79.0555 415.013 78.7005V85.8721ZM388.28 54.2404V47.5307H415.013V54.2404H388.28Z" fill="#808174"></path>
<path d="M423.968 41.7086V33.8628H432.524V41.7086H423.968ZM423.968 85.8721V47.5307H432.524V85.8721H423.968Z" fill="#808174"></path>
<path d="M459.806 86.9365C455.853 86.9365 452.481 86.0607 449.688 84.3096C446.895 82.5342 444.753 80.1207 443.262 77.0677C441.795 74.014 441.049 70.5588 441.025 66.701C441.049 62.7722 441.819 59.293 443.333 56.2636C444.872 53.2105 447.049 50.8201 449.865 49.0924C452.682 47.341 456.031 46.4653 459.912 46.4653C464.267 46.4653 467.948 47.5658 470.953 49.7669C473.982 51.9443 475.959 54.9264 476.882 58.7132L468.361 61.0208C467.699 58.9617 466.598 57.3642 465.06 56.2281C463.521 55.0684 461.77 54.4886 459.806 54.4886C457.581 54.4886 455.747 55.0211 454.303 56.0862C452.859 57.1275 451.795 58.5712 451.108 60.4172C450.421 62.2633 450.079 64.3579 450.079 66.701C450.079 70.3458 450.895 73.2926 452.528 75.5408C454.161 77.7891 456.587 78.9136 459.806 78.9136C462.078 78.9136 463.865 78.3926 465.166 77.3515C466.492 76.3096 467.486 74.8072 468.149 72.8428L476.882 74.795C475.698 78.7002 473.627 81.7064 470.669 83.8124C467.71 85.8954 464.09 86.9365 459.806 86.9365Z" fill="#808174"></path>
<path d="M483.954 85.8739L484.025 34.4946H492.731V65.893L506.825 47.3394H517.565L502.615 66.6067L518.849 85.8739H507.467L492.731 67.3203V85.8739H483.954Z" fill="#808174"></path>
<path d="M539.246 86.944C535.344 86.944 531.919 86.0991 528.97 84.4105C526.02 82.7213 523.713 80.3789 522.048 77.3813C520.406 74.3843 519.586 70.9353 519.586 67.0343C519.586 62.8241 520.395 59.1728 522.012 56.0806C523.63 52.9645 525.878 50.5501 528.756 48.8375C531.634 47.1249 534.964 46.2686 538.746 46.2686C542.742 46.2686 546.132 47.2081 548.915 49.0872C551.722 50.9426 553.803 53.5711 555.159 56.9725C556.515 60.374 557.026 64.3821 556.693 68.9967H548.166V65.8569C548.142 61.6704 547.405 58.6139 545.953 56.6871C544.503 54.7604 542.219 53.797 539.103 53.797C535.582 53.797 532.966 54.8912 531.253 57.0796C529.541 59.2442 528.685 62.4197 528.685 66.6061C528.685 70.5072 529.541 73.5279 531.253 75.669C532.966 77.8095 535.464 78.8801 538.746 78.8801C540.863 78.8801 542.683 78.4159 544.205 77.4883C545.752 76.537 546.941 75.1697 547.773 73.3856L556.265 75.9543C554.79 79.4269 552.507 82.1271 549.414 84.0534C546.346 85.9805 542.956 86.944 539.246 86.944ZM525.973 68.9967V62.503H552.483V68.9967H525.973Z" fill="#808174"></path>
<path d="M587.235 85.8733C584.689 86.3489 582.191 86.5508 579.741 86.4797C577.316 86.4323 575.139 85.9918 573.212 85.1598C571.286 84.3033 569.823 82.9597 568.823 81.1274C567.943 79.4626 567.48 77.7619 567.432 76.0252C567.384 74.2893 567.361 72.327 567.361 70.1383V36.6348H575.924V69.6388C575.924 71.1849 575.936 72.5404 575.96 73.7066C576.007 74.872 576.257 75.8233 576.709 76.5605C577.565 77.9882 578.933 78.7851 580.812 78.9511C582.692 79.1177 584.832 79.0229 587.235 78.6658V85.8733ZM560.367 54.0823V47.3388H587.235V54.0823H560.367Z" fill="#808174"></path>
<path d="M632.395 85.8733C629.849 86.3489 627.352 86.5508 624.902 86.4797C622.476 86.4323 620.299 85.9918 618.372 85.1598C616.446 84.3033 614.983 82.9597 613.984 81.1274C613.103 79.4626 612.64 77.7619 612.593 76.0252C612.544 74.2893 612.521 72.327 612.521 70.1383V36.6348H621.084V69.6388C621.084 71.1849 621.096 72.5404 621.12 73.7066C621.167 74.872 621.417 75.8233 621.869 76.5605C622.725 77.9882 624.093 78.7851 625.972 78.9511C627.852 79.1177 629.992 79.0229 632.395 78.6658V85.8733ZM605.527 54.0823V47.3388H632.395V54.0823H605.527Z" fill="#808174"></path>
<path d="M655.751 86.944C651.897 86.944 648.532 86.0753 645.654 84.3394C642.775 82.6027 640.539 80.2122 638.945 77.1672C637.375 74.0991 636.591 70.5785 636.591 66.6061C636.591 62.5624 637.399 59.0182 639.017 55.9735C640.635 52.9288 642.882 50.5501 645.761 48.8375C648.639 47.1249 651.969 46.2686 655.751 46.2686C659.628 46.2686 663.006 47.1367 665.884 48.8732C668.763 50.6096 670.999 53.0121 672.592 56.0806C674.186 59.1252 674.983 62.6337 674.983 66.6061C674.983 70.6023 674.174 74.1343 672.556 77.2031C670.963 80.2482 668.727 82.6387 665.848 84.3746C662.971 86.0876 659.604 86.944 655.751 86.944ZM655.751 78.8801C659.176 78.8801 661.721 77.7384 663.387 75.4549C665.051 73.1715 665.884 70.2217 665.884 66.6061C665.884 62.8716 665.04 59.8983 663.351 57.6862C661.662 55.4502 659.129 54.3322 655.751 54.3322C653.444 54.3322 651.54 54.8555 650.042 55.9022C648.567 56.925 647.473 58.3641 646.759 60.2195C646.046 62.051 645.689 64.1799 645.689 66.6061C645.689 70.3406 646.534 73.326 648.222 75.562C649.935 77.7743 652.444 78.8801 655.751 78.8801Z" fill="#808174"></path>
<path d="M407.348 158.388C402.615 158.388 398.769 157.323 395.81 155.193C392.852 153.063 391.054 150.069 390.414 146.211L399.148 144.862C399.597 146.755 400.591 148.246 402.13 149.335C403.668 150.424 405.609 150.968 407.952 150.968C410.011 150.968 411.597 150.566 412.709 149.761C413.845 148.933 414.413 147.809 414.413 146.389C414.413 145.513 414.2 144.815 413.774 144.294C413.371 143.75 412.473 143.229 411.076 142.732C409.68 142.235 407.538 141.608 404.65 140.851C401.431 139.999 398.875 139.087 396.982 138.117C395.089 137.123 393.728 135.951 392.899 134.602C392.071 133.253 391.656 131.62 391.656 129.703C391.656 127.312 392.284 125.23 393.538 123.455C394.793 121.68 396.544 120.319 398.793 119.372C401.041 118.402 403.692 117.917 406.745 117.917C409.727 117.917 412.366 118.378 414.661 119.302C416.981 120.224 418.851 121.538 420.271 123.242C421.69 124.946 422.566 126.946 422.898 129.242L414.165 130.804C413.951 129.17 413.206 127.881 411.928 126.934C410.673 125.987 408.993 125.455 406.887 125.336C404.875 125.218 403.254 125.526 402.023 126.26C400.792 126.97 400.177 127.976 400.177 129.277C400.177 130.011 400.425 130.638 400.922 131.159C401.42 131.68 402.413 132.2 403.905 132.721C405.42 133.242 407.668 133.88 410.65 134.638C413.703 135.419 416.141 136.318 417.963 137.336C419.809 138.33 421.134 139.525 421.939 140.922C422.768 142.318 423.182 144.01 423.182 145.998C423.182 149.856 421.774 152.885 418.957 155.087C416.164 157.288 412.294 158.388 407.348 158.388Z" fill="#808174"></path>
<path d="M457.477 157.32V138.86C457.477 137.653 457.394 136.316 457.228 134.849C457.063 133.381 456.672 131.973 456.057 130.624C455.465 129.251 454.566 128.127 453.359 127.251C452.176 126.375 450.566 125.938 448.531 125.938C447.442 125.938 446.365 126.115 445.3 126.47C444.235 126.825 443.265 127.441 442.389 128.316C441.537 129.168 440.85 130.351 440.33 131.866C439.809 133.357 439.549 135.275 439.549 137.618L434.472 135.452C434.472 132.186 435.099 129.228 436.354 126.576C437.632 123.926 439.502 121.82 441.963 120.258C444.424 118.672 447.454 117.879 451.051 117.879C453.892 117.879 456.235 118.352 458.08 119.299C459.926 120.246 461.394 121.453 462.483 122.92C463.571 124.387 464.376 125.949 464.897 127.606C465.417 129.263 465.748 130.836 465.891 132.328C466.057 133.795 466.139 134.99 466.139 135.914V157.32H457.477ZM430.887 157.32V106.199H438.52V133.109H439.549V157.32H430.887Z" fill="#808174"></path>
<path d="M492.442 158.393C488.589 158.393 485.223 157.525 482.345 155.788C479.467 154.051 477.23 151.661 475.637 148.616C474.067 145.548 473.282 142.028 473.282 138.055C473.282 134.011 474.091 130.467 475.708 127.422C477.325 124.378 479.574 121.999 482.452 120.287C485.33 118.574 488.66 117.717 492.442 117.717C496.319 117.717 499.697 118.586 502.576 120.322C505.453 122.059 507.689 124.461 509.283 127.529C510.877 130.574 511.673 134.083 511.673 138.055C511.673 142.051 510.865 145.584 509.248 148.652C507.654 151.697 505.418 154.087 502.54 155.824C499.661 157.536 496.296 158.393 492.442 158.393ZM492.442 150.329C495.867 150.329 498.412 149.187 500.078 146.903C501.743 144.62 502.576 141.671 502.576 138.055C502.576 134.321 501.731 131.348 500.042 129.135C498.353 126.899 495.82 125.781 492.442 125.781C490.135 125.781 488.232 126.304 486.734 127.351C485.258 128.374 484.164 129.813 483.451 131.669C482.737 133.5 482.38 135.629 482.38 138.055C482.38 141.79 483.225 144.775 484.914 147.011C486.627 149.223 489.136 150.329 492.442 150.329Z" fill="#808174"></path>
<path d="M526.35 157.322L514.576 118.717L522.996 118.788L530.525 143.514L538.161 118.788H545.403L553.003 143.514L560.568 118.788H568.988L557.214 157.322H550.506L541.764 130.812L533.059 157.322H526.35Z" fill="#808174"></path>
<path d="M300.178 3.59277V185.521" stroke="#2D2D2D" stroke-width="7.18518" stroke-linecap="square"></path>
<mask id="mask0_14_6" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="0" y="33" width="242" height="124">
<path d="M241.43 33.8628H0V156.732H241.43V33.8628Z" fill="white"></path>
</mask>
<g mask="url(#mask0_14_6)">
<path d="M120.717 33.877C187.382 33.8789 241.427 95.3157 241.427 95.3157C240.957 95.8482 187.094 156.746 120.717 156.748C54.2542 156.748 0.333887 95.6944 0 95.3157C0 95.3157 54.0501 33.877 120.717 33.877ZM120.633 49.6928C95.4466 49.6928 75.0306 70.1087 75.0306 95.2949C75.0306 120.481 95.4459 140.897 120.633 140.897C145.818 140.896 166.234 120.481 166.234 95.2949C166.234 70.109 145.818 49.6933 120.633 49.6928ZM120.639 68.0628C135.682 68.0646 147.879 80.2592 147.879 95.3021C147.878 110.344 135.681 122.539 120.639 122.541C105.596 122.541 93.3945 110.345 93.393 95.3021C93.393 80.2577 105.596 68.0628 120.639 68.0628Z" fill="#808174"></path>
</g>
</svg>`;
// Рваный край: зубцы билета и корешка совпадают, пока корешок на месте. side: r — справа, l — слева, b — снизу, t — сверху
function zig(w, h, d, n, side){
  const P = [];
  if (side === 'r') { P.push([0,0]); for (let k = 0; k <= n; k++) P.push([k % 2 ? w - d : w, h * k / n]); P.push([0,h]); }
  if (side === 'l') { for (let k = 0; k <= n; k++) P.push([k % 2 ? 0 : d, h * k / n]); P.push([w,h], [w,0]); }
  if (side === 'b') { P.push([0,0], [w,0]); for (let k = 0; k <= n; k++) P.push([w - w * k / n, k % 2 ? h - d : h]); }
  if (side === 't') { for (let k = 0; k <= n; k++) P.push([w * k / n, (n - k) % 2 ? 0 : d]); P.push([w,h], [0,h]); }
  return P.map(p => p.map(v => +v.toFixed(2)).join(',')).join(' ');
}
function sheet(w, h, pts){
  const n = figma.createNodeFromSvg(`<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg"><polygon points="${pts}" fill="#F5F4EE"/></svg>`);
  n.name = 'sheet'; for (const v of n.findAll(x => x.type === 'VECTOR')) v.fills = [paint('premium-bg')];
  return n;
}
const op = (node, o, key = 'fills') => { node[key] = node[key].map(f => Object.assign({}, f, { opacity:o })); return node; };
function rule(w){ const r = figma.createRectangle(); r.name = 'rule'; r.resize(w, 1); r.fills = [paint('premium-ink')]; return op(r, .12); }
function perf(len, vertical){ // перфорация: ряд точек 2,5 px с шагом 9 px (пунктир Figma рисует штрихами, не точками)
  const n = Math.floor(len / 9) + 1, g = figma.createFrame(); g.name = 'perforation'; g.fills = []; g.clipsContent = false;
  g.resize(vertical ? 2.5 : (n - 1) * 9 + 2.5, vertical ? (n - 1) * 9 + 2.5 : 2.5);
  for (let i = 0; i < n; i++) {
    const e = figma.createEllipse(); e.name = 'dot'; e.resize(2.5, 2.5); e.fills = [paint('premium-ink')]; op(e, .3);
    g.appendChild(e); e.x = vertical ? 0 : i * 9; e.y = vertical ? i * 9 : 0;
  }
  return g;
}
function rotAround(node, deg, px, py){ // поворот по часовой вокруг точки родителя (px, py)
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const [[a0, b0, x0], [c0, d0, y0]] = node.relativeTransform;
  node.relativeTransform = [[c * a0 - s * c0, c * b0 - s * d0, c * (x0 - px) - s * (y0 - py) + px],
                            [s * a0 + c * c0, s * b0 + c * d0, s * (x0 - px) + c * (y0 - py) + py]];
}
function vbox(name, gap, pad, w){ // вертикальный автолейаут с фиксированной шириной
  const b = box({ name, dir:'V', gap, pad, align:'MIN' }); b.counterAxisSizingMode = 'FIXED'; b.resize(w, b.height); return b;
}
function tkContent(mob){
  const w = mob ? 300 : 520, inner = mob ? 256 : 444;
  const b = vbox('content', 0, mob ? [22,22,34,22] : [30,44,30,32], w);
  const top = box({ name:'top', w:inner, justify:'SPACE_BETWEEN', pad:[0,0,18,0] });
  const logo = figma.createNodeFromSvg(TTS_LOGO); logo.name = 'logo'; logo.rescale(22 / 194);
  top.appendChild(logo); top.appendChild(tag('Не найдено', null, 'danger', 'danger'));
  b.appendChild(top); b.appendChild(rule(inner));
  const dw = box({ name:'date', pad:[20,0,10,0] });
  dw.appendChild(op(txt('Сеанс 404 · время не указано', { f:'ui600', size:10, caps:true, ls:20, color:'premium-ink' }), .45)); b.appendChild(dw);
  const tw = box({ name:'title', pad:[0,0,20,0] });
  tw.appendChild(txt('Страница не найдена', { f:'thin', size: mob ? 26 : 34, color:'premium-ink' })); b.appendChild(tw);
  b.appendChild(rule(inner));
  const cells = mob ? [['Сектор','—'],['Ряд / место','4 / 04']] : [['Сектор','—'],['Ряд / место','4 / 04'],['Код','404']];
  const grid = box({ name:'grid', gap:12, pad:[18,0,0,0], align:'MIN' }), cw = (inner - 12 * (cells.length - 1)) / cells.length;
  for (const [l, v] of cells) {
    const c = vbox(l, 6, [0,0], cw);
    c.appendChild(op(txt(l, { f:'ui500', size:10, caps:true, ls:14, color:'premium-ink' }), .5));
    c.appendChild(txt(v, { f: v === '—' ? 'head' : 'num', size: v === '—' ? 18 : 22, color:'premium-ink' }));
    grid.appendChild(c);
  }
  b.appendChild(grid);
  return b;
}
function frame(name, w, h){ const f = figma.createFrame(); f.name = name; f.fills = []; f.clipsContent = false; f.resize(w, h); return f; }
function tkMain(mob, d){
  const content = tkContent(mob), W = mob ? 300 : 520, H = Math.round(content.height), f = frame('ticket', W, H);
  f.appendChild(sheet(W, H, zig(W, H, d, mob ? 24 : 18, mob ? 'b' : 'r'))); f.appendChild(content); content.x = 0; content.y = 0;
  return f;
}
function tkStub(mob, d, H){
  const W = mob ? 300 : 184, h = mob ? 120 : H, f = frame('stub', W, h);
  f.appendChild(sheet(W, h, zig(W, h, d, mob ? 24 : 18, mob ? 't' : 'l')));
  const p = perf(mob ? W - 24 : h - 24, !mob); f.appendChild(p);
  if (mob) { p.x = 12; p.y = d + 4 - 1.25; } else { p.x = d + 4 - 1.25; p.y = 12; }
  const t = txt('404', { f:'num', size: mob ? 58 : 76, color:'premium-ink' }); f.appendChild(t);
  t.x = mob ? (W - t.width) / 2 : d + (W - d - t.width) / 2; t.y = mob ? d + (h - d - t.height) / 2 : (h - t.height) / 2;
  return f;
}
variants('404 · Билет', [['Целый',false,0,true], ['Надрыв',false,14,true], ['Оторван',false,0,false], ['Телефон',true,0,true]].map(([st, mob, deg, withStub]) => {
  const c = figma.createComponent(); c.name = 'Вид=' + st; c.fills = []; c.clipsContent = false;
  const d = mob ? 7 : 8, m = tkMain(mob, d); c.appendChild(m); m.x = 0; m.y = 0;
  let W = m.width, H = m.height;
  if (withStub) {
    const s = tkStub(mob, d, m.height); c.appendChild(s);
    if (mob) { s.x = 0; s.y = m.height - d; H = s.y + s.height; } else { s.x = m.width - d; s.y = 0; W = s.x + s.width; }
    if (deg) { rotAround(s, deg, s.x + d / 2, s.y + s.height); W += 70; H += 30; }
  }
  c.resize(W, H);
  return c;
}));

figma.viewport.scrollAndZoomIntoView(page.children.filter(n => n.type === 'COMPONENT_SET' && SETS.includes(n.name)));
print('Готово: ' + SETS.length + ' наборов. Цвета привязаны к Color/Dark; светлая тема — переключением коллекции.');
