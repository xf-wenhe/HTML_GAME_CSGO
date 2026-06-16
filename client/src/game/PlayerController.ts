import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { NamedBody, Physics } from './Physics.js';
import { InputManager } from './InputManager.js';
import { Scene } from './Scene.js';
import { CSGO_MOVEMENT, PLAYER_CROUCH_JUMP_BONUS, PLAYER_JUMP_FORCE, accelerate, applyFriction, clampHorizontalSpeed, canStepUpObstacle, MovementParams } from './Movement.js';
import { DamageProfile, HitRegion, calculateDamage } from './Combat.js';
import { hammerToGame, PLAYER_EYE_HEIGHT, PLAYER_HEIGHT } from './constants/MapUnits.js';

export class PlayerController {
  private body: CANNON.Body;
  private camera: THREE.PerspectiveCamera;
  private input: InputManager;
  private physics: Physics;

  private movementParams: MovementParams = CSGO_MOVEMENT;
  private jumpForce = PLAYER_JUMP_FORCE;
  private pitch = 0;
  private yaw = 0;
  private health = 100;
  private maxHealth = 100;
  private armor = 100;
  private maxArmor = 100;
  private moving = false;
  
  private grounded = false;
  private airborneTime = 0;
  private crouched = false;
  private crouchJumpActive = false;
  private lastLandingSpeed = 0;
  private groundStickSuppressTime = 0;

  // 【大跳修复核心】分离站立和下蹲的碰撞盒高度
  private readonly standingHalfHeight = PLAYER_HEIGHT / 2;
  private readonly crouchingHalfHeight = 0.27; // crouched hull, kept slightly taller than CS duck hull for stable step clearance
  private readonly standingEyeOffset = PLAYER_EYE_HEIGHT - this.standingHalfHeight;
  private readonly crouchEyeOffset = hammerToGame(46) - this.crouchingHalfHeight;
  private eyeHeight = this.standingEyeOffset;
  private currentHalfHeight = this.standingHalfHeight;
  private readonly maxStepHeight = 0.18;
  private readonly maxStepDownHeight = 2.0; // Increased to reach ground plane at spawn

  constructor(scene: Scene, physics: Physics, input: InputManager, position: THREE.Vector3 = new THREE.Vector3(0, 1.7, 0)) {
    this.camera = scene.getCamera();
    this.input = input;
    this.physics = physics;

    // 初始使用站立尺寸
    const shape = new CANNON.Box(new CANNON.Vec3(0.16, this.standingHalfHeight, 0.16));
    const bodyY = this.resolveBodyYFromEyeY(position.y);
    this.body = new CANNON.Body({
      mass: 70,
      shape: shape,
      position: new CANNON.Vec3(position.x, bodyY, position.z),
      fixedRotation: true
    });
    this.physics.addBody(this.body);
    this.settleOnGroundBelow(2.0);

    this.syncCameraToBody();
  }

  update(dt: number): void {
    this.groundStickSuppressTime = Math.max(0, this.groundStickSuppressTime - dt);
    this.updateCrouchState(dt);
    this.updateLookRotation();

    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    const right = new THREE.Vector3(1, 0, 0);
    right.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    const wishDirection = new THREE.Vector3();

    if (this.input.isKeyPressed('KeyW')) wishDirection.add(forward);
    if (this.input.isKeyPressed('KeyS')) wishDirection.sub(forward);
    if (this.input.isKeyPressed('KeyA')) wishDirection.sub(right);
    if (this.input.isKeyPressed('KeyD')) wishDirection.add(right);

    const wasGrounded = this.grounded;
    const landingVelocity = Math.abs(this.body.velocity.y);
    this.moving = wishDirection.lengthSq() > 0;
    this.applyMovement(wishDirection, dt);

    if (this.input.isKeyPressed('Space')) {
      this.input.setKeyPressed('Space', false);
      if (this.grounded) {
        this.crouchJumpActive = this.crouched;
        this.body.velocity.y = this.jumpForce + (this.crouched ? PLAYER_CROUCH_JUMP_BONUS : 0);
        this.grounded = false;
        this.groundStickSuppressTime = 0.12;
      }
    }

    if (this.grounded) {
      this.airborneTime = 0;
    } else {
      this.airborneTime += dt;
    }
    if (!wasGrounded && this.grounded) {
      this.lastLandingSpeed = landingVelocity;
    }
  }

