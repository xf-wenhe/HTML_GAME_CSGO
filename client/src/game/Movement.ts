import * as THREE from 'three';

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
  runSpeed: 11.1,
  walkSpeed: 4.85,
  crouchSpeed: 3.8,
  groundAcceleration: 44,
  airAcceleration: 6,
  friction: 12,
  stopSpeed: 6,
  airControl: 0.16
};

export const PLAYER_JUMP_FORCE = 6.4;
export const PLAYER_CROUCH_JUMP_BONUS = 2.0;

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
