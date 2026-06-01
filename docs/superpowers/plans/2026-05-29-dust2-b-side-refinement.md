# Dust2 B Tunnels + B Site Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine Dust2 B Tunnels + B Site so the geometry, cover layering, sightlines, and localized visuals look and feel much closer to CS:GO Dust2 while preserving current scale and playable routes.

**Architecture:** Keep the current Dust2 reconstruction intact at the macro level and improve fidelity only inside B Tunnels + B Site by adding smaller collision pieces, more accurate transitions, and targeted visual props/lighting. Limit code changes to Dust2 geometry (`Dust2Layout.ts`), Dust2 visual assembly (`MapData.ts`), and Dust2-specific lighting (`Scene.ts`).

**Tech Stack:** TypeScript, Three.js, existing `ArenaCollider`/`BoxSpec` map pipeline, Vite build verification.

---

## File Structure

- `client/src/game/Dust2Layout.ts` — B Tunnels cross-section variation, Upper Dark refinement, tunnel exit framing, stair sidewall pressure, B Site platform layering, Default/Double/Car/Back Plat/Window/Doors geometry.
- `client/src/game/MapData.ts` — B Tunnels + B Site visual props, ground/material zones.
- `client/src/game/Scene.ts` — B Tunnels localized lighting (Upper Dark darker, Lower B wall lamps).
- No new files required.

---

### Task 1: Verify baseline build

**Files:**
- Test: build command only

- [ ] **Step 1: Confirm current build passes**

Run:
```bash
cd /Volumes/新/work/html && npm run build
```
Expected: `✓ built in` with no errors. If it fails, stop and fix before continuing.

---

### Task 2: Refine Lower B Tunnels cross-section and exit framing

**Files:**
- Modify: `client/src/game/Dust2Layout.ts`

- [ ] **Step 1: Locate the B Tunnels section**

Open `client/src/game/Dust2Layout.ts`. Find the comment `// ── B Tunnels（B洞）`. The current Lower B uses two long walls:
```ts
b( 3072,  3072,  192, 6144, 256,   0, 'b-tunnels-outer-wall'),
b( 3456,  3072,  192, 6144, 256,   0, 'b-tunnels-inner-wall'),
b( 3264,  3072,  576, 6144,  32, 256, 'b-tunnels-ceiling'),
```

- [ ] **Step 2: Replace Lower B with cross-section variation**

Replace those three lines with:
```ts
// Lower B — outer wall split into segments for cross-section variation
b( 3072,  5760,  192,  768, 256,   0, 'b-lower-outer-entrance'),
b( 3072,  4608,  192, 1536, 256,   0, 'b-lower-outer-mid'),
b( 3040,  3584,  256,  768, 256,   0, 'b-lower-outer-narrow'),   // slight inward step
b( 3072,  2816,  192, 1536, 256,   0, 'b-lower-outer-exit'),
// Lower B — inner wall with matching variation
b( 3456,  5760,  192,  768, 256,   0, 'b-lower-inner-entrance'),
b( 3456,  4608,  192, 1536, 256,   0, 'b-lower-inner-mid'),
b( 3488,  3584,  128,  768, 256,   0, 'b-lower-inner-narrow'),   // slight inward step
b( 3456,  2816,  192, 1536, 256,   0, 'b-lower-inner-exit'),
// Lower B ceiling
b( 3264,  3072,  576, 6144,  32, 256, 'b-tunnels-ceiling'),
// B Tunnel exit framing — door-like opening into B Site
b( 3264,  1920,  576,   64,  32, 224, 'b-tunnel-exit-lintel'),
b( 3072,  1984,  192,  128, 256,   0, 'b-tunnel-exit-frame-w'),
b( 3456,  1984,  192,  128, 256,   0, 'b-tunnel-exit-frame-e'),
```

- [ ] **Step 3: Run build**

```bash
cd /Volumes/新/work/html && npm run build
```
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add client/src/game/Dust2Layout.ts
git commit -m "feat: refine dust2 lower-b cross-section and exit framing"
```

---

### Task 3: Refine Upper Tunnels, Upper Dark, and stair sidewall pressure

**Files:**
- Modify: `client/src/game/Dust2Layout.ts`

- [ ] **Step 1: Locate Upper Tunnels section**

Find the comment `// 上层平台（Upper Tunnels / Upper Dark）`. Current state:
```ts
b( 3072,  -512,  320, 1536,  16, 128, 'upper-tunnels-platform'),
b( 2880,  -512,   32, 1536, 256,   0, 'upper-tunnels-west-wall'),
b( 3072,  -512,  320, 1536,  32, 256, 'upper-tunnels-ceiling'),
...stairsX(2880, 1280, 384, 256, 0, 128, 16, 'b-tunnel-stairs'),
b( 3264,     0,   96,   80,  96, 128, 'upper-dark-box'),
b( 3264,  -896,   64,   48,  48, 128, 'upper-tunnel-exit-box'),
```

