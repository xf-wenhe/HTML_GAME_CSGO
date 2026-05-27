import * as THREE from 'three';
import { Physics } from './Physics.js';
import * as CANNON from 'cannon-es';
import { ASSETS, loadAsset } from './assets.js';
import { HitRegion, closestPointDistanceToRay } from './Combat.js';
import type { BoxSpec } from './MapData.js';

function markRaycastIgnore(root: THREE.Object3D): void {
  root.userData.raycastIgnore = true;
  root.traverse(child => {
    child.userData.raycastIgnore = true;
  });
}

export type EnemyType = 'patrol' | 'shooter' | 'assault';
export type EnemyState = 'idle' | 'patrol' | 'chase' | 'attack' | 'dead';

export interface EnemyConfig {
  position: THREE.Vector3;
  type: EnemyType;
  patrolPath?: THREE.Vector3[];
  health?: number;
  speed?: number;
}

export class Enemy {
  public readonly id: string;
  public type: EnemyType;
  public state: EnemyState = 'idle';
  public health: number;
  public readonly maxHealth: number;
  public readonly speed: number;
  public readonly detectionRange: number;
  public readonly attackRange: number;

  private mesh: THREE.Group;
  private healthBar!: THREE.Group;
  private healthFill!: THREE.Mesh;
  private body: CANNON.Body;
  private patrolPath: THREE.Vector3[];
  private currentPatrolIndex = 0;
  private lastAttackTime = 0;
  private attackCooldown = 1000;
  private animationClock = 0;
  private assetSource: 'glb' | 'fallback' = 'fallback';
  private hitStunRemaining = 0;
  private hitReact = 0;
  private healthBarRevealTime = 0;
  public readonly damage = 10;

