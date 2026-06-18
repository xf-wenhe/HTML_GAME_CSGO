import * as THREE from 'three';
import { ASSETS, loadAsset } from './assets.js';
import { Weapon } from './Weapon.js';
import { WEAPON_DEFINITIONS } from './Weapons.js';
import { getWeaponPresentation, resolveWeaponPresentationId, type ViewmodelPresentation } from './WeaponPresentation.js';

export interface ShootResult {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  damage: number;
  pellets: number;
  isMelee: boolean;
  heavyMelee: boolean;
  spread: number;
  recoilOffset: { x: number; y: number };
}

export type WeaponFeedbackEvent =
  | { type: 'shoot'; weaponId: string }
  | { type: 'empty'; weaponId: string }
  | { type: 'reload'; weaponId: string };

export class WeaponManager {
  private weapons = new Map<string, Weapon>();
  private currentWeaponId = 'pistol';
  private camera: THREE.Camera | null = null;
  private weaponRoot = new THREE.Group();
  private currentModel: THREE.Object3D | null = null;
  private currentAssetSource: 'glb' | 'fallback' = 'fallback';
  private muzzleFlash: THREE.Mesh<THREE.ConeGeometry, THREE.MeshBasicMaterial>;
  private viewmodelLight: THREE.PointLight;
  private recoil = 0;
  private swayClock = 0;
  private switchProgress = 0;
  private switchDuration = 0;
  private aiming = false;
  private scoped = false;
  private meleeSwing = 0;
  private feedbackEvents: WeaponFeedbackEvent[] = [];
  private shotCounter = 0;

