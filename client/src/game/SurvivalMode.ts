import * as THREE from 'three';
import { EnemyManager } from './EnemyManager.js';
import { EnemySpawnPoint } from './MapData.js';

export type GamePhase = 'menu' | 'playing' | 'waveComplete' | 'gameOver';
export type NpcDifficulty = 'easy' | 'normal' | 'hard' | 'expert';

export interface SurvivalStats {
  phase: GamePhase;
  wave: number;
  kills: number;
  score: number;
  enemiesRemaining: number;
  timeSurvived: number;
  prepRemaining: number;
  objective: string;
  difficulty: NpcDifficulty;
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
  private difficulty: NpcDifficulty = 'normal';
  private arenaSpawns: EnemySpawnPoint[] = [];

  constructor(private enemies: EnemyManager) {}

  start(now: number, difficulty: NpcDifficulty = 'normal', spawns: EnemySpawnPoint[] = []): void {
    this.arenaSpawns = spawns;
    this.phase = 'waveComplete';
    this.difficulty = difficulty;
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
      if (this.prepRemaining === 0 && this.arenaSpawns.length > 0) {
        this.beginNextWave();
      }
    }

    if (this.phase === 'playing' && this.enemies.getAliveCount() === 0 && this.waveTarget > 0 && this.waveKills >= this.waveTarget) {
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
      prepRemaining: this.prepRemaining,
      objective: this.currentObjective(),
      difficulty: this.difficulty
    };
  }

  private beginNextWave(): void {
    if (this.arenaSpawns.length === 0) return;
    this.phase = 'playing';
    this.wave++;
    this.waveKills = 0;
    const tuning = this.difficultyTuning();
    this.waveTarget = Math.min(Math.round((4 + this.wave * 2) * tuning.count), 22);

    for (let i = 0; i < this.waveTarget; i++) {
      const spawns = this.arenaSpawns;
      const spawn = spawns[(this.lastSpawnIndex + i) % spawns.length];
      if (!spawn) continue;
      const jitter = new THREE.Vector3((Math.random() - 0.5) * 2.2, 0, (Math.random() - 0.5) * 2.2);
      const position = spawn.position.clone().add(jitter);
      const type = this.wave >= 4 && i % 4 === 0 ? 'assault' : spawn.type;
      this.enemies.spawnEnemy({
        type,
        position,
        health: (90 + this.wave * 8) * tuning.health,
        speed: (type === 'assault' ? 3.4 + this.wave * 0.12 : 2.2 + this.wave * 0.08) * tuning.speed,
        patrolPath: [
          position.clone(),
          position.clone().add(new THREE.Vector3(3, 0, -2)),
          position.clone().add(new THREE.Vector3(-3, 0, -2))
        ]
      });
    }
    this.lastSpawnIndex = (this.lastSpawnIndex + this.waveTarget) % this.arenaSpawns.length;
  }

  private currentObjective(): string {
    if (this.phase === 'waveComplete') return `准备进入 ${this.wave === 0 ? '入口大厅' : '下一片区域'}，检查武器与投掷物`;
    const objectives = [
      '清理入口大厅，夺取第一道大门控制权',
      '推进中路仓库，肃清掩体后的敌人',
      '打开侧翼大门，清理 A/B 两侧房间',
      '守住爆破点并阻止敌人反扑',
      '完成撤离前清场，保持生命值'
    ];
    return objectives[Math.min(this.wave - 1, objectives.length - 1)];
  }

  private difficultyTuning(): { health: number; speed: number; count: number } {
    switch (this.difficulty) {
      case 'easy':
        return { health: 0.78, speed: 0.82, count: 0.75 };
      case 'hard':
        return { health: 1.22, speed: 1.12, count: 1.15 };
      case 'expert':
        return { health: 1.45, speed: 1.24, count: 1.3 };
      case 'normal':
      default:
        return { health: 1, speed: 1, count: 1 };
    }
  }
}
