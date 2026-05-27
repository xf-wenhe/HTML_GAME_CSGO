# CS:GO Visual & Audio Feedback Enhancement Design

**Date:** 2026-05-27
**Status:** Approved
**Scope:** P0 → P3 full serial implementation (8 items)

## Context

The FPS game has solid CS:GO-aligned gameplay mechanics (movement physics, recoil patterns, weapon stats, map geometry) but plays like a "silent gray box." All audio is Web Audio API synthesized beeps, weapons are procedural geometry despite GLB files existing, maps lack textures, and there's no shooting feedback (decals, tracers), no shell casings, no screen shake, and the AWP scope is a static overlay. This design addresses all gaps from P0 (core experience) to P3 (polish).

## Overview

| Pri | Item | Approach | Key Files |
|-----|------|----------|-----------|
| P0 | Audio | Free sound library files (Freesound/Mixkit) for gunshots, footsteps, headshots, reloads | `AudioFeedback.ts`, new `AudioManager.ts` |
| P0 | Weapon Models | Flip `preferFallback: false` on 8 GLB assets, tune scale/material | `assets.ts`, `WeaponManager.ts` |
| P1 | Bullet Decals | Canvas-generated sprites per material type, 80-max pool with fade-out | new `ImpactDecal.ts` |
| P1 | Tracers | Thin colored line from muzzle to hit point, every 3rd bullet, 100ms lifetime | new `TracerSystem.ts` |
| P1 | Map Textures | PBR textures from ambientCG/Poly Haven for concrete, sand, metal, wood, tile, cobblestone | `MapData.ts`, `ProceduralTextures.ts` |
| P2 | Shell Casings | Simple kinematics (gravity + bounce), 20-max pool, per-weapon-type colors | new `ShellCasing.ts` |
| P2 | Screen Shake | Camera offset with decaying sinusoidal displacement on damage/explosion | new `ScreenShake.ts` |
| P3 | Scope Distortion | Fragment shader: chromatic aberration + vignette on scope overlay when ADS | `WeaponManager.ts`, new scope shader |

---

## P0: Audio — Free Sound Library

### Architecture

Replace `AudioFeedback.ts` tone synthesis with an `AudioManager` that loads and plays real audio files. Synthesized tones remain as fallback when files are still loading or missing.

```
AudioManager
├── load() — preload all audio buffers via fetch + decodeAudioData
├── play(id, options?) — play a named cue with volume/pitch/loop control
├── playFootstep(material) — material-aware footstep selection
└── playWeaponFire(weaponType) — per-category gunshot with pitch variation
```

### Audio Cues Required (~25 files)

**Weapons (8 files):** pistol_fire, heavy_pistol_fire, rifle_fire, smg_fire, shotgun_fire, sniper_fire, knife_swing, weapon_reload

**Hits (3 files):** hit_body, hit_head, kill

**Movement (4 files):** footstep_concrete, footstep_sand, footstep_metal, footstep_wood (fall back to concrete for missing materials)

**UI/Other (3 files):** weapon_empty, weapon_switch, land

Total: ~18 audio files, ~2-4 MB in `.ogg` (mono, 44.1kHz) stored under `client/public/assets/audio/`.

### API Changes

`AudioFeedback.ts` → renamed/refactored to `AudioManager.ts`:
- `trigger(id)` → `play(id)`
- New: `playFootstep(material: string)` selecting audio file by material name
- New: `playWeaponFire(category: string)` with random pitch variation (±5%)

### Files to Modify
- `client/src/game/AudioFeedback.ts` → refactor to `AudioManager.ts`
- All callers of audio triggers (WeaponManager, PlayerController, Enemy, HUD)

---

## P0: Weapon Models — Enable GLB

### Changes

In `assets.ts`, change 8 lines from `preferFallback: true` to `preferFallback: false`:

```
pistol, heavy_pistol, rifle, defender_rifle, sniper, smg, shotgun, knife
```

### Post-Enable Tuning

After GLB loads in first-person view, tune each definition's `scale`, `position`, and `rotation` so the model matches the viewport expectation. The `tuneMaterials()` function already handles metalness/roughness clamping.

### Risk

GLB files may have issues (missing textures, wrong orientation). The existing `safeLoadFallback()` catches load failures, so if a GLB fails, the procedural fallback still works. No regression risk.

---

## P1: Bullet Decals — Sprite-Based

### Design

```typescript
// ImpactDecal.ts
interface DecalInstance {
  sprite: THREE.Sprite;
  createdAt: number;
  material: string; // 'concrete' | 'metal' | 'wood' | 'sand' | 'default'
}

class ImpactDecalManager {
  private pool: DecalInstance[] = [];
  private maxDecals = 80;

  spawn(position: Vector3, normal: Vector3, material: string): void;
  private generateTexture(material: string): THREE.SpriteMaterial;
  update(dt: number): void; // fade and remove old decals
}
```

### Texture Generation (Canvas 2D)

