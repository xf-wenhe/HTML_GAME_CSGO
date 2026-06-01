# Dust2 A Site + Mid Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine Dust2 A Site + Mid so the geometry, cover layering, sightlines, and localized visuals look and feel much closer to CS:GO Dust2 while preserving current scale and playable routes.

**Architecture:** Keep the current Dust2 reconstruction intact at the macro level and improve fidelity only inside A Site + Mid by adding smaller collision pieces, more accurate transitions, and targeted visual props/lighting. Limit code changes to Dust2 geometry (`Dust2Layout.ts`), Dust2 visual assembly (`MapData.ts`), and Dust2-specific lighting/markers (`Scene.ts`) so the rest of the project remains unchanged.

**Tech Stack:** TypeScript, Three.js, existing `ArenaCollider`/`BoxSpec` map pipeline, Vite build verification.

---

## File Structure

- `client/src/game/Dust2Layout.ts`
  - Owns Dust2 physical geometry and collision layout.
  - This is where A Site platform layering, Goose reshaping, A Ramp transition blocks, Short exit shaping, Ninja refinement, Top Mid room massing, Xbox surroundings, Mid Doors thickness, and CT Mid openness changes belong.

- `client/src/game/MapData.ts`
  - Owns Dust2 visual props, ground/material zones, and enemy spawn anchors.
  - This is where A Site / Mid visual props and ground/material refinements belong.

- `client/src/game/Scene.ts`
  - Owns scene lighting, bomb marker placement, and map-specific presentation.
  - This is where Dust2-only localized light tuning for A Site + Mid belongs.

- No new files required for implementation.
- No gameplay/network/UI logic changes are in scope.

---

### Task 1: Add failing build verification guard

**Files:**
- Modify: `client/src/game/Dust2Layout.ts`
- Modify: `client/src/game/MapData.ts`
- Modify: `client/src/game/Scene.ts`
- Test: build command only (`npm run build`)

- [ ] **Step 1: Write the failing test**

There is no dedicated Dust2 geometry test framework in this repo, so use the production build as the failing gate before each implementation chunk.

Expected target behaviors to introduce later:
- A Site gains more layered geometry and refined cover pieces.
- Mid gains more massing and sightline-shaping geometry.
- Scene remains buildable.

- [ ] **Step 2: Run test to verify current baseline behavior**

Run:
```bash
npm run build
```

Expected:
- PASS before any new edits in this plan.
- If it fails, stop and fix the regression before continuing.

- [ ] **Step 3: Record baseline constraints**

Use these baseline constraints while implementing:
```ts
// Preserve these invariants:
// 1. Keep existing Hammer scale (0.01x)
// 2. Keep existing route connectivity
// 3. Do not move bomb sites or spawn exports
// 4. Do not touch non-Dust2 maps
```

- [ ] **Step 4: Re-run build after recording constraints**

Run:
```bash
npm run build
```

Expected:
- PASS

- [ ] **Step 5: Commit**

Do not commit yet. This task is a guardrail task only.

---

### Task 2: Refine A Site platform layering and Goose

**Files:**
- Modify: `client/src/game/Dust2Layout.ts`
- Test: `npm run build`

- [ ] **Step 1: Write the failing test**

Add the intended A Site geometry in `Dust2Layout.ts` so the build becomes the gate for the new geometry names.

Target geometry to add/replace:
```ts
// A Site layered platform pieces
b(-2688, -1280,  768,  512, 16,   0, 'a-site-platform-base');
b(-2688, -1024,  768,   64, 12,  16, 'a-site-platform-front-lip');
b(-2560, -1408,  192,  128, 24,  16, 'a-site-default-base');
b(-2496, -1472,   64,   64, 48,  40, 'a-site-default-upper');
b(-2432, -1408,   64,   48, 40,  16, 'a-site-small-box-refined');

// Goose reshaping
b(-1984, -1600,  160,  224, 96,  96, 'goose-main-face');
b(-1920, -1760,   96,   64, 64,  96, 'goose-rear-step');
b(-2048, -1536,   64,  160, 96,  96, 'goose-side-thickness');
```

