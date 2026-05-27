# CS:GO Visual & Audio Feedback Enhancement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the game from silent-gray-box to immersive CS:GO-level visual/audio feedback across 8 systems (P0→P3).

**Architecture:** 4 phases, 8 independent systems. Each phase adds new systems in parallel files with minimal cross-system coupling. Integration happens in `main.ts` gameLoop and `WeaponManager.ts`. All systems follow pool-based lifecycle management (spawn → update → expire). Fallbacks guaranteed at every level (audio → tone synth, GLB → procedural geometry, PBR → Canvas textures).

**Tech Stack:** Three.js, Web Audio API, Canvas 2D, GLSL shaders, TypeScript

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `client/src/game/AudioManager.ts` | **New** | Audio file loading/playback/caching with fallback to synthesis |
| `client/src/game/AudioFeedback.ts` | **Modify** | Strip Web Audio synthesis; delegate to AudioManager; keep event API |
| `client/src/game/assets.ts` | **Modify** | Flip `preferFallback: false` on 8 weapon definitions |
| `client/src/game/ImpactDecal.ts` | **New** | Sprite-based bullet hole pool (80 max, material-specific textures) |
| `client/src/game/TracerSystem.ts` | **New** | Bullet tracer line pool (30 max, every 3rd bullet) |
| `client/src/game/ShellCasing.ts` | **New** | Shell casing physics pool (20 max, per-weapon-type) |
| `client/src/game/ScreenShake.ts` | **New** | Camera offset with decaying sinusoidal displacement |
| `client/src/game/shaders/ScopeDistortion.ts` | **New** | Fragment shader for scope chromatic aberration + vignette |
| `client/src/game/WeaponManager.ts` | **Modify** | Wire in decal/tracer/casing/scope systems |
| `client/src/game/Scene.ts` | **Modify** | Apply PBR textures to collider materials; integrate ScreenShake |
| `client/src/game/ProceduralTextures.ts` | **Modify** | Add PBR texture loading with Canvas fallback |
| `client/src/main.ts` | **Modify** | Wire in AudioManager, ScreenShake, ImpactDecal, TracerSystem, ShellCasing |
| `client/src/game/MapData.ts` | **Modify** | Add `textureKey` values to colliders referencing PBR material names |
| `client/public/assets/audio/` | **New** | ~18 .ogg audio files |
| `client/public/assets/textures/` | **New** | PBR texture sets (color/normal/roughness maps) |

---

## Phase 1: P0 — Audio + Weapon Models

### Task 1: Create AudioManager with file loading + playback

**Files:**
- Create: `client/src/game/AudioManager.ts`

- [ ] **Step 1: Write AudioManager class**

```typescript
// client/src/game/AudioManager.ts
export type AudioCueId =
  | 'pistol_fire' | 'heavy_pistol_fire' | 'rifle_fire' | 'smg_fire'
  | 'shotgun_fire' | 'sniper_fire' | 'knife_swing' | 'weapon_reload'
  | 'weapon_empty' | 'weapon_switch'
  | 'hit_body' | 'hit_head' | 'kill'
  | 'footstep_concrete' | 'footstep_sand' | 'footstep_metal' | 'footstep_wood'
  | 'land';

interface AudioBufferCache {
  [key: string]: AudioBuffer;
}

export class AudioManager {
  private context: AudioContext | null = null;
  private buffers: AudioBufferCache = {};
  private loaded = false;
  private masterGain: GainNode | null = null;

  async init(): Promise<void> {
    if (typeof window === 'undefined') return;
    const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtor) return;
    this.context = new AudioCtor();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0.8;
    this.masterGain.connect(this.context.destination);

    // Placeholder: audio files loaded later via loadFiles()
    // For now, synthesis fallback is always available
  }

  async loadFiles(fileMap: Record<string, string>): Promise<void> {
    if (!this.context) return;
    const entries = Object.entries(fileMap);
    const results = await Promise.allSettled(
      entries.map(async ([id, path]) => {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.context!.decodeAudioData(arrayBuffer);
        this.buffers[id] = audioBuffer;
      })
    );
    const loaded = results.filter(r => r.status === 'fulfilled').length;
    console.log(`[AudioManager] Loaded ${loaded}/${entries.length} audio files`);
    this.loaded = true;
  }

  play(id: string, options?: { volume?: number; pitch?: number }): void {
    if (!this.context || !this.masterGain) return;
    const buffer = this.buffers[id];
    if (buffer) {
      this.playBuffer(buffer, options);
    } else {
      this.playSynth(id, options);
    }
  }

  private playBuffer(buffer: AudioBuffer, options?: { volume?: number; pitch?: number }): void {
    if (!this.context || !this.masterGain) return;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = options?.pitch ?? 1 + (Math.random() - 0.5) * 0.1;
    const gain = this.context.createGain();
    gain.gain.value = (options?.volume ?? 0.7) * 0.6;
    source.connect(gain).connect(this.masterGain);
    source.start();
  }

  private playSynth(id: string, options?: { volume?: number; pitch?: number }): void {
    // Fallback: Web Audio synthesis matching old behavior
    if (!this.context || !this.masterGain) return;
    try {
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      const isHead = id.includes('head') || id === 'kill';
      const isFootstep = id.includes('footstep');
      const isReload = id === 'weapon_reload';
      const isEmpty = id === 'weapon_empty';

      osc.type = isHead ? 'triangle' : 'square';
      osc.frequency.value = isFootstep ? 90 : isReload ? 180 : isEmpty ? 220 : isHead ? 880 : 420;
      gain.gain.value = (options?.volume ?? 0.7) * 0.035;
      osc.connect(gain).connect(this.masterGain);
      osc.start();
      osc.stop(this.context.currentTime + (isReload ? 0.09 : 0.045));
    } catch { /* autoplay policy */ }
  }

  dispose(): void {
    this.context?.close();
    this.buffers = {};
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/game/AudioManager.ts
git commit -m "feat: add AudioManager with file playback and synth fallback"
```

