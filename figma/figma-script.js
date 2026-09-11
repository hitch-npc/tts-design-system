// ══════════════════════════════════════════════
// TTS Design System R14 — Figma Variable & Style Creator
// Paste into Scripter plugin and click Run
// ══════════════════════════════════════════════

function hex(h) {
  return {
    r: parseInt(h.slice(1,3),16)/255,
    g: parseInt(h.slice(3,5),16)/255,
    b: parseInt(h.slice(5,7),16)/255,
    a: 1
  };
}

// Remove existing TTS collections to avoid duplicates
const existingColls = await figma.variables.getLocalVariableCollectionsAsync();
for (const c of existingColls) {
  if (['Primitives','Color/Dark','Color/Light','Spacing','Radius'].includes(c.name)) c.remove();
}

// ─── 1. PRIMITIVES ───────────────────────────
const primColl = figma.variables.createVariableCollection('Primitives');
primColl.renameMode(primColl.modes[0].modeId, 'Value');
const primMode = primColl.modes[0].modeId;

const PRIMS = {
  'blue/cobalt':       '#0047FF',
  'blue/cobalt-hover': '#0038CC',
  'blue/cobalt-dim':   '#0436B6',
  'green/success':     '#22C55E',
  'red/danger':        '#E53E3E',
  'neutral/black':     '#111111',
  'neutral/white':     '#FFFFFF',
};
const primVars = {};
for (const [name, h] of Object.entries(PRIMS)) {
  const v = figma.variables.createVariable(name, primColl, 'COLOR');
  v.setValueForMode(primMode, hex(h));
  v.scopes = [];
  primVars[name] = v;
}

// ─── 2. COLOR TOKENS ─────────────────────────
// Free plan = 1 mode only → two separate collections
// [name, darkHex, lightHex]
const COLORS = [
  ['ink',            '#0D0D0D',  '#FFFFFF'],
  ['n100',           '#D6D6D2',  '#0D0D0D'],
  ['n200',           '#C0C0BC',  '#2D2D2B'],
  ['n300',           '#A6A6A2',  '#4A4A48'],
  ['n400',           '#8A8A88',  '#6A6A68'],
  ['n500',           '#7A7A78',  '#888886'],
  ['n600',           '#626260',  '#A8A8A5'],
  ['n700',           '#4A4A48',  '#B5B5B0'],
  ['n800',           '#262930',  '#E2E1DA'],
  ['n900',           '#191C22',  '#F2F1EB'],
  ['n950',           '#111318',  '#FAFAF7'],
  ['accent',         '#0047FF',  '#0047FF'],
  ['accent-hover',   '#0038CC',  '#0038CC'],
  ['accent-dim',     '#0436B6',  '#0436B6'],
  ['accent-ghost',   '#0B142A',  '#EAF0FF'],
  ['accent-border',  '#091E56',  '#B8C9F0'],
  ['blob-core',      '#06277F',  '#BFD0EE'],
  ['blob-mid',       '#15092A',  '#E5DAEF'],
  ['blob-purple',    '#200840',  '#DBC4F0'],
  ['blob-faint',     '#08133D',  '#08133D'],
  ['success',        '#22C55E',  '#22C55E'],
  ['success-bg',     '#0A2210',  '#DCFCE7'],
  ['success-border', '#1A4428',  '#86EFAC'],
  ['danger',         '#E53E3E',  '#E53E3E'],
  ['danger-bg',      '#2D1010',  '#FEE2E2'],
  ['danger-border',  '#7A2020',  '#FCA5A5'],
  ['danger-text',    '#FF8080',  '#DC2626'],
];

function createColorCollection(collName, colIndex) {
  const coll = figma.variables.createVariableCollection(collName);
  coll.renameMode(coll.modes[0].modeId, 'Value');
  const modeId = coll.modes[0].modeId;
  for (const row of COLORS) {
    const v = figma.variables.createVariable(row[0], coll, 'COLOR');
    v.setValueForMode(modeId, hex(row[colIndex]));
    v.scopes = ['ALL_FILLS', 'STROKE_COLOR'];
  }
}

createColorCollection('Color/Dark',  1);
createColorCollection('Color/Light', 2);

