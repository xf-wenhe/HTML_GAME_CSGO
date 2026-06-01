/**
 * Static geometry analysis - checks if any solid collider blocks each route.
 * Reads Dust2Layout.ts directly, no browser needed.
 */

const PLAYER_RADIUS = 0.32;

// Parse collider definitions from Dust2Layout.ts
const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '../client/src/game/Dust2Layout.ts'), 'utf-8');

// Extract all b() calls
const colliders = [];
const regex = /b\(\s*(-?\d+\.?\d*),\s*(-?\d+\.?\d*),\s*(-?\d+\.?\d*),\s*(-?\d+\.?\d*),\s*(-?\d+\.?\d*),\s*(-?\d+\.?\d*)(?:,\s*(-?\d+\.?\d*))?,\s*'([^']+)'\)/g;

let match;
while ((match = regex.exec(content)) !== null) {
  const [, hx, hz, hw, hd, hh, yOff, name] = match;
  const scale = 0.01;
  colliders.push({
    name,
    x: parseFloat(hx) * scale,
    z: -parseFloat(hz) * scale,  // Z negated
    sx: parseFloat(hw) * scale,
    sz: parseFloat(hd) * scale,
    y: ((parseFloat(hh) / 2) + (parseFloat(yOff) || 0)) * scale,
    sy: parseFloat(hh) * scale,
  });
}

console.log(`Loaded ${colliders.length} colliders\n`);

// Define routes as line segments
const routes = [
  {
    name: 'T→A (A Long)',
    segments: [
      { from: {x:0, z:-57.6}, to: {x:-35.84, z:-50}, desc: 'T Spawn exit → A Long upper' },
      { from: {x:-35.84, z:-50}, to: {x:-35.84, z:-25}, desc: 'A Long upper → mid' },
      { from: {x:-35.84, z:-25}, to: {x:-35.84, z:-13}, desc: 'A Long mid → A Doors' },
      { from: {x:-35.84, z:-13}, to: {x:-25.6, z:12.8}, desc: 'A Doors → A Site' },
    ]
  },
  {
    name: 'T→B (B Tunnels)',
    segments: [
      { from: {x:2.56, z:-57.6}, to: {x:32.64, z:-50}, desc: 'T Spawn exit → B Tunnel' },
      { from: {x:32.64, z:-50}, to: {x:32.64, z:-28}, desc: 'B Tunnel → exit' },
      { from: {x:32.64, z:-28}, to: {x:32.64, z:-13}, desc: 'B Tunnel exit → B Site approach' },
      { from: {x:32.64, z:-13}, to: {x:25.6, z:12.8}, desc: 'approach → B Site' },
    ]
  },
  {
    name: 'T→CT (Mid)',
    segments: [
      { from: {x:0, z:-57.6}, to: {x:0, z:-45}, desc: 'T Spawn exit → Mid upper' },
      { from: {x:0, z:-45}, to: {x:0, z:-30}, desc: 'Mid upper → center' },
      { from: {x:0, z:-30}, to: {x:0, z:-15}, desc: 'Mid center → CT Mid' },
      { from: {x:0, z:-15}, to: {x:0, z:33.28}, desc: 'CT Mid → CT Spawn' },
    ]
  },
  {
    name: 'T→A (Short/Catwalk)',
    segments: [
      { from: {x:-2.56, z:-57.6}, to: {x:-15.36, z:-30}, desc: 'T Spawn → Short turn' },
      { from: {x:-15.36, z:-30}, to: {x:-15.36, z:-15}, desc: 'Short approach' },
      { from: {x:-15.36, z:-15}, to: {x:-15.36, z:5}, desc: 'Catwalk' },
      { from: {x:-15.36, z:5}, to: {x:-25.6, z:12.8}, desc: 'Short exit → A Site' },
    ]
  },
  {
    name: 'CT→A (A Long)',
    segments: [
      { from: {x:-2.56, z:29.44}, to: {x:-35.84, z:15}, desc: 'CT Spawn exit → A Doors' },
      { from: {x:-35.84, z:15}, to: {x:-25.6, z:12.8}, desc: 'A Doors → A Site' },
    ]
  },
  {
    name: 'CT→B (Mid lower)',
    segments: [
      { from: {x:2.56, z:29.44}, to: {x:32.64, z:0}, desc: 'CT Spawn → B approach' },
      { from: {x:32.64, z:0}, to: {x:25.6, z:12.8}, desc: 'B approach → B Site' },
    ]
  },
  {
    name: 'CT→T (Mid)',
    segments: [
      { from: {x:0, z:29.44}, to: {x:0, z:15}, desc: 'CT Spawn → CT Mid' },
      { from: {x:0, z:15}, to: {x:0, z:0}, desc: 'CT Mid → Mid center' },
      { from: {x:0, z:0}, to: {x:0, z:-45}, desc: 'Mid center → upper' },
      { from: {x:0, z:-45}, to: {x:0, z:-57.6}, desc: 'Mid upper → T Spawn' },
    ]
  },
  {
    name: 'CT→A (Short)',
    segments: [
      { from: {x:-2.56, z:29.44}, to: {x:-35.84, z:0}, desc: 'CT Spawn → A Long' },
      { from: {x:-35.84, z:0}, to: {x:-35.84, z:-13}, desc: 'A Long → A Doors' },
      { from: {x:-35.84, z:-13}, to: {x:-15.36, z:5}, desc: 'A Doors → Short exit' },
      { from: {x:-15.36, z:5}, to: {x:-25.6, z:12.8}, desc: 'Short exit → A Site' },
    ]
  },
];

