// ══════════════════════════════════════════════════════════
// TTS Design System R14 — ПОЛНАЯ БИБЛИОТЕКА КОМПОНЕНТОВ
// Один скрипт — все компоненты — русский язык
// Запускать через Scripter ПОСЛЕ figma-script.js
// ══════════════════════════════════════════════════════════

// ─── Очистка всех предыдущих версий ─────────
const DROP = ['Кнопка','Тег','Бейдж','ПолеВвода','ЧипФильтра','Уведомление','КарточкаСобытия',
              'Button','Tag','Badge','InputField','FilterChip','Toast','EventCard'];
for (const n of [...figma.currentPage.children]) {
  if (n.type==='COMPONENT_SET' && DROP.includes(n.name)) n.remove();
  if (n.type==='COMPONENT' && (n.name.startsWith('Style=') || n.name.startsWith('State=') || n.name.startsWith('Type=') || n.name==='EventCard')) n.remove();
}

// ─── Шрифты ──────────────────────────────────
await figma.loadFontAsync({family:'Manrope',style:'Regular'});
await figma.loadFontAsync({family:'Manrope',style:'Medium'});
await figma.loadFontAsync({family:'Manrope',style:'SemiBold'});
await figma.loadFontAsync({family:'Manrope',style:'Bold'});
await figma.loadFontAsync({family:'Cormorant Garamond',style:'Medium'});
await figma.loadFontAsync({family:'Oranienbaum',style:'Regular'});

// ─── Переменные ──────────────────────────────
const allVars  = await figma.variables.getLocalVariablesAsync();
const allColls = await figma.variables.getLocalVariableCollectionsAsync();
const byId     = Object.fromEntries(allColls.map(c=>[c.id,c.name]));
const D = 'Color/Dark';

function gv(col,name){ return allVars.find(v=>byId[v.variableCollectionId]===col&&v.name===name)||null; }
function vf(v){ return figma.variables.setBoundVariableForPaint({type:'SOLID',color:{r:0,g:0,b:0}},'color',v); }
function sf(h){ return {type:'SOLID',color:{r:parseInt(h.slice(1,3),16)/255,g:parseInt(h.slice(3,5),16)/255,b:parseInt(h.slice(5,7),16)/255}}; }
function fill(varObj,hex){ return varObj?vf(varObj):sf(hex); }
function setR(node,r,rv){ node.cornerRadius=r; try{if(rv)node.setBoundVariable('cornerRadius',rv);}catch(e){} }
function addProp(set,name,def,nodeName){
  set.addComponentProperty(name,'TEXT',def);
  const key=Object.keys(set.componentPropertyDefinitions).find(k=>k.startsWith(name));
  if(!key)return;
  for(const c of set.children){ const t=c.findOne(n=>n.type==='TEXT'&&n.name===nodeName); if(t)t.componentPropertyReferences={characters:key}; }
}

const rSm  = gv('Radius','sm');
const rFull= gv('Radius','full');
const page = figma.currentPage;

// Найти свободное место правее всего содержимого
let startX=200;
for(const n of page.children){ if(typeof n.x==='number') startX=Math.max(startX,n.x+(n.width||0)+100); }
let Y=100; const GAP=56;

// Выровнять строку / столбец вариантов
function rowLayout(set,pad=16,gap=12){
  let x=pad,mH=0;
  for(const c of set.children){c.x=x;c.y=pad;x+=c.width+gap;mH=Math.max(mH,c.height);}
  try{set.resize(x-gap+pad,mH+pad*2);}catch(e){}
}
function colLayout(set,pad=16,gap=12){
  let y=pad,mW=0;
  for(const c of set.children){c.x=pad;c.y=y;y+=c.height+gap;mW=Math.max(mW,c.width);}
  try{set.resize(mW+pad*2,y-gap+pad);}catch(e){}
}
function place(node){ node.x=startX; node.y=Y; Y+=node.height+GAP; }