- [ ] **Step 2: Run test to verify it fails if geometry is malformed**

Run:
```bash
npm run build
```

Expected:
- If you introduced syntax mistakes while editing, FAIL with a TypeScript or esbuild error.
- If syntax is valid, continue — the build gate is the verification mechanism for this code-only geometry task.

- [ ] **Step 3: Write minimal implementation**

In `client/src/game/Dust2Layout.ts`, replace the current simple A Site platform/Goose cluster:
```ts
b(-2688, -1280,  768,  512,  16,   0, 'a-site-platform'),
b(-1920, -1536,   64,  192, 128,  96, 'goose-box'),
b(-1984, -1728,  128,   64,  64,  96, 'goose-plat-ext'),
b(-2752, -1408,   96,   64,  96,  96, 'a-site-shield-box'),
b(-2496, -1408,   64,   48,  96,  96, 'a-site-double-box'),
b(-2496, -1536,   64,   64,  48,  96, 'a-site-default-box'),
b(-2432, -1408,   48,   48,  48,  96, 'a-site-small-box'),
```
with:
```ts
b(-2688, -1280,  768,  512, 16,   0, 'a-site-platform-base'),
b(-2688, -1024,  768,   64, 12,  16, 'a-site-platform-front-lip'),
b(-2688, -1536,  640,   64, 10,  16, 'a-site-platform-rear-lip'),
b(-2816, -1408,  128,   96, 96,  96, 'a-site-shield-box-refined'),
b(-2560, -1408,  192,  128, 24,  16, 'a-site-default-base'),
b(-2496, -1472,   64,   64, 48,  40, 'a-site-default-upper'),
b(-2432, -1408,   64,   48, 40,  16, 'a-site-small-box-refined'),
b(-2368, -1408,   64,   64, 96,  96, 'a-site-double-box-left'),
b(-2304, -1472,   64,   64, 96,  96, 'a-site-double-box-right'),
b(-1984, -1600,  160,  224, 96,  96, 'goose-main-face'),
b(-1920, -1760,   96,   64, 64,  96, 'goose-rear-step'),
b(-2048, -1536,   64,  160, 96,  96, 'goose-side-thickness'),
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
npm run build
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/game/Dust2Layout.ts
git commit -m "feat: refine dust2 a-site platform and goose"
```

---

### Task 3: Refine A Ramp, Short exit, and Ninja

**Files:**
- Modify: `client/src/game/Dust2Layout.ts`
- Test: `npm run build`

- [ ] **Step 1: Write the failing test**

Target geometry additions for A Ramp / Short exit / Ninja:
```ts
b(-2688, -1664,  512,   96, 12,  16, 'a-ramp-top-transition');
b(-2432, -1792,  192,   64, 48,   0, 'short-exit-low-block');
b(-2240, -1728,  128,   64, 64,   0, 'short-exit-side-block');
b(-3456, -1760,   32,  320, 96,   0, 'a-ninja-wall-refined');
b(-3328, -1888,  224,   32, 96,   0, 'a-ninja-back-edge');
```

- [ ] **Step 2: Run test to verify it fails if syntax/regression is introduced**

Run:
```bash
npm run build
```

Expected:
- PASS or syntax failure only if edit is malformed.

- [ ] **Step 3: Write minimal implementation**

In `client/src/game/Dust2Layout.ts`, keep the existing `a-ramp` stair sequence and append these transition blocks immediately after it:
```ts
b(-2688, -1664,  512,   96, 12,  16, 'a-ramp-top-transition'),
b(-2560, -1760,  256,   64, 12,  24, 'a-ramp-top-transition-2'),
b(-2432, -1792,  192,   64, 48,   0, 'short-exit-low-block'),
b(-2240, -1728,  128,   64, 64,   0, 'short-exit-side-block'),
b(-2144, -1664,   64,  128, 48,   0, 'short-exit-vision-guide'),
```

