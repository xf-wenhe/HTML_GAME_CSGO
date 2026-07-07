import { DEFAULT_HIT_MULTIPLIERS, DamageProfile, HitRegion } from './Combat.js';
import { RECOIL_PATTERNS } from './RecoilPatterns.js';
import { getCs16WeaponMovementMultipliers } from '../../../shared/cs16Movement.js';
import {
  getCs16PrimaryFireRate,
  getCs16ReloadSeconds,
  getCs16SilencerTiming,
  getCs16ShotgunReloadTiming,
  isCs16BurstWeapon,
  isCs16SilencerWeapon
} from '../../../shared/cs16WeaponTiming.js';
import {
  Cs16FireState,
  Cs16KickDegrees,
  getCs16AccuracyAfterShot,
  getCs16BaseAccuracy,
  getCs16KickDegrees,
  getCs16Spread,
  hasCs16AccuracyProfile
} from '../../../shared/cs16Ballistics.js';

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
  recoilPattern?: Array<{ x: number; y: number }>;
  unscopedSpreadMultiplier?: number;
  moveInaccuracy?: number;
  standRecovery?: number;
  movementSpeedMultiplier?: number;
  scopedMovementSpeedMultiplier?: number;
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
  public readonly recoilPattern: Array<{ x: number; y: number }>;
  public readonly unscopedSpreadMultiplier: number;
  public readonly moveInaccuracy: number;
  public readonly standRecovery: number;
  public readonly movementSpeedMultiplier: number;
  public readonly scopedMovementSpeedMultiplier: number;

  public currentAmmo: number;
  public currentReserveAmmo: number;
  private lastShotTime: number = 0;
  private isReloading: boolean = false;
  private reloadStartTime: number = 0;
  private reloadNextShellAt: number = 0;
  private reloadAttackUnlockAt: number = 0;
  private shotPressure = 0;
  private lastShotIndex = -1;
  private lastUpdateTime: number = 0; // 新增：用于帧间平滑计算
  private cs16ShotsFired = 0;
  private cs16Accuracy: number;
  private cs16DecreaseShotsAt = 0;
  private lastCs16Spread: number | undefined;
  private lastCs16Kick: Cs16KickDegrees | undefined;
  private silenced = false;
  private burstMode = false;
  private actionLockedUntil = 0;
  private secondaryLockedUntil = 0;

  constructor(config: WeaponConfig) {
    const cs16Movement = getCs16WeaponMovementMultipliers(config.id);
    const cs16FireRate = getCs16PrimaryFireRate(config.id);
    const cs16ReloadTime = getCs16ReloadSeconds(config.id);
    this.id = config.id;
    this.name = config.name;
    this.displayName = config.displayName ?? config.name;
    this.damage = config.damage;
    this.fireRate = cs16FireRate ?? config.fireRate;
    this.magazineSize = config.magazineSize;
    this.reloadTime = cs16ReloadTime ?? config.reloadTime;
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
    this.recoilPattern = RECOIL_PATTERNS[config.id] ?? config.recoilPattern ?? [
      { x: 0, y: 0.012 },
      { x: 0.006, y: 0.024 },
      { x: -0.008, y: 0.034 },
      { x: 0.012, y: 0.044 },
      { x: -0.014, y: 0.052 }
    ];
    this.unscopedSpreadMultiplier = config.unscopedSpreadMultiplier ?? 1;
    // CSGO中移动开枪惩罚非常高，如果未配置自动增加为站立散布的2.5倍
    this.moveInaccuracy = config.moveInaccuracy ?? (this.isMelee ? 0 : this.spread * 2.5);
    this.standRecovery = config.standRecovery ?? (this.recoilPattern.length > 15 ? 0.48 : 0.42);
    this.movementSpeedMultiplier = config.movementSpeedMultiplier ?? cs16Movement?.normal ?? 1;
    this.scopedMovementSpeedMultiplier = config.scopedMovementSpeedMultiplier ?? cs16Movement?.scoped ?? this.movementSpeedMultiplier;
    this.currentAmmo = this.magazineSize;
    this.cs16Accuracy = getCs16BaseAccuracy(this.id) ?? 0;
  }

  canShoot(): boolean {
    return !this.isReloading && (!this.ammoConsumed || this.currentAmmo > 0);
  }

  getIsReloading(): boolean {
    return this.isReloading;
  }

  isSilenced(): boolean {
    return isCs16SilencerWeapon(this.id) && this.silenced;
  }

  isBurstMode(): boolean {
    return isCs16BurstWeapon(this.id) && this.burstMode;
  }

  toggleSilencer(now: number = performance.now()): boolean {
    const silencerTiming = getCs16SilencerTiming(this.id);
    if (!silencerTiming || now < this.actionLockedUntil) return false;
    this.silenced = !this.silenced;
    this.actionLockedUntil = now + silencerTiming.adjustSeconds * 1000;
    this.secondaryLockedUntil = this.actionLockedUntil;
    return true;
  }

  toggleBurstMode(now: number = performance.now()): boolean {
    if (!isCs16BurstWeapon(this.id) || now < this.secondaryLockedUntil) return false;
    this.burstMode = !this.burstMode;
    this.secondaryLockedUntil = now + 300;
    return true;
  }

  cancelReload(): void {
    this.isReloading = false;
    this.reloadNextShellAt = 0;
    this.reloadAttackUnlockAt = 0;
  }

  shoot(
    now: number = performance.now(),
    fireCycleSeconds = 1 / this.fireRate,
    fireState: Cs16FireState = { grounded: true, crouched: false, horizontalSpeed: 0, aiming: false }
  ): boolean {
    if (now < this.actionLockedUntil) return false;
    const shotgunReload = getCs16ShotgunReloadTiming(this.id);
    if (shotgunReload && this.isReloading) {
      if (this.currentAmmo <= 0 || now < this.reloadAttackUnlockAt) return false;
      this.cancelReload();
    }
    if (!this.canShoot()) return false;

    const timeSinceLastShot = (now - this.lastShotTime) / 1000;
    if (timeSinceLastShot < fireCycleSeconds) return false;

    this.lastCs16Spread = getCs16Spread(this.id, this.cs16Accuracy, fireState);
    if (this.ammoConsumed) this.currentAmmo--;
    if (hasCs16AccuracyProfile(this.id)) {
      this.cs16ShotsFired++;
      this.cs16Accuracy = getCs16AccuracyAfterShot(this.id, this.cs16ShotsFired) ?? this.cs16Accuracy;
      this.lastCs16Kick = getCs16KickDegrees(this.id, this.cs16ShotsFired, fireState);
      this.cs16DecreaseShotsAt = now + 400;
    } else {
      this.lastCs16Kick = getCs16KickDegrees(this.id, 1, fireState);
    }
    // 【修复】每次射击将浮点恢复转正，确保连续点射时后坐力正确叠加
    this.lastShotIndex = Math.min(this.recoilPattern.length - 1, Math.max(0, Math.floor(this.lastShotIndex)) + 1);
    this.shotPressure = Math.min(1.6, this.shotPressure + (this.recoilPattern.length > 10 ? 0.06 : 0.16));
    this.lastShotTime = now;
    this.lastUpdateTime = now;
    return true;
  }

  applyShotRecovery(now: number, firedCycleSeconds: number, recoveryCycleSeconds: number): void {
    const recoveryDeltaMs = Math.max(0, firedCycleSeconds - recoveryCycleSeconds) * 1000;
    this.lastShotTime = now - recoveryDeltaMs;
  }

  startReload(now: number = performance.now()): void {
    if (!this.ammoConsumed || this.isReloading || this.currentAmmo === this.magazineSize || this.currentReserveAmmo <= 0) return;
    this.isReloading = true;
    this.reloadStartTime = now;
    const shotgunReload = getCs16ShotgunReloadTiming(this.id);
    if (shotgunReload) {
      this.reloadAttackUnlockAt = now + shotgunReload.startSeconds * 1000;
      this.reloadNextShellAt = this.reloadAttackUnlockAt + shotgunReload.shellSeconds * 1000;
    }
    this.resetCs16Accuracy();
  }

  update(now: number = performance.now()): void {
    // 获取 delta time 用于平滑过渡
    const dt = this.lastUpdateTime > 0 ? (now - this.lastUpdateTime) / 1000 : 0.016;
    this.lastUpdateTime = now;

    const shotgunReload = getCs16ShotgunReloadTiming(this.id);
    if (this.isReloading && shotgunReload) {
      while (
        this.isReloading &&
        now >= this.reloadNextShellAt &&
        this.currentAmmo < this.magazineSize &&
        this.currentReserveAmmo > 0
      ) {
        this.currentAmmo++;
        this.currentReserveAmmo--;
        this.reloadNextShellAt += shotgunReload.shellSeconds * 1000;
        if (this.currentAmmo >= this.magazineSize || this.currentReserveAmmo <= 0) {
          this.cancelReload();
        }
      }
    } else if (this.isReloading) {
      const reloadProgress = (now - this.reloadStartTime) / 1000;
      if (reloadProgress >= this.reloadTime) {
        const needed = this.magazineSize - this.currentAmmo;
        const loaded = Math.min(needed, this.currentReserveAmmo);
        this.currentAmmo += loaded;
        this.currentReserveAmmo -= loaded;
        this.isReloading = false;
      }
    }
    
    const timeSinceLastShot = (now - this.lastShotTime) / 1000;

    if (hasCs16AccuracyProfile(this.id) && this.cs16ShotsFired > 0 && now > this.cs16DecreaseShotsAt) {
      const elapsed = now - this.cs16DecreaseShotsAt;
      const ticks = Math.floor(elapsed / 22.5) + 1;
      this.cs16ShotsFired = Math.max(0, this.cs16ShotsFired - ticks);
      this.cs16DecreaseShotsAt += ticks * 22.5;
      if (this.cs16ShotsFired === 0) this.cs16Accuracy = getCs16BaseAccuracy(this.id) ?? 0;
    }
    
    // 【核心修复】取消0.4秒的瞬间清零，改为按时间(dt)逐帧平滑衰减后坐力
    if (!this.isReloading && this.lastShotTime > 0) {
      // 恢复延迟：仅当停止射击时间超过射击间隔的一小段（类似刚能开下一枪的瞬间）就开始迅速恢复
      const recoveryDelay = Math.max(0.05, (1 / this.fireRate) * 0.6);
      
      if (timeSinceLastShot > recoveryDelay) {
        // 准星扩散恢复：基于 standRecovery 参数。乘以8让数值在半秒左右能完全归零，模拟点射手感
        this.shotPressure = Math.max(0, this.shotPressure - this.standRecovery * dt * 8);
        
        // 后坐力弹道平滑下降（每秒降低约25发后坐力进度，支持2连发/3连发迅速复位）
        this.lastShotIndex = Math.max(-1, this.lastShotIndex - dt * 25);
      }
    }
  }

  getReloadProgress(now: number = performance.now()): number {
    if (!this.isReloading) return 1;
    const shotgunReload = getCs16ShotgunReloadTiming(this.id);
    if (shotgunReload) {
      const firstShellDuration = (shotgunReload.startSeconds + shotgunReload.shellSeconds) * 1000;
      if (this.reloadNextShellAt === this.reloadStartTime + firstShellDuration) {
        return Math.min((now - this.reloadStartTime) / firstShellDuration, 1);
      }
      return Math.min(1 - (this.reloadNextShellAt - now) / (shotgunReload.shellSeconds * 1000), 1);
    }
    return Math.min((now - this.reloadStartTime) / 1000 / this.reloadTime, 1);
  }

  getSpreadMultiplier(): number {
    // 调高压力惩罚系数，做到“首发极准，扫射失控”的效果
    return 1 + (this.shotPressure * 1.5);
  }

  getCs16Spread(state: Cs16FireState): number {
    const resolvedState = {
      ...state,
      silenced: state.silenced ?? this.isSilenced(),
      burstMode: state.burstMode ?? this.isBurstMode()
    };
    return getCs16Spread(this.id, this.cs16Accuracy, resolvedState) ?? this.getEffectiveSpread(
      state.horizontalSpeed > 0,
      state.aiming
    );
  }

  getLastShotSpread(fallbackState: Cs16FireState): number {
    return this.lastCs16Spread ?? this.getEffectiveSpread(fallbackState.horizontalSpeed > 0, fallbackState.aiming);
  }

  getLastCs16KickDegrees(): Cs16KickDegrees | undefined {
    return this.lastCs16Kick;
  }

  getEffectiveSpread(isMoving = false, isAiming = false): number {
    const aimingMultiplier = isAiming && !this.isMelee ? this.adsSpreadMultiplier : this.unscopedSpreadMultiplier;
    // 【核心修复】原配置的散布在空间计算中偏差太大，用 0.15 缩小首发散布基数
    const baseCSGOPrecision = this.spread * 0.15; 
    return baseCSGOPrecision * this.getSpreadMultiplier() * aimingMultiplier + (isMoving ? this.moveInaccuracy : 0);
  }

  getRecoilOffset(): { x: number; y: number } {
    if (this.lastShotIndex <= 0 || this.isMelee) return { x: 0, y: 0 };
    // 因为现在是平滑下降(浮点数)，此处用 Math.floor 转换获取弹道阵列索引
    const idx = Math.min(Math.floor(this.lastShotIndex) - 1, this.recoilPattern.length - 1);
    if (idx < 0) return { x: 0, y: 0 };
    return this.recoilPattern[idx];
  }

  getDamageProfile(): DamageProfile {
    return {
      baseDamage: this.damage,
      armorPenetration: this.armorPenetration,
      multipliers: this.hitMultipliers
    };
  }

  private resetCs16Accuracy(): void {
    const baseAccuracy = getCs16BaseAccuracy(this.id);
    if (baseAccuracy === undefined) return;
    this.cs16ShotsFired = 0;
    this.cs16Accuracy = baseAccuracy;
    this.cs16DecreaseShotsAt = 0;
    this.lastCs16Spread = undefined;
    this.lastCs16Kick = undefined;
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
      pellets: this.pellets,
      recoilPattern: this.recoilPattern,
      unscopedSpreadMultiplier: this.unscopedSpreadMultiplier,
      moveInaccuracy: this.moveInaccuracy,
      standRecovery: this.standRecovery,
      movementSpeedMultiplier: this.movementSpeedMultiplier,
      scopedMovementSpeedMultiplier: this.scopedMovementSpeedMultiplier
    });
  }
}
