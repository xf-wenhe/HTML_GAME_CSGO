import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { WeaponManager } from '../WeaponManager.js';
import { Weapon } from '../Weapon.js';

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

  it('adds moving inaccuracy and exposes shot feedback events', () => {
    const manager = new WeaponManager();
    const weapon = manager.getCurrentWeapon();
    const camera = new THREE.PerspectiveCamera();

    const standingSpread = weapon.getEffectiveSpread(false, false);
    const movingSpread = weapon.getEffectiveSpread(true, false);
    const aimedSpread = weapon.getEffectiveSpread(false, true);

    expect(movingSpread).toBeGreaterThan(standingSpread);
    expect(aimedSpread).toBeLessThan(standingSpread);

    const result = manager.shoot(camera, 1000, { isMoving: true });

    expect(result?.spread).toBeGreaterThan(standingSpread);
    expect(manager.consumeFeedbackEvents().map(event => event.type)).toContain('shoot');
  });

  it('recovers recoil and spread pressure after waiting', () => {
    const weapon = new Weapon({
      id: 'test',
      name: 'Test',
      damage: 10,
      fireRate: 10,
      magazineSize: 30,
      reloadTime: 1,
      spread: 0.05,
      projectileSpeed: 1,
      recoilPattern: [{ x: 0, y: 0.02 }, { x: 0.01, y: 0.04 }],
      standRecovery: 0.25
    });

    weapon.shoot(1000);
    weapon.shoot(1120);
    expect(weapon.getRecoilOffset().y).toBeGreaterThan(0);

    weapon.update(1500);

    expect(weapon.getRecoilOffset().y).toBe(0);
    expect(weapon.getSpreadMultiplier()).toBe(1);
  });
});
