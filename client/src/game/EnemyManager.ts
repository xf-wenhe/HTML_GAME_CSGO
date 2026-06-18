import { Enemy, EnemyConfig, EnemyDebugState } from './Enemy.js';
import { Physics } from './Physics.js';
import * as THREE from 'three';
import type { BoxSpec } from './MapData.js';

export class EnemyManager {
  private enemies = new Map<string, Enemy>();
  private scene: THREE.Scene;
  private physics: Physics;
  private lineOfSightColliders: BoxSpec[] = [];
  private enemyPool: Enemy[] = [];
  private poolSize = 10;
  private preloadingPromise: Promise<void> | null = null;
  private isPreloaded = false;
  private pendingRemovals: Map<string, number> = new Map();
  private stuckCheckInterval = 3.0;
  private stuckCheckAccum = 0;

  constructor(scene: THREE.Scene, physics: Physics) {
    this.scene = scene;
    this.physics = physics;
  }

  preloadEnemies(count: number = 5): Promise<void> {
    if (this.isPreloaded) return Promise.resolve();
    if (this.preloadingPromise) return this.preloadingPromise;

    this.preloadingPromise = this.preloadEnemiesInternal(count).then(() => {
      this.isPreloaded = true;
    });
    return this.preloadingPromise;
  }

  private async preloadEnemiesInternal(count: number): Promise<void> {
    const tempPosition = new THREE.Vector3(0, -1000, 0);
    const configs: EnemyConfig[] = [];

    for (let i = 0; i < Math.min(count, this.poolSize); i++) {
      configs.push({
        type: 'shooter',
        position: tempPosition.clone(),
        health: 100,
        speed: 2.15,
        botProfile: { weaponId: 'usp' }
      });
    }

    for (const config of configs) {
      const enemy = new Enemy(config, this.scene, this.physics, true);
      this.enemyPool.push(enemy);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  spawnEnemy(config: EnemyConfig): Enemy {
    let enemy: Enemy | null = null;

    if (this.enemyPool.length > 0) {
      enemy = this.enemyPool.pop()!;
      enemy.reset(config.position, config.health ?? 100, config.speed ?? 2.15, config.botProfile);
      enemy.setVisible(true);
    } else {
      enemy = new Enemy(config, this.scene, this.physics);
    }

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

  update(dt: number, playerPosition: THREE.Vector3, now: number, lineOfSightColliders: BoxSpec[] = [], canMove: boolean = true): number {
    this.stuckCheckAccum += dt;
    if (this.stuckCheckAccum >= this.stuckCheckInterval) {
      this.stuckCheckAccum = 0;
      this.recoverStuckEnemies();
    }

    let damage = 0;
    this.enemies.forEach((enemy, id) => {
      damage += enemy.update(dt, playerPosition, now, lineOfSightColliders, canMove);

      if (enemy.isDead() && !this.pendingRemovals.has(id)) {
        const timeoutId = window.setTimeout(() => {
          this.removeEnemy(id);
          this.pendingRemovals.delete(id);
        }, 3000);
        this.pendingRemovals.set(id, timeoutId);
      }
    });
    return damage;
  }

  getStuckEnemies(): { id: string; stuckTimer: number }[] {
    const stuck: { id: string; stuckTimer: number }[] = [];
    this.enemies.forEach((enemy) => {
      if (enemy.isStuck()) {
        stuck.push({ id: enemy.getDebugState().id, stuckTimer: enemy.getStuckTimer() });
      }
    });
    return stuck;
  }

  recoverStuckEnemies(): void {
    this.enemies.forEach((enemy) => {
      if (enemy.isStuck()) {
        enemy.advanceRouteIndex(2);
        if (typeof window !== 'undefined' && (window as any).__debugBots) {
          console.log(`[EnemyManager] Force-recovering ${enemy.getDebugState().id} to route index ${enemy.getDebugState().routeIndex}`);
        }
      }
    });
  }

  removeEnemy(id: string): void {
    const enemy = this.enemies.get(id);
    if (enemy) {
      enemy.dispose(this.scene, this.physics);
      this.enemies.delete(id);
    }
  }

  clear(): void {
    this.pendingRemovals.forEach((timeoutId) => clearTimeout(timeoutId));
    this.pendingRemovals.clear();
    this.enemies.forEach((enemy, id) => {
      if (enemy.isDead()) {
        enemy.dispose(this.scene, this.physics);
      } else {
        enemy.resetForPool();
        if (this.enemyPool.length < this.poolSize) {
          this.enemyPool.push(enemy);
        } else {
          enemy.dispose(this.scene, this.physics);
        }
      }
    });
    this.enemies.clear();
  }

  getAliveCount(): number {
    return Array.from(this.enemies.values()).filter(e => !e.isDead()).length;
  }

  getDebugStates(): EnemyDebugState[] {
    return this.getAllEnemies().map(enemy => enemy.getDebugState());
  }
}
