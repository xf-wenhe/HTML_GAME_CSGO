import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { EnemyManager } from '../EnemyManager.js';
import { SurvivalMode } from '../SurvivalMode.js';

function createEnemyManagerStub() {
  let alive = 0;
  return {
    spawnEnemy: vi.fn(() => {
      alive++;
      return {};
    }),
    getAliveCount: vi.fn(() => alive),
    clear: vi.fn(() => {
      alive = 0;
    })
  } as unknown as EnemyManager;
}

describe('SurvivalMode', () => {
  it('starts in prep, then spawns the first wave', () => {
    const enemies = createEnemyManagerStub();
    const mode = new SurvivalMode(enemies);

    mode.start(0);
    expect(mode.getStats(0).prepRemaining).toBeGreaterThan(0);

    const stats = mode.update(3, 3000);

    expect(stats.phase).toBe('playing');
    expect(stats.wave).toBe(1);
    expect(enemies.spawnEnemy).toHaveBeenCalledTimes(6);
  });

  it('records kills and score', () => {
    const mode = new SurvivalMode(createEnemyManagerStub());

    mode.start(0);
    mode.recordKill(new THREE.Vector3(1, 0, 1));

    const stats = mode.getStats(1000);
    expect(stats.kills).toBe(1);
    expect(stats.score).toBeGreaterThanOrEqual(100);
  });
});
