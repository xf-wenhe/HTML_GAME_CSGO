import { describe, expect, it } from 'vitest';
import { WeaponManager } from '../WeaponManager.js';

describe('WeaponManager', () => {
  it('switches weapons and rejects unknown ids', () => {
    const manager = new WeaponManager();

    expect(manager.getCurrentWeaponId()).toBe('rifle');
    expect(manager.switchWeapon('shotgun')).toBe(true);
    expect(manager.getCurrentWeapon().name).toBe('Shotgun');
    expect(manager.switchWeapon('missing')).toBe(false);
    expect(manager.getCurrentWeaponId()).toBe('shotgun');
  });

  it('starts reload when the current magazine is not full', () => {
    const manager = new WeaponManager();
    const weapon = manager.getCurrentWeapon();

    weapon.shoot(1000);
    manager.startReload(1100);

    expect(weapon.getReloadProgress()).toBeLessThan(1);
  });
});
