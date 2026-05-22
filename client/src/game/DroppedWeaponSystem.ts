import * as THREE from 'three';
import { ASSETS, loadAsset } from './assets.js';

export interface DroppedWeapon {
  id: string;
  weaponId: string;
  mesh: THREE.Object3D;
}

export class DroppedWeaponSystem {
  private drops: DroppedWeapon[] = [];

  constructor(private scene: THREE.Scene) {}

  dropWeapon(weaponId: string, position: THREE.Vector3): void {
    if (weaponId === 'knife') return;
    const group = new THREE.Group();
    group.name = `drop-${weaponId}`;
    group.position.copy(position);
    group.position.y = Math.max(0.18, position.y - 1.35);
    group.rotation.set(0.05, Math.random() * Math.PI, 0.18);
    this.scene.add(group);

    const drop: DroppedWeapon = {
      id: `drop_${Math.random().toString(36).slice(2)}`,
      weaponId,
      mesh: group
    };
    this.drops.push(drop);

    const definition = ASSETS[weaponId];
    void (definition ? loadAsset(definition) : Promise.resolve(undefined)).then(model => {
      if (!model || !this.drops.includes(drop)) return;
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