  constructor() {
    Object.entries(WEAPON_DEFINITIONS).forEach(([id, weapon]) => {
      this.weapons.set(id, weapon.clone());
    });

    this.weaponRoot.name = 'first-person-weapon';
    this.weaponRoot.position.set(0.46, -0.43, -0.82);
    this.weaponRoot.rotation.set(-0.08, -0.14, 0.02);

    this.muzzleFlash = new THREE.Mesh(
      new THREE.ConeGeometry(0.07, 0.26, 12),
      new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0, depthTest: false, depthWrite: false })
    );
    this.muzzleFlash.renderOrder = 999;
    this.muzzleFlash.rotation.x = -Math.PI / 2;
    this.muzzleFlash.position.set(0, 0.03, -0.92);
    this.weaponRoot.add(this.muzzleFlash);

    this.viewmodelLight = new THREE.PointLight(0xf2f6ff, 2.2, 3.2, 1.6);
    this.viewmodelLight.position.set(0.18, 0.15, -0.38);
    this.weaponRoot.add(this.viewmodelLight);
    void this.applyWeaponModel();
  }

  setPlayerCamera(camera: THREE.Camera): void {
    this.camera = camera;
    if (!camera.children.includes(this.weaponRoot)) {
      camera.add(this.weaponRoot);
    }
  }

  setViewModelVisible(visible: boolean): void {
    this.weaponRoot.visible = visible;
  }

  switchWeapon(weaponId: string): boolean {
    if (!this.weapons.has(weaponId) || weaponId === this.currentWeaponId) return this.weapons.has(weaponId);
    this.currentWeaponId = weaponId;
    const weapon = this.getCurrentWeapon();
    const viewmodel = this.getViewmodelPresentation();
    this.switchDuration = viewmodel?.draw.duration ?? weapon.switchTime;
    this.switchProgress = this.switchDuration;
    this.recoil = 0;
    this.aiming = false;
    this.scoped = false;
    void this.applyWeaponModel();
    return true;
  }

  getCurrentWeapon(): Weapon {
    const weapon = this.weapons.get(this.currentWeaponId);
    if (!weapon) {
      console.warn(`Weapon not found: ${this.currentWeaponId}, falling back to pistol`);
      this.currentWeaponId = 'pistol';
      return this.weapons.get('pistol')!;
    }
    return weapon;
  }

  getCurrentWeaponId(): string {
    return this.currentWeaponId;
  }

  getCurrentAssetSource(): 'glb' | 'fallback' {
    return this.currentAssetSource;
  }

  setAiming(aiming: boolean): void {
    this.scoped = aiming && this.isSniperWeapon(this.currentWeaponId);
    this.aiming = this.scoped;
  }

  isAiming(): boolean {
    return this.aiming;
  }

  isScoped(): boolean {
    return this.scoped;
  }

  shoot(camera: THREE.Camera, now: number = performance.now(), options: { heavyMelee?: boolean; isMoving?: boolean } = {}): ShootResult | null {
    const weapon = this.getCurrentWeapon();
    if (this.isSwitching()) return null;
    if (!weapon.shoot(now)) {
      if (weapon.currentAmmo === 0 && !weapon.getIsReloading()) {
        this.startReload(now);
        this.feedbackEvents.push({ type: 'empty', weaponId: weapon.id });
      }
      return null;
    }

    const heavyMelee = Boolean(options.heavyMelee && weapon.isMelee);
    this.recoil = weapon.isMelee ? Math.min(this.recoil + (heavyMelee ? 0.15 : 0.09), 0.24) : Math.min(this.recoil + 0.08, 0.26);
    this.meleeSwing = weapon.isMelee ? 1 : this.meleeSwing;
    this.muzzleFlash.material.opacity = weapon.isMelee ? 0 : 0.95;

    // 【修复核心1】真实的 CSGO 弹道偏转算法
    const spread = weapon.getEffectiveSpread(Boolean(options.isMoving), this.aiming);
    const recoilOffset = weapon.getRecoilOffset();

    // 在局部的 2D 平面（也就是玩家屏幕中心点）上计算随机圆圈散布
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * spread;
    const spreadX = Math.cos(angle) * radius;
    const spreadY = Math.sin(angle) * radius;

    // 构建相机局部坐标系的向量 (-Z 是屏幕中心方向，+Y 向上，+X 向右)
    const localDirection = new THREE.Vector3(
      spreadX + recoilOffset.x,
      spreadY + (weapon.isMelee ? 0 : recoilOffset.y), 
      -1
    ).normalize();

    // 这一步至关重要：把完美的屏幕空间弹道，转换到 3D 世界朝向！
    const direction = localDirection.applyQuaternion(camera.quaternion);

    this.feedbackEvents.push({ type: 'shoot', weaponId: weapon.id });

    return {
      origin: camera.position.clone(),
      direction,
      damage: heavyMelee ? Math.round(weapon.damage * 1.65) : weapon.damage,
      pellets: weapon.pellets,
      isMelee: weapon.isMelee,
      heavyMelee,
      spread,
      recoilOffset
    };
  }

  startReload(now: number = performance.now()): void {
    const weapon = this.getCurrentWeapon();
    const wasReloading = weapon.getIsReloading();
    weapon.startReload(now);
    if (!wasReloading && weapon.getIsReloading()) {
      this.aiming = false;
      this.scoped = false;
      this.feedbackEvents.push({ type: 'reload', weaponId: weapon.id });
    }
  }

  consumeFeedbackEvents(): WeaponFeedbackEvent[] {
    const events = [...this.feedbackEvents];
    this.feedbackEvents = [];
    return events;
  }

  update(now: number = performance.now(), dt = 0.016, isMoving = false): void {
    this.weapons.forEach(weapon => weapon.update(now));
    const weapon = this.getCurrentWeapon();
    const viewmodel = this.getViewmodelPresentation();
    this.recoil = Math.max(0, this.recoil - dt * (viewmodel?.recoil.recover ?? 0.9));
    this.meleeSwing = Math.max(0, this.meleeSwing - dt * 5.8);
    this.switchProgress = Math.max(0, this.switchProgress - dt);
    const swayConfig = viewmodel?.sway;
    this.swayClock += dt * (isMoving ? (swayConfig?.speedMove ?? 9) : (swayConfig?.speedIdle ?? 3.5));

    const swayAmount = isMoving ? (swayConfig?.move ?? [0.018, 0.014]) : (swayConfig?.idle ?? [0.006, 0.004]);
    const swayX = Math.sin(this.swayClock) * swayAmount[0];
    const swayY = Math.cos(this.swayClock * 1.7) * swayAmount[1];
    const switchRatio = this.switchDuration > 0 ? this.switchProgress / this.switchDuration : 0;
    const drawDip = Math.sin(switchRatio * Math.PI) * (viewmodel?.draw.dip ?? 0.34);
    const drawSlide = switchRatio * (viewmodel?.draw.slide ?? 0.18);
    const basePosition = viewmodel?.position ?? [0.46, -0.43, -0.82];
    const baseRotation = viewmodel?.rotation ?? [-0.08, -0.14, 0.02];
    const recoilConfig = viewmodel?.recoil;
    const adsX = this.aiming ? -0.25 : 0;
    const adsY = this.aiming ? 0.12 : 0;
    const adsZ = this.aiming ? -0.14 : 0;
    const knifeX = weapon.isMelee ? 0.18 : 0;
    const knifeY = weapon.isMelee ? -0.08 : 0;
    const swing = Math.sin(this.meleeSwing * Math.PI);
    this.weaponRoot.position.set(
      basePosition[0] + adsX + knifeX + swayX + drawSlide,
      basePosition[1] + adsY + knifeY + swayY - this.recoil * (recoilConfig?.lift ?? 0.1) - drawDip + swing * 0.08,
      basePosition[2] + adsZ + this.recoil * (weapon.isMelee ? 0.2 : (recoilConfig?.kick ?? 0.82)) + drawSlide
    );
    this.weaponRoot.rotation.set(
      baseRotation[0] - this.recoil * (recoilConfig?.lift ?? 0.28) - drawDip * 0.45 + swing * 0.72,
      baseRotation[1] + swayX * 0.55 + drawSlide - this.recoil * (recoilConfig?.yaw ?? 0) - swing * 0.55,
      baseRotation[2] + swayX * 0.38 + drawDip * 0.2 + this.recoil * (recoilConfig?.roll ?? 0) + swing * 0.46
    );
    const muzzle = viewmodel?.muzzle ?? [0, 0.03, -0.92];
    this.muzzleFlash.position.set(...muzzle);

    this.muzzleFlash.material.opacity = Math.max(0, this.muzzleFlash.material.opacity - dt * 9);
  }

  getMuzzleWorldPosition(): THREE.Vector3 {
    const muzzle = this.getViewmodelPresentation()?.muzzle ?? [0, 0.03, -0.92];
    const muzzleLocal = new THREE.Vector3(...muzzle);
    return muzzleLocal.applyMatrix4(this.weaponRoot.matrixWorld);
  }

  getEjectPosition(): THREE.Vector3 {
    const eject = this.getViewmodelPresentation()?.eject ?? [0.15, -0.02, -0.5];
    const ejectLocal = new THREE.Vector3(...eject);
    return ejectLocal.applyMatrix4(this.weaponRoot.matrixWorld);
  }

  shouldSpawnTracer(): boolean {
    this.shotCounter++;
    if (this.shotCounter % 3 === 0) {
      this.shotCounter = 0;
      return true;
    }
    return false;
  }

  dispose(): void {
    this.camera?.remove(this.weaponRoot);
  }

  isSwitching(): boolean {
    return this.switchProgress > 0;
  }

  private async applyWeaponModel(): Promise<void> {
    try {
      if (this.currentModel) {
        this.weaponRoot.remove(this.currentModel);
        this.currentModel = null;
      }

      const definition = ASSETS[this.resolveWeaponAssetId(this.currentWeaponId)];
      const model = definition ? await loadAsset(definition) : undefined;
      if (!model) return;

      this.currentAssetSource = model.userData.assetSource === 'glb' ? 'glb' : 'fallback';
      const viewmodel = this.getViewmodelPresentation();
      if (viewmodel) model.scale.multiplyScalar(viewmodel.scale);
      this.currentModel = model;
      this.weaponRoot.add(model);
      this.weaponRoot.add(this.muzzleFlash);
      this.setViewModelRenderOrder(model);
    } catch (error) {
      console.warn(`Failed to load weapon model for ${this.currentWeaponId}:`, error);
    }
  }

  private setViewModelRenderOrder(model: THREE.Object3D): void {
    model.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach(mat => {
        mat.depthTest = false;
        mat.depthWrite = false;
        mat.needsUpdate = true;
      });
      child.renderOrder = 999;
    });
    model.renderOrder = 999;
  }

  private resolveWeaponAssetId(weaponId: string): string {
    const cs16SliceId = resolveWeaponPresentationId(weaponId);
    if (cs16SliceId) return cs16SliceId;

    // CS 1.6 weapons first
    if (['glock', 'usp', 'p228', 'deagle', 'five_seven'].includes(weaponId)) return weaponId;
    if (['mp5', 'tmp', 'p90', 'mac10', 'ump45'].includes(weaponId)) return weaponId;
    if (['m3', 'xm1014'].includes(weaponId)) return weaponId;
    if (['ak47', 'm4a1', 'sg552', 'aug', 'galil', 'famas'].includes(weaponId)) return weaponId;
    if (['scout', 'sg550', 'g3sg1'].includes(weaponId)) return weaponId;
    if (['m249', 'hegrenade'].includes(weaponId)) return weaponId;

    // CS:GO weapons for compatibility
    if (['usp_s', 'p250', 'dual_berettas', 'r8', 'cz75', 'tec9', 'p2000', 'sidearm'].includes(weaponId)) return 'pistol';
    if (['heavy_pistol'].includes(weaponId)) return 'deagle';
    if (['m4a1s', 'm4a4', 'sentinel'].includes(weaponId)) return 'm4a1';
    if (['vandal'].includes(weaponId)) return 'ak47';
    if (['sg553'].includes(weaponId)) return 'sg552';
    if (['ssg08'].includes(weaponId)) return 'scout';
    if (['scar20'].includes(weaponId)) return 'g3sg1';
    if (['mp9', 'pp_bizon', 'mp7', 'mp5sd', 'specter'].includes(weaponId)) return 'mp5';
    if (['nova', 'mag7', 'sawedoff', 'bulldog'].includes(weaponId)) return 'm3';
    if (['negev'].includes(weaponId)) return 'm249';

    return weaponId;
  }

  private isSniperWeapon(weaponId: string): boolean {
    const sniperWeapons = new Set([
      'scout', 'ssg08', 'awp', 'sniper', 'g3sg1', 'sg550', 'scar20', 'operator'
    ]);
    return sniperWeapons.has(weaponId);
  }

  private getViewmodelPresentation(): ViewmodelPresentation | null {
    return getWeaponPresentation(this.currentWeaponId)?.viewmodel ?? null;
  }
}
