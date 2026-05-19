import * as THREE from 'three';
import { Physics } from './Physics.js';
import * as CANNON from 'cannon-es';

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
  public readonly speed: number;
  public readonly detectionRange: number;
  public readonly attackRange: number;

  private mesh: THREE.Group;
  private body: CANNON.Body;
  private patrolPath: THREE.Vector3[];
  private currentPatrolIndex = 0;
  private lastAttackTime = 0;
  private attackCooldown = 1000;
  public readonly damage = 10;

  constructor(config: EnemyConfig, scene: THREE.Scene, physics: Physics) {
    this.id = `enemy_${Math.random().toString(36).substr(2, 9)}`;
    this.type = config.type;
    this.health = config.health ?? 100;
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

    const bodyGeometry = new THREE.BoxGeometry(1, 1.5, 0.5);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xcc0000 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.75;
    group.add(body);

    const headGeometry = new THREE.SphereGeometry(0.3);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.8;
    group.add(head);

    return group;
  }

  update(dt: number, playerPosition: THREE.Vector3, now: number): void {
    if (this.state === 'dead') return;

    this.mesh.position.set(this.body.position.x, this.body.position.y, this.mesh.position.y);

    const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);

    switch (this.state) {
      case 'idle':
      case 'patrol':
        if (distanceToPlayer < this.detectionRange) {
          this.state = 'chase';
        } else if (this.state === 'patrol') {
          this.patrol(dt);
        }
        break;

      case 'chase':
        if (distanceToPlayer > this.detectionRange * 1.5) {
          this.state = 'patrol';
        } else if (distanceToPlayer < this.attackRange) {
          this.state = 'attack';
        } else {
          this.moveTo(playerPosition, dt);
        }
        break;

      case 'attack':
        if (distanceToPlayer > this.attackRange * 1.2) {
          this.state = 'chase';
        } else {
          this.attack(now);
        }
        break;
    }
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

  private attack(now: number): void {
    if (now - this.lastAttackTime < this.attackCooldown) return;

    this.lastAttackTime = now;
  }

  takeDamage(amount: number): void {
    if (this.state === 'dead') return;

    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.die();
    }
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
}