---

### Task 2: Refactor AudioFeedback to delegate to AudioManager

**Files:**
- Modify: `client/src/game/AudioFeedback.ts`
- Modify: `client/src/main.ts` — instantiate AudioManager, pass to AudioFeedback

- [ ] **Step 1: Rewrite AudioFeedback to use AudioManager**

```typescript
// client/src/game/AudioFeedback.ts
import { HitRegion } from './Combat.js';

export type AudioCueType =
  | 'weapon:shoot' | 'weapon:empty' | 'weapon:reload'
  | 'hit:body' | 'hit:head' | 'kill'
  | 'footstep:run' | 'footstep:walk' | 'land';

export interface AudioCue { type: AudioCueType; label: string; intensity: number; }

export interface FootstepState {
  moving: boolean; walking: boolean; crouched: boolean; grounded: boolean;
}

// Map weapon IDs to audio cue file keys
const WEAPON_FIRE_SOUNDS: Record<string, string> = {
  pistol: 'pistol_fire', heavy_pistol: 'heavy_pistol_fire', deagle: 'heavy_pistol_fire',
  rifle: 'rifle_fire', defender_rifle: 'rifle_fire', ak47: 'rifle_fire',
  m4a1s: 'rifle_fire', m4a4: 'rifle_fire', famas: 'rifle_fire', galil: 'rifle_fire',
  sg553: 'rifle_fire', aug: 'rifle_fire',
  smg: 'smg_fire', mp9: 'smg_fire', mac10: 'smg_fire', mp7: 'smg_fire',
  ump45: 'smg_fire', p90: 'smg_fire',
  shotgun: 'shotgun_fire', nova: 'shotgun_fire', xm1014: 'shotgun_fire', mag7: 'shotgun_fire',
  sniper: 'sniper_fire', awp: 'sniper_fire', ssg08: 'sniper_fire',
  knife: 'knife_swing',
};

export class AudioFeedback {
  private lastFootstepAt = 0;

  constructor(private audioManager: { play: (id: string, opts?: { volume?: number; pitch?: number }) => void }) {}

  playWeapon(type: 'shoot' | 'empty' | 'reload', weaponId: string): void {
    if (type === 'shoot') {
      const soundKey = WEAPON_FIRE_SOUNDS[weaponId] ?? 'rifle_fire';
      this.audioManager.play(soundKey, { volume: 0.42 });
    } else if (type === 'empty') {
      this.audioManager.play('weapon_empty', { volume: 0.24 });
    } else if (type === 'reload') {
      this.audioManager.play('weapon_reload', { volume: 0.30 });
    }
  }

  playHit(region: HitRegion): void {
    if (region === 'head') {
      this.audioManager.play('hit_head', { volume: 0.46 });
    } else {
      this.audioManager.play('hit_body', { volume: 0.30 });
    }
  }

  playKill(): void { this.audioManager.play('kill', { volume: 0.55 }); }

  playLand(speed: number): void {
    if (speed < 2.2) return;
    this.audioManager.play('land', { volume: Math.min(0.5, speed / 18) });
  }

  playFootstep(state: FootstepState, now: number = performance.now()): void {
    if (!state.moving || !state.grounded || state.crouched) return;
    const interval = state.walking ? 430 : 310;
    if (now - this.lastFootstepAt < interval) return;
    this.lastFootstepAt = now;
    this.audioManager.play(state.walking ? 'footstep_concrete' : 'footstep_concrete', { volume: state.walking ? 0.16 : 0.28 });
  }
}
```

- [ ] **Step 2: Update main.ts to create AudioManager**

In `client/src/main.ts`, replace the existing `AudioFeedback` instantiation:

```typescript
// OLD:
import { AudioFeedback } from './game/AudioFeedback.js';
const audioFeedback = new AudioFeedback();

// NEW:
import { AudioFeedback } from './game/AudioFeedback.js';
import { AudioManager } from './game/AudioManager.js';

const audioManager = new AudioManager();
const audioFeedback = new AudioFeedback(audioManager);

// After game init, start loading audio files:
audioManager.init().then(() => {
  audioManager.loadFiles({
    pistol_fire: '/assets/audio/pistol_fire.ogg',
    heavy_pistol_fire: '/assets/audio/heavy_pistol_fire.ogg',
    rifle_fire: '/assets/audio/rifle_fire.ogg',
    smg_fire: '/assets/audio/smg_fire.ogg',
    shotgun_fire: '/assets/audio/shotgun_fire.ogg',
    sniper_fire: '/assets/audio/sniper_fire.ogg',
    knife_swing: '/assets/audio/knife_swing.ogg',
    weapon_reload: '/assets/audio/weapon_reload.ogg',
    weapon_empty: '/assets/audio/weapon_empty.ogg',
    weapon_switch: '/assets/audio/weapon_switch.ogg',
    hit_body: '/assets/audio/hit_body.ogg',
    hit_head: '/assets/audio/hit_head.ogg',
    kill: '/assets/audio/kill.ogg',
    footstep_concrete: '/assets/audio/footstep_concrete.ogg',
    footstep_sand: '/assets/audio/footstep_sand.ogg',
    footstep_metal: '/assets/audio/footstep_metal.ogg',
    footstep_wood: '/assets/audio/footstep_wood.ogg',
    land: '/assets/audio/land.ogg',
  });
});
```

