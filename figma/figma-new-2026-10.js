// ══════════════════════════════════════════════════════════
// TTS Design System R14 — НОВЫЕ ЭЛЕМЕНТЫ · октябрь 2026
// Мини-набор из стендов site/handoff/redesign-2026-10 (витрина: lab-new-elements.html)
// Запускать через Scripter ПОСЛЕ figma-script.js (нужны коллекции Color/Dark и Radius)
// Повторный запуск удаляет прошлую версию набора и собирает заново
// ══════════════════════════════════════════════════════════

const SETS = ['Плашка документа','Блок посетителя','Бейдж категории','Кнопка фильтра','Чип фильтра',
  'Кнопка фильтров (моб.)','Плитка площадки','Вкладки','Строка почты','Условия возврата','Чип билета',
  'Заголовок шага','Низ окна','Отправлено'];
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
  'zone-2':'#3F73E3', 'zone-4':'#7E6FD0' };
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

// 3. Бейдж категории — точка цвета жанра
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

figma.viewport.scrollAndZoomIntoView(page.children.filter(n => n.type === 'COMPONENT_SET' && SETS.includes(n.name)));
print('Готово: ' + SETS.length + ' наборов. Цвета привязаны к Color/Dark; светлая тема — переключением коллекции.');