Each material gets a 128×128 RGBA texture drawn once and cached:
- **concrete:** dark gray circle with radial cracks, slight noise
- **metal:** darker circle with scratch lines, brighter edge
- **wood:** brown circle with splinter lines
- **sand:** lighter circle with scattered particles
- **default:** generic dark circle

### Lifecycle

1. `spawn()`: place sprite at hit point, offset 0.02 units along surface normal, orient to face camera
2. `update()`: decals older than 15s begin fading (opacity -= dt * 0.15)
3. When pool exceeds 80, immediately remove oldest decal
4. Completely faded decals (opacity <= 0) are removed from scene and pool

### Integration Point

In `WeaponManager.ts` or `Scene.ts`, after a shot hits a surface, call `ImpactDecalManager.spawn(hitPoint, hitNormal, surfaceMaterial)`.

---

## P1: Tracers — Line System

### Design

```typescript
// TracerSystem.ts
interface TracerInstance {
  line: THREE.Line;
  createdAt: number;
  lifetime: number; // 0.08-0.12s
}

class TracerSystem {
  private pool: TracerInstance[] = [];
  private maxTracers = 30;

  spawn(from: Vector3, to: Vector3): void;
  update(dt: number): void;
}
```

### Visual Spec

- Color: `0xfff5c0` (warm white-yellow) with alpha gradient
- Line width: 0.015 units
- Geometry: `THREE.BufferGeometry` with 2 points (from → to), `THREE.LineBasicMaterial` with opacity
- Trigger: every 3rd bullet fired (counter in WeaponManager)
- Lifetime: 100ms, opacity decays linearly

### Integration

In the shooting path (WeaponManager or Scene), after muzzle flash, emit a tracer from muzzle position to hit point. For misses (no hit), trace to a far point along the ray direction.

---

## P1: Map Textures — PBR Materials

### Texture Set per Material

From ambientCG / Poly Haven, download 1K (1024×1024) tileable textures:

| Material | Maps Needed | Used On |
|----------|-------------|---------|
| concrete | color, normal, roughness | Dust2/Mirage floors, Train platforms, Nuke walls |
| sand | color, normal, roughness | Dust2 bombsite areas |
| metal | color, normal, roughness, metallic | Catwalks, doors, Train cars |
| wood | color, normal, roughness | Italy market stalls, Warehouse pallets |
| tile | color, normal, roughness | Inferno apartments, Italy interiors |
| cobblestone | color, normal, roughness | Inferno streets, Italy streets |
| brick | color, normal, roughness | Inferno/Mirage walls |
| plaster | color, roughness | Interior walls |

~8 material types, each ~2-6MB for 1K PBR set. Target total: 10-20 MB.

### Implementation

Modify `ProceduralTextures.ts` (or create `PBRTextures.ts`) to:
1. Load texture sets at game startup via `THREE.TextureLoader`
2. Set `wrapS/wrapT = RepeatWrapping` with appropriate repeat based on surface size
3. Apply to box collider materials via `MeshStandardMaterial.map`, `.roughnessMap`, `.normalMap`, `.metalnessMap`

### Fallback

If textures fail to load, fall back to procedural Canvas textures (keep existing `ProceduralTextures.ts` as fallback).

---

## P2: Shell Casings — Simple Physics

### Design

```typescript
// ShellCasing.ts
interface CasingInstance {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  age: number;
  grounded: boolean;
}

class ShellCasingManager {
  private pool: CasingInstance[] = [];
  private maxCasings = 20;

  spawn(position: Vector3, direction: Vector3, weaponType: string): void;
  update(dt: number): void;
}
```

### Physics (per-frame)

```
velocity.y -= 9.8 * dt;           // gravity
position += velocity * dt;         // linear motion
rotation += angularVelocity * dt;  // spin
if (position.y <= groundY) {       // simple ground collision
  position.y = groundY;
  velocity.y *= -0.3;              // bounce with damping
  velocity.x *= 0.7;               // friction
  velocity.z *= 0.7;
  if (abs(velocity.y) < 0.5) grounded = true;
}
```

### Spawn Parameters by Weapon Type

| Type | Eject Direction | Speed Range | Color | Size |
|------|----------------|-------------|-------|------|
| pistol | right + up | 1.5-2.5 | `#d4a843` (brass) | 0.04×0.12 |
| rifle | right + up | 2.0-3.5 | `#c9953a` (copper) | 0.045×0.16 |
| smg | right + up | 1.8-3.0 | `#c9953a` | 0.04×0.14 |
| shotgun | right + up | 2.5-4.0 | `#b8382b` (red shell) | 0.06×0.2 |
| sniper | right + up | 2.0-3.0 | `#d4a843` | 0.05×0.2 |

### Lifecycle
- Max 20 casings; exceeding removes oldest
- Auto-remove after 5 seconds
- Ground casings stop physics updates after settling

### Integration

In `WeaponManager.ts`, on each shot (non-knife), call `ShellCasingManager.spawn(ejectPosition, viewDirection, weaponCategory)`.

