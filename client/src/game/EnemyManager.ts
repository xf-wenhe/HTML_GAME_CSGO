import { Enemy, EnemyConfig } from './Enemy.js';
import { Physics } from './Physics.js';
import * as THREE from 'three';
import type { BoxSpec } from './MapData.js';

export class EnemyManager {
  private enemies = new Map<string, Enemy>();
  private scene: THREE.Scene;
  private physics: Physics;
  private lineOfSightColliders: BoxSpec[] = [];

  constructor(scene: THREE.Scene, physics: Physics) {
    this.scene = scene;
    this.physics = physics;
  }

  spawnEnemy(config: EnemyConfig): Enemy {
    const enemy = new Enemy(config, this.scene, this.physics);
    this.enemies.set(enemy.id, enemy);
    return enemy;
  }

  getEnemy(id: string): Enemy | undefined {
    return this.enemies.get(id);
  }

  getAllEnemies(): Enemy[] {
    return Array.from(this.enemies.values());
  }

  setLineOfSightColliders(colliders: BoxSpec[]): void {
    this.lineOfSightColliders = colliders;
  }

  update(dt: number, playerPosition: THREE.Vector3, now: number): number {
    let damage = 0;
    this.enemies.forEach((enemy, id) => {
      damage += enemy.update(dt, playerPosition, now, this.lineOfSightColliders);

      if (enemy.isDead()) {
        setTimeout(() => {
          this.removeEnemy(id);
        }, 3000);
      }
    });
    return damage;
  }

  removeEnemy(id: string): void {
    const enemy = this.enemies.get(id);
    if (enemy) {
      enemy.dispose(this.scene, this.physics);
      this.enemies.delete(id);
    }
  }

  clear(): void {
    this.enemies.forEach((_, id) => this.removeEnemy(id));
  }

  getAliveCount(): number {
    return Array.from(this.enemies.values()).filter(e => !e.isDead()).length;
  }
}
