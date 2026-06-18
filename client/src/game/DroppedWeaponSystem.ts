import * as THREE from 'three';
import { ASSETS, loadAsset, createFallbackWeapon } from './assets.js';
import { getWeaponPresentation, resolveWeaponPresentationId, type WeaponPose } from './WeaponPresentation.js';

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
    const presentation = getWeaponPresentation(weaponId);
    const assetId = resolveWeaponPresentationId(weaponId) ?? weaponId;
    group.position.copy(position);
    group.position.y = Math.max(presentation?.dropped.groundOffset ?? 0.06, position.y - 1.4);
    group.rotation.y = Math.random() * Math.PI;
    this.scene.add(group);

    // 【修复】同步创建 fallback 武器模型，确保掉落武器立即可见
    const variant = WEAPON_VARIANT_MAP[assetId];
    if (presentation) {
      const fallback = ASSETS[assetId]?.fallback();
      if (fallback) {
        this.applyPose(fallback, presentation.dropped);
        group.add(fallback);
      }
    } else if (variant) {
      const fallback = createFallbackWeapon(variant.color, variant.length, variant.variant);
      fallback.scale.multiplyScalar(0.72);
      group.add(fallback);
    }

    const groundMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.18, 0.205, 18),
      new THREE.MeshBasicMaterial({
        color: 0xd8c171,
        transparent: true,
        opacity: presentation?.dropped.markerOpacity ?? 0.16,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    groundMarker.rotation.x = -Math.PI / 2;
    groundMarker.position.y = 0.004;
    groundMarker.name = 'ground-marker';
    group.add(groundMarker);

    const drop: DroppedWeapon = {
      id: `drop_${Math.random().toString(36).slice(2)}`,
      weaponId,
      mesh: group
    };
    this.drops.push(drop);

    // 异步加载 GLB 模型，成功后替换 fallback
    const definition = ASSETS[assetId];
    void (definition ? loadAsset(definition) : Promise.resolve(undefined)).then(model => {
      if (!model || !this.drops.includes(drop)) return;
      const fallbackChildren = group.children.filter(c => c.name !== 'ground-marker');
      fallbackChildren.forEach(c => group.remove(c));
      if (presentation) this.applyPose(model, presentation.dropped);
      else model.scale.multiplyScalar(0.72);
      group.add(model);
    });
  }

  update(playerPosition: THREE.Vector3): DroppedWeapon | null {
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

  private applyPose(object: THREE.Object3D, pose: WeaponPose): void {
    object.position.set(...pose.position);
    object.rotation.set(...pose.rotation);
    object.scale.multiplyScalar(pose.scale);
  }
}
