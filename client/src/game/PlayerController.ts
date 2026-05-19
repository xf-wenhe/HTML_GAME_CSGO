import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Physics } from './Physics.js';
import { InputManager } from './InputManager.js';
import { Scene } from './Scene.js';

export class PlayerController {
  private body: CANNON.Body;
  private camera: THREE.PerspectiveCamera;
  private input: InputManager;
  private physics: Physics;

  private walkSpeed = 5;
  private jumpForce = 5;
  private mouseSensitivity = 0.002;
  private pitch = 0;
  private yaw = 0;

  constructor(scene: Scene, physics: Physics, input: InputManager, position: THREE.Vector3 = new THREE.Vector3(0, 1.7, 0)) {
    this.camera = scene.getCamera();
    this.input = input;
    this.physics = physics;

    const shape = new CANNON.Box(new CANNON.Vec3(0.5, 1.0, 0.5));
    this.body = new CANNON.Body({
      mass: 70,
      shape: shape,
      position: new CANNON.Vec3(position.x, position.y, position.z),
      fixedRotation: true,
      linearDamping: 0.9
    });
    this.physics.addBody(this.body);

    this.camera.position.copy(position);
  }

  update(dt: number): void {
    this.camera.position.set(
      this.body.position.x,
      this.body.position.y + 0.7,
      this.body.position.z
    );

    const mouseDelta = this.input.getMouseDelta();
    this.yaw -= mouseDelta.x * this.mouseSensitivity;
    this.pitch -= mouseDelta.y * this.mouseSensitivity;

    this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.pitch));

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    const right = new THREE.Vector3(1, 0, 0);
    right.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    const moveDirection = new THREE.Vector3();

    if (this.input.isKeyPressed('KeyW')) moveDirection.add(forward);
    if (this.input.isKeyPressed('KeyS')) moveDirection.sub(forward);
    if (this.input.isKeyPressed('KeyA')) moveDirection.sub(right);
    if (this.input.isKeyPressed('KeyD')) moveDirection.add(right);

    if (moveDirection.length() > 0) {
      moveDirection.normalize();
      this.body.velocity.x = moveDirection.x * this.walkSpeed;
      this.body.velocity.z = moveDirection.z * this.walkSpeed;
    } else {
      this.body.velocity.x = 0;
      this.body.velocity.z = 0;
    }

    if (this.input.isKeyPressed('Space')) {
      this.input.setKeyPressed('Space', false);
      if (this.canJump()) {
        this.body.velocity.y = this.jumpForce;
      }
    }
  }

  private canJump(): boolean {
    const rayStart = new CANNON.Vec3(this.body.position.x, this.body.position.y, this.body.position.z);
    const rayEnd = new CANNON.Vec3(this.body.position.x, this.body.position.y - 1.1, this.body.position.z);
    const ray = new CANNON.Ray(rayStart, rayEnd);
    const result = new CANNON.RaycastResult();
    return ray.intersectWorld(this.physics.getWorld(), { mode: CANNON.Ray.CLOSEST, skipBackfaces: true }, result);
  }

  getPosition(): THREE.Vector3 {
    return new THREE.Vector3(this.body.position.x, this.body.position.y, this.body.position.z);
  }

  getRotation(): { pitch: number; yaw: number } {
    return { pitch: this.pitch, yaw: this.yaw };
  }

  setPosition(position: THREE.Vector3): void {
    this.body.position.set(position.x, position.y, position.z);
  }

  dispose(): void {
    this.physics.removeBody(this.body);
  }
}