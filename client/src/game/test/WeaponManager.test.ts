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

  it('supports the expanded CSGO-style weapon roles', () => {
    const manager = new WeaponManager();

    expect(manager.switchWeapon('sniper')).toBe(true);
    expect(manager.getCurrentWeapon().displayName).toBe('狙击枪');
    expect(manager.getCurrentWeapon().damage).toBeGreaterThan(100);
    expect(manager.switchWeapon('smg')).toBe(true);
    expect(manager.getCurrentWeapon().fireRate).toBeGreaterThan(12);
    expect(manager.switchWeapon('knife')).toBe(true);
    expect(manager.getCurrentWeapon().isMelee).toBe(true);
  });

  it('blocks shooting during weapon draw animation', () => {
    const manager = new WeaponManager();

    manager.switchWeapon('sniper');

    expect(manager.isSwitching()).toBe(true);
    expect(manager.shoot(new (class {
      position = { clone: () => ({}) };
      quaternion = {};
    })() as any, 1000)).toBeNull();
  });

  it('starts reload when the current magazine is not full', () => {
    const manager = new WeaponManager();
    const weapon = manager.getCurrentWeapon();

    weapon.shoot(1000);
    manager.startReload(1100);

    expect(weapon.getReloadProgress(1200)).toBeLessThan(1);
  });

  it('tracks reserve ammo and right-click aim spread', () => {
    const manager = new WeaponManager();
    const weapon = manager.getCurrentWeapon();

    weapon.currentAmmo = 1;
    weapon.shoot(1000);
    manager.startReload(1100);
    weapon.update(4000);

    expect(weapon.currentAmmo).toBeGreaterThan(1);
    expect(weapon.currentReserveAmmo).toBeLessThan(weapon.reserveAmmo);

    manager.setAiming(true);
    expect(manager.isAiming()).toBe(true);
    expect(weapon.adsSpreadMultiplier).toBeLessThan(1);
  });

  it('keeps the knife as ammo-free melee with short range', () => {
    const manager = new WeaponManager();

    manager.switchWeapon('knife');
    const knife = manager.getCurrentWeapon();

    expect(knife.isMelee).toBe(true);
    expect(knife.ammoConsumed).toBe(false);
    expect(knife.currentReserveAmmo).toBe(0);
    expect(knife.range).toBeLessThan(3);
  });
});
