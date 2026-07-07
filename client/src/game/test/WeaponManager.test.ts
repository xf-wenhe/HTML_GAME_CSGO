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

  it('uses the ReGameDLL AWP spread, cycle, and kick', () => {
    const manager = new WeaponManager();
    const camera = new THREE.PerspectiveCamera();
    const standingScoped = { grounded: true, crouched: false, horizontalSpeed: 0, aiming: true };
    const standingUnscoped = { ...standingScoped, aiming: false };
    manager.switchWeapon('awp');
    manager.update(500, 1);
    const awp = manager.getCurrentWeapon();

    expect(awp.getCs16Spread(standingScoped)).toBeCloseTo(0.001, 7);
    expect(awp.getCs16Spread(standingUnscoped)).toBeCloseTo(0.081, 7);
    expect(awp.getCs16Spread({ ...standingScoped, crouched: true })).toBeCloseTo(0, 7);
    expect(awp.getCs16Spread({ ...standingScoped, horizontalSpeed: 11 })).toBeCloseTo(0.1, 7);
    expect(awp.getCs16Spread({ ...standingScoped, horizontalSpeed: 141 })).toBeCloseTo(0.25, 7);
    expect(awp.getCs16Spread({ ...standingScoped, grounded: false })).toBeCloseTo(0.85, 7);

    manager.cycleScope(1500);
    const first = manager.shoot(camera, 1500, { horizontalSpeed: 0, isGrounded: true });
    expect(first?.damage).toBe(115);
    expect(first?.spread).toBeCloseTo(0.001, 7);
    const firstKick = manager.consumeCameraKick();
    expect(firstKick.pitch).toBeCloseTo(THREE.MathUtils.degToRad(2), 7);
    expect(firstKick.yaw).toBe(0);
    expect(manager.shoot(camera, 2949, { horizontalSpeed: 0, isGrounded: true })).toBeNull();
    expect(manager.shoot(camera, 2950, { horizontalSpeed: 0, isGrounded: true })).not.toBeNull();
  });

  it('uses the ReGameDLL Scout damage, scoped spread, cycle, and kick', () => {
    const manager = new WeaponManager();
    const camera = new THREE.PerspectiveCamera();
    const standingScoped = { grounded: true, crouched: false, horizontalSpeed: 0, aiming: true };
    const standingUnscoped = { ...standingScoped, aiming: false };
    manager.switchWeapon('scout');
    manager.update(500, 1);
    const scout = manager.getCurrentWeapon();

    expect(scout.damage).toBe(75);
    expect(scout.getCs16Spread(standingScoped)).toBeCloseTo(0.007, 7);
    expect(scout.getCs16Spread(standingUnscoped)).toBeCloseTo(0.032, 7);
    expect(scout.getCs16Spread({ ...standingScoped, crouched: true })).toBeCloseTo(0, 7);
    expect(scout.getCs16Spread({ ...standingScoped, horizontalSpeed: 171 })).toBeCloseTo(0.075, 7);
    expect(scout.getCs16Spread({ ...standingScoped, grounded: false })).toBeCloseTo(0.2, 7);

    manager.cycleScope(1500);
    const first = manager.shoot(camera, 1500, { horizontalSpeed: 0, isGrounded: true });
    expect(first?.damage).toBe(75);
    expect(first?.spread).toBeCloseTo(0.007, 7);
    const firstKick = manager.consumeCameraKick();
    expect(firstKick.pitch).toBeCloseTo(THREE.MathUtils.degToRad(2), 7);
    expect(firstKick.yaw).toBe(0);
    expect(manager.shoot(camera, 2749, { horizontalSpeed: 0, isGrounded: true })).toBeNull();
    expect(manager.shoot(camera, 2750, { horizontalSpeed: 0, isGrounded: true })).not.toBeNull();
  });

  it('uses ReGameDLL semi-auto sniper damage, magazines, and scoped spread', () => {
    const manager = new WeaponManager();
    const scopedStanding = { grounded: true, crouched: false, horizontalSpeed: 0, aiming: true };
    const unscopedStanding = { ...scopedStanding, aiming: false };

    manager.switchWeapon('g3sg1');
    manager.update(500, 1);
    const g3sg1 = manager.getCurrentWeapon();
    expect(g3sg1.damage).toBe(80);
    expect(g3sg1.magazineSize).toBe(20);
    expect(g3sg1.getCs16Spread(scopedStanding)).toBeCloseTo(0.0011, 7);
    expect(g3sg1.getCs16Spread(unscopedStanding)).toBeCloseTo(0.0016, 7);
    expect(g3sg1.getCs16Spread({ ...scopedStanding, horizontalSpeed: 1 })).toBeCloseTo(0.003, 7);

    manager.switchWeapon('sg550');
    manager.update(1000, 1);
    const sg550 = manager.getCurrentWeapon();
    expect(sg550.damage).toBe(70);
    expect(sg550.magazineSize).toBe(30);
    expect(sg550.getCs16Spread(scopedStanding)).toBeCloseTo(0.005, 7);
    expect(sg550.getCs16Spread(unscopedStanding)).toBeCloseTo(0.03, 7);
    expect(sg550.getCs16Spread({ ...scopedStanding, horizontalSpeed: 1 })).toBeCloseTo(0.15, 7);
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

  it('uses ReGameDLL knife slash and stab damage', () => {
    const manager = new WeaponManager();
    const camera = new THREE.PerspectiveCamera();
    manager.switchWeapon('knife');
    manager.update(500, 1);

    const slash = manager.shoot(camera, 1000);
    expect(slash?.damage).toBe(15);
    expect(slash?.heavyMelee).toBe(false);

    const stabManager = new WeaponManager();
    stabManager.switchWeapon('knife');
    stabManager.update(500, 1);
    const stab = stabManager.shoot(camera, 1500, { heavyMelee: true });
    expect(stab?.damage).toBe(65);
    expect(stab?.heavyMelee).toBe(true);
  });

  it('exposes the shorter ReGameDLL knife stab reach on shot results', () => {
    const camera = new THREE.PerspectiveCamera();
    const slashManager = new WeaponManager();
    slashManager.switchWeapon('knife');
    slashManager.update(500, 1);

    const slash = slashManager.shoot(camera, 1000);
    expect(slash?.range).toBe(2.4);

    const stabManager = new WeaponManager();
    stabManager.switchWeapon('knife');
    stabManager.update(500, 1);

    const stab = stabManager.shoot(camera, 1500, { heavyMelee: true });
    expect(stab?.range).toBe(1.6);
  });

  it('uses ReGameDLL knife slash and stab attack timing', () => {
    const slashManager = new WeaponManager();
    const camera = new THREE.PerspectiveCamera();
    slashManager.switchWeapon('knife');
    slashManager.update(500, 1);

    expect(slashManager.shoot(camera, 1000)).not.toBeNull();
    expect(slashManager.shoot(camera, 1399)).toBeNull();
    expect(slashManager.shoot(camera, 1400)).not.toBeNull();

    const stabManager = new WeaponManager();
    stabManager.switchWeapon('knife');
    stabManager.update(500, 1);

    expect(stabManager.shoot(camera, 1500, { heavyMelee: true })).not.toBeNull();
    expect(stabManager.shoot(camera, 2599, { heavyMelee: true })).toBeNull();
    expect(stabManager.shoot(camera, 2600, { heavyMelee: true })).not.toBeNull();
  });

  it('uses CS1.6 independent knife primary and secondary attack locks', () => {
    const camera = new THREE.PerspectiveCamera();
    const slashManager = new WeaponManager();
    slashManager.switchWeapon('knife');
    slashManager.update(500, 1);

    const slash = slashManager.shoot(camera, 1000);
    expect(slash).not.toBeNull();
    slashManager.applyLocalMeleeResult(slash!, 1000, true);
    expect(slashManager.shoot(camera, 1499, { heavyMelee: true })).toBeNull();
    expect(slashManager.shoot(camera, 1500, { heavyMelee: true })).not.toBeNull();

    const stabManager = new WeaponManager();
    stabManager.switchWeapon('knife');
    stabManager.update(500, 1);

    const stab = stabManager.shoot(camera, 1000, { heavyMelee: true });
    expect(stab).not.toBeNull();
    stabManager.applyLocalMeleeResult(stab!, 1000, true);
    expect(stabManager.shoot(camera, 2099)).toBeNull();
    expect(stabManager.shoot(camera, 2100)).not.toBeNull();
  });

  it('uses ReGameDLL knife miss recovery after local melee misses', () => {
    const camera = new THREE.PerspectiveCamera();
    const slashManager = new WeaponManager();
    slashManager.switchWeapon('knife');
    slashManager.update(500, 1);

    const slash = slashManager.shoot(camera, 1000);
    expect(slash).not.toBeNull();
    slashManager.applyLocalMeleeResult(slash!, 1000, false);
    expect(slashManager.shoot(camera, 1349)).toBeNull();
    expect(slashManager.shoot(camera, 1350)).not.toBeNull();

    const stabManager = new WeaponManager();
    stabManager.switchWeapon('knife');
    stabManager.update(500, 1);

    const stab = stabManager.shoot(camera, 1500, { heavyMelee: true });
    expect(stab).not.toBeNull();
    stabManager.applyLocalMeleeResult(stab!, 1500, false);
    expect(stabManager.shoot(camera, 2499, { heavyMelee: true })).toBeNull();
    expect(stabManager.shoot(camera, 2500, { heavyMelee: true })).not.toBeNull();
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
      dual_berettas: 4.5,
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

  it('uses ReGameDLL M3 buckshot damage and pellet count', () => {
    const manager = new WeaponManager();
    const camera = new THREE.PerspectiveCamera();
    manager.switchWeapon('m3');
    manager.update(500, 1);

    const shot = manager.shoot(camera, 1000);

    expect(shot?.damage).toBe(20);
    expect(shot?.pellets).toBe(9);
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

  it('uses ReGameDLL XM1014 buckshot damage and pellet count', () => {
    const manager = new WeaponManager();
    const camera = new THREE.PerspectiveCamera();
    manager.switchWeapon('xm1014');
    manager.update(500, 1);

    const shot = manager.shoot(camera, 1000);

    expect(shot?.damage).toBe(20);
    expect(shot?.pellets).toBe(6);
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

  it('uses the ReGameDLL Galil accuracy and KickBack formulas', () => {
    const manager = new WeaponManager();
    manager.switchWeapon('galil');
    const galil = manager.getCurrentWeapon();
    const standing = { grounded: true, crouched: false, horizontalSpeed: 0, aiming: false };

    expect(galil.getCs16Spread(standing)).toBeCloseTo(0.0375 * 0.2, 7);
    expect(galil.getCs16Spread({ ...standing, horizontalSpeed: 1.41 })).toBeCloseTo(0.04 + 0.07 * 0.2, 7);
    expect(galil.getCs16Spread({ ...standing, grounded: false })).toBeCloseTo(0.04 + 0.3 * 0.2, 7);

    galil.shoot(1000, undefined, standing);
    expect(galil.getLastCs16KickDegrees()).toMatchObject({ pitch: 0.65, yawMagnitude: 0.35 });
    expect(galil.getCs16Spread(standing)).toBeCloseTo(0.0375 * (1 / 200 + 0.35), 7);
  });

  it('uses the ReGameDLL scoped-rifle accuracy and KickBack formulas for SG552 and AUG', () => {
    const standing = { grounded: true, crouched: false, horizontalSpeed: 0, aiming: false };
    const moving = { ...standing, horizontalSpeed: 160 };

    const sgManager = new WeaponManager();
    sgManager.switchWeapon('sg552');
    const sg552 = sgManager.getCurrentWeapon();
    expect(sg552.getCs16Spread(standing)).toBeCloseTo(0.004, 7);
    expect(sg552.getCs16Spread({ ...standing, horizontalSpeed: 141 })).toBeCloseTo(0.035 + 0.075 * 0.2, 7);
    sg552.shoot(1000, undefined, standing);
    expect(sg552.getLastCs16KickDegrees()).toMatchObject({ pitch: 0.625, yawMagnitude: 0.375 });
    expect(sg552.getCs16Spread(standing)).toBeCloseTo(0.02 * (1 / 220 + 0.3), 7);

    const augManager = new WeaponManager();
    augManager.switchWeapon('aug');
    const aug = augManager.getCurrentWeapon();
    expect(aug.getCs16Spread(standing)).toBeCloseTo(0.004, 7);
    expect(aug.getCs16Spread({ ...standing, horizontalSpeed: 141 })).toBeCloseTo(0.035 + 0.07 * 0.2, 7);
    aug.shoot(1000, undefined, moving);
    expect(aug.getLastCs16KickDegrees()).toMatchObject({ pitch: 1, yawMagnitude: 0.45 });
    expect(aug.getCs16Spread(standing)).toBeCloseTo(0.02 * (1 / 215 + 0.3), 7);
  });

  it('uses the ReGameDLL MP5N damage, accuracy, cycle, and KickBack', () => {
    const manager = new WeaponManager();
    const camera = new THREE.PerspectiveCamera();
    const standing = { grounded: true, crouched: false, horizontalSpeed: 0, aiming: false };
    manager.switchWeapon('mp5');
    manager.update(500, 1);
    const mp5 = manager.getCurrentWeapon();

    expect(mp5.getCs16Spread(standing)).toBeCloseTo(0, 7);

    const first = manager.shoot(camera, 1000, { horizontalSpeed: 0, isGrounded: true });
    expect(first?.damage).toBe(26);
    expect(first?.spread).toBeCloseTo(0, 7);

    const firstKick = mp5.getLastCs16KickDegrees();
    expect(firstKick).toMatchObject({ pitch: 0.25, yawMagnitude: 0.175 });
    expect(mp5.getCs16Spread(standing)).toBeCloseTo(0.04 * (1 / 220.1 + 0.45), 7);
    expect(mp5.getCs16Spread({ ...standing, grounded: false })).toBeCloseTo(0.2 * (1 / 220.1 + 0.45), 7);
    expect(manager.shoot(camera, 1074, { horizontalSpeed: 0, isGrounded: true })).toBeNull();
    expect(manager.shoot(camera, 1075, { horizontalSpeed: 0, isGrounded: true })).not.toBeNull();
  });

  it('uses the ReGameDLL P90 damage, accuracy, cycle, and KickBack', () => {
    const manager = new WeaponManager();
    const camera = new THREE.PerspectiveCamera();
    const standing = { grounded: true, crouched: false, horizontalSpeed: 0, aiming: false };
    manager.switchWeapon('p90');
    manager.update(500, 1);
    const p90 = manager.getCurrentWeapon();

    expect(p90.damage).toBe(21);
    expect(p90.getCs16Spread(standing)).toBeCloseTo(0.045 * 0.2, 7);

    const first = manager.shoot(camera, 1000, { horizontalSpeed: 0, isGrounded: true });
    expect(first?.damage).toBe(21);
    expect(first?.spread).toBeCloseTo(0.045 * 0.2, 7);

    const firstKick = p90.getLastCs16KickDegrees();
    expect(firstKick).toMatchObject({ pitch: 0.3, yawMagnitude: 0.225 });
    expect(p90.getCs16Spread(standing)).toBeCloseTo(0.045 * (1 / 175 + 0.45), 7);
    expect(p90.getCs16Spread({ ...standing, horizontalSpeed: 171 })).toBeCloseTo(0.115 * (1 / 175 + 0.45), 7);
    expect(p90.getCs16Spread({ ...standing, grounded: false })).toBeCloseTo(0.3 * (1 / 175 + 0.45), 7);
    expect(manager.shoot(camera, 1065, { horizontalSpeed: 0, isGrounded: true })).toBeNull();
    expect(manager.shoot(camera, 1066, { horizontalSpeed: 0, isGrounded: true })).not.toBeNull();
  });

  it('uses the ReGameDLL UMP45 damage, accuracy, cycle, and KickBack', () => {
    const manager = new WeaponManager();
    const camera = new THREE.PerspectiveCamera();
    const standing = { grounded: true, crouched: false, horizontalSpeed: 0, aiming: false };
    manager.switchWeapon('ump45');
    manager.update(500, 1);
    const ump45 = manager.getCurrentWeapon();

    expect(ump45.damage).toBe(30);
    expect(ump45.getCs16Spread(standing)).toBeCloseTo(0, 7);

    const first = manager.shoot(camera, 1000, { horizontalSpeed: 0, isGrounded: true });
    expect(first?.damage).toBe(30);
    expect(first?.spread).toBeCloseTo(0, 7);

    const firstKick = ump45.getLastCs16KickDegrees();
    expect(firstKick).toMatchObject({ pitch: 0.275, yawMagnitude: 0.2 });
    expect(ump45.getCs16Spread(standing)).toBeCloseTo(0.04 * (1 / 210 + 0.5), 7);
    expect(ump45.getCs16Spread({ ...standing, grounded: false })).toBeCloseTo(0.24 * (1 / 210 + 0.5), 7);
    expect(manager.shoot(camera, 1099, { horizontalSpeed: 0, isGrounded: true })).toBeNull();
    expect(manager.shoot(camera, 1100, { horizontalSpeed: 0, isGrounded: true })).not.toBeNull();
  });

  it('uses the ReGameDLL MAC-10 damage, accuracy, cycle, and KickBack', () => {
    const manager = new WeaponManager();
    const camera = new THREE.PerspectiveCamera();
    const standing = { grounded: true, crouched: false, horizontalSpeed: 0, aiming: false };
    manager.switchWeapon('mac10');
    manager.update(500, 1);
    const mac10 = manager.getCurrentWeapon();

    expect(mac10.damage).toBe(29);
    expect(mac10.getCs16Spread(standing)).toBeCloseTo(0.03 * 0.15, 7);

    const first = manager.shoot(camera, 1000, { horizontalSpeed: 0, isGrounded: true });
    expect(first?.damage).toBe(29);
    expect(first?.spread).toBeCloseTo(0.03 * 0.15, 7);

    const firstKick = mac10.getLastCs16KickDegrees();
    expect(firstKick).toMatchObject({ pitch: 0.775, yawMagnitude: 0.425 });
    expect(mac10.getCs16Spread(standing)).toBeCloseTo(0.03 * (1 / 200 + 0.6), 7);
    expect(mac10.getCs16Spread({ ...standing, grounded: false })).toBeCloseTo(0.375 * (1 / 200 + 0.6), 7);
    expect(manager.shoot(camera, 1069, { horizontalSpeed: 0, isGrounded: true })).toBeNull();
    expect(manager.shoot(camera, 1070, { horizontalSpeed: 0, isGrounded: true })).not.toBeNull();
  });

  it('uses the ReGameDLL TMP damage, accuracy, cycle, and KickBack', () => {
    const manager = new WeaponManager();
    const camera = new THREE.PerspectiveCamera();
    const standing = { grounded: true, crouched: false, horizontalSpeed: 0, aiming: false };
    manager.switchWeapon('tmp');
    manager.update(500, 1);
    const tmp = manager.getCurrentWeapon();

    expect(tmp.damage).toBe(20);
    expect(tmp.getCs16Spread(standing)).toBeCloseTo(0.03 * 0.2, 7);

    const first = manager.shoot(camera, 1000, { horizontalSpeed: 0, isGrounded: true });
    expect(first?.damage).toBe(20);
    expect(first?.spread).toBeCloseTo(0.03 * 0.2, 7);

    const firstKick = tmp.getLastCs16KickDegrees();
    expect(firstKick).toMatchObject({ pitch: 0.725, yawMagnitude: 0.375 });
    expect(tmp.getCs16Spread(standing)).toBeCloseTo(0.03 * (1 / 200 + 0.55), 7);
    expect(tmp.getCs16Spread({ ...standing, grounded: false })).toBeCloseTo(0.25 * (1 / 200 + 0.55), 7);
    expect(manager.shoot(camera, 1069, { horizontalSpeed: 0, isGrounded: true })).toBeNull();
    expect(manager.shoot(camera, 1070, { horizontalSpeed: 0, isGrounded: true })).not.toBeNull();
  });

  it('uses the ReGameDLL M249 accuracy, cycle, and KickBack', () => {
    const manager = new WeaponManager();
    const camera = new THREE.PerspectiveCamera();
    const standing = { grounded: true, crouched: false, horizontalSpeed: 0, aiming: false };
    manager.switchWeapon('m249');
    manager.update(500, 1);
    const m249 = manager.getCurrentWeapon();

    expect(m249.damage).toBe(32);
    expect(m249.getCs16Spread(standing)).toBeCloseTo(0.006, 7);
    expect(m249.getCs16Spread({ ...standing, horizontalSpeed: 141 })).toBeCloseTo(0.064, 7);
    expect(m249.getCs16Spread({ ...standing, grounded: false })).toBeCloseTo(0.145, 7);

    const first = manager.shoot(camera, 1000, { horizontalSpeed: 0, isGrounded: true });
    expect(first?.damage).toBe(32);
    expect(first?.spread).toBeCloseTo(0.006, 7);
    const firstKick = manager.consumeCameraKick();
    expect(firstKick.pitch).toBeCloseTo(THREE.MathUtils.degToRad(0.8), 7);
    expect(Math.abs(firstKick.yaw)).toBeCloseTo(THREE.MathUtils.degToRad(0.35), 7);
    expect(manager.shoot(camera, 1099, { horizontalSpeed: 0, isGrounded: true })).toBeNull();
    expect(manager.shoot(camera, 1100, { horizontalSpeed: 0, isGrounded: true })).not.toBeNull();
  });

  it('uses the ReGameDLL Desert Eagle damage, spread, cycle, and kick', () => {
    const manager = new WeaponManager();
    const camera = new THREE.PerspectiveCamera();
    manager.switchWeapon('deagle');
    manager.update(500, 1);

    const first = manager.shoot(camera, 1000, { horizontalSpeed: 0, isGrounded: true });
    expect(first?.damage).toBe(54);
    expect(first?.spread).toBeCloseTo(0.13 * (1 - 0.9), 7);

    const firstKick = manager.consumeCameraKick();
    expect(firstKick.pitch).toBeCloseTo(THREE.MathUtils.degToRad(2), 7);
    expect(firstKick.yaw).toBe(0);
    expect(manager.shoot(camera, 1224, { horizontalSpeed: 0, isGrounded: true })).toBeNull();
    expect(manager.shoot(camera, 1225, { horizontalSpeed: 0, isGrounded: true })).not.toBeNull();
  });

  it('uses the ReGameDLL P228 damage, spread, cycle, and kick', () => {
    const manager = new WeaponManager();
    const camera = new THREE.PerspectiveCamera();
    manager.switchWeapon('p228');
    manager.update(500, 1);

    const first = manager.shoot(camera, 1000, { horizontalSpeed: 0, isGrounded: true });
    expect(first?.damage).toBe(32);
    expect(first?.spread).toBeCloseTo(0.15 * (1 - 0.9), 7);

    const firstKick = manager.consumeCameraKick();
    expect(firstKick.pitch).toBeCloseTo(THREE.MathUtils.degToRad(2), 7);
    expect(firstKick.yaw).toBe(0);
    expect(manager.shoot(camera, 1199, { horizontalSpeed: 0, isGrounded: true })).toBeNull();
    expect(manager.shoot(camera, 1200, { horizontalSpeed: 0, isGrounded: true })).not.toBeNull();
  });

  it('uses the ReGameDLL Five-SeveN damage, spread, cycle, and kick', () => {
    const manager = new WeaponManager();
    const camera = new THREE.PerspectiveCamera();
    manager.switchWeapon('five_seven');
    manager.update(500, 1);

    const first = manager.shoot(camera, 1000, { horizontalSpeed: 0, isGrounded: true });
    expect(first?.damage).toBe(20);
    expect(first?.spread).toBeCloseTo(0.15 * (1 - 0.92), 7);

    const firstKick = manager.consumeCameraKick();
    expect(firstKick.pitch).toBeCloseTo(THREE.MathUtils.degToRad(2), 7);
    expect(firstKick.yaw).toBe(0);
    expect(manager.shoot(camera, 1199, { horizontalSpeed: 0, isGrounded: true })).toBeNull();
    expect(manager.shoot(camera, 1200, { horizontalSpeed: 0, isGrounded: true })).not.toBeNull();
  });

  it('uses the ReGameDLL Dual Elites damage, spread, cycle, and kick', () => {
    const manager = new WeaponManager();
    const camera = new THREE.PerspectiveCamera();
    expect(manager.switchWeapon('dual_berettas')).toBe(true);
    manager.update(500, 1);
    expect(manager.getCurrentWeaponId()).toBe('dual_berettas');
    expect(manager.getCurrentWeapon().magazineSize).toBe(30);
    expect(manager.getCurrentWeapon().reloadTime).toBe(4.5);

    const first = manager.shoot(camera, 1000, { horizontalSpeed: 0, isGrounded: true });
    expect(first?.damage).toBe(36);
    expect(first?.spread).toBeCloseTo(0.1 * (1 - 0.88), 7);

    const firstKick = manager.consumeCameraKick();
    expect(firstKick.pitch).toBeCloseTo(THREE.MathUtils.degToRad(2), 7);
    expect(firstKick.yaw).toBe(0);
    expect(manager.shoot(camera, 1199, { horizontalSpeed: 0, isGrounded: true })).toBeNull();
    expect(manager.shoot(camera, 1200, { horizontalSpeed: 0, isGrounded: true })).not.toBeNull();
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
