import * as THREE from 'three';
import { ASSETS, loadAsset, createFallbackWeapon } from './assets.js';

export interface DroppedWeapon {
  id: string;
  weaponId: string;
  mesh: THREE.Object3D;
}

/** 武器 ID → fallback 变体映射（掉落武器在 GLB 加载前先用程序化模型占位） */
const WEAPON_VARIANT_MAP: Record<string, { color: number; length: number; variant: 'pistol' | 'rifle' | 'sniper' | 'smg' | 'shotgun' }> = {
  pistol:       { color: 0x3f4650, length: 0.55, variant: 'pistol' },
  heavy_pistol: { color: 0x4b5563, length: 0.62, variant: 'pistol' },
  rifle:        { color: 0x3d4651, length: 0.95, variant: 'rifle' },
  defender_rifle:{ color: 0x45515c, length: 0.90, variant: 'rifle' },
  sniper:       { color: 0x303842, length: 1.12, variant: 'sniper' },
  smg:          { color: 0x35404a, length: 0.72, variant: 'smg' },
  shotgun:      { color: 0x47311f, length: 0.80, variant: 'shotgun' },
  // 别名映射（WeaponId → 标准 key）
  deagle:       { color: 0x4b5563, length: 0.62, variant: 'pistol' },
  ak47:         { color: 0x3d4651, length: 0.95, variant: 'rifle' },
  m4a4:         { color: 0x45515c, length: 0.90, variant: 'rifle' },
  awp:          { color: 0x303842, length: 1.12, variant: 'sniper' },
  mac10:        { color: 0x35404a, length: 0.72, variant: 'smg' },
  p90:          { color: 0x35404a, length: 0.72, variant: 'smg' },
};

export class DroppedWeaponSystem {
  private drops: DroppedWeapon[] = [];

  constructor(private scene: THREE.Scene) {}

  dropWeapon(weaponId: string, position: THREE.Vector3): void {
    if (weaponId === 'knife') return;
    const group = new THREE.Group();
    group.name = `drop-${weaponId}`;
    group.position.copy(position);
    // 武器放置在地面上方 0.06 个单位，模拟平躺效果
    group.position.y = Math.max(0.06, position.y - 1.4);
    group.rotation.set(1.5, Math.random() * Math.PI, 0.18);
    this.scene.add(group);

    // 【修复】同步创建 fallback 武器模型，确保掉落武器立即可见
    const variant = WEAPON_VARIANT_MAP[weaponId];
    if (variant) {
      const fallback = createFallbackWeapon(variant.color, variant.length, variant.variant);
      fallback.scale.multiplyScalar(0.72);
      group.add(fallback);
    }

    // 添加发光轮廓环，让玩家在远处也能看到掉落武器
    const glowRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.12, 0.015, 8, 16),
      new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.45 })
    );
    glowRing.rotation.x = Math.PI / 2;
    glowRing.position.y = 0.08;
    glowRing.name = 'glow-ring';
    group.add(glowRing);

    const drop: DroppedWeapon = {
      id: `drop_${Math.random().toString(36).slice(2)}`,
      weaponId,
      mesh: group
    };
    this.drops.push(drop);

    // 异步加载 GLB 模型，成功后替换 fallback
    const definition = ASSETS[weaponId];
    void (definition ? loadAsset(definition) : Promise.resolve(undefined)).then(model => {
      if (!model || !this.drops.includes(drop)) return;
      // 移除旧的 fallback 模型（保留发光环）
      const fallbackChildren = group.children.filter(c => c.name !== 'glow-ring');
      fallbackChildren.forEach(c => group.remove(c));
      model.scale.multiplyScalar(0.72);
      group.add(model);
    });
  }

  update(playerPosition: THREE.Vector3): DroppedWeapon | null {
    this.drops.forEach(drop => {
      drop.mesh.rotation.y += 0.015;
    });
    return this.findNearby(playerPosition, 2.1);
  }

  pickup(drop: DroppedWeapon): string {
    this.scene.remove(drop.mesh);
    this.drops = this.drops.filter(item => item !== drop);
    return drop.weaponId;
  }

  clear(): void {
    this.drops.forEach(drop => this.scene.remove(drop.mesh));
    this.drops = [];
  }

  getDrops(): DroppedWeapon[] {
    return [...this.drops];
  }

  private findNearby(position: THREE.Vector3, radius: number): DroppedWeapon | null {
    let bestDrop: DroppedWeapon | null = null;
    let bestDistance = Infinity;
    for (const drop of this.drops) {
      const distance = drop.mesh.position.distanceTo(position);
      if (distance <= radius && distance < bestDistance) {
        bestDrop = drop;
        bestDistance = distance;
      }
    }
    return bestDrop;
  }
}
