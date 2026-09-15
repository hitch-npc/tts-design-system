// ══════════════════════════════════════════════
// TTS DS R14 — Button Component (fixed)
// Run in Scripter AFTER figma-script.js
// ══════════════════════════════════════════════

// ─── Clean up previous attempts ──────────────
for (const n of [...figma.currentPage.children]) {
  if (n.type === 'COMPONENT_SET' && n.name === 'Button') n.remove();
  if (n.type === 'COMPONENT' && n.name.startsWith('Style=')) n.remove();
}

// ─── Helpers ─────────────────────────────────
const allVars  = await figma.variables.getLocalVariablesAsync();
const allColls = await figma.variables.getLocalVariableCollectionsAsync();
const collById = Object.fromEntries(allColls.map(c => [c.id, c.name]));

function gv(collName, varName) {
  return allVars.find(v =>
    collById[v.variableCollectionId] === collName && v.name === varName
  ) || null;
}

function vFill(variable) {
  const base = { type: 'SOLID', color: { r: 0, g: 0, b: 0 } };
  return variable
    ? figma.variables.setBoundVariableForPaint(base, 'color', variable)
    : base;
}

// ─── Load fonts ──────────────────────────────
await figma.loadFontAsync({ family: 'Manrope', style: 'SemiBold' });
await figma.loadFontAsync({ family: 'Manrope', style: 'Bold' });

const page = figma.currentPage;
const DARK = 'Color/Dark';

// ─── Styles ───────────────────────────────────
const STYLES = [
  { name: 'Primary',      bg: gv(DARK,'accent'),        bd: gv(DARK,'accent'),         tx: gv(DARK,'n100'),        w: 'Bold' },
  { name: 'Ghost',        bg: null,                      bd: gv(DARK,'n700'),            tx: gv(DARK,'n100'),        w: 'SemiBold' },
  { name: 'Ghost Accent', bg: null,                      bd: gv(DARK,'accent-border'),   tx: gv(DARK,'accent'),      w: 'SemiBold' },
  { name: 'Danger',       bg: gv(DARK,'danger-bg'),      bd: gv(DARK,'danger-border'),   tx: gv(DARK,'danger-text'), w: 'Bold' },
];

// ─── Sizes ────────────────────────────────────
const SIZES = [
  { name: 'Large',  fs: 12, pH: 32, pV: 16 },
  { name: 'Medium', fs: 11, pH: 24, pV: 13 },
  { name: 'Small',  fs: 9,  pH: 16, pV: 10 },
];

// ─── Find clear space on canvas ───────────────
let startX = 200;
for (const n of page.children) {
  if (typeof n.x === 'number') startX = Math.max(startX, n.x + (n.width || 0) + 120);
}

// ─── Create all variants ──────────────────────
const comps = [];

for (const st of STYLES) {
  for (const sz of SIZES) {
    const c = figma.createComponent();
    c.name = `Style=${st.name}, Size=${sz.name}`;
    c.layoutMode            = 'HORIZONTAL';
    c.primaryAxisAlignItems = 'CENTER';
    c.counterAxisAlignItems = 'CENTER';
    c.primaryAxisSizingMode = 'AUTO';
    c.counterAxisSizingMode = 'AUTO';
    c.paddingLeft   = sz.pH;
    c.paddingRight  = sz.pH;
    c.paddingTop    = sz.pV;
    c.paddingBottom = sz.pV;
    c.cornerRadius  = 2;   // система угловатая: --r-sm

    // Background
    c.fills = st.bg ? [vFill(st.bg)] : [];

    // Border
    c.strokes = st.bd ? [vFill(st.bd)] : [];
    if (st.bd) { c.strokeWeight = 1; c.strokeAlign = 'INSIDE'; }

    // Label
    const t = figma.createText();
    t.name          = 'label';
    t.characters    = 'Button';
    t.fontName      = { family: 'Manrope', style: st.w };   // заливные 700, контурные 600
    t.fontSize      = sz.fs;
    t.letterSpacing = { unit: 'PERCENT', value: 16 };
    t.textCase      = 'UPPER';
    t.fills         = st.tx ? [vFill(st.tx)] : [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

    c.appendChild(t);
    page.appendChild(c);
    comps.push(c);
  }
}

// ─── Combine as variants ──────────────────────
const set = figma.combineAsVariants(comps, page);
set.name = 'Button';

// ─── Lay out the grid manually ────────────────
// Grid: 4 rows (styles) × 3 cols (sizes)
const PAD = 24;
const GAP_COL = 16;
const GAP_ROW = 20;

// First pass: measure each variant
const grid = []; // grid[styleIndex][sizeIndex] = comp

for (const comp of set.children) {
  const parts = Object.fromEntries(comp.name.split(', ').map(p => p.split('=')));
  const si = STYLES.findIndex(s => s.name === parts['Style']);
  const zi = SIZES.findIndex(s => s.name === parts['Size']);
  if (!grid[si]) grid[si] = [];
  grid[si][zi] = comp;
}

// Second pass: position
let y = PAD;
for (let si = 0; si < STYLES.length; si++) {
  let x = PAD;
  let rowH = 0;
  for (let zi = 0; zi < SIZES.length; zi++) {
    const comp = grid[si] && grid[si][zi];
    if (!comp) continue;
    comp.x = x;
    comp.y = y;
    x += comp.width + GAP_COL;
    rowH = Math.max(rowH, comp.height);
  }
  y += rowH + GAP_ROW;
}

// Resize set to fit content
const totalW = PAD * 2 + SIZES.reduce((acc, _, zi) => {
  const maxW = Math.max(...STYLES.map((_,si) => grid[si]?.[zi]?.width || 0));
  return acc + maxW + (zi < SIZES.length - 1 ? GAP_COL : 0);
}, 0);
set.resize(totalW, y);

// Position on canvas
set.x = startX;
set.y = 100;

// ─── Add Label text property ──────────────────
set.addComponentProperty('Label', 'TEXT', 'Button');
const propKey = Object.keys(set.componentPropertyDefinitions).find(k => k.startsWith('Label'));
if (propKey) {
  for (const child of set.children) {
    const lbl = child.findOne(n => n.type === 'TEXT' && n.name === 'label');
    if (lbl) lbl.componentPropertyReferences = { characters: propKey };
  }
}

print('Button ready — ' + set.children.length + ' variants (4 styles x 3 sizes)');
