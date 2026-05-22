import { DEFAULT_HIT_MULTIPLIERS, DamageProfile, HitRegion } from './Combat.js';

export interface WeaponConfig {
  id: string;
  name: string;
  displayName?: string;
  damage: number;
  fireRate: number;
  magazineSize: number;
  reloadTime: number;
  spread: number;
  projectileSpeed: number;
  ammoConsumed?: boolean;
  isMelee?: boolean;
  switchTime?: number;
  range?: number;
  reserveAmmo?: number;
  armorPenetration?: number;
  hitMultipliers?: Partial<Record<HitRegion, number>>;
  adsSpreadMultiplier?: number;
  pellets?: number;
}

export class Weapon {
  public readonly id: string;
  public readonly name: string;
  public readonly displayName: string;
  public readonly damage: number;
  public readonly fireRate: number;
  public readonly magazineSize: number;
  public readonly reloadTime: number;
  public readonly spread: number;
  public readonly projectileSpeed: number;
  public readonly ammoConsumed: boolean;
  public readonly isMelee: boolean;
  public readonly switchTime: number;
  public readonly range: number;
  public readonly reserveAmmo: number;
  public readonly armorPenetration: number;
  public readonly hitMultipliers: Record<HitRegion, number>;
  public readonly adsSpreadMultiplier: number;
  public readonly pellets: number;

  public currentAmmo: number;
  public currentReserveAmmo: number;
  private lastShotTime: number = 0;
  private isReloading: boolean = false;
  private reloadStartTime: number = 0;

  constructor(config: WeaponConfig) {
    this.id = config.id;
    this.name = config.name;
    this.displayName = config.displayName ?? config.name;
    this.damage = config.damage;
    this.fireRate = config.fireRate;
    this.magazineSize = config.magazineSize;
    this.reloadTime = config.reloadTime;
    this.spread = config.spread;
    this.projectileSpeed = config.projectileSpeed;
    this.ammoConsumed = config.ammoConsumed ?? true;
    this.isMelee = config.isMelee ?? false;
    this.switchTime = config.switchTime ?? 0.32;
    this.range = config.range ?? 65;
    this.reserveAmmo = config.reserveAmmo ?? this.magazineSize * 3;
    this.currentReserveAmmo = this.ammoConsumed ? this.reserveAmmo : 0;
    this.armorPenetration = config.armorPenetration ?? 0.45;
    this.hitMultipliers = { ...DEFAULT_HIT_MULTIPLIERS, ...config.hitMultipliers };
    this.adsSpreadMultiplier = config.adsSpreadMultiplier ?? 0.58;
    this.pellets = config.pellets ?? 1;
    this.currentAmmo = this.magazineSize;
  }

  canShoot(): boolean {
    return !this.isReloading && (!this.ammoConsumed || this.currentAmmo > 0);
  }

  getIsReloading(): boolean {
    return this.isReloading;
  }

  shoot(now: number = performance.now()): boolean {
    if (!this.canShoot()) return false;

    const timeSinceLastShot = (now - this.lastShotTime) / 1000;
    if (timeSinceLastShot < 1 / this.fireRate) return false;

    if (this.ammoConsumed) this.currentAmmo--;
    this.lastShotTime = now;
    return true;
  }

  startReload(now: number = performance.now()): void {
    if (!this.ammoConsumed || this.isReloading || this.currentAmmo === this.magazineSize || this.currentReserveAmmo <= 0) return;
    this.isReloading = true;
    this.reloadStartTime = now;
  }

  update(now: number = performance.now()): void {
    if (this.isReloading) {
      const reloadProgress = (now - this.reloadStartTime) / 1000;
      if (reloadProgress >= this.reloadTime) {
        const needed = this.magazineSize - this.currentAmmo;
        const loaded = Math.min(needed, this.currentReserveAmmo);
        this.currentAmmo += loaded;
        this.currentReserveAmmo -= loaded;
        this.isReloading = false;
      }
    }
  }

  getReloadProgress(now: number = performance.now()): number {
    if (!this.isReloading) return 1;
    return Math.min((now - this.reloadStartTime) / 1000 / this.reloadTime, 1);
  }

  getSpreadMultiplier(): number {
    return 1 + (this.magazineSize - this.currentAmmo) * 0.05;
  }

  getDamageProfile(): DamageProfile {
    return {
      baseDamage: this.damage,
      armorPenetration: this.armorPenetration,
      multipliers: this.hitMultipliers
    };
  }

  clone(): Weapon {
    return new Weapon({
      id: this.id,
      name: this.name,
      displayName: this.displayName,
      damage: this.damage,
      fireRate: this.fireRate,
      magazineSize: this.magazineSize,
      reloadTime: this.reloadTime,
      spread: this.spread,
      projectileSpeed: this.projectileSpeed,
      ammoConsumed: this.ammoConsumed,
      isMelee: this.isMelee,
      switchTime: this.switchTime,
      range: this.range,
      reserveAmmo: this.reserveAmmo,
      armorPenetration: this.armorPenetration,
      hitMultipliers: this.hitMultipliers,
      adsSpreadMultiplier: this.adsSpreadMultiplier,
      pellets: this.pellets
    });
  }
}
