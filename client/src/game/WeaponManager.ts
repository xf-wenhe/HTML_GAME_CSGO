import * as THREE from 'three';
import { ASSETS, loadAsset } from './assets.js';
import { Weapon } from './Weapon.js';
import { WEAPON_DEFINITIONS } from './Weapons.js';

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
  private currentWeaponId = 'rifle';
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
  private meleeSwing = 0;
  private feedbackEvents: WeaponFeedbackEvent[] = [];

  constructor() {
    Object.entries(WEAPON_DEFINITIONS).forEach(([id, weapon]) => {
      this.weapons.set(id, weapon.clone());
    });

    this.weaponRoot.name = 'first-person-weapon';
    this.weaponRoot.position.set(0.46, -0.43, -0.82);
    this.weaponRoot.rotation.set(-0.08, -0.14, 0.02);

    this.muzzleFlash = new THREE.Mesh(
      new THREE.ConeGeometry(0.07, 0.26, 12),
      new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0 })
    );
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

  switchWeapon(weaponId: string): boolean {
    if (!this.weapons.has(weaponId) || weaponId === this.currentWeaponId) return this.weapons.has(weaponId);
    this.currentWeaponId = weaponId;
    const weapon = this.getCurrentWeapon();
    this.switchDuration = weapon.switchTime;
    this.switchProgress = weapon.switchTime;
    this.recoil = 0;
    void this.applyWeaponModel();
    return true;
  }

  getCurrentWeapon(): Weapon {
    return this.weapons.get(this.currentWeaponId)!;
  }

  getCurrentWeaponId(): string {
    return this.currentWeaponId;
  }

  getCurrentAssetSource(): 'glb' | 'fallback' {
    return this.currentAssetSource;
  }

  setAiming(aiming: boolean): void {
    const weapon = this.getCurrentWeapon();
    this.aiming = aiming && !weapon.isMelee;
  }

  isAiming(): boolean {
    return this.aiming;
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

    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const recoilOffset = weapon.getRecoilOffset();
    direction.x += recoilOffset.x;
    direction.y += recoilOffset.y;
    const spread = weapon.getEffectiveSpread(Boolean(options.isMoving), this.aiming);
    direction.x += (Math.random() - 0.5) * spread;
    direction.y += (Math.random() - 0.5) * spread;
    direction.z += (Math.random() - 0.5) * spread;
    direction.normalize();
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
    this.recoil = Math.max(0, this.recoil - dt * 0.9);
    this.meleeSwing = Math.max(0, this.meleeSwing - dt * 5.8);
    this.switchProgress = Math.max(0, this.switchProgress - dt);
    this.swayClock += dt * (isMoving ? 9 : 3.5);

    const swayX = Math.sin(this.swayClock) * (isMoving ? 0.018 : 0.006);
    const swayY = Math.cos(this.swayClock * 1.7) * (isMoving ? 0.014 : 0.004);
    const switchRatio = this.switchDuration > 0 ? this.switchProgress / this.switchDuration : 0;
    const drawDip = Math.sin(switchRatio * Math.PI) * 0.34;
    const drawSlide = switchRatio * 0.18;
    const weapon = this.getCurrentWeapon();
    const adsX = this.aiming ? -0.25 : 0;
    const adsY = this.aiming ? 0.12 : 0;
    const adsZ = this.aiming ? -0.14 : 0;
    const knifeX = weapon.isMelee ? 0.18 : 0;
    const knifeY = weapon.isMelee ? -0.08 : 0;
    const swing = Math.sin(this.meleeSwing * Math.PI);
    this.weaponRoot.position.set(
      0.46 + adsX + knifeX + swayX + drawSlide,
      -0.43 + adsY + knifeY + swayY - this.recoil * 0.1 - drawDip + swing * 0.08,
      -0.82 + adsZ + this.recoil * (weapon.isMelee ? 0.2 : 0.82) + drawSlide
    );
    this.weaponRoot.rotation.set(
      -0.08 - this.recoil * 0.28 - drawDip * 0.45 + swing * 0.72,
      -0.14 + swayX * 0.55 + drawSlide - swing * 0.55,
      0.02 + swayX * 0.38 + drawDip * 0.2 + swing * 0.46
    );

    this.muzzleFlash.material.opacity = Math.max(0, this.muzzleFlash.material.opacity - dt * 9);
  }

  dispose(): void {
    this.camera?.remove(this.weaponRoot);
  }

  isSwitching(): boolean {
    return this.switchProgress > 0;
  }

  private async applyWeaponModel(): Promise<void> {
    if (this.currentModel) {
      this.weaponRoot.remove(this.currentModel);
      this.currentModel = null;
    }

    const definition = ASSETS[this.currentWeaponId];
    const model = definition ? await loadAsset(definition) : undefined;
    if (!model || this.currentWeaponId !== definition?.id) return;

    this.currentAssetSource = model.userData.assetSource === 'glb' ? 'glb' : 'fallback';
    this.currentModel = model;
    this.weaponRoot.add(model);
    this.weaponRoot.add(this.muzzleFlash);
  }
}