Then replace the current Ninja refinement:
```ts
b(-3328, -1792,   32,  256,  96,   0, 'a-ninja-wall-n'),
b(-3200, -1920,  256,   32,  96,   0, 'a-ninja-wall-w'),
```
with:
```ts
b(-3456, -1760,   32,  320, 96,   0, 'a-ninja-wall-refined'),
b(-3328, -1888,  224,   32, 96,   0, 'a-ninja-back-edge'),
b(-3264, -1760,   64,  128, 48,   0, 'a-ninja-floor-stop'),
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
npm run build
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/game/Dust2Layout.ts
git commit -m "feat: refine dust2 a-ramp short exit and ninja"
```

---

### Task 4: Refine Top Mid massing and Xbox surroundings

**Files:**
- Modify: `client/src/game/Dust2Layout.ts`
- Test: `npm run build`

- [ ] **Step 1: Write the failing test**

Target Mid massing additions:
```ts
b(-512,  1536,  256,  768, 256, 0, 'top-mid-west-mass-1');
b( 512,  1536,  256,  768, 256, 0, 'top-mid-east-mass-1');
b(-192,   896,  128,  128,  64, 0, 'xbox-side-block-w');
b( 192,   896,  128,  128,  64, 0, 'xbox-side-block-e');
```

- [ ] **Step 2: Run test to verify failure on malformed edit**

Run:
```bash
npm run build
```

Expected:
- PASS unless syntax mistake introduced.

- [ ] **Step 3: Write minimal implementation**

In `client/src/game/Dust2Layout.ts`, after the Mid section begins, append/refine these pieces around Xbox and Top Mid:
```ts
b(-512,  1536,  256,  768, 256, 0, 'top-mid-west-mass-1'),
b(-768,  2048,  256,  512, 256, 0, 'top-mid-west-mass-2'),
b( 512,  1536,  256,  768, 256, 0, 'top-mid-east-mass-1'),
b( 768,  2048,  256,  512, 256, 0, 'top-mid-east-mass-2'),
b(-192,   896,  128,  128,  64, 0, 'xbox-side-block-w'),
b( 192,   896,  128,  128,  64, 0, 'xbox-side-block-e'),
b(   0,   768,  192,   64,  32, 0, 'xbox-front-lip'),
b(-320,  1152,   96,  160,  64, 0, 'mid-cover-west'),
b( 320,  1088,   96,  160,  64, 0, 'mid-cover-east'),
```

