import * as THREE from 'three';
import {
  PLAYER_RUN_SPEED,
  PLAYER_WALK_SPEED,
  PLAYER_CROUCH_SPEED,
  PLAYER_JUMP_HEIGHT,
  PLAYER_JUMP_TIME,
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

export const CSGO_MOVEMENT: MovementParams = {
  runSpeed: PLAYER_RUN_SPEED,      // 2.5 游戏单位/秒 (250 Hammer units/秒)
  walkSpeed: PLAYER_WALK_SPEED,    // 1.1 游戏单位/秒 (110 Hammer units/秒)
  crouchSpeed: PLAYER_CROUCH_SPEED, // 0.85 游戏单位/秒 (85 Hammer units/秒)
  groundAcceleration: hammerToGame(1000),  // 加速度
  airAcceleration: hammerToGame(150),     // 空中加速度
  friction: 12,
  stopSpeed: 6,
  airControl: 0.16
};

export const PLAYER_JUMP_FORCE = (PLAYER_JUMP_HEIGHT / (PLAYER_JUMP_TIME * PLAYER_JUMP_TIME * 0.5)); // ~1.44
export const PLAYER_CROUCH_JUMP_BONUS = hammerToGame(8); // 0.08

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
    check.obstacleHeight <= check.maxStepHeight &&
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
