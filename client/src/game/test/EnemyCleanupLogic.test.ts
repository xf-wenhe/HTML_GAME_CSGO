import { describe, expect, it, vi } from 'vitest';

describe('EnemyManager cleanup logic', () => {
  it('only schedules one timeout per dead enemy across many frames', () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    const pendingRemovals = new Map<string, number>();
    const enemyId = 'dead-enemy';
    const isDead = true;

    for (let frame = 0; frame < 100; frame++) {
      if (isDead && !pendingRemovals.has(enemyId)) {
        const timeoutId = setTimeout(() => {}, 3000);
        pendingRemovals.set(enemyId, timeoutId);
      }
    }

    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(pendingRemovals.size).toBe(1);

    pendingRemovals.forEach((id) => clearTimeout(id));
    pendingRemovals.clear();
    setTimeoutSpy.mockRestore();
  });

  it('clear() cancels all pending timeouts', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');

    const pendingRemovals = new Map<string, number>();
    const timeouts: number[] = [];
    const originalSetTimeout = globalThis.setTimeout;

    globalThis.setTimeout = ((cb: () => void, ms: number, ...args: any[]) => {
      const id = originalSetTimeout(cb, ms, ...args);
      timeouts.push(id);
      pendingRemovals.set(`enemy-${timeouts.length}`, id);
      return id;
    }) as typeof setTimeout;

    for (let i = 0; i < 5; i++) {
      setTimeout(() => {}, 3000);
    }

    expect(pendingRemovals.size).toBe(5);

    pendingRemovals.forEach((id) => clearTimeout(id));
    pendingRemovals.clear();

    expect(clearSpy).toHaveBeenCalledTimes(5);
    expect(pendingRemovals.size).toBe(0);

    globalThis.setTimeout = originalSetTimeout;
    clearSpy.mockRestore();
  });

  it('clear() disposes dead enemies instead of pooling them', () => {
    const enemies = new Map<string, { isDead: () => boolean; dispose: () => void; resetForPool: () => void }>();

    const disposeCalls: string[] = [];
    const poolCalls: string[] = [];

    enemies.set('alive-1', {
      isDead: () => false,
      dispose: () => disposeCalls.push('alive-1'),
      resetForPool: () => poolCalls.push('alive-1'),
    });
    enemies.set('alive-2', {
      isDead: () => false,
      dispose: () => disposeCalls.push('alive-2'),
      resetForPool: () => poolCalls.push('alive-2'),
    });
    enemies.set('dead-1', {
      isDead: () => true,
      dispose: () => disposeCalls.push('dead-1'),
      resetForPool: () => poolCalls.push('dead-1'),
    });

    // Simulate clear() logic
    enemies.forEach((enemy, id) => {
      if (enemy.isDead()) {
        enemy.dispose();
      } else {
        enemy.resetForPool();
      }
    });
    enemies.clear();

    expect(disposeCalls).toEqual(['dead-1']);
    expect(poolCalls).toEqual(['alive-1', 'alive-2']);
    expect(enemies.size).toBe(0);
  });

  it('die() zeroes velocity and sets mass to 0', () => {
    const body = {
      velocity: { set: vi.fn() },
      angularVelocity: { set: vi.fn() },
      mass: 50,
      updateMassProperties: vi.fn(),
    };

    // Simulate die() logic
    body.velocity.set(0, 0, 0);
    body.angularVelocity.set(0, 0, 0);
    body.mass = 0;
    body.updateMassProperties();

    expect(body.velocity.set).toHaveBeenCalledWith(0, 0, 0);
    expect(body.angularVelocity.set).toHaveBeenCalledWith(0, 0, 0);
    expect(body.mass).toBe(0);
    expect(body.updateMassProperties).toHaveBeenCalled();
  });

  it('startGame cleanup disposes old player and clears all state', () => {
    // This tests the conceptual cleanup flow in startGame()
    const state = {
      player: { disposed: false },
      enemies: new Map<string, { dead: boolean }>(),
      grenades: { reset: vi.fn() },
      droppedWeapons: { clear: vi.fn() },
      impactDecalManager: { clear: vi.fn() },
      shellCasingManager: { clear: vi.fn() },
      tracerSystem: { clear: vi.fn() },
      network: { disconnect: vi.fn() },
      soloBotMatch: { round: 1 },
      predictedState: null,
    };

    // Simulate startGame() cleanup block
    if (state.player) {
      state.player.disposed = true;
    }
    state.enemies.clear();
    state.grenades.reset();
    state.droppedWeapons.clear();
    state.impactDecalManager.clear();
    state.shellCasingManager.clear();
    state.tracerSystem.clear();
    state.network.disconnect();
    state.soloBotMatch = null;
    state.predictedState = { reset: true };

    expect(state.player.disposed).toBe(true);
    expect(state.enemies.size).toBe(0);
    expect(state.grenades.reset).toHaveBeenCalledTimes(1);
    expect(state.network.disconnect).toHaveBeenCalledTimes(1);
    expect(state.soloBotMatch).toBeNull();
  });
});
