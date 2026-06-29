import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { WeaponManager } from '../WeaponManager.js';
import { Weapon } from '../Weapon.js';

describe('WeaponManager', () => {
  it('switches weapons and rejects unknown ids', () => {
    const manager = new WeaponManager();

    expect(manager.getCurrentWeaponId()).toBe('pistol');
    expect(manager.switchWeapon('shotgun')).toBe(true);
    expect(manager.getCurrentWeapon().name).toBe('M3 Super 90');
    expect(manager.switchWeapon('missing')).toBe(false);
    expect(manager.getCurrentWeaponId()).toBe('shotgun');
  });

  it('supports the expanded CSGO-style weapon roles', () => {
    const manager = new WeaponManager();

    expect(manager.switchWeapon('sniper')).toBe(true);
    expect(manager.getCurrentWeapon().displayName).toBe('AWP');
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

  it('only enters scoped aim for sniper weapons', () => {
    const manager = new WeaponManager();
    const weapon = manager.getCurrentWeapon();

    weapon.currentAmmo = 1;
    weapon.shoot(1000);
    manager.startReload(1100);
    weapon.update(4000);

    expect(weapon.currentAmmo).toBeGreaterThan(1);
    expect(weapon.currentReserveAmmo).toBeLessThan(weapon.reserveAmmo);

    manager.setAiming(true);
    expect(manager.isAiming()).toBe(false);
    expect(manager.isScoped()).toBe(false);

    manager.switchWeapon('awp');
    manager.setAiming(true);
    expect(manager.isAiming()).toBe(true);
    expect(manager.isScoped()).toBe(true);
    manager.switchWeapon('pistol');
    expect(manager.isScoped()).toBe(false);
    expect(weapon.adsSpreadMultiplier).toBeLessThan(1);
  });

  it('cycles sniper scope through CS1.6 first zoom, second zoom, and unscoped', () => {
    const manager = new WeaponManager();
    manager.switchWeapon('awp');

    expect(manager.getScopeLevel()).toBe(0);
    expect(manager.getScopeFov()).toBe(82);

    manager.cycleScope(1000);
    expect(manager.isScoped()).toBe(true);
    expect(manager.getScopeLevel()).toBe(1);
    expect(manager.getScopeFov()).toBe(40);
    expect(manager.getScopeLookSensitivityMultiplier()).toBeCloseTo((40 / 82) * 1.2, 5);

    manager.cycleScope(1300);
    expect(manager.isScoped()).toBe(true);
    expect(manager.getScopeLevel()).toBe(2);
    expect(manager.getScopeFov()).toBe(10);
    expect(manager.getScopeLookSensitivityMultiplier()).toBeCloseTo((10 / 82) * 1.2, 5);

    manager.cycleScope(1600);
    expect(manager.isScoped()).toBe(false);
    expect(manager.getScopeLevel()).toBe(0);
    expect(manager.getScopeFov()).toBe(82);
    expect(manager.getScopeLookSensitivityMultiplier()).toBe(1);
  });

  it('uses the CS1.6 55-degree scope and 0.135 second fire cycle for SG552', () => {
    const manager = new WeaponManager();
    const camera = new THREE.PerspectiveCamera();
    manager.switchWeapon('sg552');
    manager.update(500, 1);

    manager.cycleScope(1000);
    expect(manager.isScoped()).toBe(true);
    expect(manager.getScopeLevel()).toBe(1);
    expect(manager.getScopeFov()).toBe(55);

    expect(manager.shoot(camera, 2000)).not.toBeNull();
    expect(manager.shoot(camera, 2134)).toBeNull();
    expect(manager.shoot(camera, 2135)).not.toBeNull();

    manager.cycleScope(1299);
    expect(manager.isScoped()).toBe(true);
    manager.cycleScope(1300);
    expect(manager.isScoped()).toBe(false);
  });

  it('auto re-zooms after a scoped sniper shot while retaining scoped accuracy', () => {
    const manager = new WeaponManager();
    manager.switchWeapon('awp');
    manager.cycleScope(1000);
    manager.cycleScope(1300);

    const weapon = manager.getCurrentWeapon();
    const scopedSpread = weapon.getEffectiveSpread(false, true);
    expect(manager.getScopeLevel()).toBe(2);

    expect(manager.startScopedShotRecovery(1000, 900)).toBe(true);
    expect(manager.isScoped()).toBe(false);
    expect(manager.isAiming()).toBe(true);
    expect(manager.isAutoRescopePending()).toBe(true);
    expect(manager.getScopeFov()).toBe(82);
    expect(weapon.getEffectiveSpread(false, manager.isAiming())).toBe(scopedSpread);

    manager.update(1899, 0.016);
    expect(manager.isScoped()).toBe(false);
    expect(manager.isAutoRescopePending()).toBe(true);

    manager.update(1900, 0.016);
    expect(manager.isScoped()).toBe(true);
    expect(manager.getScopeLevel()).toBe(2);
    expect(manager.isAutoRescopePending()).toBe(false);
    expect(manager.getScopeFov()).toBe(10);
  });

  it('hides the normal crosshair for unscoped sniper weapons', () => {
    const manager = new WeaponManager();

    expect(manager.shouldHideCrosshair()).toBe(false);

    manager.switchWeapon('awp');
    expect(manager.isScoped()).toBe(false);
    expect(manager.shouldHideCrosshair()).toBe(true);

    manager.switchWeapon('pistol');
    expect(manager.shouldHideCrosshair()).toBe(false);
  });

  it('makes CS1.6 AWP no-scopes unreliable while scoped shots stay precise', () => {
    const manager = new WeaponManager();
    manager.switchWeapon('awp');
    const weapon = manager.getCurrentWeapon();

    const noScopeSpread = weapon.getEffectiveSpread(false, false);
    const scopedSpread = weapon.getEffectiveSpread(false, true);

    expect(noScopeSpread).toBeGreaterThan(0.03);
    expect(scopedSpread).toBeLessThan(0.001);
    expect(noScopeSpread).toBeGreaterThan(scopedSpread * 100);
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

  it('uses the CS1.6 AK47 standing and crouched KickBack values', () => {
    const managerStand = new WeaponManager();
    const camera = new THREE.PerspectiveCamera();

    managerStand.switchWeapon('ak47');
    managerStand.update(500, 0.5);
    managerStand.setCrouching(false);
    managerStand.shoot(camera, 1000);
    const kickStanding = managerStand.getCameraKickY();

    const managerCrouch = new WeaponManager();
    managerCrouch.switchWeapon('ak47');
    managerCrouch.update(500, 0.5);
    managerCrouch.setCrouching(true);
    managerCrouch.shoot(camera, 1000);
    const kickCrouched = managerCrouch.getCameraKickY();

    expect(kickStanding).toBeCloseTo(THREE.MathUtils.degToRad(1), 7);
    expect(kickCrouched).toBeCloseTo(THREE.MathUtils.degToRad(0.9), 7);
  });

  it('applies camera kick on shoot', () => {
    const manager = new WeaponManager();
    const camera = new THREE.PerspectiveCamera();

    manager.switchWeapon('rifle');
    manager.update(500, 0.5);
    expect(manager.isSwitching()).toBe(false);

    const result = manager.shoot(camera, 1000);
    expect(result).not.toBeNull();
    expect(manager.getCameraKickY()).toBeGreaterThan(0);
    expect(manager.getCameraKickX()).toBeGreaterThanOrEqual(0);
  });

  it('uses AK47 pattern for vandal alias', () => {
    const weapon = new Weapon({
      id: 'vandal',
      name: 'Vandal',
      damage: 40,
      fireRate: 600,
      magazineSize: 25,
      reloadTime: 2.5,
      spread: 0.02
    });

    expect(weapon.recoilPattern.length).toBeGreaterThan(10);
    for (let i = 0; i < 5; i++) {
      weapon.shoot(1000 + i);
      weapon.update(1001 + i);
    }
    expect(weapon.getSpreadMultiplier()).toBeGreaterThan(1);
  });

  it('uses AWP pattern for operator alias', () => {
    const weapon = new Weapon({
      id: 'operator',
      name: 'Operator',
      damage: 115,
      fireRate: 600,
      magazineSize: 5,
      reloadTime: 3.5,
      spread: 0.01
    });

    expect(weapon.recoilPattern.length).toBeGreaterThan(0);
    weapon.shoot(1000);
    weapon.update(1001);
    weapon.shoot(1001);
    expect(weapon.getSpreadMultiplier()).toBeGreaterThan(1);
  });

  it('uses the CS 1.6 AWP 10-round magazine', () => {
    const manager = new WeaponManager();
    manager.switchWeapon('awp');

    expect(manager.getCurrentWeapon().magazineSize).toBe(10);
    expect(manager.getCurrentWeapon().currentAmmo).toBe(10);
    expect(manager.getCurrentWeapon().reloadTime).toBe(2.5);
    expect(manager.getCurrentWeapon().movementSpeedMultiplier).toBe(0.84);
    expect(manager.getCurrentWeapon().scopedMovementSpeedMultiplier).toBe(0.6);
    expect(manager.getCurrentWeapon().unscopedSpreadMultiplier).toBe(18);
  });

  it('uses ReGameDLL reload times for every magazine-fed CS1.6 weapon', () => {
    const manager = new WeaponManager();
    const expectedReloadTimes: Record<string, number> = {
      glock: 2.2,
      usp: 2.7,
      p228: 2.7,
      deagle: 2.2,
      five_seven: 2.7,
      mp5: 2.63,
      tmp: 2.12,
      p90: 3.4,
      mac10: 3.15,
      ump45: 3.5,
      galil: 2.45,
      famas: 3.3,
      ak47: 2.45,
      m4a1: 3.05,
      sg552: 3,
      aug: 3.3,
      scout: 2,
      awp: 2.5,
      g3sg1: 3.5,
      sg550: 3.35,
      m249: 4.7
    };

    for (const [weaponId, reloadTime] of Object.entries(expectedReloadTimes)) {
      manager.switchWeapon(weaponId);
      expect(manager.getCurrentWeapon().reloadTime, weaponId).toBe(reloadTime);
    }
  });

  it('reloads the M3 shell-by-shell and allows firing to interrupt after a shell is loaded', () => {
    const manager = new WeaponManager();
    const camera = new THREE.PerspectiveCamera();
    manager.switchWeapon('m3');
    manager.update(500, 1);
    const weapon = manager.getCurrentWeapon();
    weapon.currentAmmo = 0;
    weapon.currentReserveAmmo = 3;

    manager.startReload(1000);
    manager.update(1999, 0.016);
    expect(weapon.currentAmmo).toBe(0);
    expect(weapon.getIsReloading()).toBe(true);

    manager.update(2000, 0.016);
    expect(weapon.currentAmmo).toBe(1);
    expect(weapon.currentReserveAmmo).toBe(2);
    expect(weapon.getIsReloading()).toBe(true);

    expect(manager.shoot(camera, 2000)).not.toBeNull();
    expect(weapon.currentAmmo).toBe(0);
    expect(weapon.getIsReloading()).toBe(false);
  });

  it('uses the XM1014 0.55 second start and 0.30 second per-shell timing', () => {
    const manager = new WeaponManager();
    manager.switchWeapon('xm1014');
    manager.update(500, 1);
    const weapon = manager.getCurrentWeapon();
    weapon.currentAmmo = 0;
    weapon.currentReserveAmmo = 3;

    manager.startReload(1000);
    manager.update(1849, 0.016);
    expect(weapon.currentAmmo).toBe(0);
    manager.update(1850, 0.016);
    expect(weapon.currentAmmo).toBe(1);
    manager.update(2150, 0.016);
    expect(weapon.currentAmmo).toBe(2);
  });

  it('cancels an in-progress reload when the weapon is holstered', () => {
    const manager = new WeaponManager();
    const pistol = manager.getCurrentWeapon();
    pistol.currentAmmo = 5;
    pistol.currentReserveAmmo = 20;

    manager.startReload(1000);
    manager.switchWeapon('knife');
    manager.update(5000, 4);
    manager.switchWeapon('pistol');

    expect(pistol.currentAmmo).toBe(5);
    expect(pistol.currentReserveAmmo).toBe(20);
    expect(pistol.getIsReloading()).toBe(false);
  });

  it('uses the ReGameDLL AK47 accuracy formula for standing, moving, and airborne fire', () => {
    const manager = new WeaponManager();
    manager.switchWeapon('ak47');
    const ak47 = manager.getCurrentWeapon();
    const standing = { grounded: true, crouched: false, horizontalSpeed: 0, aiming: false };

    expect(ak47.getCs16Spread(standing)).toBeCloseTo(0.0055, 7);

    expect(ak47.shoot(1000)).toBe(true);
    expect(ak47.getCs16Spread(standing)).toBeCloseTo(0.0275 * 0.355, 7);
    expect(ak47.getCs16Spread({ ...standing, horizontalSpeed: 1.41 })).toBeCloseTo(0.04 + 0.07 * 0.355, 7);
    expect(ak47.getCs16Spread({ ...standing, grounded: false })).toBeCloseTo(0.04 + 0.4 * 0.355, 7);
  });

  it('restores AK47 base accuracy using the GoldSrc 0.4 second delay and 0.0225 second ticks', () => {
    const manager = new WeaponManager();
    manager.switchWeapon('ak47');
    const ak47 = manager.getCurrentWeapon();
    const standing = { grounded: true, crouched: false, horizontalSpeed: 0, aiming: false };

    ak47.shoot(1000);
    ak47.shoot(1096);
    expect(ak47.getCs16Spread(standing)).toBeCloseTo(0.0275 * 0.39, 7);

    ak47.update(1495);
    expect(ak47.getCs16Spread(standing)).toBeCloseTo(0.0275 * 0.39, 7);
    ak47.update(1496);
    expect(ak47.getCs16Spread(standing)).toBeCloseTo(0.0275 * 0.39, 7);
    ak47.update(1518.6);
    expect(ak47.getCs16Spread(standing)).toBeCloseTo(0.0055, 7);
  });

  it('uses one-shot AK47 KickBack deltas instead of accumulating a synthetic recoil pattern', () => {
    const manager = new WeaponManager();
    manager.switchWeapon('ak47');
    const ak47 = manager.getCurrentWeapon();

    ak47.shoot(1000);
    expect(ak47.getLastCs16KickDegrees()).toMatchObject({ pitch: 1, yawMagnitude: 0.375 });

    ak47.shoot(1096);
    expect(ak47.getLastCs16KickDegrees()).toMatchObject({ pitch: 1.35, yawMagnitude: 0.45 });
  });

  it('feeds the current AK47 shot spread and consumes its camera kick exactly once', () => {
    const manager = new WeaponManager();
    const camera = new THREE.PerspectiveCamera();
    manager.switchWeapon('ak47');
    manager.update(500, 1);

    const result = manager.shoot(camera, 1000, {
      horizontalSpeed: 0,
      isGrounded: true
    });
    expect(result?.spread).toBeCloseTo(0.0055, 7);

    const firstKick = manager.consumeCameraKick();
    expect(firstKick.pitch).toBeCloseTo(THREE.MathUtils.degToRad(1), 7);
    expect(Math.abs(firstKick.yaw)).toBeCloseTo(THREE.MathUtils.degToRad(0.375), 7);
    expect(manager.consumeCameraKick()).toEqual({ pitch: 0, yaw: 0 });
  });

  it('uses the ReGameDLL M4A1 accuracy and KickBack formulas', () => {
    const manager = new WeaponManager();
    manager.switchWeapon('m4a1');
    const m4a1 = manager.getCurrentWeapon();
    const standing = { grounded: true, crouched: false, horizontalSpeed: 0, aiming: false };

    expect(m4a1.getCs16Spread(standing)).toBeCloseTo(0.004, 7);
    expect(m4a1.getCs16Spread({ ...standing, silenced: true })).toBeCloseTo(0.005, 7);

    m4a1.shoot(1000, undefined, standing);
    expect(m4a1.getLastCs16KickDegrees()).toMatchObject({ pitch: 0.65, yawMagnitude: 0.35 });
    expect(m4a1.getCs16Spread(standing)).toBeCloseTo(0.02 * (1 / 220 + 0.3), 7);
  });

  it('uses the ReGameDLL FAMAS accuracy and KickBack formulas', () => {
    const manager = new WeaponManager();
    manager.switchWeapon('famas');
    const famas = manager.getCurrentWeapon();
    const standing = { grounded: true, crouched: false, horizontalSpeed: 0, aiming: false };
    const moving = { ...standing, horizontalSpeed: 160 };

    expect(famas.getCs16Spread(standing)).toBeCloseTo(0.014, 7);
    expect(famas.getCs16Spread({ ...standing, burstMode: true })).toBeCloseTo(0.004, 7);

    famas.shoot(1000, undefined, standing);
    expect(famas.getLastCs16KickDegrees()).toMatchObject({ pitch: 0.625, yawMagnitude: 0.375 });
    expect(famas.getCs16Spread(standing)).toBeCloseTo(0.02 * (1 / 215 + 0.3) + 0.01, 7);

    const movingManager = new WeaponManager();
    movingManager.switchWeapon('famas');
    const movingFamas = movingManager.getCurrentWeapon();
    movingFamas.shoot(1000, undefined, moving);
    expect(movingFamas.getLastCs16KickDegrees()).toMatchObject({ pitch: 1, yawMagnitude: 0.45 });
  });

  it('attaches and detaches the M4A1 silencer with the CS1.6 two-second attack lock', () => {
    const manager = new WeaponManager();
    const camera = new THREE.PerspectiveCamera();
    manager.switchWeapon('m4a1');
    manager.update(500, 1);

    expect(manager.isSilenced()).toBe(false);
    expect(manager.secondaryAttack(1000)).toBe(true);
    expect(manager.isSilenced()).toBe(true);
    expect(manager.shoot(camera, 2999, { horizontalSpeed: 0, isGrounded: true })).toBeNull();
    const silencedShot = manager.shoot(camera, 3000, { horizontalSpeed: 0, isGrounded: true });
    expect(silencedShot?.damage).toBe(33);
    expect(silencedShot?.spread).toBeCloseTo(0.005, 7);

    expect(manager.secondaryAttack(3000)).toBe(true);
    expect(manager.isSilenced()).toBe(false);
    expect(manager.shoot(camera, 4999, { horizontalSpeed: 0, isGrounded: true })).toBeNull();
    manager.update(5000, 2);
    const unsilencedShot = manager.shoot(camera, 5000, { horizontalSpeed: 0, isGrounded: true });
    expect(unsilencedShot?.damage).toBe(32);
    expect(unsilencedShot?.spread).toBeCloseTo(0.004, 7);
  });

  it('attaches and detaches the USP silencer with the CS1.6 three-second attack lock', () => {
    const manager = new WeaponManager();
    const camera = new THREE.PerspectiveCamera();
    manager.switchWeapon('usp');
    manager.update(500, 1);

    expect(manager.isSilenced()).toBe(false);
    const unsilencedShot = manager.shoot(camera, 1000, { horizontalSpeed: 0, isGrounded: true });
    expect(unsilencedShot?.damage).toBe(34);
    expect(unsilencedShot?.spread).toBeCloseTo(0.008, 7);

    manager.update(1150, 2);
    expect(manager.secondaryAttack(1150)).toBe(true);
    expect(manager.isSilenced()).toBe(true);
    expect(manager.shoot(camera, 4149, { horizontalSpeed: 0, isGrounded: true })).toBeNull();
    const silencedShot = manager.shoot(camera, 4150, { horizontalSpeed: 0, isGrounded: true });
    expect(silencedShot?.damage).toBe(30);
    expect(silencedShot?.spread).toBeCloseTo(0.012, 7);
  });

  it('fires Glock burst rounds at the CS1.6 0.1 second cadence', () => {
    const manager = new WeaponManager();
    const camera = new THREE.PerspectiveCamera();
    manager.switchWeapon('glock');
    manager.update(500, 1);

    expect(manager.secondaryAttack(1000)).toBe(true);
    expect(manager.isBurstMode()).toBe(true);

    const first = manager.shoot(camera, 1000, { horizontalSpeed: 0, isGrounded: true });
    expect(first?.spread).toBeCloseTo(0.03, 7);
    expect(manager.getCurrentWeapon().currentAmmo).toBe(19);
    expect(manager.shoot(camera, 1499, { horizontalSpeed: 0, isGrounded: true })).toBeNull();

    expect(manager.consumeQueuedShots(camera, 1099, { horizontalSpeed: 0, isGrounded: true })).toEqual([]);
    const second = manager.consumeQueuedShots(camera, 1100, { horizontalSpeed: 0, isGrounded: true });
    expect(second).toHaveLength(1);
    expect(second[0].spread).toBeCloseTo(0.05, 7);
    expect(manager.getCurrentWeapon().currentAmmo).toBe(18);

    const third = manager.consumeQueuedShots(camera, 1200, { horizontalSpeed: 0, isGrounded: true });
    expect(third).toHaveLength(1);
    expect(third[0].spread).toBeCloseTo(0.05, 7);
    expect(manager.getCurrentWeapon().currentAmmo).toBe(17);
    expect(manager.consumeQueuedShots(camera, 1201, { horizontalSpeed: 0, isGrounded: true })).toEqual([]);

    expect(manager.shoot(camera, 1500, { horizontalSpeed: 0, isGrounded: true })).not.toBeNull();
  });

  it('fires FAMAS burst rounds with CS1.6 timing, spread, and damage', () => {
    const manager = new WeaponManager();
    const camera = new THREE.PerspectiveCamera();
    manager.switchWeapon('famas');
    manager.update(500, 1);

    expect(manager.secondaryAttack(1000)).toBe(true);
    expect(manager.isBurstMode()).toBe(true);

    const first = manager.shoot(camera, 1000, { horizontalSpeed: 0, isGrounded: true });
    expect(first?.damage).toBe(34);
    expect(first?.spread).toBeCloseTo(0.004, 7);
    expect(manager.getCurrentWeapon().currentAmmo).toBe(24);
    expect(manager.shoot(camera, 1549, { horizontalSpeed: 0, isGrounded: true })).toBeNull();

    expect(manager.consumeQueuedShots(camera, 1049, { horizontalSpeed: 0, isGrounded: true })).toEqual([]);
    const second = manager.consumeQueuedShots(camera, 1050, { horizontalSpeed: 0, isGrounded: true });
    expect(second).toHaveLength(1);
    expect(second[0]).toMatchObject({ damage: 30 });
    expect(second[0].spread).toBeCloseTo(0.004, 7);
    expect(manager.getCurrentWeapon().currentAmmo).toBe(23);

    expect(manager.consumeQueuedShots(camera, 1149, { horizontalSpeed: 0, isGrounded: true })).toEqual([]);
    const third = manager.consumeQueuedShots(camera, 1150, { horizontalSpeed: 0, isGrounded: true });
    expect(third).toHaveLength(1);
    expect(third[0]).toMatchObject({ damage: 30 });
    expect(third[0].spread).toBeCloseTo(0.004, 7);
    expect(manager.getCurrentWeapon().currentAmmo).toBe(22);

    expect(manager.shoot(camera, 1550, { horizontalSpeed: 0, isGrounded: true })).not.toBeNull();
  });
});
