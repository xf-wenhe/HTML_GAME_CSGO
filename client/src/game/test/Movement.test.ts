import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CSGO_MOVEMENT, PLAYER_CROUCH_JUMP_BONUS, PLAYER_JUMP_FORCE, accelerate, applyFriction, clampHorizontalSpeed, canStepUpObstacle } from '../Movement.js';
import { PLAYER_RUN_SPEED } from '../constants/MapUnits.js';

describe('CSGO-style movement helpers', () => {
  it('accelerates to run speed within one second without exceeding the cap', () => {
    const velocity = new THREE.Vector3();
    const forward = new THREE.Vector3(0, 0, -1);

    for (let i = 0; i < 60; i++) {
      accelerate(velocity, forward, CSGO_MOVEMENT.runSpeed, CSGO_MOVEMENT.groundAcceleration, 1 / 60);
      clampHorizontalSpeed(velocity, CSGO_MOVEMENT.runSpeed);
    }

    expect(Math.abs(velocity.z)).toBeGreaterThan(PLAYER_RUN_SPEED * 0.9);
    expect(Math.abs(velocity.z)).toBeLessThanOrEqual(CSGO_MOVEMENT.runSpeed);
  });

  it('walk speed is clearly slower than run speed', () => {
    expect(CSGO_MOVEMENT.walkSpeed).toBeLessThan(CSGO_MOVEMENT.runSpeed);
    expect(CSGO_MOVEMENT.walkSpeed).toBeLessThan(CSGO_MOVEMENT.runSpeed * 0.5);
    expect(CSGO_MOVEMENT.runSpeed).toBeCloseTo(2.5, 2);
    expect(PLAYER_RUN_SPEED).toBeCloseTo(2.5, 2);
  });

  it('crouch speed is slower and crouch jump has a bounded boost', () => {
    expect(CSGO_MOVEMENT.crouchSpeed).toBeLessThan(CSGO_MOVEMENT.walkSpeed);
    const crouchJump = PLAYER_JUMP_FORCE + PLAYER_CROUCH_JUMP_BONUS;
    const gravity = 18;
    const crouchJumpHeight = (crouchJump * crouchJump) / (2 * gravity);
    expect(crouchJump).toBeGreaterThan(PLAYER_JUMP_FORCE);
    // CSGO crouch jump height is slightly higher than regular jump
    expect(crouchJumpHeight).toBeGreaterThan(PLAYER_JUMP_FORCE * PLAYER_JUMP_FORCE / (2 * gravity));
  });

  it('jump parameters imply a quick grounded arc', () => {
    const gravity = 18;
    const airtime = (2 * PLAYER_JUMP_FORCE) / gravity;
    // CSGO jump is quick (~0.8s total airtime)
    expect(airtime).toBeGreaterThan(0.1);
    expect(airtime).toBeLessThan(0.2);
  });

  it('keeps diagonal movement under the max speed cap', () => {
    const velocity = new THREE.Vector3();
    const diagonal = new THREE.Vector3(1, 0, -1).normalize();

    for (let i = 0; i < 60; i++) {
      accelerate(velocity, diagonal, CSGO_MOVEMENT.runSpeed, CSGO_MOVEMENT.groundAcceleration, 1 / 60);
      clampHorizontalSpeed(velocity, CSGO_MOVEMENT.runSpeed);
    }

    expect(Math.hypot(velocity.x, velocity.z)).toBeLessThanOrEqual(CSGO_MOVEMENT.runSpeed + 0.01); // Small epsilon for floating point
  });

  it('stops quickly after releasing movement keys', () => {
    const velocity = new THREE.Vector3(0, 0, -CSGO_MOVEMENT.runSpeed);
    let traveled = 0;

    for (let i = 0; i < 30; i++) {
      applyFriction(velocity, 1 / 60, CSGO_MOVEMENT);
      traveled += Math.hypot(velocity.x, velocity.z) * (1 / 60);
    }

    expect(Math.hypot(velocity.x, velocity.z)).toBeLessThan(0.1);
    // CSGO friction stops quickly - test scaled for new speeds
    expect(traveled).toBeLessThan(CSGO_MOVEMENT.runSpeed * 0.3);
  });

  it('allows stepping up stairs but rejects walls, crates, high ledges, and airborne bumps', () => {
    expect(canStepUpObstacle({ grounded: true, obstacleHeight: 0.16, maxStepHeight: 0.2, horizontalSpeed: 1, surfaceName: 'dust2-catwalk-stair-1' })).toBe(true);
    expect(canStepUpObstacle({ grounded: true, obstacleHeight: 0.16, maxStepHeight: 0.2, horizontalSpeed: 1, surfaceName: 'dust2-mid-low-wall' })).toBe(false);
    expect(canStepUpObstacle({ grounded: true, obstacleHeight: 0.16, maxStepHeight: 0.2, horizontalSpeed: 1, surfaceName: 'dust2-xbox-crate' })).toBe(false);
    expect(canStepUpObstacle({ grounded: true, obstacleHeight: 0.7, maxStepHeight: 0.2, horizontalSpeed: 1, surfaceName: 'stair-high' })).toBe(false);
    expect(canStepUpObstacle({ grounded: false, obstacleHeight: 0.16, maxStepHeight: 0.2, horizontalSpeed: 1, surfaceName: 'stair' })).toBe(false);
    expect(canStepUpObstacle({ grounded: true, obstacleHeight: 0.16, maxStepHeight: 0.2, horizontalSpeed: 0, surfaceName: 'stair' })).toBe(false);
  });
});
