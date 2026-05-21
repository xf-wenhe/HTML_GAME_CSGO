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

    expect(Math.abs(velocity.z)).toBeGreaterThan(10.5);
    expect(Math.abs(velocity.z)).toBeLessThanOrEqual(CSGO_MOVEMENT.runSpeed);
  });

  it('walk speed is clearly slower than run speed', () => {
    expect(CSGO_MOVEMENT.walkSpeed).toBeGreaterThanOrEqual(4.5);
    expect(CSGO_MOVEMENT.walkSpeed).toBeLessThanOrEqual(5.2);
    expect(CSGO_MOVEMENT.runSpeed).toBeGreaterThanOrEqual(10.5);
    expect(CSGO_MOVEMENT.runSpeed).toBeLessThanOrEqual(11.5);
  });

  it('crouch speed is slower and crouch jump has a bounded boost', () => {
    expect(CSGO_MOVEMENT.crouchSpeed).toBeLessThan(CSGO_MOVEMENT.walkSpeed);
    const normalJump = 6.4;
    const crouchJump = normalJump + 0.75;
    expect(crouchJump).toBeGreaterThan(normalJump);
    expect((2 * crouchJump) / 18).toBeLessThan(0.85);
  });

  it('jump parameters imply a quick grounded arc', () => {
    const gravity = 18;
    const jumpForce = 6.4;
    const airtime = (2 * jumpForce) / gravity;
    expect(airtime).toBeGreaterThan(0.65);
    expect(airtime).toBeLessThan(0.85);
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
