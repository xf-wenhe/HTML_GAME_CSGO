import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Physics } from './Physics.js';
import { InputManager } from './InputManager.js';
import { Scene } from './Scene.js';
import { CSGO_MOVEMENT, accelerate, applyFriction, clampHorizontalSpeed, MovementParams } from './Movement.js';
import { DamageProfile, HitRegion, calculateDamage } from './Combat.js';

export class PlayerController {
  private body: CANNON.Body;
  private camera: THREE.PerspectiveCamera;
  private input: InputManager;
  private physics: Physics;

  private movementParams: MovementParams = CSGO_MOVEMENT;
  private jumpForce = 6.4;
  private pitch = 0;
  private yaw = 0;
  private health = 100;
  private maxHealth = 100;
  private armor = 100;
  private maxArmor = 100;
  private moving = false;
  private eyeHeight = 0.7;
  private readonly standingEyeHeight = 0.7;
  private readonly crouchEyeHeight = 0.32;
  private grounded = false;
  private airborneTime = 0;
  private crouched = false;
  private crouchJumpActive = false;

  constructor(scene: Scene, physics: Physics, input: InputManager, position: THREE.Vector3 = new THREE.Vector3(0, 1.7, 0)) {
    this.camera = scene.getCamera();
    this.input = input;
    this.physics = physics;

    const shape = new CANNON.Box(new CANNON.Vec3(0.5, 1.0, 0.5));
    this.body = new CANNON.Body({
      mass: 70,
      shape: shape,
      position: new CANNON.Vec3(position.x, position.y - this.eyeHeight, position.z),
      fixedRotation: true,
      linearDamping: 0.02
    });
    this.physics.addBody(this.body);

    this.camera.position.set(position.x, position.y, position.z);
  }