Keep the original `xbox` collider and existing `mid-box-left`, but do not remove any route openings.

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
npm run build
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/game/Dust2Layout.ts
git commit -m "feat: refine dust2 top-mid massing and xbox"
```

---

### Task 5: Refine Mid Doors thickness and CT Mid openness

**Files:**
- Modify: `client/src/game/Dust2Layout.ts`
- Test: `npm run build`

- [ ] **Step 1: Write the failing test**

Target Mid Doors / CT Mid refinements:
```ts
b(-320,  2048,  160,  256, 256, 0, 'mid-doors-thickness-west');
b( 320,  2048,  160,  256, 256, 0, 'mid-doors-thickness-east');
b(-128, -1664,  128,  384, 160, 0, 'ct-mid-opening-guide-w');
b( 128, -1664,  128,  384, 160, 0, 'ct-mid-opening-guide-e');
```

- [ ] **Step 2: Run test to verify failure on malformed edit**

Run:
```bash
npm run build
```

Expected:
- PASS unless syntax mistake introduced.

- [ ] **Step 3: Write minimal implementation**

In `client/src/game/Dust2Layout.ts`, immediately after the existing Mid Doors entries add:
```ts
b(-320,  2048,  160,  256, 256, 0, 'mid-doors-thickness-west'),
b( 320,  2048,  160,  256, 256, 0, 'mid-doors-thickness-east'),
b(   0,  1856,  384,  128, 128, 0, 'mid-doors-inner-depth'),
```

Then refine CT Mid openness by replacing:
```ts
b(    0, -2176,  512,  640, 256,   0, 'ct-mid-north-wall'),
b( -256, -1792,   32,  768, 256,   0, 'ct-mid-wall-left'),
b(  256, -1792,   32,  768, 256,   0, 'ct-mid-wall-right'),
```
with:
```ts
b(    0, -2240,  448,  512, 224,   0, 'ct-mid-north-wall-refined'),
b( -288, -1792,   32,  704, 224,   0, 'ct-mid-wall-left-refined'),
b(  288, -1792,   32,  704, 224,   0, 'ct-mid-wall-right-refined'),
b( -128, -1664,  128,  384, 160,   0, 'ct-mid-opening-guide-w'),
b(  128, -1664,  128,  384, 160,   0, 'ct-mid-opening-guide-e'),
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
npm run build
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/game/Dust2Layout.ts
git commit -m "feat: refine dust2 mid-doors and ct-mid openness"
```

---

### Task 6: Add A Site + Mid visual props and localized material cues

**Files:**
- Modify: `client/src/game/MapData.ts`
- Test: `npm run build`

- [ ] **Step 1: Write the failing test**

Target visual props to add:
```ts
box(H(-2560), 0.18, H(1280), H(256), 0.04, H(32), ..., 'dust2-a-site-platform-edge');
box(H(0),     0.02, H(-1024), H(1024), 0.02, H(2048), ..., 'dust2-mid-tone-floor');
```

- [ ] **Step 2: Run test to verify failure on malformed edit**

Run:
```bash
npm run build
```

Expected:
- PASS unless syntax mistake introduced.

- [ ] **Step 3: Write minimal implementation**

In `client/src/game/MapData.ts`, append these A Site + Mid props inside the Dust2 `props` array:
```ts
{ ...box(H(-2688), 0.18, H(1024), H(768), 0.04, H(32), 0xe0c48c, 'dust2-a-site-platform-edge', 0.05, 0.78), textureKey: 'plaster' as const },
{ ...box(H(-1984), 0.18, H(1600), H(224), 0.04, H(224), 0xc8b898, 'dust2-goose-floor-accent', 0.05, 0.80), textureKey: 'plaster' as const },
{ ...box(H(0), 0.02, H(-1024), H(1024), 0.02, H(2048), 0xb89e6a, 'dust2-mid-tone-floor', 0.05, 0.86), textureKey: 'sand' as const },
{ ...box(H(-64), 0.10, H(-2048), H(384), 0.04, H(128), 0x9a8a72, 'dust2-mid-doors-threshold', 0.05, 0.84), textureKey: 'concrete' as const },
{ ...box(H(0), 0.10, H(-1664), H(256), 0.04, H(512), 0x8f7b5e, 'dust2-ct-mid-floor-accent', 0.05, 0.84), textureKey: 'concrete' as const },
```

Also update Dust2 material zones to add localized Mid coverage:
```ts
materialZone('dust2-mid-sand',      'sand',     H(0),      0.01, H(-1024), H(1024), 0.1, H(2048)),
materialZone('dust2-goose-plaster', 'plaster',  H(-1984),  0.01, H(1600),  H(256),  0.1, H(224)),
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
npm run build
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/game/MapData.ts
git commit -m "feat: refine dust2 a-site and mid visual props"
```

---

### Task 7: Tune Dust2-only localized lighting for A Site and Mid

**Files:**
- Modify: `client/src/game/Scene.ts`
- Test: `npm run build`

- [ ] **Step 1: Write the failing test**

Target localized Dust2 lights:
```ts
new THREE.PointLight(0xffefdc, 2.0, 18, 1.8) // A Site
new THREE.PointLight(0xffe2b0, 1.3, 14, 2.0) // Mid Doors
```

- [ ] **Step 2: Run test to verify failure on malformed edit**

Run:
```bash
npm run build
```

Expected:
- PASS unless syntax mistake introduced.

- [ ] **Step 3: Write minimal implementation**

In `client/src/game/Scene.ts`, inside the `if (isD2)` branch, replace the current A Site / Mid lights with:
```ts
const aSiteLamps = [
  new THREE.Vector3(-25.6, 5.2, 12.8),
  new THREE.Vector3(-22.8, 4.8, 15.8),
  new THREE.Vector3(-28.8, 4.7, 10.2),
];
aSiteLamps.forEach(pos => {
  const l = new THREE.PointLight(0xffefdc, 2.0, 18, 1.8);
  l.position.copy(pos);
  this.addArenaObject(l);
});