- [ ] **Step 2: Replace with refined Upper Tunnels + Upper Dark**

Replace those lines with:
```ts
// Upper Tunnels platform with front/rear lip
b( 3072,  -512,  320, 1536,  16, 128, 'upper-tunnels-platform-base'),
b( 3072,  -256,  320,   64,  10, 144, 'upper-tunnels-platform-front-lip'),
b( 3072, -1024,  320,   64,  10, 144, 'upper-tunnels-platform-rear-lip'),
// Upper Tunnels walls
b( 2880,  -512,   32, 1536, 256,   0, 'upper-tunnels-west-wall'),
b( 3072,  -512,  320, 1536,  32, 256, 'upper-tunnels-ceiling'),
// Upper Dark — tighter room with stronger corner
b( 2944,   128,  192,  512, 256,   0, 'upper-dark-south-wall'),
b( 3072,   384,  320,   32, 256, 128, 'upper-dark-inner-wall'),
b( 3264,   192,   96,  192,  96, 128, 'upper-dark-box-refined'),
b( 3200,    64,   64,   64,  64, 128, 'upper-dark-corner-block'),
b( 3264,  -896,   64,   48,  48, 128, 'upper-tunnel-exit-box'),
// Stair sidewall pressure — walls flanking the staircase
b( 2816,  1280,   64,  256, 256,   0, 'b-stair-sidewall-w'),
b( 3392,  1280,   64,  256, 256,   0, 'b-stair-sidewall-e'),
b( 2880,  1024,   32,  128, 128,   0, 'b-stair-lower-block'),
...stairsX(2880, 1280, 384, 256, 0, 128, 16, 'b-tunnel-stairs'),
```

- [ ] **Step 3: Run build**

```bash
cd /Volumes/新/work/html && npm run build
```
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add client/src/game/Dust2Layout.ts
git commit -m "feat: refine dust2 upper-tunnels upper-dark and stair pressure"
```

---

### Task 4: Refine B Site platform layering and Default/Double stack

**Files:**
- Modify: `client/src/game/Dust2Layout.ts`

- [ ] **Step 1: Locate B Site section**

Find `// ── B Site（B包点）`. Current platform and cover:
```ts
b( 2560, -1280,  640,  448,  16,   0, 'b-site-platform'),
...
b( 2368, -1408,   64,   64,  96,  96, 'b-site-double-stack'),
b( 2368, -1536,   64,   64,  48,  96, 'b-site-default-box'),
b( 2688, -1664,   64,   48,  96,  96, 'b-site-right-back-box'),
b( 2176, -1344,   48,   48,  48,  96, 'b-site-small-box'),
```

- [ ] **Step 2: Replace with layered platform and refined cover**

Replace those lines with:
```ts
// B Site platform — base + front/rear lip
b( 2560, -1280,  640,  448,  16,   0, 'b-site-platform-base'),
b( 2560, -1024,  640,   64,  10,  16, 'b-site-platform-front-lip'),
b( 2560, -1536,  512,   64,  10,  16, 'b-site-platform-rear-lip'),
// Default box — base + upper layer
b( 2368, -1408,   64,  128,  20,  96, 'b-site-default-base'),
b( 2368, -1472,   64,   64,  48, 116, 'b-site-default-upper'),
// Double stack — two clearly distinct layers
b( 2240, -1408,   64,   64,  48,  96, 'b-site-double-lower'),
b( 2240, -1408,   48,   48,  48, 144, 'b-site-double-upper'),
// Right back box
b( 2688, -1664,   64,   48,  96,  96, 'b-site-right-back-box'),
// Small box
b( 2176, -1344,   48,   48,  48,  96, 'b-site-small-box'),
```

- [ ] **Step 3: Run build**

