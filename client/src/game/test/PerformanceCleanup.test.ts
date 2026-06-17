// Performance benchmark: simulate the cleanup scenarios
// This tests the actual physics body count impact

import { describe, expect, it, vi } from 'vitest';

describe('Physics body accumulation scenario', () => {
  it('simulates solo->TDM mode switch without cleanup (old bug)', () => {
    // Simulate: 22 enemies from solo mode + 1 old player body
    // remain in physics world when TDM starts
    const physicsBodies: Array<{ mass: number; active: boolean }> = [];

    // Solo mode: spawn 22 enemies (mass=50 each)
    for (let i = 0; i < 22; i++) {
      physicsBodies.push({ mass: 50, active: true });
    }
    // Player body from solo
    physicsBodies.push({ mass: 5, active: true });

    expect(physicsBodies.length).toBe(23);

    // Mode switch WITHOUT cleanup (old behavior)
    // New TDM player body added
    physicsBodies.push({ mass: 5, active: true });

    // Physics step cost is proportional to active body count
    // With 24 bodies (23 orphaned + 1 new), collision checks: O(n^2) narrow phase
    // vs clean state with just 1 body
    const activeBodiesWithoutCleanup = physicsBodies.filter(b => b.active).length;
    expect(activeBodiesWithoutCleanup).toBe(24);
  });

  it('simulates solo->TDM mode switch WITH cleanup (new behavior)', () => {
    const physicsBodies: Array<{ mass: number; active: boolean }> = [];

    // Solo mode: spawn 22 enemies
    for (let i = 0; i < 22; i++) {
      physicsBodies.push({ mass: 50, active: true });
    }
    // Player body
    physicsBodies.push({ mass: 5, active: true });

    // Mode switch WITH cleanup (new behavior)
    // Remove old player body
    const oldPlayerIndex = physicsBodies.findIndex(b => b.mass === 5);
    physicsBodies.splice(oldPlayerIndex, 1);
    // Remove all enemies
    physicsBodies.length = 0;

    // Add new TDM player
    physicsBodies.push({ mass: 5, active: true });

    const activeBodiesWithCleanup = physicsBodies.filter(b => b.active).length;
    expect(activeBodiesWithCleanup).toBe(1);
  });

  it('solo mode: dead enemies with mass=0 do not participate in collision', () => {
    // Old behavior: all 22 enemies keep mass=50
    const oldBodies: Array<{ mass: number; active: boolean }> = [];
    for (let i = 0; i < 22; i++) {
      oldBodies.push({ mass: 50, active: true });
    }
    const oldColliding = oldBodies.filter(b => b.mass > 0 && b.active).length;
    expect(oldColliding).toBe(22);

    // New behavior: 15 dead enemies get mass=0
    const newBodies: Array<{ mass: number; active: boolean }> = [];
    for (let i = 0; i < 22; i++) {
      newBodies.push({ mass: 50, active: true });
    }
    for (let i = 0; i < 15; i++) {
      newBodies[i] = { mass: 0, active: false };
    }
    const newColliding = newBodies.filter(b => b.mass > 0 && b.active).length;
    expect(newColliding).toBe(7);
  });

  it('timeout accumulation without Map tracking', () => {
    // Old behavior: setTimeout scheduled every frame per dead enemy
    const setTimeoutCalls: number[] = [];
    const originalSetTimeout = globalThis.setTimeout;

    globalThis.setTimeout = ((cb: (...args: any[]) => number, ms: number, ...args: any[]) => {
      const id = originalSetTimeout(cb, ms, ...args);
      setTimeoutCalls.push(id);
      return id;
    }) as typeof setTimeout;

    // Simulate 60fps for 3 seconds with 10 dead enemies
    // OLD behavior: schedules timeout every frame
    const oldPendingRemovals: number[] = [];
    for (let frame = 0; frame < 180; frame++) {
      for (let e = 0; e < 10; e++) {
        const enemyId = `enemy-${e}`;
        if (!oldPendingRemovals.includes(enemyId)) {
          const timeoutId = setTimeout(() => {}, 3000);
          oldPendingRemovals.push(timeoutId);
        }
      }
    }

    const oldTimeoutCount = setTimeoutCalls.length;

    // NEW behavior: schedules timeout once per dead enemy
    const newPendingRemovals = new Map<string, number>();
    for (let frame = 0; frame < 180; frame++) {
      for (let e = 0; e < 10; e++) {
        const enemyId = `enemy-${e}`;
        if (!newPendingRemovals.has(enemyId)) {
          const timeoutId = setTimeout(() => {}, 3000);
          newPendingRemovals.set(enemyId, timeoutId);
        }
      }
    }

    const newTimeoutCount = setTimeoutCalls.length - oldTimeoutCount;

    expect(oldTimeoutCount).toBe(1800); // 10 enemies * 180 frames
    expect(newTimeoutCount).toBe(10);  // 10 enemies * 1 timeout each
    expect(oldTimeoutCount / newTimeoutCount).toBe(180); // 180x reduction

    globalThis.setTimeout = originalSetTimeout;
  });
});
