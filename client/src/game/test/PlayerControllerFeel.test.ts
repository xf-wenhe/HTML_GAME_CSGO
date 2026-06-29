import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { InputManager } from '../InputManager.js';
import { Physics } from '../Physics.js';
import { PlayerController } from '../PlayerController.js';
import { CSGO_MOVEMENT } from '../Movement.js';

function createController() {
  const physics = new Physics();
  physics.setGlobalGroundEnabled(true, 0);
  const camera = new THREE.PerspectiveCamera();
  const scene = {
    getCamera: () => camera,
    getCurrentArena: () => ({ name: 'Test', source: { sourceBacked: false }, bounds: { width: 20, depth: 20, centerZ: 0 } }),
    getFeedbackEffects: () => ({ landHard: () => undefined }),
  };
  const input = new InputManager(undefined, 'linux');
  const player = new PlayerController(scene as any, physics, input, new THREE.Vector3(0, 0.64, 0));
  return { physics, input, player };
}

function createPlatformController() {
  const physics = new Physics();
  physics.setGlobalGroundEnabled(false);
  const camera = new THREE.PerspectiveCamera();
  const scene = {
    getCamera: () => camera,
    getCurrentArena: () => ({ name: 'Test', source: { sourceBacked: false }, bounds: { width: 20, depth: 20, centerZ: 0 } }),
    getFeedbackEffects: () => ({ landHard: () => undefined }),
  };
  physics.addStaticBox(
    new CANNON.Vec3(0, -0.06, 0),
    new CANNON.Vec3(1.2, 0.06, 0.55),
    undefined,
    'test-walkable-platform',
    { walkable: true, collisionKind: 'floor' }
  );
  const input = new InputManager(undefined, 'linux');
  const player = new PlayerController(scene as any, physics, input, new THREE.Vector3(0, 0.64, 0));
  return { physics, input, player };
}

function createUntaggedPlatformController() {
  const physics = new Physics();
  physics.setGlobalGroundEnabled(false);
  const camera = new THREE.PerspectiveCamera();
  const scene = {
    getCamera: () => camera,
    getCurrentArena: () => ({ name: 'Test', source: { sourceBacked: false }, bounds: { width: 20, depth: 20, centerZ: 0 } }),
    getFeedbackEffects: () => ({ landHard: () => undefined }),
  };
  physics.addStaticBox(
    new CANNON.Vec3(0, -0.06, 0),
    new CANNON.Vec3(1.2, 0.06, 1.2),
    undefined,
    'test-untagged-platform'
  );
  const input = new InputManager(undefined, 'linux');
  const player = new PlayerController(scene as any, physics, input, new THREE.Vector3(0, 0.64, 0));
  return { physics, player };
}

function tick(player: PlayerController, physics: Physics, dt = 1 / 100): THREE.Vector3 {
  player.update(dt);
  physics.step(dt);
  player.syncCameraToBody();
  return player.getPosition();
}

