import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { InputManager } from '../InputManager.js';
import { Physics } from '../Physics.js';
import { PlayerController } from '../PlayerController.js';
import { CSGO_MOVEMENT } from '../Movement.js';

function createController() {
  const physics = new Physics();
  physics.setGlobalGroundEnabled(true, 0);
  const camera = new THREE.PerspectiveCamera();
  const scene = { getCamera: () => camera };
  const input = new InputManager(undefined, 'linux');
  const player = new PlayerController(scene as any, physics, input, new THREE.Vector3(0, 0.64, 0));
  return { physics, input, player };
}

function tick(player: PlayerController, physics: Physics, dt = 1 / 100): THREE.Vector3 {
  player.update(dt);
  physics.step(dt);
  player.syncCameraToBody();
  return player.getPosition();
}

describe('PlayerController CS1.6 feel', () => {
  it('does not bob vertically while idle or while walking on flat ground', () => {
    const { physics, input, player } = createController();
    const idleY: number[] = [];
    for (let i = 0; i < 90; i++) idleY.push(tick(player, physics).y);

    input.setKeyPressed('KeyW', true);
    const movingY: number[] = [];
    for (let i = 0; i < 120; i++) movingY.push(tick(player, physics).y);

    const range = (values: number[]) => Math.max(...values) - Math.min(...values);
    expect(range(idleY)).toBeLessThan(0.002);
    expect(range(movingY)).toBeLessThan(0.002);
    expect(player.getHorizontalSpeed()).toBeCloseTo(CSGO_MOVEMENT.runSpeed, 1);
  });

  it('keeps mouse turning continuous while moving', () => {
    const { physics, input, player } = createController();
    input.setKeyPressed('KeyW', true);

    const yaws: number[] = [];
    for (let i = 0; i < 80; i++) {
      input.setMouseDelta(0.018, 0);
      tick(player, physics);
      yaws.push(player.getRotation().yaw);
    }

    const steps = yaws.slice(1).map((yaw, index) => yaw - yaws[index]);
    expect(Math.max(...steps) - Math.min(...steps)).toBeLessThan(0.0001);
    expect(Math.abs(yaws.at(-1)! - yaws[0])).toBeGreaterThan(1.0);
    expect(player.getHorizontalSpeed()).toBeGreaterThan(CSGO_MOVEMENT.runSpeed * 0.85);
  });

  it('uses a quick CS1.6-style jump arc and lands cleanly', () => {
    const { physics, input, player } = createController();
    input.setKeyPressed('Space', true);

    const y: number[] = [];
    const grounded: boolean[] = [];
    for (let i = 0; i < 120; i++) {
      y.push(tick(player, physics).y);
      grounded.push(player.isGrounded());
    }

    const apex = Math.max(...y);
    const landedFrame = y.findIndex((value, index) => index > 10 && Math.abs(value - 0.64) < 0.01 && grounded[index]);
    expect(apex - 0.64).toBeGreaterThan(0.40);
    expect(apex - 0.64).toBeLessThan(0.50);
    expect(landedFrame).toBeGreaterThan(30);
    expect(landedFrame).toBeLessThan(85);
    expect(y.at(-1)).toBeCloseTo(0.64, 2);
  });
});