```bash
cd /Volumes/新/work/html && npm run build
```
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add client/src/game/Dust2Layout.ts
git commit -m "feat: refine dust2 b-site platform and default/double layering"
```

---

### Task 5: Refine Car, Back Plat, B Window, and B Doors

**Files:**
- Modify: `client/src/game/Dust2Layout.ts`

- [ ] **Step 1: Locate Car, Back Plat, B Window, B Doors**

Find the existing entries:
```ts
b( 2688, -1408,  128,   64,  40,  96, 'b-car'),
b( 2176, -1728,  256,  128,  88,   0, 'b-back-plat'),
b( 1920, -1216,   96,   64, 128,   0, 'b-window-platform'),
b( 1920, -1152,   96,   32,  32, 128, 'b-window-sill'),
b( 1920, -1280,   96,   32,  64,  64, 'b-window-sill-low'),
b( 1920, -1472,   32,  128, 256,   0, 'b-doors-frame-north'),
b( 1920, -1600,   32,  128, 256,   0, 'b-doors-frame-south'),
b( 1920, -1536,  128,   32,  64, 192, 'b-doors-lintel'),
```

- [ ] **Step 2: Replace with refined versions**

Replace those lines with:
```ts
// Car — body + hood step + undercarriage
b( 2688, -1408,  128,   64,  40,  96, 'b-car-body'),
b( 2688, -1344,   96,   32,  16, 136, 'b-car-hood'),
b( 2688, -1472,   96,   32,  16, 136, 'b-car-trunk'),
// Back Plat — base + raised step + rear wall
b( 2176, -1728,  256,  128,  88,   0, 'b-back-plat-base'),
b( 2176, -1792,  192,   64,  32,  88, 'b-back-plat-step'),
b( 2176, -1856,  256,   32,  64,  88, 'b-back-plat-rear-wall'),
// B Window — clearer window opening with sill layers
b( 1920, -1216,   96,   64, 128,   0, 'b-window-platform'),
b( 1920, -1152,   96,   32,  32, 128, 'b-window-sill-top'),
b( 1920, -1280,   96,   32,  64,  64, 'b-window-sill-low'),
b( 1888, -1216,   32,   64, 128,   0, 'b-window-side-block-w'),
b( 1952, -1216,   32,   64, 128,   0, 'b-window-side-block-e'),
// B Doors — thicker door opening
b( 1920, -1472,   32,  128, 256,   0, 'b-doors-frame-north'),
b( 1920, -1600,   32,  128, 256,   0, 'b-doors-frame-south'),
b( 1920, -1536,  128,   32,  64, 192, 'b-doors-lintel'),
b( 1856, -1536,   64,  256, 256,   0, 'b-doors-thickness-w'),
b( 1984, -1536,   64,  256, 256,   0, 'b-doors-thickness-e'),
```

- [ ] **Step 3: Run build**

```bash
cd /Volumes/新/work/html && npm run build
```
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add client/src/game/Dust2Layout.ts
git commit -m "feat: refine dust2 b-car back-plat b-window b-doors"
```

---

### Task 6: Add B Tunnels + B Site visual props and material zones

**Files:**
- Modify: `client/src/game/MapData.ts`

- [ ] **Step 1: Locate the Dust2 props array**

Open `client/src/game/MapData.ts`. Find the `const props: BoxSpec[] = [` inside `buildDust2Arena()`. Locate the existing B Tunnels floor entry:
```ts
{ ...box(H(3264), 0.01, H(3072), H(576), 0.02, H(6144), 0x6a5a48, 'dust2-b-tunnel-floor', 0.06, 0.92), textureKey: 'concrete' as const },
```

- [ ] **Step 2: Add B Site visual props after the B Tunnels floor entry**

After that line, add:
```ts
// ── B Site platform edge accent ──
{ ...box(H(2560), 0.18, H(1024), H(640), 0.04, H(32), 0xd0b888, 'dust2-b-site-platform-edge', 0.05, 0.78), textureKey: 'plaster' as const },
// ── B Site Default / Double area floor accent ──
{ ...box(H(2368), 0.10, H(1408), H(128), 0.04, H(192), 0xb8a070, 'dust2-b-default-floor-accent', 0.05, 0.82), textureKey: 'plaster' as const },
// ── Upper Dark floor (darker concrete) ──
{ ...box(H(3072), 0.01, H(512), H(320), 0.02, H(1536), 0x3a3028, 'dust2-upper-dark-floor', 0.06, 0.95), textureKey: 'concrete' as const },
// ── B Window threshold ──
{ ...box(H(1920), 0.10, H(1216), H(96), 0.04, H(64), 0x9a8a72, 'dust2-b-window-threshold', 0.05, 0.84), textureKey: 'concrete' as const },
// ── B Doors threshold ──
{ ...box(H(1920), 0.10, H(1536), H(128), 0.04, H(256), 0x8f7b5e, 'dust2-b-doors-threshold', 0.05, 0.84), textureKey: 'concrete' as const },
```

- [ ] **Step 3: Add B-side material zones**

Find the `materialZones` array in the return statement and add:
```ts
materialZone('dust2-b-tunnel-concrete', 'concrete', H(3264), 0.01, H(3072), H(576), 0.1, H(6144)),
materialZone('dust2-upper-dark-stone',  'stone',    H(3072), 0.01, H(512),  H(320), 0.1, H(1536)),
materialZone('dust2-b-site-plaster',    'plaster',  H(2560), 0.01, H(1280), H(640), 0.1, H(448)),
```

