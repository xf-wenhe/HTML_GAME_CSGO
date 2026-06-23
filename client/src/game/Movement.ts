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

// CS:GO Source engine 风格运动常数
// 基于 CS1.6 标准值:
// sv_accelerate = 5.5, sv_airaccelerate = 10, sv_friction = 5.2, sv_stopspeed = 100
const GAME_SV_ACCELERATE = 5.5;
const GAME_SV_AIRACCELERATE = 10;
const GAME_SV_FRICTION = 5.2;
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

// CS1.6 标准物理参数（与 Physics.ts 保持同步）
// 物理公式：
//   上升时间 t = v0 / g
//   跳跃高度 h = v0² / (2g) = 0.5 * g * t²
// 目标：h = 0.45, t = 0.38
// => g = 2h/t² = 2*0.45/(0.38²) ≈ 6.23
// => v0 = g*t = 6.23*0.38 ≈ 2.37
export const CSGO_GRAVITY = 6.23;
export const PLAYER_JUMP_FORCE = 2.37;
export const PLAYER_CROUCH_JUMP_BONUS = hammerToGame(8); // 0.08

// CS1.6 摔落伤害参数
// 安全下落高度：216 HU（不会受伤）
// 从高度 h 下落的着陆速度：v = sqrt(2gh)
// 转换为游戏单位：
//   g = 7.06, h_safe = 2.16 (216 HU)
//   v_safe = sqrt(2*7.06*2.16) ≈ 5.52 游戏单位/秒
// 超过安全高度后：每增加 1 HU 造成约 1 点伤害
export const FALL_DAMAGE_SAFE_SPEED = 5.52; // 安全着陆速度（游戏单位/秒）
export const FALL_DAMAGE_PER_HU = 1.0; // 每 HU 额外高度的伤害
export const FALL_DAMAGE_SPEED_PER_HU = 0.376; // 每 HU 高度对应的速度增量 (sqrt(2*7.06*0.01) ≈ 0.376)

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