- [ ] **Step 3: Commit**

```bash
git add client/src/game/AudioFeedback.ts client/src/main.ts
git commit -m "refactor: delegate AudioFeedback to AudioManager with file playback"
```

---

### Task 3: Enable GLB weapon models

**Files:**
- Modify: `client/src/game/assets.ts`

- [ ] **Step 1: Flip preferFallback on all 8 weapon definitions**

In `client/src/game/assets.ts`, change `preferFallback: true` to `preferFallback: false` on these definitions: `pistol`, `heavy_pistol`, `rifle`, `defender_rifle`, `sniper`, `smg`, `shotgun`, `knife`.

Use replace_all or 8 individual edits.

- [ ] **Step 2: Verify no startup errors**

Run: `npm run dev`
Expected: Game starts without GLB load errors. Weapons render as GLB models. Fallback works if GLB fails.

- [ ] **Step 3: Tune weapon model transforms if needed**

After visual inspection, adjust `scale`, `position`, `rotation` on each definition in `assets.ts` so first-person view looks correct. The `tuneMaterials()` function already handles metalness/roughness.

- [ ] **Step 4: Commit**

```bash
git add client/src/game/assets.ts
git commit -m "feat: enable GLB weapon models (preferFallback=false)"
```

---

## Phase 2: P1 — Bullet Decals + Tracers + Map Textures

### Task 4: Create ImpactDecal system

**Files:**
- Create: `client/src/game/ImpactDecal.ts`

- [ ] **Step 1: Write ImpactDecalManager**

```typescript
// client/src/game/ImpactDecal.ts
import * as THREE from 'three';

interface DecalInstance {
  sprite: THREE.Sprite;
  createdAt: number;
  material: string;
}

const DECAL_LIFETIME = 15; // seconds before fade starts
const MAX_DECALS = 80;

const materialTextureCache = new Map<string, THREE.SpriteMaterial>();

function generateDecalTexture(surfaceMaterial: string): THREE.SpriteMaterial {
  if (materialTextureCache.has(surfaceMaterial)) {
    return materialTextureCache.get(surfaceMaterial)!.clone();
  }

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Transparent background
  ctx.clearRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;

  // Bullet hole — dark center with material-specific coloring
  const baseColor = surfaceMaterial === 'concrete' ? '100,95,85' :
    surfaceMaterial === 'metal' ? '40,40,45' :
    surfaceMaterial === 'wood' ? '80,50,30' :
    surfaceMaterial === 'sand' ? '140,120,80' :
    '60,60,65';

  // Outer ring (displaced material)
  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${baseColor}, 0.75)`;
  ctx.fill();

  // Inner hole
  const gradient = ctx.createRadialGradient(cx, cy, 4, cx, cy, 12);
  gradient.addColorStop(0, 'rgba(0,0,0,0.95)');
  gradient.addColorStop(0.5, 'rgba(10,10,10,0.85)');
  gradient.addColorStop(1, `rgba(${baseColor}, 0.3)`);
  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Radial cracks
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1.2;
  const crackCount = 4 + Math.floor(Math.random() * 4);
  for (let i = 0; i < crackCount; i++) {
    const angle = (i / crackCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const length = 14 + Math.random() * 16;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * 8, cy + Math.sin(angle) * 8);
    const endX = cx + Math.cos(angle) * length;
    const endY = cy + Math.sin(angle) * length;
    const midX = cx + Math.cos(angle) * length * 0.6 + (Math.random() - 0.5) * 6;
    const midY = cy + Math.sin(angle) * length * 0.6 + (Math.random() - 0.5) * 6;
    ctx.quadraticCurveTo(midX, midY, endX, endY);
    ctx.stroke();
  }

  // Scorch mark
  ctx.beginPath();
  ctx.arc(cx, cy, 16, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(20,18,15,0.25)';
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: true,
  });
  materialTextureCache.set(surfaceMaterial, material);
  return material.clone();
}

