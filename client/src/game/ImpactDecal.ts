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