---

## P2: Screen Shake — Camera Offset

### Design

```typescript
// ScreenShake.ts
class ScreenShake {
  private intensity = 0;
  private duration = 0;
  private elapsed = 0;

  trigger(strength: number, durationMs: number): void;
  getOffset(): { x: number; y: number }; // called each frame, added to camera
}
```

### Algorithm

```
elapsed += dt;
if (elapsed >= duration) { intensity = 0; return {0, 0}; }
decay = 1 - (elapsed / duration);
currentIntensity = intensity * decay * decay; // quadratic falloff
x = sin(elapsed * freqX + seed) * currentIntensity * amplitudeX;
y = cos(elapsed * freqY + seed + 1.7) * currentIntensity * amplitudeY;
```

### Trigger Sources

| Event | Strength | Duration | Freq |
|-------|----------|----------|------|
| Player damaged (>20 dmg) | 0.008 | 200ms | 45Hz |
| Player damaged (<20 dmg) | 0.003 | 100ms | 60Hz |
| Nearby explosion | 0.020 | 500ms | 30Hz + decay |
| Flash grenade (close) | 0.010 | 300ms | 40Hz |

### Integration

Applied in the main render loop (Scene.ts or PlayerController.ts), adding offset to `camera.position` each frame. The offset is temporary — actual camera position doesn't change, only the rendered view.

---

## P3: Scope Distortion — Fragment Shader

### Design

When ADS with a sniper rifle, apply a custom shader over the scope view area (the circular scope overlay). The shader adds:

1. **Chromatic aberration:** shift R and B channels slightly outward from center (radial displacement)
2. **Vignette:** darken edges of the scope view
3. **Subtle barrel distortion:** slight magnification at center

### Shader Approach

Create a `ScopeDistortionPass` — a full-screen quad that only renders within the scope circle (using stencil or alpha mask from existing scope overlay). Fragment shader:

```glsl
// Pseudo-code for scope shader
varying vec2 vUv;
uniform float u_time;
uniform float u_distortionStrength; // 0.02 baseline

void main() {
  vec2 center = vUv - 0.5;
  float dist = length(center);

  // Chromatic aberration: shift R outward, B inward proportional to dist
  float rShift = dist * u_distortionStrength;
  float bShift = -dist * u_distortionStrength * 0.7;

  vec4 r = texture2D(tDiffuse, vUv + center * rShift);
  vec4 g = texture2D(tDiffuse, vUv);
  vec4 b = texture2D(tDiffuse, vUv + center * bShift);

  gl_FragColor = vec4(r.r, g.g, b.b, g.a);

  // Vignette
  gl_FragColor.rgb *= 1.0 - dist * 0.6;
}
```

### Integration

In `WeaponManager.ts` ADS state:
- When `isScoped` is true, enable `ScopeDistortionPass` (add to EffectComposer or apply as post-render overlay)
- When unscoped, disable the pass
- The pass reuses the existing scope mask/overlay to constrain the effect area

### Performance
- Single fullscreen quad, single texture lookup + 2 offset lookups
- Negligible GPU cost
- Only active during scoped ADS, which is <5% of gameplay time

---

## Implementation Order

```
Phase 1 (P0) — Audio + Weapon Models
Phase 2 (P1) — Bullet Decals + Tracers + Map Textures
Phase 3 (P2) — Shell Casings + Screen Shake
Phase 4 (P3) — Scope Distortion
```

Each phase is independently testable. After each phase: `npm run dev`, verify in browser, check console for errors.

## Verification

For each phase:
1. `npm run dev` — confirm no startup errors
2. Play through: walk, shoot walls, reload, switch weapons, take damage
3. Check browser console for audio decode errors, GLB load failures, shader compilation errors
4. Verify fallback paths work (audio → tone synth, GLB → procedural geometry, textures → Canvas fallback)

## Files Summary

| Action | File |
|--------|------|
| **Modify** | `client/src/game/assets.ts` — flip preferFallback |
| **Refactor** | `client/src/game/AudioFeedback.ts` → `AudioManager.ts` |
| **Modify** | `client/src/game/WeaponManager.ts` — integrate decals, tracers, casings, scope |
| **Modify** | `client/src/game/Scene.ts` — integrate screen shake, texture loading |
| **Modify** | `client/src/game/MapData.ts` — material texture references |
| **Modify** | `client/src/game/ProceduralTextures.ts` — PBR texture loading + Canvas fallback |
| **New** | `client/src/game/ImpactDecal.ts` — bullet hole sprite manager |
| **New** | `client/src/game/TracerSystem.ts` — bullet tracer line manager |
| **New** | `client/src/game/ShellCasing.ts` — shell casing physics |
| **New** | `client/src/game/ScreenShake.ts` — camera shake system |
| **New** | `client/src/game/shaders/ScopeDistortion.ts` — scope post-process shader |
| **New** | `client/public/assets/audio/` — audio files directory |
| **New** | `client/public/assets/textures/` — PBR texture files |
