import * as THREE from 'three';
import { EnemyManager } from './EnemyManager.js';
import { INDUSTRIAL_ARENA } from './MapData.js';

export type GamePhase = 'menu' | 'playing' | 'waveComplete' | 'gameOver';

export interface SurvivalStats {
  phase: GamePhase;
  wave: number;
  kills: number;
  score: number;
  enemiesRemaining: number;
  timeSurvived: number;
  prepRemaining: number;
}

export class SurvivalMode {
  private phase: GamePhase = 'menu';
  private wave = 0;
  private kills = 0;
  private score = 0;
  private waveKills = 0;
  private waveTarget = 0;
  private prepRemaining = 0;
  private startedAt = 0;
  private lastSpawnIndex = 0;

  constructor(private enemies: EnemyManager) {}

  start(now: number): void {
    this.phase = 'waveComplete';
    this.wave = 0;
    this.kills = 0;
    this.score = 0;
    this.waveKills = 0;
    this.startedAt = now;
    this.prepRemaining = 2.5;
  }

  update(dt: number, now: number): SurvivalStats {
    if (this.phase === 'waveComplete') {
      this.prepRemaining = Math.max(0, this.prepRemaining - dt);
      if (this.prepRemaining === 0) {
        this.beginNextWave();
      }
    }

    if (this.phase === 'playing' && this.enemies.getAliveCount() === 0 && this.waveKills >= this.waveTarget) {
      this.phase = 'waveComplete';
      this.prepRemaining = 4;
    }

    return this.getStats(now);
  }

  recordKill(enemyPosition: THREE.Vector3): void {
    this.kills++;
    this.waveKills++;
    this.score += 100 + Math.max(0, Math.round(40 - enemyPosition.length()));
  }

  gameOver(): void {
    this.phase = 'gameOver';
    this.enemies.clear();
  }

  getStats(now: number = performance.now()): SurvivalStats {
    return {
      phase: this.phase,
      wave: this.wave,
      kills: this.kills,
      score: this.score,
      enemiesRemaining: this.enemies.getAliveCount(),
      timeSurvived: this.startedAt ? (now - this.startedAt) / 1000 : 0,
      prepRemaining: this.prepRemaining
    };
  }

  private beginNextWave(): void {
    this.phase = 'playing';
    this.wave++;
    this.waveKills = 0;
    this.waveTarget = Math.min(4 + this.wave * 2, 18);

    for (let i = 0; i < this.waveTarget; i++) {
      const spawn = INDUSTRIAL_ARENA.enemySpawns[(this.lastSpawnIndex + i) % INDUSTRIAL_ARENA.enemySpawns.length];
      const jitter = new THREE.Vector3((Math.random() - 0.5) * 2.2, 0, (Math.random() - 0.5) * 2.2);
      const position = spawn.position.clone().add(jitter);
      const type = this.wave >= 4 && i % 4 === 0 ? 'assault' : spawn.type;
      this.enemies.spawnEnemy({
        type,
        position,
        health: 90 + this.wave * 8,
        speed: type === 'assault' ? 3.4 + this.wave * 0.12 : 2.2 + this.wave * 0.08,
        patrolPath: [
          position.clone(),
          position.clone().add(new THREE.Vector3(3, 0, -2)),
          position.clone().add(new THREE.Vector3(-3, 0, -2))
        ]
      });
    }
    this.lastSpawnIndex = (this.lastSpawnIndex + this.waveTarget) % INDUSTRIAL_ARENA.enemySpawns.length;
  }
}
