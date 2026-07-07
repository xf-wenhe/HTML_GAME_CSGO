import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { NamedBody, Physics, PhysicsBodyUserData } from './Physics.js';
import { InputManager } from './InputManager.js';
import { Scene } from './Scene.js';
import { CSGO_MOVEMENT, PLAYER_CROUCH_JUMP_BONUS, PLAYER_JUMP_FORCE, calculateCs16FallDamage, limitCs16BunnyhopSpeed, resolveCs16TargetSpeed, accelerate, airAccelerate, applyFriction, clampHorizontalSpeed, canStepUpObstacle, MovementParams } from './Movement.js';
import { DamageProfile, HitRegion, calculateDamage } from './Combat.js';
import { hammerToGame, PLAYER_EYE_HEIGHT, PLAYER_HEIGHT } from './constants/MapUnits.js';

interface GroundProbeResult {
  hitY: number;
  normalY: number;
  distance: number;
  body: NamedBody;
}

export class PlayerController {
  private body: CANNON.Body;
  private camera: THREE.PerspectiveCamera;
  private input: InputManager;
  private physics: Physics;
  private scene: Scene; // Reference to scene for feedback effects

  private movementParams: MovementParams = CSGO_MOVEMENT;
  private movementSpeedMultiplier = 1;
  private lookSensitivityMultiplier = 1;
  private jumpForce = PLAYER_JUMP_FORCE;
  private pitch = 0;
  private yaw = 0;
  private recoilKickPitch = 0;
  private recoilKickYaw = 0;
  private health = 100;
  private maxHealth = 100;
  private armor = 100;
  private maxArmor = 100;
  private hasHelmet = true;
  private moving = false;

  private grounded = false;
  private wasGrounded = false; // Track previous grounded state
  private airborneTime = 0;
  private crouched = false;
  private duckingInProgress = false;
  private duckTransitionElapsed = 0;
  private crouchJumpActive = false;
  private lastLandingSpeed = 0;
  private groundStickSuppressTime = 0;

  // GoldSrc standing hull is -36..36 HU; duck hull is -18..32 HU.
  private readonly standingHalfHeight = PLAYER_HEIGHT / 2;
  private readonly crouchingHalfHeight = hammerToGame(50) / 2;
  private readonly standingEyeOffset = PLAYER_EYE_HEIGHT - this.standingHalfHeight;
  private readonly crouchEyeOffset = hammerToGame(30) - this.crouchingHalfHeight;
  private readonly duckTransitionDuration = 0.4;
  private eyeHeight = this.standingEyeOffset;
  private currentHalfHeight = this.standingHalfHeight;
  private readonly maxStepHeight = 0.24;
  private readonly maxStepDownHeight = 2.0;
  private readonly groundedProbeDistance = 0.14;
  private readonly groundProbeRadius = 0.16;
  private readonly snapDownDistance = 0.28;
  private readonly groundedStickEpsilon = 0.015;
  private lastSafeEyePosition: THREE.Vector3;

