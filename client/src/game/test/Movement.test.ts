import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CSGO_MOVEMENT, accelerate, applyFriction, clampHorizontalSpeed } from '../Movement.js';

describe('CSGO-style movement helpers', () => {
  it('accelerates to run speed within one second without exceeding the cap', () => {
    const velocity = new THREE.Vector3();
    const forward = new THREE.Vector3(0, 0, -1);

    for (let i = 0; i < 60; i++) {
      accelerate(velocity, forward, CSGO_MOVEMENT.runSpeed, CSGO_MOVEMENT.groundAcceleration, 1 / 60);
      clampHorizontalSpeed(velocity, CSGO_MOVEMENT.runSpeed);
    }

    expect(Math.abs(velocity.z)).toBeGreaterThan(12.5);
    expect(Math.abs(velocity.z)).toBeLessThanOrEqual(CSGO_MOVEMENT.runSpeed);
  });

  it('keeps diagonal movement under the max speed cap', () => {
    const velocity = new THREE.Vector3();
    const diagonal = new THREE.Vector3(1, 0, -1).normalize();

    for (let i = 0; i < 60; i++) {
      accelerate(velocity, diagonal, CSGO_MOVEMENT.runSpeed, CSGO_MOVEMENT.groundAcceleration, 1 / 60);
      clampHorizontalSpeed(velocity, CSGO_MOVEMENT.runSpeed);
    }

    expect(Math.hypot(velocity.x, velocity.z)).toBeLessThanOrEqual(CSGO_MOVEMENT.runSpeed);
  });

  it('stops quickly after releasing movement keys', () => {
    const velocity = new THREE.Vector3(0, 0, -CSGO_MOVEMENT.runSpeed);
    let traveled = 0;

    for (let i = 0; i < 30; i++) {
      applyFriction(velocity, 1 / 60, CSGO_MOVEMENT);
      traveled += Math.hypot(velocity.x, velocity.z) * (1 / 60);
    }

    expect(Math.hypot(velocity.x, velocity.z)).toBeLessThan(1);
    expect(traveled).toBeLessThan(1.4);
  });
});