// ════════════════════════════════════════════════
// 01 — КНОПКА
//   4 стиля × 3 размера = 12 вариантов
//   Стиль: Primary / Ghost / Ghost Accent / Danger
//   Размер: Large / Medium / Small
// ════════════════════════════════════════════════
const BTN_ST=[
  {n:'Primary',     bg:gv(D,'accent'),       bd:gv(D,'accent'),        tx:gv(D,'n100')},
  {n:'Ghost',       bg:null,                  bd:gv(D,'n700'),           tx:gv(D,'n300')},
  {n:'Ghost Accent',bg:null,                  bd:gv(D,'accent-border'),  tx:gv(D,'accent')},
  {n:'Danger',      bg:gv(D,'danger-bg'),     bd:gv(D,'danger-border'),  tx:gv(D,'danger-text')},
];
const BTN_SZ=[
  {n:'Large', fs:11,pH:28,pV:14},
  {n:'Medium',fs:10,pH:22,pV:11},
  {n:'Small', fs:9, pH:16,pV:10},
];
const btnComps=[];
for(const st of BTN_ST) for(const sz of BTN_SZ){
  const c=figma.createComponent();
  c.name=`Style=${st.n}, Size=${sz.n}`;
  c.layoutMode='HORIZONTAL'; c.primaryAxisAlignItems='CENTER'; c.counterAxisAlignItems='CENTER';
  c.primaryAxisSizingMode='AUTO'; c.counterAxisSizingMode='AUTO';
  c.paddingLeft=sz.pH; c.paddingRight=sz.pH; c.paddingTop=sz.pV; c.paddingBottom=sz.pV;
  setR(c,9999,rFull);
  c.fills  =st.bg?[vf(st.bg)]:[];
  c.strokes=st.bd?[vf(st.bd)]:[];
  if(st.bd){c.strokeWeight=1;c.strokeAlign='INSIDE';}
  const t=figma.createText();
  t.name='label'; t.characters='Купить'; t.fontName={family:'Manrope',style:'SemiBold'};
  t.fontSize=sz.fs; t.letterSpacing={unit:'PERCENT',value:18}; t.textCase='UPPER';
  t.fills=st.tx?[vf(st.tx)]:[sf('#FFFFFF')];
  c.appendChild(t); page.appendChild(c); btnComps.push(c);
}
const btnSet=figma.combineAsVariants(btnComps,page);
btnSet.name='Кнопка';
// Сетка 4 стиля × 3 размера
{const P=24,GC=16,GR=20,grid=[];
 for(const comp of btnSet.children){
   const p=Object.fromEntries(comp.name.split(', ').map(s=>s.split('=')));
   const si=BTN_ST.findIndex(s=>s.n===p['Style']), zi=BTN_SZ.findIndex(s=>s.n===p['Size']);
   if(!grid[si])grid[si]=[]; grid[si][zi]=comp;
 }
 let y=P;
 for(let si=0;si<BTN_ST.length;si++){
   let x=P,mH=0;
   for(let zi=0;zi<BTN_SZ.length;zi++){
     const comp=grid[si]&&grid[si][zi]; if(!comp)continue;
     comp.x=x; comp.y=y; x+=comp.width+GC; mH=Math.max(mH,comp.height);
   }
   y+=mH+GR;
 }
 try{btnSet.resize(P*2+BTN_SZ.reduce((a,_,i)=>{const mW=Math.max(...BTN_ST.map((_,si)=>grid[si]?.[i]?.width||0));return a+mW+(i<2?GC:0);},0),y+P);}catch(e){}
}
addProp(btnSet,'Label','Купить','label');
place(btnSet);
print('✓ Кнопка — '+btnSet.children.length+' вариантов');

