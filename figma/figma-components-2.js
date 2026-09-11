// ══════════════════════════════════════════════
// TTS DS R14 — Tag + Badge + InputField
// Run in Scripter AFTER figma-script.js
// ══════════════════════════════════════════════

// ─── Clean up previous ───────────────────────
for (const n of [...figma.currentPage.children]) {
  if (n.type === 'COMPONENT_SET' && ['Tag','Badge','InputField'].includes(n.name)) n.remove();
}

// ─── Helpers ─────────────────────────────────
const allVars  = await figma.variables.getLocalVariablesAsync();
const allColls = await figma.variables.getLocalVariableCollectionsAsync();
const collById = Object.fromEntries(allColls.map(c => [c.id, c.name]));

function gv(coll, name) {
  return allVars.find(v => collById[v.variableCollectionId] === coll && v.name === name) || null;
}
function vFill(v) {
  return figma.variables.setBoundVariableForPaint({ type:'SOLID', color:{r:0,g:0,b:0} }, 'color', v);
}
function sf(h) {
  return { type:'SOLID', color:{ r:parseInt(h.slice(1,3),16)/255, g:parseInt(h.slice(3,5),16)/255, b:parseInt(h.slice(5,7),16)/255 } };
}

await figma.loadFontAsync({ family:'Manrope', style:'Regular'  });
await figma.loadFontAsync({ family:'Manrope', style:'SemiBold' });
await figma.loadFontAsync({ family:'Manrope', style:'Bold'     });

const page  = figma.currentPage;
const D     = 'Color/Dark';
const rSm   = gv('Radius','sm');
const rFull = gv('Radius','full');

// Find clear canvas position
let startX = 200;
for (const n of page.children) {
  if (typeof n.x === 'number') startX = Math.max(startX, n.x + (n.width||0) + 120);
}
let currentY = 100;

// Layout helpers
function rowLayout(set, pad=16, gap=12) {
  let x=pad, maxH=0;
  for (const c of set.children) { c.x=x; c.y=pad; x+=c.width+gap; maxH=Math.max(maxH,c.height); }
  try { set.resize(x-gap+pad, maxH+pad*2); } catch(e) {}
}
function colLayout(set, pad=16, gap=12) {
  let y=pad, maxW=0;
  for (const c of set.children) { c.x=pad; c.y=y; y+=c.height+gap; maxW=Math.max(maxW,c.width); }
  try { set.resize(maxW+pad*2, y-gap+pad); } catch(e) {}
}
function linkTextProp(set, propName, defaultVal, nodeName) {
  set.addComponentProperty(propName, 'TEXT', defaultVal);
  const key = Object.keys(set.componentPropertyDefinitions).find(k => k.startsWith(propName));
  if (!key) return;
  for (const c of set.children) {
    const t = c.findOne(n => n.type==='TEXT' && n.name===nodeName);
    if (t) t.componentPropertyReferences = { characters: key };
  }
}

// ═══════════════════════════════════════════════
// 1 — TAG  (sharp corners, r-sm = 2px)
// ═══════════════════════════════════════════════
// .tag: 10px SemiBold uppercase, padding 4px 10px, r-sm
// 5 styles: Default / Accent / Green / Red / Orange

const TAG_DEFS = [
  { name:'Default', bgV: gv(D,'n900'),         bdV: gv(D,'n800'),         tx:'#8A8A88' },
  { name:'Accent',  bgV: gv(D,'accent-ghost'), bdV: gv(D,'accent-border'), tx:'#7A9FFF' },
  { name:'Green',   bgH:'#0A2210', bdH:'#1A4428', tx:'#4ADE80' },
  { name:'Red',     bgH:'#220A0A', bdH:'#441414', tx:'#F87171' },
  { name:'Orange',  bgH:'#221408', bdH:'#442810', tx:'#FB923C' },
];

const tagComps = [];
for (const st of TAG_DEFS) {
  const c = figma.createComponent();
  c.name = `Style=${st.name}`;
  c.layoutMode = 'HORIZONTAL';
  c.primaryAxisAlignItems = 'CENTER';
  c.counterAxisAlignItems = 'CENTER';
  c.primaryAxisSizingMode = 'AUTO';
  c.counterAxisSizingMode = 'AUTO';
  c.paddingLeft = c.paddingRight = 10;
  c.paddingTop  = c.paddingBottom = 4;
  c.cornerRadius = 2;
  try { if (rSm) c.setBoundVariable('cornerRadius', rSm); } catch(e) {}

  c.fills   = st.bgV ? [vFill(st.bgV)] : st.bgH ? [sf(st.bgH)] : [];
  c.strokes = st.bdV ? [vFill(st.bdV)] : st.bdH ? [sf(st.bdH)] : [];
  if (st.bdV || st.bdH) { c.strokeWeight=1; c.strokeAlign='INSIDE'; }

  const t = figma.createText();
  t.name = 'label';
  t.characters = 'Category';
  t.fontName = { family:'Manrope', style:'SemiBold' };
  t.fontSize = 10;
  t.letterSpacing = { unit:'PERCENT', value:16 };
  t.textCase = 'UPPER';
  t.fills = [sf(st.tx)];

  c.appendChild(t);
  page.appendChild(c);
  tagComps.push(c);
}