  updateLookOnly(dt: number): void {
    this.updateCrouchState(dt);
    this.updateLookRotation();
    this.moving = false;
  }

  syncCameraToBody(): void {
    this.camera.position.set(
      this.body.position.x,
      this.body.position.y + this.eyeHeight,
      this.body.position.z
    );
  }

  stickToGroundIfSupported(maxDistance = 2.0): void {
    if (this.groundStickSuppressTime > 0) return;
    if (!this.grounded) return;
    const bottomY = this.body.position.y - this.currentHalfHeight;
    const staticTop = this.physics.findStaticBoxTopBelow(this.body.position.x, this.body.position.z, bottomY, maxDistance);
    if (staticTop === null) return;
    const targetY = staticTop + this.currentHalfHeight;
    if (Math.abs(this.body.position.y - targetY) <= 0.001) return;
    this.body.position.y = targetY;
    this.body.velocity.y = 0;
    this.body.aabbNeedsUpdate = true;
  }

  private updateLookRotation(): void {
    const mouseDelta = this.input.getMouseDelta();
    this.yaw -= mouseDelta.x;
    this.pitch -= mouseDelta.y;

    this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.pitch));

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  private applyMovement(wishDirection: THREE.Vector3, dt: number): void {
    this.grounded = this.canJump();
    const velocity = new THREE.Vector3(this.body.velocity.x, this.body.velocity.y, this.body.velocity.z);
    const horizontalVelocity = new THREE.Vector3(velocity.x, 0, velocity.z);

    // Clear any lingering crouch state before checking walk speed
    const isCrouchingInput = this.input.isKeyPressed('ControlLeft') || this.input.isKeyPressed('ControlRight');
    const isWalkingInput = this.input.isKeyPressed('ShiftLeft') || this.input.isKeyPressed('ShiftRight');

    // Priority: Crouch > Walk > Run (prevent state conflicts)
    const targetSpeed = isCrouchingInput
      ? this.movementParams.crouchSpeed
      : isWalkingInput
        ? this.movementParams.walkSpeed
        : this.movementParams.runSpeed;

    // Debug log for movement analysis
    if (typeof window !== 'undefined' && (window as any).__debugMovement) {
      const actualSpeed = this.getHorizontalSpeed();
      if (Math.abs(actualSpeed - targetSpeed) > 0.1 || isCrouchingInput || isWalkingInput) {
        console.log(`[Movement] crouchInput=${isCrouchingInput}, walkInput=${isWalkingInput}, target=${targetSpeed.toFixed(2)}, actual=${actualSpeed.toFixed(2)}`);
      }
    }

    if (this.grounded) {
      applyFriction(velocity, dt, this.movementParams);
    }

    if (wishDirection.lengthSq() > 0) {
      wishDirection.normalize();
      // Increase acceleration when crouching for responsive movement
      const isCurrentlyCrouching = this.crouched;
      const acceleration = this.grounded
        ? (isCurrentlyCrouching ? this.movementParams.groundAcceleration * 2.5 : this.movementParams.groundAcceleration)
        : this.movementParams.airAcceleration;
      accelerate(horizontalVelocity.set(velocity.x, 0, velocity.z), wishDirection, targetSpeed, acceleration, dt);
      if (!this.grounded) {
        horizontalVelocity.lerp(new THREE.Vector3(velocity.x, 0, velocity.z), 1 - this.movementParams.airControl);
      }
      velocity.x = horizontalVelocity.x;
      velocity.z = horizontalVelocity.z;
      clampHorizontalSpeed(velocity, this.movementParams.runSpeed);
    }

    this.body.velocity.x = velocity.x;
    this.body.velocity.z = velocity.z;
    this.tryStepUp(wishDirection, Math.hypot(velocity.x, velocity.z));
    this.snapDownToGround(wishDirection);
  }

  private tryStepUp(wishDirection: THREE.Vector3, horizontalSpeed: number): void {
    // Only try step up if grounded and moving, not mid-jump
    if (!this.grounded || wishDirection.lengthSq() === 0) return;

    const direction = wishDirection.clone().normalize();
    const groundY = this.body.position.y - this.currentHalfHeight; // 【修复】使用当前实际半高
    const probeDistances = [0.34, 0.5, 0.68];
    const currentFullHeight = this.currentHalfHeight * 2;

    for (const probeDistance of probeDistances) {
      const probeX = this.body.position.x + direction.x * probeDistance;
      const probeZ = this.body.position.z + direction.z * probeDistance;
      // Start ray slightly below step height to avoid hitting player's own collider
      const from = new CANNON.Vec3(probeX, groundY + this.maxStepHeight - 0.001, probeZ);
      const to = new CANNON.Vec3(probeX, groundY + 0.01, probeZ);
      const ray = new CANNON.Ray(from, to);
      const result = new CANNON.RaycastResult();

      if (!ray.intersectWorld(this.physics.getWorld(), { mode: CANNON.Ray.CLOSEST, skipBackfaces: false, result })) continue;

      const obstacleHeight = result.hitPointWorld.y - groundY;
      const surfaceName = (result.body as NamedBody | undefined)?.userData?.name;
      if (!canStepUpObstacle({ grounded: this.grounded, obstacleHeight, maxStepHeight: this.maxStepHeight, horizontalSpeed, surfaceName })) continue;

      const targetY = result.hitPointWorld.y + this.currentHalfHeight + 0.01;
      // 【修复】只检查当前姿态是否有足够的空间上去
      if (!this.hasClearance(probeX, result.hitPointWorld.y, probeZ, currentFullHeight)) continue;

      this.body.position.y = Math.max(this.body.position.y, targetY);
      if (this.body.velocity.y < 0) this.body.velocity.y = 0;
      return;
    }
  }

  private snapDownToGround(wishDirection: THREE.Vector3): void {
    if (this.body.velocity.y > 0.05) return; // Don't snap while jumping up
    // Only snap down for SMALL drops - cannon-es Trimesh doesn't work with raycasting,
    // so we might hit the global ground plane far below the actual floor we're standing on.
    // Let gravity handle large falls.
    const maxSnapDownDistance = 0.3;
    // Only snap down if already grounded or falling reasonably fast
    // But skip this check if we're very close to ground (spawn case)
    if (!this.grounded && this.body.velocity.y > -1.0) {
      // Do a quick check - if ground is very close, still allow snapping
      const bottomY = this.body.position.y - this.currentHalfHeight;
      const probe = new CANNON.Ray(
        new CANNON.Vec3(this.body.position.x, bottomY - 0.01, this.body.position.z),
        new CANNON.Vec3(this.body.position.x, bottomY - maxSnapDownDistance, this.body.position.z)
      );
      const result = new CANNON.RaycastResult();
      if (!probe.intersectWorld(this.physics.getWorld(), { mode: CANNON.Ray.CLOSEST, skipBackfaces: false, result })) {
        return; // No ground close enough
      }
    }

    const probes = [{ x: this.body.position.x, z: this.body.position.z }];
    if (wishDirection.lengthSq() > 0) {
      const direction = wishDirection.clone().normalize();
      probes.push(
        { x: this.body.position.x + direction.x * 0.28, z: this.body.position.z + direction.z * 0.28 },
        { x: this.body.position.x + direction.x * 0.48, z: this.body.position.z + direction.z * 0.48 }
      );
    }

    const currentBottom = this.body.position.y - this.currentHalfHeight;
    let bestHitY: number | null = null;
    for (const probe of probes) {
      // Start ray slightly below feet to avoid hitting player's own collider
      const from = new CANNON.Vec3(probe.x, currentBottom - 0.001, probe.z);
      const to = new CANNON.Vec3(probe.x, currentBottom - maxSnapDownDistance, probe.z);
      const ray = new CANNON.Ray(from, to);
      const result = new CANNON.RaycastResult();
      if (!ray.intersectWorld(this.physics.getWorld(), { mode: CANNON.Ray.CLOSEST, skipBackfaces: false, result })) continue;
      if (Math.abs(result.hitNormalWorld.y) < 0.45) continue;
      // Only snap if hit is within small step down range
      const drop = currentBottom - result.hitPointWorld.y;
      if (drop < 0 || drop > maxSnapDownDistance) continue;
      if (bestHitY === null || result.hitPointWorld.y > bestHitY) bestHitY = result.hitPointWorld.y;
    }

    if (bestHitY === null) return;
    const targetBodyY = bestHitY + this.currentHalfHeight;
    // Snap if within reasonable step-down range
    if (targetBodyY < this.body.position.y + 0.05) {
      this.body.position.y = targetBodyY;
      if (this.body.velocity.y < 0) this.body.velocity.y = 0;
      this.grounded = true;
    }
  }

  // 【新增】通用空间净空检测逻辑
  private hasClearance(x: number, bottomY: number, z: number, requiredHeight: number): boolean {
    const from = new CANNON.Vec3(x, bottomY + 0.1, z);
    const to = new CANNON.Vec3(x, bottomY + requiredHeight - 0.05, z);
    const ray = new CANNON.Ray(from, to);
    const result = new CANNON.RaycastResult();
    return !ray.intersectWorld(this.physics.getWorld(), { mode: CANNON.Ray.CLOSEST, skipBackfaces: true, result });
  }

  private updateCrouchState(dt: number): void {
    const wantsCrouch = this.input.isKeyPressed('ControlLeft') || this.input.isKeyPressed('ControlRight');
    
    if (wantsCrouch && !this.crouched) {
      this.crouched = true;
      this.setHullSize(true);
    } else if (!wantsCrouch && this.crouched) {
      if (this.canStand()) { // 确保头顶有空间才允许站立
        this.crouched = false;
        this.setHullSize(false);
      }
    }

    const targetEyeHeight = this.crouched ? this.crouchEyeOffset : this.standingEyeOffset;
    this.eyeHeight = THREE.MathUtils.lerp(this.eyeHeight, targetEyeHeight, 1 - Math.exp(-8 * dt));
    if (this.grounded) this.crouchJumpActive = false;
  }

  // 【核心修复】动态改变物理碰撞盒，并根据着地状态智能位移
  private setHullSize(isCrouching: boolean): void {
    const targetHalfHeight = isCrouching ? this.crouchingHalfHeight : this.standingHalfHeight;
    if (this.currentHalfHeight === targetHalfHeight) return;

    const oldHalfHeight = this.currentHalfHeight;
    this.currentHalfHeight = targetHalfHeight;

    // 1. 替换物理引擎里的形状
    const newShape = new CANNON.Box(new CANNON.Vec3(0.16, this.currentHalfHeight, 0.16));
    this.body.shapes = [];
    this.body.shapeOffsets = [];
    this.body.shapeOrientations = [];
    this.body.addShape(newShape);
    this.body.updateBoundingRadius(); // 更新内部缓存

    // 2. CSGO大跳精髓：改变形状时处理重心补偿
    const heightDiff = oldHalfHeight - this.currentHalfHeight;
    if (isCrouching) {
      if (!this.grounded) {
        // 【空中下蹲】顶部保持不动，底部强行上提，产生让脚跨过箱子的净空！
        this.body.position.y += heightDiff;
      } else {
        // 【地面下蹲】底部保持紧贴地面，头部下降
        this.body.position.y -= heightDiff;
      }
    } else {
      if (!this.grounded) {
        // 空中起立（把腿伸直）
        this.body.position.y -= heightDiff;
      } else {
        // 地面起立
        this.body.position.y += heightDiff;
      }
    }
    this.body.wakeUp();
  }

  private canStand(): boolean {
    const bottomY = this.body.position.y - this.currentHalfHeight;
    // 从脚底往上检测，是否能容纳站立的总高度
    return this.hasClearance(this.body.position.x, bottomY, this.body.position.z, this.standingHalfHeight * 2);
  }

  private canJump(): boolean {
    const bottomY = this.body.position.y - this.currentHalfHeight;
    const rayStart = new CANNON.Vec3(this.body.position.x, bottomY + 0.03, this.body.position.z);
    const rayEnd = new CANNON.Vec3(this.body.position.x, bottomY - 0.12, this.body.position.z);
    const ray = new CANNON.Ray(rayStart, rayEnd);
    const result = new CANNON.RaycastResult();
    if (!ray.intersectWorld(this.physics.getWorld(), { mode: CANNON.Ray.CLOSEST, skipBackfaces: false, result })) {
      return false;
    }
    const hitDistance = rayStart.distanceTo(result.hitPointWorld);
    const footDistance = Math.abs(bottomY - result.hitPointWorld.y);
    return hitDistance > 0.01 && footDistance <= 0.12 && Math.abs(result.hitNormalWorld.y) > 0.45;
  }

  private settleOnGroundBelow(maxDistance: number): void {
    const bottomY = this.body.position.y - this.currentHalfHeight;
    const staticTop = this.physics.findStaticBoxTopBelow(this.body.position.x, this.body.position.z, bottomY, maxDistance);
    if (staticTop !== null) {
      this.body.position.y = staticTop + this.currentHalfHeight;
      this.body.velocity.y = 0;
      this.grounded = true;
      this.body.aabbNeedsUpdate = true;
      return;
    }

    const ray = new CANNON.Ray(
      new CANNON.Vec3(this.body.position.x, bottomY + 0.02, this.body.position.z),
      new CANNON.Vec3(this.body.position.x, bottomY - maxDistance, this.body.position.z)
    );
    const result = new CANNON.RaycastResult();
    if (!ray.intersectWorld(this.physics.getWorld(), { mode: CANNON.Ray.CLOSEST, skipBackfaces: false, result })) return;
    if (Math.abs(result.hitNormalWorld.y) < 0.45) return;
    const drop = bottomY - result.hitPointWorld.y;
    if (drop < -0.02 || drop > maxDistance) return;
    this.body.position.y = result.hitPointWorld.y + this.currentHalfHeight;
    this.body.velocity.y = 0;
    this.grounded = true;
    this.body.aabbNeedsUpdate = true;
  }

  private resolveBodyYFromEyeY(eyeY: number): number {
    return eyeY - this.eyeHeight;
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

  getLastLandingSpeed(): number {
    return this.lastLandingSpeed;
  }

  isCrouched(): boolean {
    return this.crouched;
  }

  isCrouchJumping(): boolean {
    return this.crouchJumpActive;
  }

  getCollisionHeight(): number {
    return this.currentHalfHeight * 2;
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

  buyArmor(amount = this.maxArmor): void {
    this.armor = Math.max(this.armor, Math.min(this.maxArmor, amount));
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

  setRotation(pitch: number, yaw: number): void {
    this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitch));
    this.yaw = yaw;
  }

  setPosition(position: THREE.Vector3): void {
    const bodyY = this.resolveBodyYFromEyeY(position.y);
    this.body.position.set(position.x, bodyY, position.z);
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.settleOnGroundBelow(2.0);
    this.body.wakeUp(); // Ensure physics body is active
    this.syncCameraToBody();
    // Fix: Force immediate grounded check instead of setting to false
    // This prevents physics oscillation when spawning
    this.grounded = this.canJump();
  }

  setEyePositionForDebug(position: THREE.Vector3): void {
    this.body.position.set(position.x, position.y - this.eyeHeight, position.z);
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.body.wakeUp();
    this.syncCameraToBody();
    this.grounded = this.canJump();
  }

  resetVelocity(): void {
    this.body.velocity.set(0, 0, 0);
  }

  stopHorizontalMovement(): void {
    this.body.velocity.x = 0;
    this.body.velocity.z = 0;
    this.moving = false;
  }

  dispose(): void {
    this.physics.removeBody(this.body);
  }
}