describe('PlayerController CS1.6 feel', () => {
  it('does not bob vertically while idle or while walking on flat ground', () => {
    const { physics, input, player } = createController();
    const idleY: number[] = [];
    for (let i = 0; i < 90; i++) idleY.push(tick(player, physics).y);

    input.setKeyPressed('KeyW', true);
    const movingY: number[] = [];
    for (let i = 0; i < 120; i++) movingY.push(tick(player, physics).y);

    const range = (values: number[]) => Math.max(...values) - Math.min(...values);
    expect(range(idleY)).toBeLessThan(0.002);
    expect(range(movingY)).toBeLessThan(0.002);
    expect(player.getHorizontalSpeed()).toBeCloseTo(CSGO_MOVEMENT.runSpeed, 1);
  });

  it('keeps mouse turning continuous while moving', () => {
    const { physics, input, player } = createController();
    input.setKeyPressed('KeyW', true);

    const yaws: number[] = [];
    for (let i = 0; i < 80; i++) {
      input.setMouseDelta(0.018, 0);
      tick(player, physics);
      yaws.push(player.getRotation().yaw);
    }

    const steps = yaws.slice(1).map((yaw, index) => yaw - yaws[index]);
    expect(Math.max(...steps) - Math.min(...steps)).toBeLessThan(0.0001);
    expect(Math.abs(yaws.at(-1)! - yaws[0])).toBeGreaterThan(1.0);
    expect(player.getHorizontalSpeed()).toBeGreaterThan(CSGO_MOVEMENT.runSpeed * 0.85);
  });

  it('applies weapon movement speed multipliers to running speed', () => {
    const { physics, input, player } = createController();
    player.setMovementSpeedMultiplier(0.84);
    input.setKeyPressed('KeyW', true);

    for (let i = 0; i < 160; i++) tick(player, physics);

    expect(player.getHorizontalSpeed()).toBeCloseTo(CSGO_MOVEMENT.runSpeed * 0.84, 1);
  });

  it('applies scoped look sensitivity without muting recoil kick', () => {
    const { physics, input, player } = createController();

    input.setMouseDelta(0.02, 0);
    tick(player, physics);
    const normalYaw = player.getRotation().yaw;

    player.setRotation(0, 0);
    player.setLookSensitivityMultiplier(0.25);
    input.setMouseDelta(0.02, 0);
    tick(player, physics);
    const scopedYaw = player.getRotation().yaw;

    expect(Math.abs(scopedYaw)).toBeCloseTo(Math.abs(normalYaw) * 0.25, 5);

    player.setRotation(0, 0);
    input.setMouseDelta(0, 0);
    player.addRecoilKick(0, 0.01);
    tick(player, physics);

    expect(player.getRotation().yaw).toBeCloseTo(-0.01, 5);
  });

  it('accepts server-authoritative health, armor, and helmet state', () => {
    const { player } = createController();

    (player as any).syncAuthoritativeVitals?.({
      health: 37,
      armor: 52,
      hasHelmet: true
    });

    expect(player.getHealth()).toBe(37);
    expect(player.getArmor()).toBe(52);
    expect(player.getHasHelmet()).toBe(true);
  });

  it('uses a quick CS1.6-style jump arc and lands cleanly', () => {
    const { physics, input, player } = createController();
    input.setKeyPressed('Space', true);

    const y: number[] = [];
    const grounded: boolean[] = [];
    for (let i = 0; i < 120; i++) {
      y.push(tick(player, physics).y);
      grounded.push(player.isGrounded());
    }

    const apex = Math.max(...y);
    const landedFrame = y.findIndex((value, index) => index > 10 && Math.abs(value - 0.53) < 0.01 && grounded[index]);
    expect(apex - 0.53).toBeGreaterThan(0.40);
    expect(apex - 0.53).toBeLessThan(0.50);
    expect(landedFrame).toBeGreaterThan(30);
    expect(landedFrame).toBeLessThan(85);
    expect(y.at(-1)).toBeCloseTo(0.53, 2);
  });

  it('applies CS 1.6 multiplayer damage after a high-speed fall', () => {
    const { physics, player } = createController();
    player.setPosition(new THREE.Vector3(0, 4.64, 0));

    for (let i = 0; i < 240 && !player.isGrounded(); i++) tick(player, physics);

    expect(player.isGrounded()).toBe(true);
    expect(player.getHealth()).toBeLessThan(100);
  });

  it('clears airborne state when multiplayer or recovery logic repositions the player', () => {
    const { physics, input, player } = createController();
    input.setKeyPressed('Space', true);
    for (let i = 0; i < 20; i++) tick(player, physics);
    expect(player.getAirborneTime()).toBeGreaterThan(0);

    player.setPosition(new THREE.Vector3(0, 0.53, 0));

    expect(player.isGrounded()).toBe(true);
    expect(player.getAirborneTime()).toBe(0);
    expect(player.isCrouchJumping()).toBe(false);
  });

  it('uses the CS 1.6 standing and duck hull with a 30 HU crouched eye height', () => {
    const { physics, input, player } = createController();
    expect(player.getCollisionHeight()).toBeCloseTo(0.72, 5);
    expect(player.getPosition().y).toBeCloseTo(0.53, 2);

    input.setKeyPressed('ControlLeft', true);
    for (let i = 0; i < 50; i++) tick(player, physics);

    expect(player.isCrouched()).toBe(true);
    expect(player.getCollisionHeight()).toBeCloseTo(0.5, 5);
    expect(player.getPosition().y).toBeCloseTo(0.3, 2);
  });

  it('takes 0.4 seconds to finish a grounded CS 1.6 duck transition', () => {
    const { physics, input, player } = createController();
    input.setKeyPressed('ControlLeft', true);

    for (let i = 0; i < 20; i++) tick(player, physics);
    expect(player.getCollisionHeight()).toBeCloseTo(0.72, 5);
    expect(player.getPosition().y).toBeLessThan(0.53);
    expect(player.getPosition().y).toBeGreaterThan(0.3);

    for (let i = 0; i < 21; i++) tick(player, physics);
    expect(player.isCrouched()).toBe(true);
    expect(player.getCollisionHeight()).toBeCloseTo(0.5, 5);
    expect(player.getPosition().y).toBeCloseTo(0.3, 2);
  });

  it('uses normal GoldSrc acceleration while ducking instead of an artificial boost', () => {
    const { physics, input, player } = createController();
    input.setKeyPressed('ControlLeft', true);
    input.setKeyPressed('KeyW', true);

    tick(player, physics);

    expect(player.getHorizontalSpeed()).toBeCloseTo(CSGO_MOVEMENT.crouchSpeed * CSGO_MOVEMENT.groundAcceleration * 0.01, 4);
  });

  it('lands with feet still stuck to the ground after jump and crouch cycles', () => {
    const { physics, input, player } = createController();

    for (let cycle = 0; cycle < 3; cycle++) {
      input.setKeyPressed('Space', true);
      for (let i = 0; i < 140; i++) tick(player, physics);
      input.setKeyPressed('ControlLeft', true);
      for (let i = 0; i < 15; i++) tick(player, physics);
      input.setKeyPressed('ControlLeft', false);
      for (let i = 0; i < 25; i++) tick(player, physics);
    }
    for (let i = 0; i < 40; i++) tick(player, physics);

    expect(player.isGrounded()).toBe(true);
    expect(player.getFootGroundDistanceForDebug()).not.toBeNull();
    expect(Math.abs(player.getFootGroundDistanceForDebug() ?? 1)).toBeLessThan(0.03);
    expect(player.getPosition().y).toBeCloseTo(0.53, 2);
  });

  it('does not snap to ground or hover after walking off a high ledge', () => {
    const { physics, input, player } = createPlatformController();
    input.setKeyPressed('KeyW', true);

    let leftGround = false;
    let lowestY = player.getPosition().y;
    for (let i = 0; i < 130; i++) {
      const position = tick(player, physics);
      lowestY = Math.min(lowestY, position.y);
      if (!player.isGrounded()) leftGround = true;
    }

    expect(leftGround).toBe(true);
    expect(lowestY).toBeLessThan(0.2);
    expect(player.getFootGroundDistanceForDebug()).toBeNull();
  });

  it('does not treat untagged physics bodies as valid ground', () => {
    const { physics, player } = createUntaggedPlatformController();

    for (let i = 0; i < 20; i++) tick(player, physics);

    expect(player.isGrounded()).toBe(false);
    expect(player.getFootGroundDistanceForDebug()).toBeNull();
  });

  it('can reset armor separately for CS1.6 pistol rounds', () => {
    const { player } = createController();

    player.healFull();
    player.setArmor(0);

    expect(player.getHealth()).toBe(100);
    expect(player.getArmor()).toBe(0);
  });

  it('only lets armor protect head damage after buying a helmet', () => {
    const unhelmeted = createController().player;
    unhelmeted.healFull();
    unhelmeted.setHelmet(false);
    unhelmeted.takeDamage(50, 'head', 0.5);

    expect(unhelmeted.getHealth()).toBe(50);
    expect(unhelmeted.getArmor()).toBe(100);

    const helmeted = createController().player;
    helmeted.healFull();
    helmeted.setHelmet(false);
    helmeted.buyArmorHelmet();
    helmeted.takeDamage(50, 'head', 0.5);

    expect(helmeted.getHealth()).toBe(75);
    expect(helmeted.getArmor()).toBeLessThan(100);
  });
});