const midLights = [
  { pos: new THREE.Vector3(0, 4.8, -10.24), color: 0xfff0d0, intensity: 1.6, dist: 22 },
  { pos: new THREE.Vector3(0, 3.2, -20.48), color: 0xffd8a0, intensity: 1.3, dist: 14 },
  { pos: new THREE.Vector3(-15.36, 3.8, -12.16), color: 0xffe2b0, intensity: 1.1, dist: 12 },
];
midLights.forEach(({ pos, color, intensity, dist }) => {
  const l = new THREE.PointLight(color, intensity, dist, 1.9);
  l.position.copy(pos);
  this.addArenaObject(l);
});
```

Keep B Tunnel and A Long wall lamps already added unless they break the look.

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
npm run build
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/game/Scene.ts
git commit -m "feat: tune dust2 a-site and mid lighting"
```

---

### Task 8: Final build verification and comparison pass

**Files:**
- Modify: none required unless issues found
- Test: `npm run build`

- [ ] **Step 1: Write the failing test**

Use the final build plus manual comparison checklist as the release gate.

Manual checklist to evaluate after implementation:
```text
1. A Site cover layering is more legible from Long and Short
2. Goose looks like a true corner structure, not a single box
3. A Ramp transition into site feels natural
4. Short exit into A no longer dumps into an overly empty space
5. Top Mid looks like a real Dust2 room volume
6. Xbox no longer feels isolated
7. Mid Doors feel embedded in a thicker structure
8. CT Mid feels more open and transitional
```

- [ ] **Step 2: Run full build verification**

Run:
```bash
npm run build
```

Expected:
- PASS with Vite build output and no errors

- [ ] **Step 3: Perform manual comparison pass**

Compare the implemented state against the spec and report:
```text
- What now matches more closely
- What still remains non-1:1
- Whether A Site + Mid are ready to move on from or need one more pass
```

- [ ] **Step 4: Fix only blocking regressions if found**

If build or visual comparison reveals a blocking problem, make the smallest possible correction in the relevant file and rerun:
```bash
npm run build
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/game/Dust2Layout.ts client/src/game/MapData.ts client/src/game/Scene.ts
git commit -m "feat: refine dust2 a-site and mid fidelity"
```

---

## Self-Review

### Spec coverage
- A Site platform layering: covered in Task 2
- Goose reshaping: covered in Task 2
- Ramp-to-platform transition: covered in Task 3
- Short exit composition: covered in Task 3
- Ninja refinement: covered in Task 3
- Top Mid room massing: covered in Task 4
- Xbox surroundings: covered in Task 4
- Mid Doors thickness: covered in Task 5
- CT Mid openness: covered in Task 5
- Localized props/lighting: covered in Tasks 6 and 7
- Build verification and final comparison: covered in Task 8

### Placeholder scan
- No TODO/TBD markers remain.
- Every implementation step names exact files and concrete geometry or props.
- Every verification step contains exact commands.

### Type consistency
- Uses existing `b(...)`, `box(...)`, `materialZone(...)`, and `THREE.PointLight(...)` patterns already present in the repo.
- Restricts all work to the approved files and Dust2-only branches.