// Skip list for non-blocking colliders
const skipPatterns = [
  'floor', 'platform-base', 'sand-floor', 'cobblestone', 'concrete-floor',
  'pit-floor', 'lamp', 'light', 'fence', 'drum', 'barrel', 'pipe',
  'tank', 'sign', 'glass', 'header', 'truss', 'stripe', 'wear-',
  'dirt-', 'accent', 'threshold', 'shipping', 'barrier', 'crate-',
  'partition', 'plinth', 'ceiling', 'roof', 'wear-', 'marker',
  'sand-floor', 'water', 'pipe', 'truss',
];

function isSolid(c) {
  const name = c.name || '';
  return !skipPatterns.some(s => name.includes(s));
}

function lineIntersectsBox(x1, z1, x2, z2, bx, bz, bw, bd, clearance) {
  const hw = bw / 2 + clearance;
  const hd = bd / 2 + clearance;

  // Quick reject
  const lxMin = Math.min(x1, x2), lxMax = Math.max(x1, x2);
  const lzMin = Math.min(z1, z2), lzMax = Math.max(z1, z2);
  if (lxMax < bx - hw || lxMin > bx + hw) return false;
  if (lzMax < bz - hd || lzMin > bz + hd) return false;
  return true;
}

let allPassed = true;

for (const route of routes) {
  console.log(`══ ${route.name} ══`);
  let routeBlocked = false;

  for (const seg of route.segments) {
    const blockers = [];

    for (const col of colliders) {
      if (!isSolid(col)) continue;

      if (lineIntersectsBox(
        seg.from.x, seg.from.z, seg.to.x, seg.to.z,
        col.x, col.z, col.sx, col.sz, PLAYER_RADIUS
      )) {
        blockers.push(col.name);
      }
    }

    if (blockers.length > 0) {
      console.log(`  ✗ ${seg.desc}: BLOCKED by [${blockers.slice(0, 3).join(', ')}]`);
      allPassed = false;
      routeBlocked = true;
    } else {
      console.log(`  ✓ ${seg.desc}`);
    }
  }
  console.log();
}

console.log('═══════════════════════════════');
console.log(allPassed ? '✅ ALL ROUTES CLEAR' : '❌ SOME ROUTES BLOCKED');
console.log('═══════════════════════════════');

process.exit(allPassed ? 0 : 1);