export class ImpactDecalManager {
  private decals: DecalInstance[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  spawn(position: THREE.Vector3, normal: THREE.Vector3, surfaceMaterial: string = 'concrete'): void {
    const material = generateDecalTexture(surfaceMaterial);
    const sprite = new THREE.Sprite(material);
    // Offset slightly along surface normal to avoid z-fighting
    sprite.position.copy(position).addScaledVector(normal, 0.03);
    sprite.scale.set(1.2, 1.2, 1);
    // Orient to face along the normal
    sprite.lookAt(position.clone().add(normal));

    this.decals.push({ sprite, createdAt: performance.now() / 1000, material: surfaceMaterial });
    this.scene.add(sprite);

    // Enforce pool limit
    while (this.decals.length > MAX_DECALS) {
      const oldest = this.decals.shift()!;
      this.scene.remove(oldest.sprite);
      oldest.sprite.material.map?.dispose();
      oldest.sprite.material.dispose();
    }
  }

  update(now: number): void {
    const currentTime = now / 1000;
    for (let i = this.decals.length - 1; i >= 0; i--) {
      const decal = this.decals[i];
      const age = currentTime - decal.createdAt;
      if (age > DECAL_LIFETIME) {
        const fadeProgress = (age - DECAL_LIFETIME) / 3; // 3s fade
        decal.sprite.material.opacity = Math.max(0, 1 - fadeProgress);
        if (fadeProgress >= 1) {
          this.scene.remove(decal.sprite);
          decal.sprite.material.map?.dispose();
          decal.sprite.material.dispose();
          this.decals.splice(i, 1);
        }
      }
    }
  }

  dispose(): void {
    this.decals.forEach(d => {
      this.scene.remove(d.sprite);
      d.sprite.material.map?.dispose();
      d.sprite.material.dispose();
    });
    this.decals = [];
    materialTextureCache.forEach(m => { m.map?.dispose(); m.dispose(); });
    materialTextureCache.clear();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/game/ImpactDecal.ts
git commit -m "feat: add ImpactDecal system with material-specific bullet holes"
```

---

### Task 5: Create TracerSystem

**Files:**
- Create: `client/src/game/TracerSystem.ts`

- [ ] **Step 1: Write TracerSystem**

```typescript
// client/src/game/TracerSystem.ts
import * as THREE from 'three';

interface TracerInstance {
  line: THREE.Line;
  createdAt: number;
  lifetime: number;
}

const MAX_TRACERS = 30;
const TRACER_LIFETIME = 0.1; // 100ms

export class TracerSystem {
  private tracers: TracerInstance[] = [];
  private scene: THREE.Scene;
  private tracerMaterial: THREE.LineBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.tracerMaterial = new THREE.LineBasicMaterial({
      color: 0xfff5c0,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
  }

  spawn(from: THREE.Vector3, to: THREE.Vector3): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array([
      from.x, from.y, from.z,
      to.x, to.y, to.z,
    ]);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const line = new THREE.Line(geometry, this.tracerMaterial.clone());
    this.tracers.push({ line, createdAt: performance.now() / 1000, lifetime: TRACER_LIFETIME });
    this.scene.add(line);

    while (this.tracers.length > MAX_TRACERS) {
      const oldest = this.tracers.shift()!;
      this.scene.remove(oldest.line);
      oldest.line.geometry.dispose();
      (oldest.line.material as THREE.Material).dispose();
    }
  }

  update(now: number): void {
    const currentTime = now / 1000;
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const tracer = this.tracers[i];
      const age = currentTime - tracer.createdAt;
      const ratio = age / tracer.lifetime;
      if (ratio >= 1) {
        this.scene.remove(tracer.line);
        tracer.line.geometry.dispose();
        (tracer.line.material as THREE.Material).dispose();
        this.tracers.splice(i, 1);
      } else {
        (tracer.line.material as THREE.LineBasicMaterial).opacity = 0.7 * (1 - ratio);
      }
    }
  }

  dispose(): void {
    this.tracers.forEach(t => {
      this.scene.remove(t.line);
      t.line.geometry.dispose();
      (t.line.material as THREE.Material).dispose();
    });
    this.tracers = [];
    this.tracerMaterial.dispose();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/game/TracerSystem.ts
git commit -m "feat: add TracerSystem for bullet tracer lines"
```

---

### Task 6: Wire ImpactDecal + TracerSystem into WeaponManager and main.ts

**Files:**
- Modify: `client/src/game/WeaponManager.ts` — add `shootImpact`, `tracerCount`, `getMuzzlePosition()`
- Modify: `client/src/main.ts` — instantiate ImpactDecalManager, TracerSystem; call from hit handling

- [ ] **Step 1: Add tracer counter and muzzle position to WeaponManager**

In `client/src/game/WeaponManager.ts`:

```typescript
// Add field:
private shotCounter = 0;

// Add method:
getMuzzleWorldPosition(): THREE.Vector3 {
  const muzzleLocal = new THREE.Vector3(0, 0.03, -0.92);
  return muzzleLocal.applyMatrix4(this.weaponRoot.matrixWorld);
}

shouldSpawnTracer(): boolean {
  this.shotCounter++;
  if (this.shotCounter % 3 === 0) {
    this.shotCounter = 0;
    return true;
  }
  return false;
}
```

- [ ] **Step 2: In main.ts gameLoop, integrate decals and tracers after shooting**

After the existing shoot handling code in `gameLoop()`, add:

```typescript
// After a shot hits something (in the hit detection path):
// ImpactDecal: spawn at hit point
impactDecalManager.spawn(hitPoint, hitNormal, surfaceMaterial ?? 'concrete');

// Tracer: every 3rd bullet
if (weaponManager.shouldSpawnTracer()) {
  const muzzlePos = weaponManager.getMuzzleWorldPosition(scene.getCamera());
  tracerSystem.spawn(muzzlePos, hitPoint);
}
```

Add these to the main.ts imports and instantiation:

```typescript
import { ImpactDecalManager } from './game/ImpactDecal.js';
import { TracerSystem } from './game/TracerSystem.js';

const impactDecalManager = new ImpactDecalManager(scene.getScene());
const tracerSystem = new TracerSystem(scene.getScene());
```

Add to gameLoop update section:

```typescript
impactDecalManager.update(now);
tracerSystem.update(now);
```

- [ ] **Step 3: Commit**

```bash
git add client/src/game/WeaponManager.ts client/src/main.ts
git commit -m "feat: integrate ImpactDecal and TracerSystem into game loop"
```

---

### Task 7: Add PBR texture loading to ProceduralTextures

**Files:**
- Modify: `client/src/game/ProceduralTextures.ts`
- Modify: `client/src/game/MapData.ts` — add missing textureKey values to colliders
- Modify: `client/src/game/Scene.ts` — apply PBR maps in `addBox()`

- [ ] **Step 1: Extend ProceduralTextures with PBR loading**

Add to `client/src/game/ProceduralTextures.ts`:

```typescript
// New type for PBR material keys
export type PBRTextureKey = 'sand' | 'concrete' | 'wood' | 'metal' | 'plaster' | 'tile' | 'cobblestone' | 'brick';

const pbrCache = new Map<string, { map: THREE.Texture; normalMap?: THREE.Texture; roughnessMap?: THREE.Texture }>();
const textureLoader = new THREE.TextureLoader();

function wrapTexture(tex: THREE.Texture, repeatX: number, repeatY: number): THREE.Texture {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function wrapNonColorTexture(tex: THREE.Texture, repeatX: number, repeatY: number): THREE.Texture {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.LinearSRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export async function loadPBRTextureSet(
  key: PBRTextureKey,
  basePath: string,
  repeatX: number = 1,
  repeatY: number = 1
): Promise<{ map: THREE.Texture; normalMap?: THREE.Texture; roughnessMap?: THREE.Texture } | null> {
  if (pbrCache.has(key)) {
    const cached = pbrCache.get(key)!;
    // Clone and re-wrap for this specific usage
    return {
      map: cached.map.clone(),
      normalMap: cached.normalMap?.clone(),
      roughnessMap: cached.roughnessMap?.clone(),
    };
  }

  try {
    const colorResponse = await fetch(`${basePath}/${key}_color.jpg`);
    if (!colorResponse.ok) throw new Error('PBR texture not found');
    const colorBlob = await colorResponse.blob();
    const colorUrl = URL.createObjectURL(colorBlob);

    const map = wrapTexture(textureLoader.load(colorUrl), repeatX, repeatY);

    let normalMap: THREE.Texture | undefined;
    let roughnessMap: THREE.Texture | undefined;

    try {
      const normalResponse = await fetch(`${basePath}/${key}_normal.jpg`);
      if (normalResponse.ok) {
        const nBlob = await normalResponse.blob();
        const nUrl = URL.createObjectURL(nBlob);
        normalMap = wrapNonColorTexture(textureLoader.load(nUrl), repeatX, repeatY);
      }
    } catch { /* normal map optional */ }

    try {
      const roughResponse = await fetch(`${basePath}/${key}_roughness.jpg`);
      if (roughResponse.ok) {
        const rBlob = await roughResponse.blob();
        const rUrl = URL.createObjectURL(rBlob);
        roughnessMap = wrapNonColorTexture(textureLoader.load(rUrl), repeatX, repeatY);
      }
    } catch { /* roughness map optional */ }

    // Cache the original textures
    pbrCache.set(key, { map: map.clone(), normalMap: normalMap?.clone(), roughnessMap: roughnessMap?.clone() });
    // Clean up blob URLs after a short delay (textures are now in GPU memory)
    setTimeout(() => { URL.revokeObjectURL(colorUrl); }, 5000);

    return { map, normalMap, roughnessMap };
  } catch {
    // Fall back to Canvas procedural texture
    return null;
  }
}

export function getPBRFallback(key: PBRTextureKey): THREE.Texture {
  const canvasKey = key === 'tile' || key === 'cobblestone' || key === 'brick' ? 'concrete' as TextureKey : key as TextureKey;
  return getTexture(canvasKey);
}
```

- [ ] **Step 2: Update Scene.ts addBox() to use PBR textures**

In `client/src/game/Scene.ts:addBox()`, modify the texture application section:

```typescript
private addBox(spec: BoxSpec): void {
  let materialProps: any = {
    color: new THREE.Color(spec.color).lerp(new THREE.Color(0xffffff), 0.14),
    metalness: spec.metalness ?? 0.2,
    roughness: spec.roughness ?? 0.6,
    transparent: spec.opacity !== undefined && spec.opacity < 1,
    opacity: spec.opacity ?? 1,
  };

  if (spec.textureKey) {
    // Try PBR first, fall back to Canvas procedural
    const pbrKey = spec.textureKey as PBRTextureKey;
    const tileX = Math.max(1, Math.round(spec.size.x / 1.5));
    const tileY = Math.max(1, Math.round(spec.size.z / 1.5));

    loadPBRTextureSet(pbrKey, '/assets/textures', tileX, tileY).then(pbrSet => {
      if (pbrSet) {
        mesh.material.map = pbrSet.map;
        mesh.material.normalMap = pbrSet.normalMap;
        mesh.material.roughnessMap = pbrSet.roughnessMap;
        mesh.material.color.set(0xffffff);
        mesh.material.needsUpdate = true;
      } else {
        // Fallback: use Canvas procedural
        const canvasTex = getPBRFallback(pbrKey);
        mesh.material.map = canvasTex.clone();
        mesh.material.map.repeat.set(tileX, tileY);
        mesh.material.map.needsUpdate = true;
        mesh.material.needsUpdate = true;
      }
    });
  }

  // ... rest of existing addBox code
}
```

- [ ] **Step 3: Add missing textureKey to MapData colliders**

Audit `Dust2Layout.ts` and other layout files. Add `textureKey` to colliders that lack it:

```typescript
// Example: in Dust2Layout.ts, add textureKey to colliders:
{ ..., textureKey: 'sand' }       // bombsite floors, sandy areas
{ ..., textureKey: 'concrete' }   // walls, platforms
{ ..., textureKey: 'metal' }      // catwalks, doors, railings
{ ..., textureKey: 'wood' }       // crates
```

- [ ] **Step 4: Commit**

```bash
git add client/src/game/ProceduralTextures.ts client/src/game/Scene.ts client/src/game/MapData.ts client/src/game/Dust2Layout.ts
git commit -m "feat: add PBR texture loading with Canvas fallback to map system"
```

---

## Phase 3: P2 — Shell Casings + Screen Shake

### Task 8: Create ShellCasing system

**Files:**
- Create: `client/src/game/ShellCasing.ts`

- [ ] **Step 1: Write ShellCasingManager**

```typescript
// client/src/game/ShellCasing.ts
import * as THREE from 'three';

interface CasingInstance {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  age: number;
  grounded: boolean;
}

const MAX_CASINGS = 20;
const CASING_LIFETIME = 5; // seconds
const GRAVITY = 9.8;
const GROUND_Y = 0.05;

const casingGeometries: Record<string, THREE.CylinderGeometry> = {
  pistol: new THREE.CylinderGeometry(0.02, 0.02, 0.12, 8),
  rifle: new THREE.CylinderGeometry(0.022, 0.022, 0.16, 8),
  smg: new THREE.CylinderGeometry(0.02, 0.02, 0.14, 8),
  shotgun: new THREE.CylinderGeometry(0.03, 0.03, 0.20, 8),
  sniper: new THREE.CylinderGeometry(0.025, 0.025, 0.20, 8),
};

const casingColors: Record<string, number> = {
  pistol: 0xd4a843,
  rifle: 0xc9953a,
  smg: 0xc9953a,
  shotgun: 0xb8382b,
  sniper: 0xd4a843,
};

function createCasingMesh(weaponType: string): THREE.Mesh {
  const geometry = casingGeometries[weaponType] ?? casingGeometries.rifle;
  const color = casingColors[weaponType] ?? casingColors.rifle;
  const material = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.8,
    roughness: 0.35,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

export class ShellCasingManager {
  private casings: CasingInstance[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  spawn(position: THREE.Vector3, viewDirection: THREE.Vector3, weaponType: string): void {
    const mesh = createCasingMesh(weaponType);
    mesh.position.copy(position);

    // Eject to the right and up relative to view direction
    const right = new THREE.Vector3().crossVectors(viewDirection, new THREE.Vector3(0, 1, 0)).normalize();
    const ejectDir = new THREE.Vector3()
      .addScaledVector(right, 1.0)
      .addScaledVector(new THREE.Vector3(0, 1, 0), 0.6)
      .addScaledVector(viewDirection, -0.2)
      .normalize();

    const speed = weaponType === 'shotgun' ? 2.5 + Math.random() * 1.5 :
      weaponType === 'rifle' ? 2.0 + Math.random() * 1.5 :
      1.5 + Math.random() * 1.0;

    const velocity = ejectDir.clone().multiplyScalar(speed);
    const angularVelocity = new THREE.Vector3(
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 12,
    );

    this.casings.push({ mesh, position: position.clone(), velocity, angularVelocity, age: 0, grounded: false });
    this.scene.add(mesh);

    while (this.casings.length > MAX_CASINGS) {
      const oldest = this.casings.shift()!;
      this.scene.remove(oldest.mesh);
      (oldest.mesh.material as THREE.Material).dispose();
    }
  }

  update(dt: number): void {
    for (let i = this.casings.length - 1; i >= 0; i--) {
      const casing = this.casings[i];
      casing.age += dt;

      if (casing.age > CASING_LIFETIME) {
        this.scene.remove(casing.mesh);
        (casing.mesh.material as THREE.Material).dispose();
        this.casings.splice(i, 1);
        continue;
      }

      if (!casing.grounded) {
        casing.velocity.y -= GRAVITY * dt;
        casing.position.addScaledVector(casing.velocity, dt);
        casing.mesh.rotation.x += casing.angularVelocity.x * dt;
        casing.mesh.rotation.y += casing.angularVelocity.y * dt;
        casing.mesh.rotation.z += casing.angularVelocity.z * dt;

        if (casing.position.y <= GROUND_Y) {
          casing.position.y = GROUND_Y;
          casing.velocity.y *= -0.3;
          casing.velocity.x *= 0.7;
          casing.velocity.z *= 0.7;
          if (Math.abs(casing.velocity.y) < 0.5) {
            casing.grounded = true;
            casing.velocity.set(0, 0, 0);
          }
        }
      }

      casing.mesh.position.copy(casing.position);
    }
  }

  dispose(): void {
    this.casings.forEach(c => {
      this.scene.remove(c.mesh);
      (c.mesh.material as THREE.Material).dispose();
    });
    this.casings = [];
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/game/ShellCasing.ts
git commit -m "feat: add ShellCasing system with physics and per-weapon-type meshes"
```

---

### Task 9: Create ScreenShake system

**Files:**
- Create: `client/src/game/ScreenShake.ts`

- [ ] **Step 1: Write ScreenShake class**

```typescript
// client/src/game/ScreenShake.ts
export class ScreenShake {
  private intensity = 0;
  private duration = 0;
  private elapsed = 0;
  private seed: number;

  constructor() {
    this.seed = Math.random() * 100;
  }

  trigger(strength: number, durationMs: number): void {
    if (strength > this.intensity || this.elapsed >= this.duration) {
      this.intensity = strength;
      this.duration = durationMs / 1000;
      this.elapsed = 0;
      this.seed = Math.random() * 100;
    }
  }

  getOffset(): { x: number; y: number } {
    if (this.elapsed >= this.duration) {
      return { x: 0, y: 0 };
    }

    const decay = 1 - this.elapsed / this.duration;
    const currentIntensity = this.intensity * decay * decay;
    const freqX = 42;
    const freqY = 55;
    const amplitudeX = 1.0;
    const amplitudeY = 0.8;

    const x = Math.sin(this.elapsed * freqX + this.seed) * currentIntensity * amplitudeX;
    const y = Math.cos(this.elapsed * freqY + this.seed + 1.7) * currentIntensity * amplitudeY;

    return { x, y };
  }

  update(dt: number): void {
    this.elapsed += dt;
  }

  // Convenience presets
  static presets = {
    damageSmall:  { strength: 0.003, duration: 100 },
    damageMedium: { strength: 0.008, duration: 200 },
    explosion:    { strength: 0.020, duration: 500 },
    flashbang:    { strength: 0.010, duration: 300 },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/game/ScreenShake.ts
git commit -m "feat: add ScreenShake system with decay-based camera offset"
```

---

### Task 10: Integrate ShellCasing + ScreenShake into game loop

**Files:**
- Modify: `client/src/main.ts` — instantiate, wire update loop
- Modify: `client/src/game/WeaponManager.ts` — expose casing eject position

- [ ] **Step 1: Wire ShellCasing into WeaponManager shoot path**

In `client/src/game/WeaponManager.ts`, add:

```typescript
getEjectPosition(): THREE.Vector3 {
  const ejectLocal = new THREE.Vector3(0.15, -0.02, -0.5);
  return ejectLocal.applyMatrix4(this.weaponRoot.matrixWorld);
}
```

- [ ] **Step 2: In main.ts, instantiate and update ShellCasingManager + ScreenShake**

Add to main.ts:

```typescript
import { ShellCasingManager } from './game/ShellCasing.js';
import { ScreenShake } from './game/ScreenShake.js';

const shellCasingManager = new ShellCasingManager(scene.getScene());
const screenShake = new ScreenShake();
```

In gameLoop update:

```typescript
shellCasingManager.update(dt);
screenShake.update(dt);

// After each shot (non-melee), spawn casing:
if (shootResult && !shootResult.isMelee) {
  const weaponType = weaponManager.getCurrentWeapon().weaponCategory ?? 'rifle';
  const ejectPos = weaponManager.getEjectPosition(scene.getCamera());
  shellCasingManager.spawn(ejectPos, shootResult.direction, weaponType);
}

// After player takes damage:
screenShake.trigger(ScreenShake.presets.damageMedium.strength, ScreenShake.presets.damageMedium.duration);

// Apply screen shake offset to camera each frame (before rendering):
const shakeOffset = screenShake.getOffset();
const camera = scene.getCamera();
camera.position.x += shakeOffset.x;
camera.position.y += shakeOffset.y;
// ... render ...
camera.position.x -= shakeOffset.x;
camera.position.y -= shakeOffset.y;
```

- [ ] **Step 3: Commit**

```bash
git add client/src/main.ts client/src/game/WeaponManager.ts
git commit -m "feat: integrate ShellCasing and ScreenShake into game loop"
```

---

## Phase 4: P3 — Scope Distortion

### Task 11: Create scope distortion shader

**Files:**
- Create: `client/src/game/shaders/ScopeDistortion.ts`

- [ ] **Step 1: Write ScopeDistortion shader pass**

```typescript
// client/src/game/shaders/ScopeDistortion.ts
import * as THREE from 'three';

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D tDiffuse;
  uniform float u_distortionStrength;
  uniform float u_time;
  uniform float u_scopeRadius;   // radius of scope circle in UV space
  uniform vec2 u_scopeCenter;    // center of scope in UV space

  void main() {
    vec2 center = vUv - u_scopeCenter;
    float dist = length(center);
    float distNorm = dist / u_scopeRadius;

    // Chromatic aberration: radial shift of R and B channels
    float rShift = distNorm * u_distortionStrength * 0.015;
    float bShift = -distNorm * u_distortionStrength * 0.010;

    vec4 r = texture2D(tDiffuse, vUv + normalize(center + 0.001) * rShift);
    vec4 g = texture2D(tDiffuse, vUv);
    vec4 b = texture2D(tDiffuse, vUv + normalize(center + 0.001) * bShift);

    vec4 color = vec4(r.r, g.g, b.b, 1.0);

    // Vignette: darken toward edges of scope circle
    float vignette = 1.0 - smoothstep(0.5, 1.0, distNorm) * 0.55;

    color.rgb *= vignette;

    // Fully transparent outside scope
    float alpha = 1.0 - smoothstep(0.85, 1.0, distNorm);
    color.a = alpha;

    gl_FragColor = color;
  }
`;

export class ScopeDistortionPass {
  private material: THREE.ShaderMaterial;
  private quad: THREE.Mesh;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private enabled = false;

  constructor() {
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        tDiffuse: { value: null },
        u_distortionStrength: { value: 0.6 },
        u_time: { value: 0 },
        u_scopeRadius: { value: 0.35 },
        u_scopeCenter: { value: new THREE.Vector2(0.5, 0.5) },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });

    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.scene = new THREE.Scene();
    this.scene.add(this.quad);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  enable(): void { this.enabled = true; }
  disable(): void { this.enabled = false; }
  isEnabled(): boolean { return this.enabled; }

  render(renderer: THREE.WebGLRenderer, sourceTexture: THREE.Texture, time: number): void {
    if (!this.enabled) return;
    this.material.uniforms.tDiffuse.value = sourceTexture;
    this.material.uniforms.u_time.value = time;
    renderer.render(this.scene, this.camera);
  }

  setDistortionStrength(value: number): void {
    this.material.uniforms.u_distortionStrength.value = value;
  }

  dispose(): void {
    this.material.dispose();
    this.quad.geometry.dispose();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/game/shaders/ScopeDistortion.ts
git commit -m "feat: add scope distortion shader with chromatic aberration and vignette"
```

---

### Task 12: Integrate scope distortion into WeaponManager and render pipeline

**Files:**
- Modify: `client/src/game/WeaponManager.ts` — expose scope state
- Modify: `client/src/game/Scene.ts` — add render-to-texture + scope pass
- Modify: `client/src/main.ts` — wire scope pass into render loop

- [ ] **Step 1: Apply scope pass in Scene render**

In `client/src/game/Scene.ts`, add render target and scope pass:

```typescript
import { ScopeDistortionPass } from './shaders/ScopeDistortion.js';

private scopePass: ScopeDistortionPass;
private renderTarget: THREE.WebGLRenderTarget;

// In constructor:
this.scopePass = new ScopeDistortionPass();
this.renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);

// In render method, when scoped:
render(weaponManager: WeaponManager): void {
  if (!this.renderer) return;

  if (weaponManager.isScoped()) {
    // Render scene to texture
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);

    // Apply scope distortion on top
    this.scopePass.enable();
    this.scopePass.render(this.renderer, this.renderTarget.texture, performance.now() / 1000);
    // Also render weapon overlay on top (without scope distortion)
    // ... render weapon model separately
  } else {
    this.scopePass.disable();
    this.renderer.render(this.scene, this.camera);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/game/Scene.ts client/src/game/WeaponManager.ts client/src/main.ts
git commit -m "feat: integrate scope distortion pass into render pipeline"
```

---

## Verification Checklist

After each phase, run:

```bash
npm run dev
```

Then test in browser:

**Phase 1 (P0):**
- [ ] Shoot pistol, rifle, sniper — each plays distinct fire sound (or synth fallback)
- [ ] Footsteps play when moving on ground
- [ ] Headshot plays distinct sound
- [ ] Weapons render as GLB models (not procedural boxes)
- [ ] Switch weapons — model changes smoothly

**Phase 2 (P1):**
- [ ] Shoot a wall — bullet hole decal appears, matches surface material
- [ ] After 80+ bullet holes, oldest ones fade and disappear
- [ ] Every 3rd bullet shows tracer line from muzzle to hit point
- [ ] Tracers fade out over ~100ms
- [ ] Maps show PBR textures on surfaces; fallback Canvas textures if PBR not loaded

**Phase 3 (P2):**
- [ ] Shell casings eject from weapon when shooting (non-melee)
- [ ] Casings bounce on ground, settle, disappear after 5s
- [ ] Shotgun shells are red, rifle shells copper-colored
- [ ] Screen shakes on taking damage
- [ ] Stronger screen shake on nearby explosions

**Phase 4 (P3):**
- [ ] Scoping in with sniper (AWP) shows chromatic aberration on scope edges
- [ ] Vignette darkens toward edge of scope circle
- [ ] Unscoping removes the effect cleanly

**Final integration:**
- [ ] `npm run build` succeeds with no TypeScript errors
- [ ] `npm run test` passes (vitest)
- [ ] No console errors in browser during gameplay