// ─── 3. SPACING ──────────────────────────────
const spColl = figma.variables.createVariableCollection('Spacing');
spColl.renameMode(spColl.modes[0].modeId, 'Value');
const spMode = spColl.modes[0].modeId;

const SPACING = [
  ['sp-1',4],['sp-2',8],['sp-3',12],['sp-4',16],['sp-5',20],
  ['sp-6',24],['sp-8',32],['sp-10',40],['sp-12',48],['sp-16',64],['sp-20',80],
  ['section-sm',40],['section-md',64],['section-lg',96],
];
for (const [name, val] of SPACING) {
  const v = figma.variables.createVariable(name, spColl, 'FLOAT');
  v.setValueForMode(spMode, val);
  v.scopes = ['GAP', 'WIDTH_HEIGHT'];
}

// ─── 4. RADIUS ───────────────────────────────
const rColl = figma.variables.createVariableCollection('Radius');
rColl.renameMode(rColl.modes[0].modeId, 'Value');
const rMode = rColl.modes[0].modeId;

for (const [name, val] of [['sm',2],['md',4],['lg',8],['full',9999]]) {
  const v = figma.variables.createVariable(name, rColl, 'FLOAT');
  v.setValueForMode(rMode, val);
  v.scopes = ['CORNER_RADIUS'];
}

// ─── 5. TEXT STYLES ──────────────────────────
for (const s of figma.getLocalTextStyles()) {
  if (s.name.startsWith('TTS/')) s.remove();
}

const TEXT_STYLES = [
  { name:'TTS/display',      family:'Cormorant Garamond', style:'Regular',  size:80, lh:95,  ls:6,  tc:'UPPER' },
  { name:'TTS/h1',           family:'Forum',              style:'Regular',  size:45, lh:100, ls:10, tc:'UPPER' },
  { name:'TTS/h2',           family:'Forum',              style:'Regular',  size:29, lh:110, ls:10, tc:'UPPER' },
  { name:'TTS/h3',           family:'Cormorant Garamond', style:'Medium',   size:29, lh:110, ls:8,  tc:'ORIGINAL' },
  { name:'TTS/subtitle',     family:'Manrope',            style:'Medium',   size:13, lh:100, ls:8,  tc:'UPPER' },
  { name:'TTS/body-lg',      family:'Manrope',            style:'Regular',  size:15, lh:175, ls:0,  tc:'ORIGINAL' },
  { name:'TTS/body',         family:'Manrope',            style:'Regular',  size:14, lh:175, ls:0,  tc:'ORIGINAL' },
  { name:'TTS/body-sm',      family:'Manrope',            style:'Regular',  size:12, lh:170, ls:0,  tc:'ORIGINAL' },
  { name:'TTS/caption',      family:'Manrope',            style:'Medium',   size:10, lh:100, ls:18, tc:'UPPER' },
  { name:'TTS/label-accent', family:'Manrope',            style:'SemiBold', size:10, lh:100, ls:22, tc:'UPPER' },
  { name:'TTS/num',          family:'Oranienbaum',        style:'Regular',  size:48, lh:100, ls:0,  tc:'ORIGINAL' },
  { name:'TTS/price',        family:'Oranienbaum',        style:'Regular',  size:26, lh:100, ls:0,  tc:'ORIGINAL' },
];

for (const def of TEXT_STYLES) {
  try {
    await figma.loadFontAsync({ family: def.family, style: def.style });
    const s = figma.createTextStyle();
    s.name = def.name;
    s.fontName = { family: def.family, style: def.style };
    s.fontSize = def.size;
    s.lineHeight = { unit: 'PERCENT', value: def.lh };
    s.letterSpacing = { unit: 'PERCENT', value: def.ls };
    s.textCase = def.tc;
  } catch(e) {
    print('⚠ Skipped ' + def.name + ': ' + e.message);
  }
}

print('Done! Created:');
print('  Primitives (7)');
print('  Color/Dark (27) + Color/Light (27)');
print('  Spacing (14) + Radius (4)');
print('  Text styles TTS/* (12)');
print('Check: Edit > Local variables  &  Assets > Text styles');