  constructor(config: EnemyConfig, scene: THREE.Scene, physics: Physics) {
    this.id = `enemy_${Math.random().toString(36).substr(2, 9)}`;
    this.type = config.type;
    this.health = config.health ?? 100;
    this.maxHealth = this.health;
    this.speed = config.speed ?? 2;
    this.patrolPath = config.patrolPath ?? [];

    switch (this.type) {
      case 'patrol':
        this.detectionRange = 15;
        this.attackRange = 5;
        break;
      case 'shooter':
        this.detectionRange = 30;
        this.attackRange = 25;
        break;
      case 'assault':
        this.detectionRange = 20;
        this.attackRange = 2;
        break;
    }

    try {
      this.mesh = this.createEnemyMesh();
    } catch {
      this.mesh = new THREE.Group();
      this.mesh.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.8, 0.3), new THREE.MeshStandardMaterial({ color: 0x555555 })));
    }
    this.mesh.position.copy(config.position);
    markRaycastIgnore(this.mesh);
    scene.add(this.mesh);
    void this.loadModel();

    // 将碰撞盒尺寸改为 1.6米高 (0.8是半高)
    const shape = new CANNON.Box(new CANNON.Vec3(0.25, 0.8, 0.25));
    this.body = new CANNON.Body({
      mass: 50,
      shape: shape,
      // 保证生成时，脚底踩在地面，而不是整个身子卡在地下
      position: new CANNON.Vec3(config.position.x, config.position.y + 0.8, config.position.z),
      fixedRotation: true
    });
    physics.addBody(this.body);

    if (this.patrolPath.length > 0) {
      this.state = 'patrol';
    }
  }

  private createEnemyMesh(): THREE.Group {
    const group = new THREE.Group();

    const fallback = ASSETS.enemy_assault.fallback();
    fallback.userData.assetSource = 'fallback';
    group.add(fallback);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.21, 0.025, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xff4040, transparent: true, opacity: 0.72 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.03;
    group.add(ring);

    this.healthBar = new THREE.Group();
    this.healthBar.position.y = 0.85;
    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(0.32, 0.032),
      new THREE.MeshBasicMaterial({ color: 0x0a0a0a, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    // Border frame
    const border = new THREE.Mesh(
      new THREE.PlaneGeometry(0.34, 0.046),
      new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    border.position.z = -0.001;
    this.healthFill = new THREE.Mesh(
      new THREE.PlaneGeometry(0.30, 0.018),
      new THREE.MeshBasicMaterial({ color: 0x4bc263, side: THREE.DoubleSide })
    );
    this.healthFill.position.z = 0.002;
    this.healthBar.add(border, bg, this.healthFill);
    group.add(this.healthBar);

    return group;
  }

  update(dt: number, playerPosition: THREE.Vector3, now: number, lineOfSightColliders: BoxSpec[] = []): number {
    if (this.state === 'dead') return 0;

    // 将模型锚点完美对齐到物理盒子的底部（减去 0.8 的半高）
    this.mesh.position.set(this.body.position.x, this.body.position.y - 0.8, this.body.position.z);
    this.healthBar.lookAt(playerPosition);
    this.animate(dt);
    this.hitStunRemaining = Math.max(0, this.hitStunRemaining - dt);
    if (this.hitStunRemaining > 0) {
      this.body.velocity.x = 0;
      this.body.velocity.z = 0;
      return 0;
    }

    const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);
    const seesPlayer = hasLineOfSight(this.mesh.position.clone().add(new THREE.Vector3(0, 1.4, 0)), playerPosition, lineOfSightColliders);
    this.healthBarRevealTime = Math.max(0, this.healthBarRevealTime - dt);
    this.healthBar.visible = this.healthBarRevealTime > 0 && distanceToPlayer < 22 && seesPlayer;
    let damage = 0;

    switch (this.state) {
      case 'idle':
      case 'patrol':
        if (distanceToPlayer < this.detectionRange && seesPlayer) {
          this.state = 'chase';
        } else if (this.state === 'patrol') {
          this.patrol(dt);
        }
        break;

      case 'chase':
        if (distanceToPlayer > this.detectionRange * 1.5 || !seesPlayer) {
          this.state = 'patrol';
        } else if (distanceToPlayer < this.attackRange) {
          this.state = 'attack';
        } else {
          this.moveTo(playerPosition, dt);
        }
        break;

      case 'attack':
        if (distanceToPlayer > this.attackRange * 1.2 || !seesPlayer) {
          this.state = 'chase';
        } else {
          damage = this.attack(now);
        }
        break;
    }

    return damage;
  }

  private patrol(dt: number): void {
    if (this.patrolPath.length === 0) return;

    const target = this.patrolPath[this.currentPatrolIndex];
    const direction = new THREE.Vector3().subVectors(target, this.mesh.position);
    direction.y = 0;
    const distance = direction.length();

    if (distance < 0.5) {
      this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPath.length;
    } else {
      direction.normalize();
      this.body.velocity.x = direction.x * this.speed;
      this.body.velocity.z = direction.z * this.speed;
    }
  }

  private moveTo(target: THREE.Vector3, dt: number): void {
    const direction = new THREE.Vector3().subVectors(target, this.mesh.position);
    direction.y = 0;
    direction.normalize();

    this.body.velocity.x = direction.x * this.speed;
    this.body.velocity.z = direction.z * this.speed;

    const angle = Math.atan2(direction.x, direction.z);
    const delta = Math.atan2(Math.sin(angle - this.mesh.rotation.y), Math.cos(angle - this.mesh.rotation.y));
    const maxStep = Math.min(1, dt * 10);
    this.mesh.rotation.y += delta * maxStep;
  }

  private animate(dt: number): void {
    const speed = Math.hypot(this.body.velocity.x, this.body.velocity.z);
    const speedRatio = THREE.MathUtils.clamp(speed / Math.max(0.001, this.speed), 0, 1.25);
    this.animationClock += dt * (1.6 + speedRatio * 4.2);
    const t = this.animationClock;
    const stride = Math.sin(t * 1.05);
    const strideAmp = THREE.MathUtils.lerp(0.02, 0.22, speedRatio);
    const legSwing = stride * strideAmp;
    const armSwing = stride * strideAmp * 0.78;

    // Pivot groups — rotation happens at the joint, giving natural limb movement
    const lLegPivot = this.mesh.getObjectByName('left-leg-pivot');
    const rLegPivot = this.mesh.getObjectByName('right-leg-pivot');
    const lArmPivot = this.mesh.getObjectByName('left-arm-pivot');
    const rArmPivot = this.mesh.getObjectByName('right-arm-pivot');
    const headMesh  = this.mesh.getObjectByName('head');

    if (lLegPivot) lLegPivot.rotation.x = -legSwing;
    if (rLegPivot) rLegPivot.rotation.x = legSwing;
    if (lArmPivot) lArmPivot.rotation.x = armSwing;
    if (rArmPivot) rArmPivot.rotation.x = -armSwing;

    if (headMesh) {
      headMesh.rotation.y = THREE.MathUtils.lerp(headMesh.rotation.y, speed > 0.1 ? Math.sin(t * 1.2) * 0.025 : 0, 0.08);
    }
    const bob = speed > 0.08 ? Math.abs(Math.sin(t * 2.1)) * 0.015 * speedRatio : 0;
    this.mesh.position.y += bob;

    this.hitReact = Math.max(0, this.hitReact - dt * 3.6);
    const moveLean = speed > 0.08 ? -THREE.MathUtils.clamp(speedRatio * 0.03, 0.008, 0.03) : 0;
    this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, moveLean, 0.12);
    this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, -this.hitReact * 0.14, 0.22);
  }

  private attack(now: number): number {
    this.body.velocity.x = 0;
    this.body.velocity.z = 0;
    if (now - this.lastAttackTime < this.attackCooldown) return 0;

    this.lastAttackTime = now;
    return this.damage;
  }

  takeDamage(amount: number, region: HitRegion = 'chest'): void {
    if (this.state === 'dead') return;

    this.health -= amount;
    const healthRatio = Math.max(0, this.health / this.maxHealth);
    this.healthFill.scale.x = healthRatio;
    this.healthFill.position.x = -(1 - healthRatio) * 0.15;

    // Green → Yellow → Red gradient based on health
    const fillMat = this.healthFill.material as THREE.MeshBasicMaterial;
    if (healthRatio > 0.5) {
      fillMat.color.setHex(0x4bc263); // green
    } else if (healthRatio > 0.25) {
      fillMat.color.setHex(0xe8a030); // yellow
    } else {
      fillMat.color.setHex(0xff3b30); // red
    }

    this.flashHit(region);
    this.hitStunRemaining = region === 'head' ? 0.18 : 0.1;
    this.hitReact = Math.max(this.hitReact, region === 'head' ? 1 : 0.7);
    this.healthBarRevealTime = 1.2;
    if (this.health <= 0) {
      this.health = 0;
      this.die();
    }
  }

  getRayHit(origin: THREE.Vector3, direction: THREE.Vector3, maxRange: number): { distance: number; region: HitRegion; point: THREE.Vector3 } | null {
    if (this.state === 'dead') return null;

    const base = this.mesh.position;
    const zones: Array<{ region: HitRegion; center: THREE.Vector3; radius: number }> = [
      { region: 'head', center: base.clone().add(new THREE.Vector3(0, 1.45, 0)), radius: 0.15 },
      { region: 'chest', center: base.clone().add(new THREE.Vector3(0, 1.15, 0)), radius: 0.25 },
      { region: 'stomach', center: base.clone().add(new THREE.Vector3(0, 0.85, 0)), radius: 0.22 },
      { region: 'arm', center: base.clone().add(new THREE.Vector3(-0.35, 1.0, 0)), radius: 0.12 },
      { region: 'arm', center: base.clone().add(new THREE.Vector3(0.35, 1.0, 0)), radius: 0.12 },
      { region: 'leg', center: base.clone().add(new THREE.Vector3(-0.15, 0.4, 0)), radius: 0.15 },
      { region: 'leg', center: base.clone().add(new THREE.Vector3(0.15, 0.4, 0)), radius: 0.15 }
    ];

    let best: { distance: number; region: HitRegion; point: THREE.Vector3 } | null = null;
    zones.forEach(zone => {
      const ray = closestPointDistanceToRay(origin, direction, zone.center);
      if (ray.t < 0 || ray.t > maxRange || ray.distance > zone.radius) return;
      if (!best || ray.t < best.distance) {
        best = { distance: ray.t, region: zone.region, point: zone.center.clone() };
      }
    });
    return best;
  }

  private flashHit(region: HitRegion): void {
    const color = region === 'head' ? 0xffd166 : 0xff4d4d;
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(region === 'head' ? 0.12 : 0.08, 10, 8),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.82 })
    );
    marker.position.set(0, region === 'head' ? 1.65 : region === 'leg' ? 0.45 : 1.3, -0.34);
    marker.userData.life = 0;
    marker.name = 'hit-flash';
    this.mesh.add(marker);
    window.setTimeout(() => this.mesh.remove(marker), 90);
  }

  private die(): void {
    this.state = 'dead';
    this.body.velocity.set(0, 0, 0);
    this.mesh.rotation.x = Math.PI / 2;
    this.mesh.position.y = 0.5;
  }

  isDead(): boolean {
    return this.state === 'dead';
  }

  getPosition(): THREE.Vector3 {
    return this.mesh.position.clone();
  }

  dispose(scene: THREE.Scene, physics: Physics): void {
    scene.remove(this.mesh);
    physics.removeBody(this.body);
  }

  getHealthRatio(): number {
    return Math.max(0, this.health / this.maxHealth);
  }

  getAssetSource(): 'glb' | 'fallback' {
    return this.assetSource;
  }

  private normalizeHumanoidModel(model: THREE.Object3D, targetHeight: number): void {
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);

    const lateralMax = Math.max(size.x, size.z);
    if (size.y < lateralMax * 1.1) {
      if (size.z >= size.x && size.z > size.y) {
        model.rotateX(Math.PI / 2);
      } else if (size.x > size.z && size.x > size.y) {
        model.rotateZ(-Math.PI / 2);
      }
      box.setFromObject(model);
      box.getSize(size);
    }

    if (size.y > 0.0001) {
      const scaleFactor = targetHeight / size.y;
      model.scale.multiplyScalar(scaleFactor);
      box.setFromObject(model);
    }

    const center = new THREE.Vector3();
    box.getCenter(center);
    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y -= box.min.y;
  }

  private async loadModel(): Promise<void> {
    try {
      const loaded = await loadAsset(ASSETS.enemy_assault);
      if (this.state === 'dead' || !loaded) return;

      const oldModel = this.mesh.children[0];

      // 【重点】自动测量模型体积，强制将其缩放至 1.8 米高
      const box = new THREE.Box3().setFromObject(loaded);
      const size = new THREE.Vector3();
      box.getSize(size);

      if (size.y > 0.001) {
        const scale = 1.6 / size.y;
        loaded.scale.set(scale, scale, scale);
        // 修正锚点，让脚底板平齐
        box.setFromObject(loaded);
        loaded.position.y = -box.min.y;
      }

      this.mesh.remove(oldModel);
      this.assetSource = loaded.userData.assetSource === 'glb' ? 'glb' : 'fallback';
      this.mesh.add(loaded);
    } catch (e) {
      console.warn("加载模型失败", e);
    }
  }
}

export function hasLineOfSight(origin: THREE.Vector3, target: THREE.Vector3, colliders: BoxSpec[]): boolean {
  const direction = target.clone().sub(origin);
  const length = direction.length();
  if (length <= 0.001) return true;
  direction.normalize();
  return !colliders.some(collider => segmentIntersectsBox(origin, direction, length, collider));
}

function segmentIntersectsBox(origin: THREE.Vector3, direction: THREE.Vector3, length: number, box: BoxSpec): boolean {
  const min = box.position.clone().sub(box.size.clone().multiplyScalar(0.5));
  const max = box.position.clone().add(box.size.clone().multiplyScalar(0.5));
  let tMin = 0;
  let tMax = length;
  for (const axis of ['x', 'y', 'z'] as const) {
    const axisDirection = direction[axis];
    if (Math.abs(axisDirection) < 1e-6) {
      if (origin[axis] < min[axis] || origin[axis] > max[axis]) return false;
      continue;
    }
    const inv = 1 / axisDirection;
    let t1 = (min[axis] - origin[axis]) * inv;
    let t2 = (max[axis] - origin[axis]) * inv;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  return tMax >= 0 && tMin <= length;
}