  constructor(scene: Scene, physics: Physics, input: InputManager, position: THREE.Vector3 = new THREE.Vector3(0, 1.7, 0)) {
    this.scene = scene;
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
    this.lastSafeEyePosition = this.getPosition();

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

    this.wasGrounded = this.grounded; // Store previous grounded state
    const landingVelocity = Math.abs(this.body.velocity.y);
    this.moving = wishDirection.lengthSq() > 0;

    // 先检测跳跃，避免 applyMovement 把 grounded 又搞成 true
    if (this.input.isKeyPressed('Space')) {
      this.input.setKeyPressed('Space', false);
      if (this.grounded && this.groundStickSuppressTime <= 0) {
        this.crouchJumpActive = this.crouched;
        const jumpVelocity = new THREE.Vector3(this.body.velocity.x, this.body.velocity.y, this.body.velocity.z);
        limitCs16BunnyhopSpeed(jumpVelocity, resolveCs16TargetSpeed('run', this.movementSpeedMultiplier));
        this.body.velocity.x = jumpVelocity.x;
        this.body.velocity.z = jumpVelocity.z;
        this.body.velocity.y = this.jumpForce + (this.crouched ? PLAYER_CROUCH_JUMP_BONUS : 0);
        this.grounded = false;
        this.groundStickSuppressTime = 0.25; // 增加抑制时间防止连跳
      }
    }

    this.applyMovement(wishDirection, dt);
    this.preventSourceVoidEscape();
    this.updateLastSafeGroundPosition();

    // Check if just landed
    if (!this.wasGrounded && this.grounded) {
      this.lastLandingSpeed = landingVelocity;
      this.airborneTime = 0;
      // Trigger landing feedback if landing speed is significant
      if (landingVelocity > 5) {
        this.scene.getFeedbackEffects().landHard();
      }
      // CS1.6 摔落伤害
      const fallDamage = calculateCs16FallDamage(landingVelocity);
      if (fallDamage > 0) this.takeDamage(fallDamage, 'leg');
    } else if (!this.grounded) {
      this.airborneTime += dt;
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
    if (!this.grounded && this.body.velocity.y > 0.05) return;
    const wasGrounded = this.grounded;
    const ground = this.grounded
      ? this.probeGround(Math.min(maxDistance, this.snapDownDistance))
      : this.probeGround(this.groundedProbeDistance) ?? this.probeGround(this.snapDownDistance);
    if (!ground) {
      this.grounded = false;
      this.preventSourceVoidEscape();
      return;
    }
    if (!this.grounded && ground.distance > this.groundedProbeDistance && ground.body.userData?.sourceBacked !== true) {
      this.grounded = false;
      return;
    }
    this.alignBodyToGround(ground);
    this.grounded = true;
    if (!wasGrounded) {
      this.airborneTime = 0;
      this.crouchJumpActive = false;
    }
  }

  private updateLookRotation(): void {
    const mouseDelta = this.input.getMouseDelta();
    this.yaw -= mouseDelta.x * this.lookSensitivityMultiplier + this.recoilKickYaw;
    this.pitch -= mouseDelta.y * this.lookSensitivityMultiplier + this.recoilKickPitch;
    this.recoilKickYaw = 0;
    this.recoilKickPitch = 0;

    this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.pitch));

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  private applyMovement(wishDirection: THREE.Vector3, dt: number): void {
    const fallingProbeDistance = this.body.velocity.y < 0
      ? Math.min(this.snapDownDistance, this.groundedProbeDistance + Math.abs(this.body.velocity.y) * dt + 0.08)
      : this.groundedProbeDistance;
    const canProbeGround = this.groundStickSuppressTime <= 0 && (this.grounded || this.body.velocity.y <= 0.05);
    const ground = canProbeGround ? this.probeGround(fallingProbeDistance) : null;
    this.grounded = ground !== null;
    if (ground && this.body.velocity.y <= 0) {
      this.alignBodyToGround(ground);
    }
    const velocity = new THREE.Vector3(this.body.velocity.x, this.body.velocity.y, this.body.velocity.z);
    const horizontalVelocity = new THREE.Vector3(velocity.x, 0, velocity.z);

    // Clear any lingering crouch state before checking walk speed
    const isCrouchingInput = this.input.isKeyPressed('ControlLeft') || this.input.isKeyPressed('ControlRight');
    const isWalkingInput = this.input.isKeyPressed('ShiftLeft') || this.input.isKeyPressed('ShiftRight');

    // Priority: Crouch > Walk > Run (prevent state conflicts)
    const movementMode = isCrouchingInput ? 'duck' : isWalkingInput ? 'walk' : 'run';
    const targetSpeed = resolveCs16TargetSpeed(movementMode, this.movementSpeedMultiplier);

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
      const acceleration = this.grounded
        ? this.movementParams.groundAcceleration
        : this.movementParams.airAcceleration;
      const accelerateMovement = this.grounded ? accelerate : airAccelerate;
      accelerateMovement(horizontalVelocity.set(velocity.x, 0, velocity.z), wishDirection, targetSpeed, acceleration, dt);
      velocity.x = horizontalVelocity.x;
      velocity.z = horizontalVelocity.z;
      if (this.grounded) clampHorizontalSpeed(velocity, targetSpeed);
    }

