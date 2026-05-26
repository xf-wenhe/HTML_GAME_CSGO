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

export class GrenadeSystem {
  private inventory: GrenadeInventory = { he: 1, flash: 2, smoke: 1, incendiary: 1, decoy: 1 };
  private selected: GrenadeId = 'he';
  private active: ActiveGrenade[] = [];
  private effects: THREE.Object3D[] = [];
  private lastFlashIntensity = 0;

  constructor(private scene: THREE.Scene) {}

  select(type: GrenadeId): void {
    this.selected = type;
  }

  cycle(): GrenadeId {
    const order: GrenadeId[] = ['he', 'flash', 'smoke', 'incendiary', 'decoy'];
    this.selected = order[(order.indexOf(this.selected) + 1) % order.length];
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

  update(dt: number, playerPosition: THREE.Vector3): { damage: number; flash: number } {
    let damage = 0;
    this.lastFlashIntensity = Math.max(0, this.lastFlashIntensity - dt * 0.9);

    this.active.forEach(grenade => {
      if (grenade.exploded) return;
      grenade.life += dt;
      grenade.timer -= dt;
      grenade.velocity.y -= 18 * dt;
      grenade.mesh.position.addScaledVector(grenade.velocity, dt);
      grenade.mesh.rotation.x += dt * 8;
      grenade.mesh.rotation.z += dt * 5;

      if (grenade.mesh.position.y < 0.13) {
        grenade.mesh.position.y = 0.13;
        grenade.velocity.y = Math.abs(grenade.velocity.y) * 0.34;
        grenade.velocity.x *= 0.62;
        grenade.velocity.z *= 0.62;
      }

      if (grenade.timer <= 0) {
        const effect = this.createEffect(grenade.type, grenade.mesh.position);
        this.scene.add(effect);
        this.effects.push(effect);
        const distance = grenade.mesh.position.distanceTo(playerPosition);
        if (grenade.type === 'he' && distance < 7) damage += Math.round((1 - distance / 7) * 65);
        if (grenade.type === 'flash' && distance < 18) this.lastFlashIntensity = Math.max(this.lastFlashIntensity, 1 - distance / 18);
        if (grenade.type === 'incendiary' && distance < 5) damage += 8;
        this.scene.remove(grenade.mesh);
        grenade.exploded = true;
      }
    });

    this.active = this.active.filter(grenade => !grenade.exploded);
    this.effects.forEach(effect => {
      effect.userData.life = (effect.userData.life ?? 0) + dt;
      if (effect.userData.kind === 'smoke') {
        effect.scale.addScalar(dt * 1.9);
        ((effect as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.62 - effect.userData.life * 0.08);
      } else {
        effect.scale.addScalar(dt * 2.4);
        ((effect as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 - effect.userData.life * 1.1);
      }
    });
    this.effects = this.effects.filter(effect => {
      const maxLife = effect.userData.kind === 'smoke' ? 8 : effect.userData.kind === 'fire' ? 5 : 1.2;
      if ((effect.userData.life ?? 0) <= maxLife) return true;
      this.scene.remove(effect);
      return false;
    });

    return { damage, flash: this.lastFlashIntensity };
  }

  reset(): void {
    this.active.forEach(grenade => this.scene.remove(grenade.mesh));
    this.effects.forEach(effect => this.scene.remove(effect));
    this.active = [];
    this.effects = [];
    this.inventory = { he: 1, flash: 2, smoke: 1, incendiary: 1, decoy: 1 };
    this.selected = 'he';
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

  private createEffect(type: GrenadeId, position: THREE.Vector3): THREE.Mesh {
    const kind = type === 'smoke' ? 'smoke' : type === 'incendiary' ? 'fire' : 'burst';
    const color = type === 'flash' ? 0xffffff : type === 'incendiary' ? 0xff7a18 : type === 'smoke' ? 0x9aa4af : 0xffd166;
    const effect = new THREE.Mesh(
      new THREE.SphereGeometry(type === 'smoke' ? 1.4 : 0.55, 24, 16),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: type === 'smoke' ? 0.62 : 0.9, depthWrite: false })
    );
    effect.position.copy(position);
    effect.userData.kind = kind;
    effect.userData.life = 0;
    return effect;
  }
}
