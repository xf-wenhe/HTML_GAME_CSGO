import * as THREE from 'three';

export type PBRTextureKey = 'sand' | 'concrete' | 'wood' | 'metal' | 'plaster' | 'tile' | 'cobblestone' | 'brick';

export type TextureKey = 'sand' | 'concrete' | 'wood' | 'metal' | 'plaster';

const cache = new Map<TextureKey, THREE.Texture>();

function makeTexture(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

function noise(ctx: CanvasRenderingContext2D, s: number, alpha: number): void {
  const id = ctx.getImageData(0, 0, s, s);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = (Math.random() - 0.5) * 40;
    id.data[i] = Math.max(0, Math.min(255, id.data[i] + v));
    id.data[i + 1] = Math.max(0, Math.min(255, id.data[i + 1] + v));
    id.data[i + 2] = Math.max(0, Math.min(255, id.data[i + 2] + v));
    id.data[i + 3] = Math.round(id.data[i + 3] * alpha + id.data[i + 3] * (1 - alpha));
  }
  ctx.putImageData(id, 0, 0);
}

function buildSand(ctx: CanvasRenderingContext2D, s: number): void {
  // Base gradient
  const g = ctx.createLinearGradient(0, 0, s, s);
  g.addColorStop(0, '#c8a86a');
  g.addColorStop(0.5, '#d4b87a');
  g.addColorStop(1, '#c09858');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  noise(ctx, s, 1);
  // Stone crack lines
  ctx.strokeStyle = 'rgba(90,70,40,0.25)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 6; i++) {
    const y = Math.random() * s;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(s, y + (Math.random() - 0.5) * 12);
    ctx.stroke();
  }
  for (let i = 0; i < 4; i++) {
    const x = Math.random() * s;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (Math.random() - 0.5) * 12, s);
    ctx.stroke();
  }
}

function buildConcrete(ctx: CanvasRenderingContext2D, s: number): void {
  ctx.fillStyle = '#8a8278';
  ctx.fillRect(0, 0, s, s);
  noise(ctx, s, 1);
  // Horizontal form lines
  ctx.strokeStyle = 'rgba(50,45,40,0.35)';
  ctx.lineWidth = 1;
  const step = Math.round(s / 4);
  for (let y = step; y < s; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(s, y);
    ctx.stroke();
  }
  // Vertical dividers
  ctx.lineWidth = 0.5;
  ctx.strokeStyle = 'rgba(50,45,40,0.18)';
  for (let x = Math.round(s / 2); x < s; x += Math.round(s / 2)) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, s);
    ctx.stroke();
  }
  // Light scratches
  ctx.strokeStyle = 'rgba(200,195,185,0.12)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * s;
    const y = Math.random() * s;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 10);
    ctx.stroke();
  }
}

function buildWood(ctx: CanvasRenderingContext2D, s: number): void {
  ctx.fillStyle = '#7a5c2e';
  ctx.fillRect(0, 0, s, s);
  // Wood grain lines
  for (let i = 0; i < 18; i++) {
    const x = (i / 18) * s + (Math.random() - 0.5) * 4;
    const alpha = 0.08 + Math.random() * 0.18;
    ctx.strokeStyle = `rgba(40,22,8,${alpha})`;
    ctx.lineWidth = 0.6 + Math.random() * 1.2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(
      x + (Math.random() - 0.5) * 8, s * 0.33,
      x + (Math.random() - 0.5) * 8, s * 0.66,
      x + (Math.random() - 0.5) * 6, s
    );
    ctx.stroke();
  }
  // Highlight sheen
  const gh = ctx.createLinearGradient(0, 0, s, 0);
  gh.addColorStop(0, 'rgba(255,210,140,0.10)');
  gh.addColorStop(0.5, 'rgba(255,210,140,0.04)');
  gh.addColorStop(1, 'rgba(255,210,140,0.10)');
  ctx.fillStyle = gh;
  ctx.fillRect(0, 0, s, s);
}

function buildMetal(ctx: CanvasRenderingContext2D, s: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, s);
  g.addColorStop(0, '#606060');
  g.addColorStop(0.5, '#787878');
  g.addColorStop(1, '#585858');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  noise(ctx, s, 1);
  // Horizontal brushed lines
  for (let y = 0; y < s; y += 3) {
    const a = 0.04 + Math.random() * 0.06;
    ctx.strokeStyle = `rgba(220,220,220,${a})`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(s, y);
    ctx.stroke();
  }
  // Rust spots
  for (let i = 0; i < 5; i++) {
    const rx = Math.random() * s;
    const ry = Math.random() * s;
    const rg = ctx.createRadialGradient(rx, ry, 0, rx, ry, 6);
    rg.addColorStop(0, 'rgba(120,60,20,0.25)');
    rg.addColorStop(1, 'rgba(120,60,20,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(rx, ry, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function buildPlaster(ctx: CanvasRenderingContext2D, s: number): void {
  ctx.fillStyle = '#d8ceb8';
  ctx.fillRect(0, 0, s, s);
  noise(ctx, s, 1);
  // Subtle mortar lines
  ctx.strokeStyle = 'rgba(100,90,75,0.20)';
  ctx.lineWidth = 0.8;
  const bh = Math.round(s / 5);
  for (let y = bh; y < s; y += bh) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(s, y);
    ctx.stroke();
  }
  const bw = Math.round(s / 3);
  for (let x = bw; x < s; x += bw) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, s);
    ctx.stroke();
  }
}

const BUILDERS: Record<TextureKey, (ctx: CanvasRenderingContext2D, s: number) => void> = {
  sand: buildSand,
  concrete: buildConcrete,
  wood: buildWood,
  metal: buildMetal,
  plaster: buildPlaster,
};

export function getTexture(key: TextureKey): THREE.Texture {
  if (cache.has(key)) return cache.get(key)!;
  const tex = makeTexture(256, BUILDERS[key]);
  cache.set(key, tex);
  return tex;
}

export function disposeTextures(): void {
  cache.forEach(t => t.dispose());
  cache.clear();
}

// —— PBR texture loading ————————————————————————————————————————

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

    // Cache the original
    pbrCache.set(key, { map: map.clone(), normalMap: normalMap?.clone(), roughnessMap: roughnessMap?.clone() });
    setTimeout(() => { URL.revokeObjectURL(colorUrl); }, 5000);

    return { map, normalMap, roughnessMap };
  } catch {
    return null;
  }
}

export function getPBRFallback(key: PBRTextureKey): THREE.Texture {
  const canvasKey = key === 'tile' || key === 'cobblestone' || key === 'brick' ? 'concrete' as TextureKey : key as TextureKey;
  return getTexture(canvasKey);
}
