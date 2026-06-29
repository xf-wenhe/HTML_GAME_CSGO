import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import * as movement from '../Movement.js';
import { CSGO_GRAVITY, CSGO_MOVEMENT, PLAYER_CROUCH_JUMP_BONUS, PLAYER_JUMP_FORCE, accelerate, applyFriction, clampHorizontalSpeed, canStepUpObstacle } from '../Movement.js';
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
    expect(CSGO_MOVEMENT.walkSpeed).toBeCloseTo(1.2, 5);
    expect(CSGO_MOVEMENT.runSpeed).toBeCloseTo(2.5, 2);
    expect(PLAYER_RUN_SPEED).toBeCloseTo(2.5, 2);
  });

  it('uses the ReHLDS default ground acceleration and friction movevars', () => {
    expect(CSGO_MOVEMENT.groundAcceleration).toBe(10);
    expect(CSGO_MOVEMENT.airAcceleration).toBe(10);
    expect(CSGO_MOVEMENT.friction).toBe(4);
    expect(CSGO_MOVEMENT.stopSpeed).toBeCloseTo(1, 5);
  });

  it('crouch speed is slower without inventing extra vertical jump impulse', () => {
    expect(CSGO_MOVEMENT.crouchSpeed).toBeLessThan(CSGO_MOVEMENT.walkSpeed);
    expect(CSGO_MOVEMENT.crouchSpeed).toBeCloseTo(2.5 * 0.333, 5);
    expect(PLAYER_CROUCH_JUMP_BONUS).toBe(0);
  });

  it('applies GoldSrc input scaling in the correct order for weapon, walk, and duck speed', () => {
    const resolveTargetSpeed = (movement as typeof movement & {
      resolveCs16TargetSpeed?: (
        mode: 'run' | 'walk' | 'duck',
        weaponMovementMultiplier: number
      ) => number;
    }).resolveCs16TargetSpeed;
    expect(resolveTargetSpeed).toBeTypeOf('function');
    if (!resolveTargetSpeed) return;

    expect(resolveTargetSpeed('run', 210 / 250)).toBeCloseTo(2.1, 5);
    expect(resolveTargetSpeed('walk', 210 / 250)).toBeCloseTo(1.2, 5);
    expect(resolveTargetSpeed('duck', 210 / 250)).toBeCloseTo(2.1 * 0.333, 5);
    expect(resolveTargetSpeed('run', 260 / 250)).toBeCloseTo(2.6, 5);
  });

  it('uses the GoldSrc 800 gravity and 45 HU jump impulse', () => {
    const airtime = (2 * PLAYER_JUMP_FORCE) / CSGO_GRAVITY;
    const jumpHeight = (PLAYER_JUMP_FORCE * PLAYER_JUMP_FORCE) / (2 * CSGO_GRAVITY);
    expect(CSGO_GRAVITY).toBeCloseTo(8, 5);
    expect(PLAYER_JUMP_FORCE).toBeCloseTo(Math.sqrt(2 * 8 * 0.45), 5);
    expect(airtime).toBeCloseTo(0.67082, 4);
    expect(jumpHeight).toBeCloseTo(0.45, 5);
  });

  it('caps GoldSrc air acceleration to 30 HU along the wish direction without capping total speed', () => {
    const airAccelerate = (movement as typeof movement & {
      airAccelerate?: (
        velocity: THREE.Vector3,
        wishDirection: THREE.Vector3,
        wishSpeed: number,
        acceleration: number,
        dt: number
      ) => THREE.Vector3;
    }).airAccelerate;
    expect(airAccelerate).toBeTypeOf('function');
    if (!airAccelerate) return;

    const velocity = new THREE.Vector3(0, 0, -CSGO_MOVEMENT.runSpeed);
    airAccelerate(velocity, new THREE.Vector3(1, 0, 0), CSGO_MOVEMENT.runSpeed, CSGO_MOVEMENT.airAcceleration, 1 / 60);

    expect(velocity.x).toBeCloseTo(0.3, 5);
    expect(Math.hypot(velocity.x, velocity.z)).toBeGreaterThan(CSGO_MOVEMENT.runSpeed);
  });

  it('applies the CS 1.6 mega-bunnyhop crop only above 120 percent max speed', () => {
    const limitBunnyhopSpeed = (movement as typeof movement & {
      limitCs16BunnyhopSpeed?: (velocity: THREE.Vector3, maxSpeed: number) => THREE.Vector3;
    }).limitCs16BunnyhopSpeed;
    expect(limitBunnyhopSpeed).toBeTypeOf('function');
    if (!limitBunnyhopSpeed) return;

    const belowLimit = new THREE.Vector3(0, 0, 2.9);
    limitBunnyhopSpeed(belowLimit, 2.5);
    expect(belowLimit.length()).toBeCloseTo(2.9, 5);

    const aboveLimit = new THREE.Vector3(0, 0, 4);
    limitBunnyhopSpeed(aboveLimit, 2.5);
    expect(aboveLimit.length()).toBeCloseTo(2.4, 5);
  });

  it('uses CS 1.6 multiplayer fall damage above 500 HU/s', () => {
    const calculateFallDamage = (movement as typeof movement & {
      calculateCs16FallDamage?: (landingSpeed: number) => number;
    }).calculateCs16FallDamage;
    expect(calculateFallDamage).toBeTypeOf('function');
    if (!calculateFallDamage) return;

    expect(calculateFallDamage(5)).toBe(0);
    expect(calculateFallDamage(8)).toBe(62);
    expect(calculateFallDamage(11)).toBe(125);
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