// ════════════════════════════════════════════════
// 02 — ТЕГ
//   5 стилей: Default / Accent / Green / Red / Orange
//   Острые углы (r-sm = 2px)
// ════════════════════════════════════════════════
const TAG_ST=[
  {n:'Default',bgV:gv(D,'n900'),        bdV:gv(D,'n800'),         txH:'#8A8A88'},
  {n:'Accent', bgV:gv(D,'accent-ghost'),bdV:gv(D,'accent-border'),txH:'#7A9FFF'},
  {n:'Green',  bgH:'#0A2210',bdH:'#1A4428',txH:'#4ADE80'},
  {n:'Red',    bgH:'#220A0A',bdH:'#441414',txH:'#F87171'},
  {n:'Orange', bgH:'#221408',bdH:'#442810',txH:'#FB923C'},
];
const tagComps=[];
for(const st of TAG_ST){
  const c=figma.createComponent();
  c.name=`Style=${st.n}`;
  c.layoutMode='HORIZONTAL'; c.primaryAxisAlignItems='CENTER'; c.counterAxisAlignItems='CENTER';
  c.primaryAxisSizingMode='AUTO'; c.counterAxisSizingMode='AUTO';
  c.paddingLeft=c.paddingRight=10; c.paddingTop=c.paddingBottom=4;
  setR(c,2,rSm);
  c.fills  =st.bgV?[vf(st.bgV)]:st.bgH?[sf(st.bgH)]:[];
  c.strokes=st.bdV?[vf(st.bdV)]:st.bdH?[sf(st.bdH)]:[];
  if(st.bdV||st.bdH){c.strokeWeight=1;c.strokeAlign='INSIDE';}
  const t=figma.createText();
  t.name='label'; t.characters='Опера'; t.fontName={family:'Manrope',style:'SemiBold'};
  t.fontSize=10; t.letterSpacing={unit:'PERCENT',value:16}; t.textCase='UPPER';
  t.fills=[sf(st.txH)];
  c.appendChild(t); page.appendChild(c); tagComps.push(c);
}
const tagSet=figma.combineAsVariants(tagComps,page);
tagSet.name='Тег'; rowLayout(tagSet); addProp(tagSet,'Label','Опера','label'); place(tagSet);
print('✓ Тег — '+tagSet.children.length+' стилей');

// ════════════════════════════════════════════════
// 03 — БЕЙДЖ
//   Круглый счётчик: Accent / Muted
// ════════════════════════════════════════════════
const BADGE_ST=[
  {n:'Accent',bgV:gv(D,'accent'),txH:'#FFFFFF'},
  {n:'Muted', bgV:gv(D,'n800'), txH:'#8A8A88'},
];
const badgeComps=[];
for(const st of BADGE_ST){
  const c=figma.createComponent();
  c.name=`Style=${st.n}`;
  c.layoutMode='HORIZONTAL'; c.primaryAxisAlignItems='CENTER'; c.counterAxisAlignItems='CENTER';
  c.primaryAxisSizingMode='AUTO'; c.counterAxisSizingMode='AUTO';
  c.paddingLeft=c.paddingRight=6; c.paddingTop=c.paddingBottom=5;
  setR(c,9999,rFull); try{c.minWidth=20;c.minHeight=20;}catch(e){}
  c.fills=st.bgV?[vf(st.bgV)]:[];
  const t=figma.createText();
  t.name='count'; t.characters='3'; t.fontName={family:'Manrope',style:'Bold'};
  t.fontSize=10; t.textAlignHorizontal='CENTER'; t.fills=[sf(st.txH)];
  c.appendChild(t); page.appendChild(c); badgeComps.push(c);
}
const badgeSet=figma.combineAsVariants(badgeComps,page);
badgeSet.name='Бейдж'; rowLayout(badgeSet); addProp(badgeSet,'Count','3','count'); place(badgeSet);
print('✓ Бейдж — '+badgeSet.children.length+' стилей');

