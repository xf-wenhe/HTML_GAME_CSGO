import * as THREE from 'three';
import {
  PLAYER_RUN_SPEED,
  PLAYER_WALK_SPEED,
  PLAYER_CROUCH_SPEED,
  PLAYER_JUMP_HEIGHT,
  hammerToGame
} from './constants/MapUnits.js';

export interface MovementParams {
  runSpeed: number;
  walkSpeed: number;
  crouchSpeed: number;
  groundAcceleration: number;
  airAcceleration: number;
  friction: number;
  stopSpeed: number;
  airControl: number;
}

// ReHLDS defaults: sv_accelerate 10, sv_airaccelerate 10,
// sv_friction 4, sv_stopspeed 100.
const GAME_SV_ACCELERATE = 10;
const GAME_SV_AIRACCELERATE = 10;
const GAME_SV_FRICTION = 4;
const GAME_SV_STOPSPEED = hammerToGame(100); // 1.0 game units

export const CSGO_MOVEMENT: MovementParams = {
  runSpeed: PLAYER_RUN_SPEED,       // 2.5 game units/s (250 HU/s)
  walkSpeed: PLAYER_WALK_SPEED,     // 1.1 game units/s (110 HU/s)
  crouchSpeed: PLAYER_CROUCH_SPEED, // 0.85 game units/s (85 HU/s)
  groundAcceleration: GAME_SV_ACCELERATE,
  airAcceleration: GAME_SV_AIRACCELERATE,
  friction: GAME_SV_FRICTION,
  stopSpeed: GAME_SV_STOPSPEED,
  airControl: 0.16
};

export function resolveCs16TargetSpeed(
  mode: 'run' | 'walk' | 'duck',
  weaponMovementMultiplier: number
): number {
  const weaponMaxSpeed = CSGO_MOVEMENT.runSpeed * weaponMovementMultiplier;
  if (mode === 'walk') return Math.min(CSGO_MOVEMENT.walkSpeed, weaponMaxSpeed);
  if (mode === 'duck') return weaponMaxSpeed * 0.333;
  return weaponMaxSpeed;
}

// GoldSrc uses sv_gravity 800 and a normal jump height of 45 HU.
export const CSGO_GRAVITY = hammerToGame(800);
export const PLAYER_JUMP_FORCE = Math.sqrt(2 * CSGO_GRAVITY * hammerToGame(45));
export const PLAYER_CROUCH_JUMP_BONUS = 0;

export const FALL_DAMAGE_SAFE_SPEED = hammerToGame(500);
export const FALL_DAMAGE_FATAL_SPEED = hammerToGame(1100);
const MULTIPLAYER_FALL_DAMAGE_SCALE = 1.25;

export function calculateCs16FallDamage(landingSpeed: number): number {
  if (landingSpeed <= FALL_DAMAGE_SAFE_SPEED) return 0;
  const damagePerSpeed = 100 / (FALL_DAMAGE_FATAL_SPEED - FALL_DAMAGE_SAFE_SPEED);
  return Math.floor((landingSpeed - FALL_DAMAGE_SAFE_SPEED) * damagePerSpeed * MULTIPLAYER_FALL_DAMAGE_SCALE);
}

export interface StepUpCheck {
  grounded: boolean;
  obstacleHeight: number;
  maxStepHeight: number;
  horizontalSpeed: number;
  surfaceName?: string;
}

export function canStepUpObstacle(check: StepUpCheck): boolean {
  const surfaceName = check.surfaceName?.toLowerCase() ?? '';
  const blockedSurface = /wall|box|crate|cover|rail|post|door/.test(surfaceName);
  const stepSurface = /stair|step|ramp|step-up/.test(surfaceName);
  return (
    check.grounded &&
    check.horizontalSpeed > 0.01 &&
    check.obstacleHeight > 0.01 &&
    check.obstacleHeight <= check.maxStepHeight + 0.02 &&
    stepSurface &&
    !blockedSurface
  );
}

export function applyFriction(velocity: THREE.Vector3, dt: number, params: MovementParams): THREE.Vector3 {
  const horizontal = new THREE.Vector3(velocity.x, 0, velocity.z);
  const speed = horizontal.length();
  if (speed < 0.001) {
    velocity.x = 0;
    velocity.z = 0;
    return velocity;
  }

  const control = Math.max(speed, params.stopSpeed);
  const drop = control * params.friction * dt;
  const nextSpeed = Math.max(0, speed - drop);
  const ratio = nextSpeed / speed;
  velocity.x *= ratio;
  velocity.z *= ratio;
  return velocity;
}

export function accelerate(
  velocity: THREE.Vector3,
  wishDirection: THREE.Vector3,
  wishSpeed: number,
  acceleration: number,
  dt: number
): THREE.Vector3 {
  if (wishDirection.lengthSq() === 0) return velocity;
  const currentSpeed = velocity.dot(wishDirection);
  const addSpeed = wishSpeed - currentSpeed;
  if (addSpeed <= 0) return velocity;

  const accelSpeed = Math.min(acceleration * wishSpeed * dt, addSpeed);
  velocity.addScaledVector(wishDirection, accelSpeed);
  return velocity;
}

export function airAccelerate(
  velocity: THREE.Vector3,
  wishDirection: THREE.Vector3,
  wishSpeed: number,
  acceleration: number,
  dt: number
): THREE.Vector3 {
  if (wishDirection.lengthSq() === 0) return velocity;
  const cappedWishSpeed = Math.min(wishSpeed, hammerToGame(30));
  const currentSpeed = velocity.dot(wishDirection);
  const addSpeed = cappedWishSpeed - currentSpeed;
  if (addSpeed <= 0) return velocity;

  const accelSpeed = Math.min(acceleration * wishSpeed * dt, addSpeed);
  velocity.addScaledVector(wishDirection, accelSpeed);
  return velocity;
}

export function limitCs16BunnyhopSpeed(velocity: THREE.Vector3, maxSpeed: number): THREE.Vector3 {
  const maxScaledSpeed = maxSpeed * 1.2;
  const speed = velocity.length();
  if (maxScaledSpeed <= 0 || speed <= maxScaledSpeed) return velocity;
  velocity.multiplyScalar((maxScaledSpeed / speed) * 0.8);
  return velocity;
}

export function clampHorizontalSpeed(velocity: THREE.Vector3, maxSpeed: number): THREE.Vector3 {
  const horizontal = new THREE.Vector3(velocity.x, 0, velocity.z);
  const speed = horizontal.length();
  if (speed > maxSpeed) {
    horizontal.multiplyScalar(maxSpeed / speed);
    velocity.x = horizontal.x;
    velocity.z = horizontal.z;
  }
  return velocity;
}