const tagSet = figma.combineAsVariants(tagComps, page);
tagSet.name = 'Tag';
tagSet.x = startX;
tagSet.y = currentY;
rowLayout(tagSet);
linkTextProp(tagSet, 'Label', 'Category', 'label');
currentY += tagSet.height + 60;
print('Tag: ' + tagSet.children.length + ' styles');

// ═══════════════════════════════════════════════
// 2 — BADGE  (pill, r-full, notification count)
// ═══════════════════════════════════════════════
// .badge: 10px Bold, min 20×20px, padding 0 6px, r-full
// 2 styles: Accent / Muted

const BADGE_DEFS = [
  { name:'Accent', bgV: gv(D,'accent'), tx:'#FFFFFF' },
  { name:'Muted',  bgV: gv(D,'n800'),   tx:'#8A8A88' },
];

const badgeComps = [];
for (const st of BADGE_DEFS) {
  const c = figma.createComponent();
  c.name = `Style=${st.name}`;
  c.layoutMode = 'HORIZONTAL';
  c.primaryAxisAlignItems  = 'CENTER';
  c.counterAxisAlignItems  = 'CENTER';
  c.primaryAxisSizingMode  = 'AUTO';
  c.counterAxisSizingMode  = 'AUTO';
  c.paddingLeft = c.paddingRight = 6;
  c.paddingTop = c.paddingBottom = 5;
  c.cornerRadius = 9999;
  try { if (rFull) c.setBoundVariable('cornerRadius', rFull); } catch(e) {}
  try { c.minWidth = 20; c.minHeight = 20; } catch(e) {}

  c.fills = st.bgV ? [vFill(st.bgV)] : [];

  const t = figma.createText();
  t.name = 'count';
  t.characters = '9';
  t.fontName = { family:'Manrope', style:'Bold' };
  t.fontSize = 10;
  t.textAlignHorizontal = 'CENTER';
  t.fills = [sf(st.tx)];

  c.appendChild(t);
  page.appendChild(c);
  badgeComps.push(c);
}

const badgeSet = figma.combineAsVariants(badgeComps, page);
badgeSet.name = 'Badge';
badgeSet.x = startX;
badgeSet.y = currentY;
rowLayout(badgeSet);
linkTextProp(badgeSet, 'Count', '9', 'count');
currentY += badgeSet.height + 60;
print('Badge: ' + badgeSet.children.length + ' styles');

// ═══════════════════════════════════════════════
// 3 — INPUT FIELD  (sharp corners, r-sm = 2px)
// ═══════════════════════════════════════════════
// .form-input: 14px Regular, padding 12px 16px, r-sm
// 4 states: Default / Focus / Error / Disabled

const INPUT_DEFS = [
  { name:'Default',  bgV: gv(D,'n950'), bdV: gv(D,'n700'),           ph:'Placeholder text', txH:'#626260' },
  { name:'Focus',    bgH:'#0D0D1A',     bdV: gv(D,'accent-border'),  ph:'Placeholder text', txH:'#626260' },
  { name:'Error',    bgV: gv(D,'n950'), bdH:'#FF4444',               ph:'Placeholder text', txH:'#626260' },
  { name:'Disabled', bgV: gv(D,'n900'), bdV: gv(D,'n900'),           ph:'Disabled',         txH:'#4A4A48', opacity:0.5 },
];

const inputComps = [];
for (const st of INPUT_DEFS) {
  const c = figma.createComponent();
  c.name = `State=${st.name}`;
  c.layoutMode = 'HORIZONTAL';
  c.primaryAxisAlignItems = 'CENTER';
  c.counterAxisAlignItems = 'CENTER';
  c.paddingLeft = c.paddingRight = 16;
  c.paddingTop  = c.paddingBottom = 12;
  c.cornerRadius = 2;
  try { if (rSm) c.setBoundVariable('cornerRadius', rSm); } catch(e) {}

  // Fixed width, auto height
  c.resize(280, 44);
  c.primaryAxisSizingMode = 'FIXED';
  c.counterAxisSizingMode = 'AUTO';

  c.fills   = st.bgV ? [vFill(st.bgV)] : st.bgH ? [sf(st.bgH)] : [];
  c.strokes = st.bdV ? [vFill(st.bdV)] : st.bdH ? [sf(st.bdH)] : [];
  if (st.bdV || st.bdH) { c.strokeWeight=1; c.strokeAlign='INSIDE'; }
  if (st.opacity) c.opacity = st.opacity;

  const t = figma.createText();
  t.name = 'placeholder';
  t.characters = st.ph;
  t.fontName = { family:'Manrope', style:'Regular' };
  t.fontSize = 14;
  t.fills = [sf(st.txH)];

  c.appendChild(t);
  t.layoutSizingHorizontal = 'FILL';

  page.appendChild(c);
  inputComps.push(c);
}

const inputSet = figma.combineAsVariants(inputComps, page);
inputSet.name = 'InputField';
inputSet.x = startX;
inputSet.y = currentY;
colLayout(inputSet, 16, 16);

print('InputField: ' + inputSet.children.length + ' states');
print('');
print('All done!');
print('  Tag      — 5 styles (sharp corners)');
print('  Badge    — 2 styles (pill, count)');
print('  InputField — 4 states (Default/Focus/Error/Disabled)');