- [ ] **Step 4: Run build**

```bash
cd /Volumes/新/work/html && npm run build
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/game/MapData.ts
git commit -m "feat: refine dust2 b-side visual props and material zones"
```

---

### Task 7: Tune B Tunnels localized lighting

**Files:**
- Modify: `client/src/game/Scene.ts`

- [ ] **Step 1: Locate the Dust2 B Tunnels lighting block**

Open `client/src/game/Scene.ts`. Find the `if (isD2)` block. Locate the existing B Tunnels wall lamps:
```ts
// B Tunnels 壁灯（橙黄色，较暗）
[55.0, 40.0, 25.0, 10.0].forEach(zHU => {
  const l = new THREE.PointLight(0xff9930, 1.4, 12, 2.2);
  l.position.set(32.64, 2.0, -zHU);
  this.addArenaObject(l);
});
```

- [ ] **Step 2: Replace with layered B Tunnels lighting**

Replace those lines with:
```ts
// Lower B Tunnels — warm orange wall lamps, moderate brightness
[55.0, 42.0, 28.0, 14.0].forEach((zHU, i) => {
  const intensity = i < 2 ? 1.2 : 1.0; // entrance slightly brighter
  const l = new THREE.PointLight(0xff9930, intensity, 10, 2.4);
  l.position.set(32.64, 2.0, -zHU);
  this.addArenaObject(l);
});
// Upper Dark — very dim, cold tint to reinforce darkness
const upperDarkLight = new THREE.PointLight(0x8090a0, 0.5, 8, 2.8);
upperDarkLight.position.set(32.64, 3.8, -5.12);
this.addArenaObject(upperDarkLight);
// B Site — slightly warmer and brighter than tunnels
const bSiteExtraLight = new THREE.PointLight(0xffeedd, 1.4, 16, 1.8);
bSiteExtraLight.position.set(25.6, 4.8, 12.8);
this.addArenaObject(bSiteExtraLight);
```

- [ ] **Step 3: Run build**

```bash
cd /Volumes/新/work/html && npm run build
```
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add client/src/game/Scene.ts
git commit -m "feat: tune dust2 b-tunnels and upper-dark lighting"
```

---

### Task 8: Final build verification and comparison pass

**Files:**
- Modify: none unless issues found

- [ ] **Step 1: Run full build**

```bash
cd /Volumes/新/work/html && npm run build
```
Expected:
```
✓ 84 modules transformed.
✓ built in ~1s
```

- [ ] **Step 2: Manual comparison checklist**

Evaluate against these criteria:
```
1. Lower B no longer feels like a uniform-width straight tube
2. Upper Dark feels noticeably darker and more enclosed
3. B tunnel exit into B Site has a framed opening, not a flat gap
4. B Site platform has visible edge layering
5. Default and Double stack are clearly two distinct structures
6. Car has a hood/trunk step, not just a flat box
7. Back Plat has a raised step and rear wall
8. B Window is a clear shooting aperture with side blocks
9. B Doors feel embedded in a thicker structure
10. B Tunnels are darker than B Site; Upper Dark is darkest
```

- [ ] **Step 3: Fix any blocking regressions**

If build fails or a critical visual regression is found, make the smallest possible correction and rerun:
```bash
cd /Volumes/新/work/html && npm run build
```

- [ ] **Step 4: Final commit**

```bash
git add client/src/game/Dust2Layout.ts client/src/game/MapData.ts client/src/game/Scene.ts
git commit -m "feat: refine dust2 b-tunnels and b-site fidelity"
```

---

## Self-Review

### Spec coverage
- Lower B cross-section variation: Task 2 ✓
- Upper Tunnels / Upper Dark refinement: Task 3 ✓
- Tunnel exit-to-site framing: Task 2 ✓
- Stairs/sidewall pressure: Task 3 ✓
- B Site platform layering: Task 4 ✓
- Default/Double stack refinement: Task 4 ✓
- Car/Back Plat/Water Tank relationship: Task 5 ✓ (Water Tank already exists as visual prop from previous pass)
- B Window clarity: Task 5 ✓
- B Doors thickness: Task 5 ✓
- Localized props/lighting: Tasks 6 and 7 ✓
- Build verification and final comparison: Task 8 ✓

### Placeholder scan
- No TBD/TODO markers.
- Every step has exact file paths, concrete geometry values, and exact commands.

### Type consistency
- Uses existing `b(...)`, `box(...)`, `materialZone(...)`, `THREE.PointLight(...)` patterns.
- All geometry uses Hammer units with the `b()` helper already defined in `Dust2Layout.ts`.
- All visual props use the `H()` helper already defined in `buildDust2Arena()` in `MapData.ts`.
