import { Weapon } from './Weapon.js';
import { WEAPON_DEFINITIONS } from './Weapons.js';
import * as THREE from 'three';

export interface ShootResult {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  damage: number;
  hitMarker?: boolean;
}

export class WeaponManager {
  private weapons: Map<string, Weapon>;
  private currentWeaponId: string;
  private weaponModels: Map<string, THREE.Object3D> = new Map();

  constructor() {
    this.weapons = new Map();
    Object.entries(WEAPON_DEFINITIONS).forEach(([id, weapon]) => {
      this.weapons.set(id, weapon.clone());
    });
    this.currentWeaponId = 'pistol';
  }

  getCurrentWeapon(): Weapon {
    return this.weapons.get(this.currentWeaponId)!;
  }

  switchWeapon(weaponId: string): boolean {
    if (!this.weapons.has(weaponId)) return false;
    this.currentWeaponId = weaponId;
    return true;
  }

  shoot(camera: THREE.Camera, now: number = performance.now()): ShootResult | null {
    const weapon = this.getCurrentWeapon();

    if (!weapon.shoot(now)) {
      if (weapon.currentAmmo === 0 && !weapon.isReloading) {
        this.startReload(now);
      }
      return null;
    }

    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);

    const spread = weapon.spread * weapon.getSpreadMultiplier();
    direction.x += (Math.random() - 0.5) * spread;
    direction.y += (Math.random() - 0.5) * spread;
    direction.z += (Math.random() - 0.5) * spread;
    direction.normalize();

    return {
      origin: camera.position.clone(),
      direction,
      damage: weapon.damage
    };
  }

  startReload(now: number = performance.now()): void {
    this.getCurrentWeapon().startReload(now);
  }

  update(now: number = performance.now()): void {
    this.weapons.forEach(weapon => weapon.update(now));
  }
}