// ════════════════════════════════════════════════
// 04 — ПОЛЕ ВВОДА
//   4 состояния: Default / Focus / Error / Disabled
//   Острые углы r-sm = 2px
// ════════════════════════════════════════════════
const INPUT_ST=[
  {n:'Default',  bgV:gv(D,'n950'),bdV:gv(D,'n700'),           ph:'Введите текст',txH:'#626260'},
  {n:'Focus',    bgH:'#0D0D1A',   bdV:gv(D,'accent-border'),  ph:'Введите текст',txH:'#626260'},
  {n:'Error',    bgV:gv(D,'n950'),bdH:'#FF4444',              ph:'Введите текст',txH:'#626260'},
  {n:'Disabled', bgV:gv(D,'n900'),bdV:gv(D,'n900'),           ph:'Недоступно',   txH:'#4A4A48',op:0.5},
];
const inputComps=[];
for(const st of INPUT_ST){
  const c=figma.createComponent();
  c.name=`State=${st.n}`;
  c.layoutMode='HORIZONTAL'; c.primaryAxisAlignItems='CENTER'; c.counterAxisAlignItems='CENTER';
  c.paddingLeft=c.paddingRight=16; c.paddingTop=c.paddingBottom=12;
  setR(c,2,rSm);
  c.resize(280,44); c.primaryAxisSizingMode='FIXED'; c.counterAxisSizingMode='AUTO';
  c.fills  =st.bgV?[vf(st.bgV)]:st.bgH?[sf(st.bgH)]:[];
  c.strokes=st.bdV?[vf(st.bdV)]:st.bdH?[sf(st.bdH)]:[];
  if(st.bdV||st.bdH){c.strokeWeight=1;c.strokeAlign='INSIDE';}
  if(st.op)c.opacity=st.op;
  const t=figma.createText();
  t.name='placeholder'; t.characters=st.ph; t.fontName={family:'Manrope',style:'Regular'};
  t.fontSize=14; t.fills=[sf(st.txH)];
  c.appendChild(t); t.layoutSizingHorizontal='FILL';
  page.appendChild(c); inputComps.push(c);
}
const inputSet=figma.combineAsVariants(inputComps,page);
inputSet.name='ПолеВвода'; colLayout(inputSet,16,16); place(inputSet);
print('✓ ПолеВвода — '+inputSet.children.length+' состояний');

// ════════════════════════════════════════════════
// 05 — ЧИП ФИЛЬТРА
//   2 состояния: Default / Active
//   Скруглённый (r-full), 11px Medium
// ════════════════════════════════════════════════
const CHIP_ST=[
  {n:'Default',bgV:gv(D,'n900'),        bdV:gv(D,'n800'),  txV:gv(D,'n400')},
  {n:'Active', bgV:gv(D,'accent-ghost'),bdV:gv(D,'accent'),txV:gv(D,'n100')},
];
const chipComps=[];
for(const st of CHIP_ST){
  const c=figma.createComponent();
  c.name=`State=${st.n}`;
  c.layoutMode='HORIZONTAL'; c.primaryAxisAlignItems='CENTER'; c.counterAxisAlignItems='CENTER';
  c.primaryAxisSizingMode='AUTO'; c.counterAxisSizingMode='AUTO';
  c.paddingLeft=c.paddingRight=14; c.paddingTop=c.paddingBottom=7;
  setR(c,9999,rFull);
  c.fills  =[vf(st.bgV)];
  c.strokes=[vf(st.bdV)]; c.strokeWeight=1; c.strokeAlign='INSIDE';
  const t=figma.createText();
  t.name='label'; t.characters='Все жанры'; t.fontName={family:'Manrope',style:'Medium'};
  t.fontSize=11; t.letterSpacing={unit:'PERCENT',value:6};
  t.fills=st.txV?[vf(st.txV)]:[sf('#8A8A88')];
  c.appendChild(t); page.appendChild(c); chipComps.push(c);
}
const chipSet=figma.combineAsVariants(chipComps,page);
chipSet.name='ЧипФильтра'; rowLayout(chipSet); addProp(chipSet,'Label','Все жанры','label'); place(chipSet);
print('✓ ЧипФильтра — '+chipSet.children.length+' состояний');