    this.body.velocity.x = velocity.x;
    this.body.velocity.z = velocity.z;
    this.tryStepUp(wishDirection, Math.hypot(velocity.x, velocity.z));
    this.snapDownToGround(wishDirection);
  }

  setMovementSpeedMultiplier(multiplier: number): void {
    this.movementSpeedMultiplier = Math.max(0.1, Math.min(1.2, multiplier));
  }

  setLookSensitivityMultiplier(multiplier: number): void {
    this.lookSensitivityMultiplier = Math.max(0.05, Math.min(1.2, multiplier));
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
      const surface = this.physics.findWalkableBoxTopInRange(
        probeX,
        probeZ,
        groundY + 0.01,
        groundY + this.maxStepHeight + 0.06,
        0.03
      );
      if (surface) {
        const obstacleHeight = surface.topY - groundY;
        const surfaceName = surface.body.userData?.name;
        if (!canStepUpObstacle({ grounded: this.grounded, obstacleHeight, maxStepHeight: this.maxStepHeight, horizontalSpeed, surfaceName })) continue;
        const targetY = surface.topY + this.currentHalfHeight + 0.01;
        if (!this.hasClearance(probeX, surface.topY, probeZ, currentFullHeight)) continue;

        this.body.position.y = Math.max(this.body.position.y, targetY);
        if (this.body.velocity.y < 0) this.body.velocity.y = 0;
        return;
      }

      const from = new CANNON.Vec3(probeX, groundY + this.maxStepHeight + 0.06, probeZ);
      const to = new CANNON.Vec3(probeX, groundY - 0.02, probeZ);
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
    if (this.groundStickSuppressTime > 0) return;

    const moving = wishDirection.lengthSq() > 0;
    const ground = this.probeGround(moving ? this.snapDownDistance : this.groundedProbeDistance);
    if (!ground) return;
    if (ground.distance > this.snapDownDistance) return;

    this.alignBodyToGround(ground);
    this.grounded = true;
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
      if (!this.duckingInProgress) {
        this.duckingInProgress = true;
        this.duckTransitionElapsed = 0;
      }
      this.duckTransitionElapsed = Math.min(this.duckTransitionDuration, this.duckTransitionElapsed + dt);
      if (!this.grounded || this.duckTransitionElapsed >= this.duckTransitionDuration) {
        this.crouched = true;
        this.duckingInProgress = false;
        this.setHullSize(true);
      }
    } else if (!wantsCrouch) {
      this.duckingInProgress = false;
      this.duckTransitionElapsed = 0;
      if (!this.crouched) {
        this.eyeHeight = this.standingEyeOffset;
      } else if (this.crouched) {
        if (this.canStand()) { // 确保头顶有空间才允许站立
          this.crouched = false;
          this.setHullSize(false);
        }
      }
    }

    if (this.duckingInProgress) {
      const t = this.duckTransitionElapsed / this.duckTransitionDuration;
      const smoothT = t * t * (3 - 2 * t);
      const eyeAboveFeet = THREE.MathUtils.lerp(PLAYER_EYE_HEIGHT, hammerToGame(30), smoothT);
      this.eyeHeight = eyeAboveFeet - this.currentHalfHeight;
    } else {
      this.eyeHeight = this.crouched ? this.crouchEyeOffset : this.standingEyeOffset;
    }
    if (this.grounded) this.crouchJumpActive = false;
  }

  // 【核心修复】动态改变物理碰撞盒，并根据着地状态智能位移
  private setHullSize(isCrouching: boolean): void {
    const targetHalfHeight = isCrouching ? this.crouchingHalfHeight : this.standingHalfHeight;
    if (this.currentHalfHeight === targetHalfHeight) return;

    const oldHalfHeight = this.currentHalfHeight;
    const oldBottomY = this.body.position.y - oldHalfHeight;
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
    if (this.grounded) {
      // 地面姿态切换永远保持脚底贴地，避免蹲起后脚底悬空或插入地面。
      this.body.position.y = oldBottomY + this.currentHalfHeight;
    } else if (isCrouching) {
      if (!this.grounded) {
        // 【空中下蹲】顶部保持不动，底部强行上提，产生让脚跨过箱子的净空！
        this.body.position.y += heightDiff;
      }
    } else {
      if (!this.grounded) {
        // 空中起立（把腿伸直）
        this.body.position.y -= heightDiff;
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
    return this.groundStickSuppressTime <= 0 && this.probeGround(this.groundedProbeDistance) !== null;
  }

  private probeGround(maxDistance: number): GroundProbeResult | null {
    const bottomY = this.body.position.y - this.currentHalfHeight;
    const offsets = [
      { x: 0, z: 0 },
      { x: this.groundProbeRadius, z: 0 },
      { x: -this.groundProbeRadius, z: 0 },
      { x: 0, z: this.groundProbeRadius },
      { x: 0, z: -this.groundProbeRadius },
      { x: this.groundProbeRadius, z: this.groundProbeRadius },
      { x: -this.groundProbeRadius, z: this.groundProbeRadius },
      { x: this.groundProbeRadius, z: -this.groundProbeRadius },
      { x: -this.groundProbeRadius, z: -this.groundProbeRadius },
    ];
    let best: GroundProbeResult | null = null;

    for (const offset of offsets) {
      const probeX = this.body.position.x + offset.x;
      const probeZ = this.body.position.z + offset.z;
      const boxHit = this.physics.findWalkableBoxBelow(probeX, probeZ, bottomY, maxDistance, 0.02);
      if (boxHit) {
        const distance = bottomY - boxHit.topY;
        const hit: GroundProbeResult = {
          hitY: boxHit.topY,
          normalY: 1,
          distance,
          body: boxHit.body,
        };
        if (!best || hit.hitY > best.hitY) best = hit;
      }

      const rayStart = new CANNON.Vec3(probeX, bottomY + 0.04, probeZ);
      const rayEnd = new CANNON.Vec3(probeX, bottomY - maxDistance, probeZ);
      const ray = new CANNON.Ray(rayStart, rayEnd);
      const result = new CANNON.RaycastResult();
      if (!ray.intersectWorld(this.physics.getWorld(), { mode: CANNON.Ray.CLOSEST, skipBackfaces: false, result })) continue;

      const body = result.body as NamedBody;
      if (!this.isWalkableGround(body.userData)) continue;
      if (result.hitNormalWorld.y < 0.45) continue;

      const distance = bottomY - result.hitPointWorld.y;
      if (distance < -0.04 || distance > maxDistance) continue;
      if (rayStart.distanceTo(result.hitPointWorld) < 0.02) continue;
      const hit: GroundProbeResult = {
        hitY: result.hitPointWorld.y,
        normalY: result.hitNormalWorld.y,
        distance,
        body,
      };
      if (!best || hit.hitY > best.hitY) best = hit;
    }

    return best;
  }

  private isWalkableGround(userData?: PhysicsBodyUserData): boolean {
    return userData?.walkable === true;
  }

  private alignBodyToGround(ground: GroundProbeResult): void {
    const targetY = ground.hitY + this.currentHalfHeight;
    if (Math.abs(this.body.position.y - targetY) > this.groundedStickEpsilon) {
      this.body.position.y = targetY;
      this.body.aabbNeedsUpdate = true;
    }
    if (this.body.velocity.y < 0) this.body.velocity.y = 0;
  }

  private settleOnGroundBelow(maxDistance: number): void {
    const ground = this.probeGround(maxDistance);
    if (!ground) return;
    this.alignBodyToGround(ground);
    this.grounded = true;
    this.body.aabbNeedsUpdate = true;
  }

  private resolveBodyYFromEyeY(eyeY: number): number {
    return eyeY - this.eyeHeight;
  }

  private updateLastSafeGroundPosition(): void {
    if (!this.grounded) return;
    const ground = this.probeGround(this.groundedProbeDistance);
    if (!ground || ground.distance > this.groundedStickEpsilon * 2) return;
    if (ground.body.userData?.sourceBacked && ground.body.userData.walkable !== true) return;
    this.lastSafeEyePosition = this.getPosition();
  }

  private preventSourceVoidEscape(): void {
    const arena = this.scene.getCurrentArena?.();
    if (!arena || arena.name !== 'Dust2' || !arena.source?.sourceBacked) return;

    const eyePosition = this.getPosition();
    const halfWidth = arena.bounds.width / 2 + 2;
    const halfDepth = arena.bounds.depth / 2 + 2;
    const minZ = arena.bounds.centerZ - halfDepth;
    const maxZ = arena.bounds.centerZ + halfDepth;
    const escaped =
      Math.abs(eyePosition.x) > halfWidth ||
      eyePosition.z < minZ ||
      eyePosition.z > maxZ ||
      eyePosition.y < -8;

    if (!escaped) return;

    const safe = this.lastSafeEyePosition ?? arena.playerSpawn;
    this.setPosition(safe.clone());
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
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

  getVerticalVelocityForDebug(): number {
    return this.body.velocity.y;
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

  getFootGroundDistanceForDebug(): number | null {
    const ground = this.probeGround(this.groundedProbeDistance);
    return ground?.distance ?? null;
  }

  takeDamage(amount: number, region: HitRegion = 'chest', armorPenetration = 0.35): void {
    const result = calculateDamage(
      {
        baseDamage: amount,
        armorPenetration,
        multipliers: { head: 1, chest: 1, stomach: 1, arm: 1, leg: 1 }
      } satisfies DamageProfile,
      region,
      this.armor,
      this.hasHelmet
    );
    this.armor = Math.max(0, this.armor - result.armorDamage);
    this.health = Math.max(0, this.health - result.healthDamage);
  }

  healFull(): void {
    this.health = this.maxHealth;
    this.armor = this.maxArmor;
    this.hasHelmet = true;
  }

  buyArmor(amount = this.maxArmor): void {
    this.armor = Math.max(this.armor, Math.min(this.maxArmor, amount));
  }

  buyArmorHelmet(): void {
    this.buyArmor();
    this.hasHelmet = true;
  }

  setArmor(amount: number): void {
    this.armor = Math.max(0, Math.min(this.maxArmor, amount));
    if (this.armor <= 0) this.hasHelmet = false;
  }

  setHelmet(hasHelmet: boolean): void {
    this.hasHelmet = hasHelmet;
  }

  syncAuthoritativeVitals(state: { health: number; armor: number; hasHelmet: boolean }): void {
    this.health = Math.max(0, Math.min(this.maxHealth, state.health));
    this.armor = Math.max(0, Math.min(this.maxArmor, state.armor));
    this.hasHelmet = state.hasHelmet;
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

  getHasHelmet(): boolean {
    return this.hasHelmet;
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

  addRecoilKick(pitchOffset: number, yawOffset: number): void {
    this.recoilKickPitch += pitchOffset;
    this.recoilKickYaw += yawOffset;
  }

  setPosition(position: THREE.Vector3): void {
    const bodyY = this.resolveBodyYFromEyeY(position.y);
    this.body.position.set(position.x, bodyY, position.z);
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.resetAirborneState();
    this.settleOnGroundBelow(2.0);
    this.body.wakeUp(); // Ensure physics body is active
    this.syncCameraToBody();
    // Fix: Force immediate grounded check instead of setting to false
    // This prevents physics oscillation when spawning
    this.grounded = this.canJump();
    this.updateLastSafeGroundPosition();
  }

  setEyePositionForDebug(position: THREE.Vector3): void {
    this.body.position.set(position.x, position.y - this.eyeHeight, position.z);
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.resetAirborneState();
    this.body.wakeUp();
    this.syncCameraToBody();
    this.grounded = this.canJump();
    this.updateLastSafeGroundPosition();
  }

  private resetAirborneState(): void {
    this.groundStickSuppressTime = 0;
    this.airborneTime = 0;
    this.crouchJumpActive = false;
    this.lastLandingSpeed = 0;
    this.wasGrounded = false;
    this.duckingInProgress = false;
    this.duckTransitionElapsed = 0;
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
