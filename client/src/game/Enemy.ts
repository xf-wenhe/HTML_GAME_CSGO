import * as THREE from 'three';
import { Physics } from './Physics.js';
import * as CANNON from 'cannon-es';
import { ASSETS, loadAsset } from './assets.js';
import { HitRegion, closestPointDistanceToRay } from './Combat.js';
import type { BoxSpec } from './MapData.js';

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

    this.mesh = this.createEnemyMesh();
    this.mesh.position.copy(config.position);
    scene.add(this.mesh);
    void this.loadModel();

    const shape = new CANNON.Box(new CANNON.Vec3(0.5, 1, 0.5));
    this.body = new CANNON.Body({
      mass: 50,
      shape: shape,
      position: new CANNON.Vec3(config.position.x, config.position.y, config.position.z),
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
      new THREE.TorusGeometry(0.58, 0.025, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xff4040, transparent: true, opacity: 0.72 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.03;
    group.add(ring);

    this.healthBar = new THREE.Group();
    this.healthBar.position.y = 2.35;
    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.08),
      new THREE.MeshBasicMaterial({ color: 0x130f0f, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
    );
    this.healthFill = new THREE.Mesh(
      new THREE.PlaneGeometry(0.86, 0.045),
      new THREE.MeshBasicMaterial({ color: 0xff3b30, side: THREE.DoubleSide })
    );
    this.healthFill.position.z = 0.002;
    this.healthBar.add(bg, this.healthFill);
    group.add(this.healthBar);

    return group;
  }

  update(dt: number, playerPosition: THREE.Vector3, now: number, lineOfSightColliders: BoxSpec[] = []): number {
    if (this.state === 'dead') return 0;

    this.mesh.position.set(this.body.position.x, this.body.position.y - 1, this.body.position.z);
    this.healthBar.lookAt(playerPosition);
    this.healthBar.visible = this.mesh.position.distanceTo(playerPosition) < 22;
    this.animate(dt);
    this.hitStunRemaining = Math.max(0, this.hitStunRemaining - dt);
    if (this.hitStunRemaining > 0) {
      this.body.velocity.x = 0;
      this.body.velocity.z = 0;
      return 0;
    }

    const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);
    const seesPlayer = hasLineOfSight(this.mesh.position.clone().add(new THREE.Vector3(0, 1.4, 0)), playerPosition, lineOfSightColliders);
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
    this.mesh.rotation.y = angle;
  }

  private animate(dt: number): void {
    const speed = Math.hypot(this.body.velocity.x, this.body.velocity.z);
    this.animationClock += dt * Math.max(2, speed * 4);
    const swing = Math.sin(this.animationClock) * Math.min(0.35, speed * 0.08);
    const leftArm = this.mesh.getObjectByName('left-arm');
    const rightArm = this.mesh.getObjectByName('right-arm');
    const leftLeg = this.mesh.getObjectByName('left-leg');
    const rightLeg = this.mesh.getObjectByName('right-leg');
    if (leftArm) leftArm.rotation.x = swing;
    if (rightArm) rightArm.rotation.x = -swing;
    if (leftLeg) leftLeg.rotation.x = -swing;
    if (rightLeg) rightLeg.rotation.x = swing;
    this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, speed > 0.1 ? -0.035 : 0, 0.08);
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
    this.healthFill.position.x = -(1 - healthRatio) * 0.43;
    this.flashHit(region);
    this.hitStunRemaining = region === 'head' ? 0.18 : 0.1;
    if (this.health <= 0) {
      this.health = 0;
      this.die();
    }
  }

  getRayHit(origin: THREE.Vector3, direction: THREE.Vector3, maxRange: number): { distance: number; region: HitRegion; point: THREE.Vector3 } | null {
    if (this.state === 'dead') return null;

    const base = this.mesh.position;
    const zones: Array<{ region: HitRegion; center: THREE.Vector3; radius: number }> = [
      { region: 'head', center: base.clone().add(new THREE.Vector3(0, 2.12, 0)), radius: 0.32 },
      { region: 'chest', center: base.clone().add(new THREE.Vector3(0, 1.48, 0)), radius: 0.48 },
      { region: 'stomach', center: base.clone().add(new THREE.Vector3(0, 1.02, 0)), radius: 0.44 },
      { region: 'arm', center: base.clone().add(new THREE.Vector3(-0.52, 1.25, 0)), radius: 0.2 },
      { region: 'arm', center: base.clone().add(new THREE.Vector3(0.52, 1.25, 0)), radius: 0.2 },
      { region: 'leg', center: base.clone().add(new THREE.Vector3(-0.2, 0.45, 0)), radius: 0.24 },
      { region: 'leg', center: base.clone().add(new THREE.Vector3(0.2, 0.45, 0)), radius: 0.24 }
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
    marker.position.set(0, region === 'head' ? 2.18 : region === 'leg' ? 0.5 : 1.35, -0.34);
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

  private async loadModel(): Promise<void> {
    const loaded = await loadAsset(ASSETS.enemy_assault);
    if (this.state === 'dead') return;

    const oldModel = this.mesh.children[0];
    this.mesh.remove(oldModel);
    loaded.position.set(0, 0, 0);
    this.assetSource = loaded.userData.assetSource === 'glb' ? 'glb' : 'fallback';
    this.mesh.add(loaded);
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