// ════════════════════════════════════════════════
// 06 — УВЕДОМЛЕНИЕ (Toast)
//   3 типа: Success / Error / Info
//   Цветная полоса слева, r-sm, bg n950
// ════════════════════════════════════════════════
const TOAST_ST=[
  {n:'Success',acH:'#4ADE80'},
  {n:'Error',  acH:'#F87171'},
  {n:'Info',   acH:'#60A5FA'},
];
const toastComps=[];
for(const st of TOAST_ST){
  const c=figma.createComponent();
  c.name=`Type=${st.n}`;
  c.layoutMode='VERTICAL';
  c.primaryAxisSizingMode='AUTO'; c.counterAxisSizingMode='FIXED';
  c.paddingLeft=20; c.paddingRight=16; c.paddingTop=12; c.paddingBottom=12;
  c.itemSpacing=4;
  setR(c,2,rSm); c.clipsContent=true;
  c.fills=[fill(gv(D,'n950'),'#111318')];
  c.strokes=[fill(gv(D,'n800'),'#262930')]; c.strokeWeight=1; c.strokeAlign='INSIDE';
  c.resize(320,1);

  // Текст: ширина явная (320-20-16=284), высота авто
  const title=figma.createText();
  title.name='title'; title.fontName={family:'Manrope',style:'SemiBold'}; title.fontSize=12;
  title.characters=st.n==='Success'?'Готово!':(st.n==='Error'?'Ошибка':'Информация');
  title.fills=[fill(gv(D,'n100'),'#D6D6D2')];
  title.resize(284,16); title.textAutoResize='HEIGHT';
  c.appendChild(title);

  const msg=figma.createText();
  msg.name='message'; msg.fontName={family:'Manrope',style:'Regular'}; msg.fontSize=12;
  msg.characters=st.n==='Success'?'Билеты добавлены в корзину':(st.n==='Error'?'Не удалось оформить заказ':'Места ограничены — поторопитесь');
  msg.fills=[fill(gv(D,'n300'),'#A6A6A2')];
  msg.resize(284,14); msg.textAutoResize='HEIGHT';
  c.appendChild(msg);

  // Цветная полоса (абсолютно, левый край)
  const bar=figma.createRectangle();
  bar.name='accent-bar'; bar.fills=[sf(st.acH)];
  bar.resize(3,48);
  c.appendChild(bar);
  bar.layoutPositioning='ABSOLUTE'; bar.x=0; bar.y=0;
  bar.constraints={horizontal:'MIN',vertical:'STRETCH'};

  page.appendChild(c); toastComps.push(c);
}
const toastSet=figma.combineAsVariants(toastComps,page);
toastSet.name='Уведомление'; colLayout(toastSet,16,12); place(toastSet);
print('✓ Уведомление — '+toastSet.children.length+' типов');

// ════════════════════════════════════════════════
// 07 — КАРТОЧКА СОБЫТИЯ (вертикальная)
//   event-card: r-sm, n950 фон, n700 рамка
//   Обложка 240×160 + тело с названием, площадкой, ценой
// ════════════════════════════════════════════════
const card=figma.createComponent();
card.name='КарточкаСобытия';
card.layoutMode='VERTICAL'; card.primaryAxisSizingMode='AUTO'; card.counterAxisSizingMode='FIXED';
card.resize(240,1); setR(card,2,rSm); card.clipsContent=true;
card.fills=[fill(gv(D,'n950'),'#111318')];
card.strokes=[fill(gv(D,'n700'),'#4A4A48')]; card.strokeWeight=1; card.strokeAlign='INSIDE';