  update(dt: number): void {
    this.updateCrouchState(dt);
    this.camera.position.set(
      this.body.position.x,
      this.body.position.y + this.eyeHeight,
      this.body.position.z
    );

    const mouseDelta = this.input.getMouseDelta();
    this.yaw -= mouseDelta.x;
    this.pitch -= mouseDelta.y;

    this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.pitch));

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    const right = new THREE.Vector3(1, 0, 0);
    right.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    const wishDirection = new THREE.Vector3();

    if (this.input.isKeyPressed('KeyW')) wishDirection.add(forward);
    if (this.input.isKeyPressed('KeyS')) wishDirection.sub(forward);
    if (this.input.isKeyPressed('KeyA')) wishDirection.sub(right);
    if (this.input.isKeyPressed('KeyD')) wishDirection.add(right);

    this.moving = wishDirection.lengthSq() > 0;
    this.applyMovement(wishDirection, dt);

    if (this.input.isKeyPressed('Space')) {
      this.input.setKeyPressed('Space', false);
      if (this.grounded) {
        this.crouchJumpActive = this.crouched;
        this.body.velocity.y = this.jumpForce + (this.crouched ? 1.25 : 0);
        this.grounded = false;
      }
    }

    if (this.grounded) {
      this.airborneTime = 0;
    } else {
      this.airborneTime += dt;
    }
  }

  private applyMovement(wishDirection: THREE.Vector3, dt: number): void {
    this.grounded = this.canJump();
    const velocity = new THREE.Vector3(this.body.velocity.x, this.body.velocity.y, this.body.velocity.z);
    const horizontalVelocity = new THREE.Vector3(velocity.x, 0, velocity.z);
    const targetSpeed = this.input.isKeyPressed('ControlLeft') || this.input.isKeyPressed('ControlRight')
      ? this.movementParams.crouchSpeed
      : this.input.isKeyPressed('ShiftLeft') || this.input.isKeyPressed('ShiftRight')
        ? this.movementParams.walkSpeed
        : this.movementParams.runSpeed;

    if (this.grounded) {
      applyFriction(velocity, dt, this.movementParams);
    }

    if (wishDirection.lengthSq() > 0) {
      wishDirection.normalize();
      const acceleration = this.grounded ? this.movementParams.groundAcceleration : this.movementParams.airAcceleration;
      accelerate(horizontalVelocity.set(velocity.x, 0, velocity.z), wishDirection, targetSpeed, acceleration, dt);
      if (!this.grounded) {
        horizontalVelocity.lerp(new THREE.Vector3(velocity.x, 0, velocity.z), 1 - this.movementParams.airControl);
      }
      velocity.x = horizontalVelocity.x;
      velocity.z = horizontalVelocity.z;
      clampHorizontalSpeed(velocity, targetSpeed);
    }

    this.body.velocity.x = velocity.x;
    this.body.velocity.z = velocity.z;
  }

  private updateCrouchState(dt: number): void {
    const wantsCrouch = this.input.isKeyPressed('ControlLeft') || this.input.isKeyPressed('ControlRight');
    if (wantsCrouch) {
      this.crouched = true;
    } else if (this.canStand()) {
      this.crouched = false;
    }
    const targetEyeHeight = this.crouched ? this.crouchEyeHeight : this.standingEyeHeight;
    this.eyeHeight = THREE.MathUtils.lerp(this.eyeHeight, targetEyeHeight, Math.min(1, dt * 14));
    if (this.grounded) this.crouchJumpActive = false;
  }

  private canStand(): boolean {
    const from = new CANNON.Vec3(this.body.position.x, this.body.position.y + 0.85, this.body.position.z);
    const to = new CANNON.Vec3(this.body.position.x, this.body.position.y + 1.35, this.body.position.z);
    const ray = new CANNON.Ray(from, to);
    const result = new CANNON.RaycastResult();
    return !ray.intersectWorld(this.physics.getWorld(), { mode: CANNON.Ray.CLOSEST, skipBackfaces: true, result });
  }

  private canJump(): boolean {
    const rayStart = new CANNON.Vec3(this.body.position.x, this.body.position.y, this.body.position.z);
    const rayEnd = new CANNON.Vec3(this.body.position.x, this.body.position.y - 1.1, this.body.position.z);
    const ray = new CANNON.Ray(rayStart, rayEnd);
    const result = new CANNON.RaycastResult();
    return ray.intersectWorld(this.physics.getWorld(), { mode: CANNON.Ray.CLOSEST, skipBackfaces: true, result });
  }

  getPosition(): THREE.Vector3 {
    return new THREE.Vector3(this.body.position.x, this.body.position.y + this.eyeHeight, this.body.position.z);
  }

  isMoving(): boolean {
    return this.moving;
  }

  getHorizontalSpeed(): number {
    return Math.hypot(this.body.velocity.x, this.body.velocity.z);
  }

  isGrounded(): boolean {
    return this.grounded;
  }

  getAirborneTime(): number {
    return this.airborneTime;
  }

  isCrouched(): boolean {
    return this.crouched;
  }

  isCrouchJumping(): boolean {
    return this.crouchJumpActive;
  }

  getCollisionHeight(): number {
    return this.crouched ? 1.35 : 2;
  }

  takeDamage(amount: number, region: HitRegion = 'chest', armorPenetration = 0.35): void {
    const result = calculateDamage(
      {
        baseDamage: amount,
        armorPenetration,
        multipliers: { head: 1, chest: 1, stomach: 1, arm: 1, leg: 1 }
      } satisfies DamageProfile,
      region,
      this.armor
    );
    this.armor = Math.max(0, this.armor - result.armorDamage);
    this.health = Math.max(0, this.health - result.healthDamage);
  }

  healFull(): void {
    this.health = this.maxHealth;
    this.armor = this.maxArmor;
  }

  getHealth(): number {
    return this.health;
  }

  getMaxHealth(): number {
    return this.maxHealth;
  }

  getArmor(): number {
    return this.armor;
  }

  getMaxArmor(): number {
    return this.maxArmor;
  }

  isDead(): boolean {
    return this.health <= 0;
  }

  getRotation(): { pitch: number; yaw: number } {
    return { pitch: this.pitch, yaw: this.yaw };
  }

  setPosition(position: THREE.Vector3): void {
    this.body.position.set(position.x, position.y - this.eyeHeight, position.z);
  }

  dispose(): void {
    this.physics.removeBody(this.body);
  }
}
