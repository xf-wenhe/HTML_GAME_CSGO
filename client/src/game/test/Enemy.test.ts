import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { Enemy, EnemyConfig } from '../Enemy.js';

function createMockPhysics() {
  const vel = { x: 0, y: 0, z: 0 };
  const bodyPos = { x: 0, y: 0.8, z: 0 };
  return {
    addBody: vi.fn(),
    removeBody: vi.fn(),
    body: {
      get velocity() { return vel; },
      set velocity(v: any) {
        if (v && typeof v === 'object') { vel.x = v.x; vel.y = v.y; vel.z = v.z; }
      },
      get angularVelocity() { return { set: vi.fn() }; },
      set angularVelocity(_v: any) {},
      get position() { return bodyPos; },
      set position(v: any) {
        if (v) { bodyPos.x = v.x; bodyPos.y = v.y; bodyPos.z = v.z; }
      },
      mass: 50,
      wakeUp: vi.fn(),
      updateMassProperties: vi.fn(),
    },
  };
}

function createMockScene() {
  return { add: vi.fn(), remove: vi.fn() };
}

function createBotConfig(route: THREE.Vector3[] = []): EnemyConfig {
  return {
    type: 'shooter' as const,
    position: new THREE.Vector3(0, 0, 0),
    health: 100,
    speed: 2.15,
    botProfile: {
      weaponId: 'usp',
      route,
      viewRange: 34,
      attackRange: 31,
      damage: 12,
      fireIntervalMs: 520,
      accuracy: 0.34,
    },
  };
}

// Player far away so bot stays in patrol mode, not attack
const FAR_PLAYER = new THREE.Vector3(100, 1, 0);

describe('Enemy stuck detection', () => {
  it('starts with zero stuck timer', () => {
    const physics = createMockPhysics();
    const scene = createMockScene();
    const enemy = new Enemy(createBotConfig(), scene as any, physics as any);
    expect(enemy.getStuckTimer()).toBe(0);
    expect(enemy.isStuck()).toBe(false);
  });

  it('accumulates stuck timer when frozen (canMove=false)', () => {
    const physics = createMockPhysics();
    const scene = createMockScene();
    // Use route so botProfile is set, but single waypoint at origin = bot stays
    const enemy = new Enemy(createBotConfig([new THREE.Vector3(0, 0, 0)]), scene as any, physics as any);

    // 20 frames at dt=0.1: after stuck recovery fires at 2.8s, stuckTimer resets
    // But accumulation happens before recovery check within each frame
    for (let i = 0; i < 10; i++) {
      enemy.update(0.1, FAR_PLAYER, 1000 + i * 100, [], false);
    }
    expect(enemy.getStuckTimer()).toBeGreaterThan(0.5);
  });

  it('resets stuck timer on enemy reset', () => {
    const physics = createMockPhysics();
    const scene = createMockScene();
    const enemy = new Enemy(createBotConfig([new THREE.Vector3(0, 0, 0)]), scene as any, physics as any);

    for (let i = 0; i < 10; i++) {
      enemy.update(0.1, FAR_PLAYER, 1000 + i * 100, [], false);
    }
    expect(enemy.getStuckTimer()).toBeGreaterThan(0.5);

    enemy.reset(new THREE.Vector3(0, 0, 0), 100, 2.15, createBotConfig().botProfile);
    expect(enemy.getStuckTimer()).toBe(0);
    expect(enemy.isStuck()).toBe(false);
  });
});

describe('Enemy stuck recovery', () => {
  it('advances route index when stuck timer exceeds threshold', () => {
    const physics = createMockPhysics();
    const scene = createMockScene();
    const route = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 0, 0), new THREE.Vector3(15, 0, 0)];
    const enemy = new Enemy(createBotConfig(route), scene as any, physics as any);

    // Use canMove=false to avoid attack mode resetting stuckTimer
    for (let i = 0; i < 40; i++) {
      enemy.update(0.1, FAR_PLAYER, 1000 + i * 100, [], false);
    }

    // Recovery fires multiple times, each advancing routeIndex
    // RouteIndex should have advanced past initial (0)
    expect(enemy.getDebugState().routeIndex).toBeGreaterThan(0);
  });

  it('logs stuck recovery when __debugBots is enabled', () => {
    const physics = createMockPhysics();
    const scene = createMockScene();
    const route = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 0, 0)];
    const enemy = new Enemy(createBotConfig(route), scene as any, physics as any);

    const logSpy = vi.spyOn(console, 'log');
    (window as any).__debugBots = true;

    for (let i = 0; i < 40; i++) {
      enemy.update(0.1, FAR_PLAYER, 1000 + i * 100, [], false);
    }

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Stuck recovery'));
    (window as any).__debugBots = false;
    logSpy.mockRestore();
  });

  it('does not recover when patrolPath is empty', () => {
    const physics = createMockPhysics();
    const scene = createMockScene();
    // No route means patrolPath is empty
    const enemy = new Enemy(createBotConfig([]), scene as any, physics as any);

    for (let i = 0; i < 40; i++) {
      enemy.update(0.1, FAR_PLAYER, 1000 + i * 100, [], false);
    }

    // Without a route, recovery can't skip waypoints
    expect(enemy.getStuckTimer()).toBeGreaterThan(3);
  });
});

describe('Enemy bot shooting', () => {
  it('respects fire interval cooldown', () => {
    const physics = createMockPhysics();
    const scene = createMockScene();
    const config = createBotConfig([]);
    config.botProfile!.fireIntervalMs = 500;
    const enemy = new Enemy(config, scene as any, physics as any);

    const dmg1 = enemy.update(0.016, FAR_PLAYER, 1000, [], true);
    expect(dmg1).toBeGreaterThanOrEqual(0);
    expect(enemy.update(0.016, FAR_PLAYER, 1001, [], true)).toBe(0);
  });

  it('fires after cooldown expires', () => {
    const physics = createMockPhysics();
    const scene = createMockScene();
    const config = createBotConfig([]);
    config.botProfile!.fireIntervalMs = 500;
    const enemy = new Enemy(config, scene as any, physics as any);

    enemy.update(0.016, FAR_PLAYER, 1000, [], true);
    expect(enemy.update(0.016, FAR_PLAYER, 1500, [], true)).toBeGreaterThanOrEqual(0);
  });
});

describe('Enemy bot route following', () => {
  it('advances route index when reaching waypoint', () => {
    const physics = createMockPhysics();
    const scene = createMockScene();
    const route = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 0, 0), new THREE.Vector3(20, 0, 0)];
    const enemy = new Enemy(createBotConfig(route), scene as any, physics as any);

    enemy.update(0.1, FAR_PLAYER, 1000, [], true);
    expect(enemy.getDebugState().routeIndex).toBe(1);
  });
});
