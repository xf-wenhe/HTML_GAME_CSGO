import * as THREE from 'three';

export type GrenadeId = 'he' | 'flash' | 'smoke' | 'incendiary' | 'decoy';

export interface GrenadeInventory {
  he: number;
  flash: number;
  smoke: number;
  incendiary: number;
  decoy: number;
}

interface ActiveGrenade {
  id: string;
  type: GrenadeId;
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  timer: number;
  life: number;
  exploded: boolean;
}

interface SmokeParticle {
  mesh: THREE.Mesh;
  growthRate: number;
  targetScale: number;
  baseOpacity: number;
  life: number;
}

interface FlashBurst {
  mesh: THREE.Mesh;
  life: number;
  intensity: number;
  flashOrigin: THREE.Vector3;
}

const GRENADE_LABELS: Record<GrenadeId, string> = {
  he: '高爆雷',
  flash: '闪光弹',
  smoke: '烟雾弹',
  incendiary: '燃烧弹',
  decoy: '诱饵弹'
};

const GRENADE_COLORS: Record<GrenadeId, number> = {
  he: 0x4b5563,
  flash: 0xe8edf2,
  smoke: 0x8b949e,
  incendiary: 0xd97706,
  decoy: 0xd6a84f
};

const DEFAULT_GRENADE_INVENTORY: GrenadeInventory = { he: 0, flash: 0, smoke: 0, incendiary: 0, decoy: 0 };