// Обложка 240×160 — фиксированные размеры, без FILL
const cover=figma.createFrame();
cover.name='cover'; cover.resize(240,160);
cover.fills=[fill(gv(D,'n900'),'#191C22')];
cover.clipsContent=true;
card.appendChild(cover);

// Дата на обложке (внутри cover — не auto-layout, позиционируем вручную)
const datePill=figma.createFrame();
datePill.name='cover-date'; datePill.layoutMode='HORIZONTAL';
datePill.primaryAxisSizingMode='AUTO'; datePill.counterAxisSizingMode='AUTO';
datePill.paddingLeft=datePill.paddingRight=9; datePill.paddingTop=datePill.paddingBottom=4;
datePill.fills=[fill(gv(D,'n950'),'#111318')];
datePill.strokes=[fill(gv(D,'n800'),'#262930')]; datePill.strokeWeight=1; datePill.strokeAlign='INSIDE';
datePill.cornerRadius=2; datePill.x=12; datePill.y=124;
cover.appendChild(datePill);
const dateT=figma.createText();
dateT.characters='15 авг'; dateT.fontName={family:'Manrope',style:'Medium'};
dateT.fontSize=10; dateT.letterSpacing={unit:'PERCENT',value:8};
dateT.fills=[fill(gv(D,'n300'),'#A6A6A2')];
datePill.appendChild(dateT);

// Тело карточки — FIXED ширина 240, без FILL у детей
const body=figma.createFrame();
body.name='body'; body.layoutMode='VERTICAL';
body.primaryAxisSizingMode='AUTO'; body.counterAxisSizingMode='FIXED';
body.paddingLeft=body.paddingRight=16; body.paddingTop=body.paddingBottom=16;
body.itemSpacing=8; body.fills=[];
body.resize(240,1);
card.appendChild(body);

// Название — явная ширина 208 (240-16-16), высота авто
const titleT=figma.createText();
titleT.name='title'; titleT.characters='Дон Жуан';
titleT.fontName={family:'Cormorant Garamond',style:'Medium'};
titleT.fontSize=21; titleT.lineHeight={unit:'PERCENT',value:120};
titleT.letterSpacing={unit:'PERCENT',value:4};
titleT.fills=[fill(gv(D,'n100'),'#D6D6D2')];
titleT.resize(208,28); titleT.textAutoResize='HEIGHT';
body.appendChild(titleT);

// Площадка
const subT=figma.createText();
subT.name='venue'; subT.characters='Большой театр · Москва';
subT.fontName={family:'Manrope',style:'Regular'};
subT.fontSize=11; subT.lineHeight={unit:'PERCENT',value:150};
subT.fills=[fill(gv(D,'n500'),'#7A7A78')];
subT.resize(208,16); subT.textAutoResize='HEIGHT';
body.appendChild(subT);

// Разделитель
const div=figma.createRectangle();
div.name='divider'; div.fills=[fill(gv(D,'n800'),'#262930')];
div.resize(208,1);
body.appendChild(div);

// Цена
const priceT=figma.createText();
priceT.name='price'; priceT.characters='от 3 200 ₽';
priceT.fontName={family:'Oranienbaum',style:'Regular'};
priceT.fontSize=21; priceT.fills=[fill(gv(D,'n100'),'#D6D6D2')];
body.appendChild(priceT);

page.appendChild(card); place(card);
print('✓ КарточкаСобытия');

print('');
print('════════════════════');
print('Готово! Компоненты:');
print('  01 Кнопка          — 12 вар. (4 стиля × 3 размера)');
print('  02 Тег             — 5 стилей');
print('  03 Бейдж           — 2 стиля');
print('  04 ПолеВвода       — 4 состояния');
print('  05 ЧипФильтра      — 2 состояния');
print('  06 Уведомление     — 3 типа (Success / Error / Info)');
print('  07 КарточкаСобытия — вертикальная');
print('════════════════════');