function createSmokeTexture(size: number = 64): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
  gradient.addColorStop(0.15, 'rgba(230, 232, 235, 0.85)');
  gradient.addColorStop(0.35, 'rgba(200, 203, 210, 0.65)');
  gradient.addColorStop(0.55, 'rgba(160, 165, 175, 0.38)');
  gradient.addColorStop(0.75, 'rgba(120, 128, 140, 0.12)');
  gradient.addColorStop(1, 'rgba(100, 105, 115, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const imageData = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 25;
    imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise));
    imageData.data[i+1] = Math.max(0, Math.min(255, imageData.data[i+1] + noise));
    imageData.data[i+2] = Math.max(0, Math.min(255, imageData.data[i+2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

let _smokeTexture: THREE.CanvasTexture | null = null;
function getSmokeTexture(): THREE.CanvasTexture {
  if (!_smokeTexture) _smokeTexture = createSmokeTexture();
  return _smokeTexture;
}

function createFlashTexture(size: number = 32): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.2, 'rgba(255, 252, 240, 0.9)');
  gradient.addColorStop(0.5, 'rgba(240, 235, 220, 0.4)');
  gradient.addColorStop(1, 'rgba(200, 190, 170, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

let _flashTexture: THREE.CanvasTexture | null = null;
function getFlashTexture(): THREE.CanvasTexture {
  if (!_flashTexture) _flashTexture = createFlashTexture();
  return _flashTexture;
}

export class GrenadeSystem {
  private inventory: GrenadeInventory = { ...DEFAULT_GRENADE_INVENTORY };
  private selected: GrenadeId = 'he';
  private active: ActiveGrenade[] = [];
  private effects: THREE.Object3D[] = [];
  private smokeParticles: SmokeParticle[] = [];
  private flashBursts: FlashBurst[] = [];
  private lastFlashIntensity = 0;
  private smTexture = getSmokeTexture();
  private flTexture = getFlashTexture();
  private raycaster = new THREE.Raycaster();

  constructor(private scene: THREE.Scene) {}

  select(type: GrenadeId): void {
    this.selected = type;
  }

  setInventory(inventory: Partial<GrenadeInventory>): void {
    this.inventory = { ...DEFAULT_GRENADE_INVENTORY, ...inventory };
    if (this.inventory[this.selected] <= 0) {
      this.selected = (Object.keys(this.inventory) as GrenadeId[]).find(type => this.inventory[type] > 0) ?? 'he';
    }
  }

  addGrenade(type: GrenadeId, amount: number = 1): void {
    this.inventory = {
      ...this.inventory,
      [type]: Math.max(0, (this.inventory[type] ?? 0) + amount)
    };
    this.selected = type;
  }

  hasAnyGrenade(): boolean {
    return Object.values(this.inventory).some(count => count > 0);
  }

  getInventoryForBuy(): Partial<Record<'he' | 'flashbang' | 'smoke' | 'incendiary' | 'decoy', number>> {
    return {
      he: this.inventory.he,
      flashbang: this.inventory.flash,
      smoke: this.inventory.smoke,
      incendiary: this.inventory.incendiary,
      decoy: this.inventory.decoy,
    };
  }

  cycle(): GrenadeId {
    const order: GrenadeId[] = ['he', 'flash', 'smoke', 'incendiary', 'decoy'];
    const start = order.indexOf(this.selected);
    for (let offset = 1; offset <= order.length; offset++) {
      const candidate = order[(start + offset) % order.length];
      if (this.inventory[candidate] > 0) {
        this.selected = candidate;
        break;
      }
    }
    return this.selected;
  }

  throwSelected(camera: THREE.Camera, mode: 'full' | 'light' = 'full'): { success: boolean; origin?: THREE.Vector3; velocity?: THREE.Vector3 } {
    if (this.inventory[this.selected] <= 0) return { success: false };
    this.inventory[this.selected]--;

    const power = mode === 'light' ? 0.45 : 1;
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 16, 12),
      new THREE.MeshStandardMaterial({ color: GRENADE_COLORS[this.selected], roughness: 0.55, metalness: 0.25 })
    );
    // 【修复】防止手雷自己挡住自己的射线检测
    mesh.userData.raycastIgnore = true;
    
    mesh.position.copy(camera.position).add(direction.clone().multiplyScalar(0.75));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const velocity = direction.clone().multiplyScalar(16 * power).add(new THREE.Vector3(0, mode === 'light' ? 2.2 : 4.8, 0));
    this.active.push({
      id: `grenade_${Math.random().toString(36).slice(2)}`,
      type: this.selected,
      mesh,
      velocity: velocity.clone(),
      timer: this.selected === 'flash' ? 1.3 : this.selected === 'smoke' ? 1.6 : 1.8,
      life: 0,
      exploded: false
    });
    return { success: true, origin: camera.position.clone(), velocity };
  }

  update(dt: number, playerPosition: THREE.Vector3, playerDirection?: THREE.Vector3): { damage: number; flash: number } {
    let damage = 0;
    this.lastFlashIntensity = Math.max(0, this.lastFlashIntensity - dt * 0.85);

    // 【修复核心2】缓存地图网格用于射线检测（代替硬编码的 Y<0.13）
    const collisionTargets: THREE.Object3D[] = [];
    this.scene.traverse(obj => {
      if (!obj.visible || !(obj as THREE.Mesh).isMesh || obj.userData.raycastIgnore) return;
      if (obj.name === 'hit-flash' || obj.userData.kind) return;
      collisionTargets.push(obj);
    });

    this.active.forEach(grenade => {
      if (grenade.exploded) return;
      grenade.life += dt;
      grenade.timer -= dt;
      grenade.velocity.y -= 18 * dt; // 重力

      const dist = grenade.velocity.length() * dt;
      if (dist > 0.001) {
        const dir = grenade.velocity.clone().normalize();
        this.raycaster.set(grenade.mesh.position, dir);
        
        // 发射射线寻找墙壁和地板
        const hits = this.raycaster.intersectObjects(collisionTargets, false);
        
        // 0.11 是手雷的半径
        if (hits.length > 0 && hits[0].distance <= dist + 0.11) {
          // 碰壁/碰地 反弹
          const normal = hits[0].face?.normal || new THREE.Vector3(0, 1, 0);
          // 把手雷推到接触点表面，防止卡进墙里
          grenade.mesh.position.copy(hits[0].point).add(normal.clone().multiplyScalar(0.12));
          // CSGO 物理摩擦弹跳系数
          grenade.velocity.reflect(normal).multiplyScalar(0.35); 
        } else {
          // 前方无障碍，正常飞行
          grenade.mesh.position.addScaledVector(grenade.velocity, dt);
        }
      }

      grenade.mesh.rotation.x += grenade.velocity.length() * dt;
      grenade.mesh.rotation.z += dt * 5;

      if (grenade.timer <= 0) {
        const pos = grenade.mesh.position.clone();
        const distance = pos.distanceTo(playerPosition);

        switch (grenade.type) {
          case 'he':
            this.createExplosionEffect(pos);
            if (distance < 7) damage += Math.round((1 - distance / 7) * 65);
            break;
          case 'flash':
            this.createFlashEffect(pos);
            if (distance < 20) {
              let directionFactor = 1.0;
              if (playerDirection) {
                const toFlash = pos.clone().sub(playerPosition).normalize();
                const dot = playerDirection.dot(toFlash);
                directionFactor = 0.35 + 0.65 * Math.max(0, (dot + 1) / 2);
              }
              const rawIntensity = Math.pow(1 - Math.min(distance / 20, 1), 1.5);
              const intensity = rawIntensity * directionFactor;
              this.lastFlashIntensity = Math.max(this.lastFlashIntensity, intensity);
            }
            break;
          case 'smoke':
            this.createSmokeEffect(pos);
            break;
          case 'incendiary':
            this.createFireEffect(pos);
            if (distance < 5) damage += 8;
            break;
          case 'decoy':
            this.createExplosionEffect(pos);
            break;
        }

        this.scene.remove(grenade.mesh);
        grenade.exploded = true;
      }
    });

    this.active = this.active.filter(grenade => !grenade.exploded);

    this.effects.forEach(effect => {
      effect.userData.life = (effect.userData.life ?? 0) + dt;
      const mat = (effect as THREE.Mesh).material as THREE.MeshBasicMaterial;

      if (effect.userData.kind === 'fire') {
        effect.scale.addScalar(dt * 1.8);
        mat.opacity = Math.max(0, 0.85 - effect.userData.life * 0.18);
        const t = Math.min(1, effect.userData.life / 5);
        const r = 1.0, g = 0.48 - t * 0.35, b = 0.09 - t * 0.05;
        mat.color.setRGB(r, g, b);
      } else {
        effect.scale.addScalar(dt * 3.5);
        mat.opacity = Math.max(0, 0.95 - effect.userData.life * 1.3);
      }
    });
    this.effects = this.effects.filter(effect => {
      const kind = effect.userData.kind as string;
      const maxLife = kind === 'fire' ? 6 : 1.0;
      if ((effect.userData.life ?? 0) <= maxLife) return true;
      this.scene.remove(effect);
      return false;
    });

    this.flashBursts.forEach(burst => {
      burst.life += dt;
      const mat = burst.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 0.9 * (1 - burst.life / 0.5));
      burst.mesh.scale.addScalar(dt * 20);
    });
    this.flashBursts = this.flashBursts.filter(burst => {
      if (burst.life <= 0.5) return true;
      this.scene.remove(burst.mesh);
      return false;
    });

    this.smokeParticles.forEach(p => {
      p.life += dt;
      const progress = Math.min(1, p.life / 18);

      const growFactor = Math.sin(progress * Math.PI * 0.5);
      const targetScale = 1 + growFactor * (p.targetScale - 1);
      p.mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), dt * 2.5);

      let opacity: number;
      if (progress < 0.11) {
        opacity = p.baseOpacity * (progress / 0.11);
      } else if (progress < 0.67) {
        opacity = p.baseOpacity;
      } else {
        opacity = p.baseOpacity * (1 - (progress - 0.67) / 0.33);
      }

      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = opacity;
    });
    this.smokeParticles = this.smokeParticles.filter(p => {
      if (p.life <= 18) return true;
      this.scene.remove(p.mesh);
      return false;
    });

    return { damage, flash: this.lastFlashIntensity };
  }

  // 【修复】放大了所有投掷物特效的尺寸
  private createExplosionEffect(position: THREE.Vector3): void {
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 20, 14),
      new THREE.MeshBasicMaterial({ color: 0xffee88, transparent: true, opacity: 0.95, depthWrite: false })
    );
    core.position.copy(position);
    core.userData.kind = 'burst';
    core.userData.life = 0;
    this.scene.add(core);
    this.effects.push(core);

    const ring = new THREE.Mesh(
      new THREE.SphereGeometry(2.5, 16, 10),
      new THREE.MeshBasicMaterial({ color: 0xff9933, transparent: true, opacity: 0.7, depthWrite: false })
    );
    ring.position.copy(position);
    ring.userData.kind = 'burst';
    ring.userData.life = -0.08;
    this.scene.add(ring);
    this.effects.push(ring);
  }

  private createFlashEffect(position: THREE.Vector3): void {
    const burst = new THREE.Mesh(
      new THREE.SphereGeometry(2.5, 24, 16),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        map: this.flTexture
      })
    );
    burst.position.copy(position);
    this.scene.add(burst);
    this.flashBursts.push({
      mesh: burst,
      life: 0,
      intensity: 1,
      flashOrigin: position.clone()
    });

    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(4.0, 24, 16),
      new THREE.MeshBasicMaterial({
        color: 0xfff8e0,
        transparent: true,
        opacity: 0.55,
        depthWrite: false
      })
    );
    halo.position.copy(position);
    halo.userData.kind = 'burst';
    halo.userData.life = -0.05;
    this.scene.add(halo);
    this.effects.push(halo);
  }

  private createSmokeEffect(position: THREE.Vector3): void {
    const particleCount = 12; // 烟雾弹体积加厚

    for (let i = 0; i < particleCount; i++) {
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        Math.random() * 1.5,
        (Math.random() - 0.5) * 1.5
      );

      const initialSize = 0.5 + Math.random() * 0.8;
      // 目标膨胀尺寸达到 4 ~ 6.5 米（完全可以封住中门）
      const targetSize = 4.5 + Math.random() * 2.0; 
      const growthRate = 1.5 + Math.random() * 1.8;
      const baseOpacity = 0.45 + Math.random() * 0.35; 

      const mat = new THREE.MeshBasicMaterial({
        color: 0x9aa4af,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        map: this.smTexture,
        blending: THREE.NormalBlending
      });

      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(initialSize, 16, 12),
        mat
      );
      mesh.position.copy(position).add(offset);
      mesh.position.y += 0.2;
      this.scene.add(mesh);

      this.smokeParticles.push({
        mesh,
        growthRate,
        targetScale: targetSize,
        baseOpacity,
        life: -Math.random() * 0.3 
      });
    }
  }

  private createFireEffect(position: THREE.Vector3): void {
    for (let i = 0; i < 5; i++) {
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        0,
        (Math.random() - 0.5) * 1.5
      );
      const fire = new THREE.Mesh(
        new THREE.SphereGeometry(0.3 + Math.random() * 0.4, 12, 8),
        new THREE.MeshBasicMaterial({
          color: 0xff6600,
          transparent: true,
          opacity: 0.8,
          depthWrite: false
        })
      );
      fire.position.copy(position).add(offset);
      fire.position.y = 0.1;
      fire.userData.kind = 'fire';
      fire.userData.life = -Math.random() * 0.5;
      this.scene.add(fire);
      this.effects.push(fire);
    }
  }

  reset(): void {
    this.active.forEach(grenade => this.scene.remove(grenade.mesh));
    this.effects.forEach(effect => this.scene.remove(effect));
    this.flashBursts.forEach(burst => this.scene.remove(burst.mesh));
    this.smokeParticles.forEach(p => this.scene.remove(p.mesh));
    this.active = [];
    this.effects = [];
    this.flashBursts = [];
    this.smokeParticles = [];
    this.inventory = { ...DEFAULT_GRENADE_INVENTORY };
    this.selected = 'he';
    this.lastFlashIntensity = 0;
  }

  getSelected(): GrenadeId {
    return this.selected;
  }

  getSelectedLabel(): string {
    return GRENADE_LABELS[this.selected];
  }

  getInventory(): GrenadeInventory {
    return { ...this.inventory };
  }
}
