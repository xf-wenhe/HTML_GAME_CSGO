import * as CANNON from 'cannon-es';

export type NamedBody = CANNON.Body & { userData?: { name?: string } };

export class Physics {
  private world: CANNON.World;
  private bodies: CANNON.Body[] = [];
  private groundBody: CANNON.Body | null = null;
  private defaultMaterial = new CANNON.Material('default');
  private readonly fixedTimeStep = 1 / 120;
  private readonly maxSubSteps = 6;

  constructor() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, -7.06, 0); // CS1.6 标准重力（与 Movement.ts 保持同步）
    this.world.defaultContactMaterial.friction = 0;
    this.world.defaultContactMaterial.restitution = 0;

    // 【优化 1：启用 SAP 宽相检测】将物理碰撞的性能消耗从 O(n^2) 降级到近乎 O(n)
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    const defaultContactMaterial = new CANNON.ContactMaterial(
      this.defaultMaterial,
      this.defaultMaterial,
      { friction: 0, restitution: 0 }
    );
    this.world.addContactMaterial(defaultContactMaterial);

    this.setGlobalGroundEnabled(true);
  }

  setGlobalGroundEnabled(enabled: boolean, topY = 0): void {
    if (enabled && !this.groundBody) {
      // Use thick box instead of Plane - cannon-es Plane doesn't work well with raycasting
      const groundShape = new CANNON.Box(new CANNON.Vec3(500, 0.5, 500));
      const groundBody = new CANNON.Body({ mass: 0, material: this.defaultMaterial });
      groundBody.addShape(groundShape);
      groundBody.position.set(0, topY - 0.5, 0);
      this.world.addBody(groundBody);
      this.bodies.push(groundBody);
      this.groundBody = groundBody;
      return;
    }
    if (enabled && this.groundBody) {
      this.groundBody.position.y = topY - 0.5;
      this.groundBody.aabbNeedsUpdate = true;
      return;
    }
    if (!enabled && this.groundBody) {
      this.removeBody(this.groundBody);
      this.groundBody = null;
    }
  }

  getWorld(): CANNON.World {
    return this.world;
  }

  addBody(body: CANNON.Body): void {
    this.world.addBody(body);
    this.bodies.push(body);
  }

  addStaticBox(position: CANNON.Vec3, halfExtents: CANNON.Vec3, rotation?: { x: number; y: number; z: number }, name?: string): CANNON.Body {
    const body = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(halfExtents),
      position
    });
    if (rotation && (rotation.x !== 0 || rotation.y !== 0 || rotation.z !== 0)) {
      body.quaternion.setFromEuler(rotation.x, rotation.y, rotation.z);
    }
    const namedBody = body as NamedBody;
    namedBody.userData = { ...(namedBody.userData ?? {}), name };
    this.addBody(body);
    return body;
  }

  addStaticTrimesh(vertices: number[], indices: number[], name?: string): CANNON.Body {
    const body = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Trimesh(vertices, indices),
    });
    const namedBody = body as NamedBody;
    namedBody.userData = { ...(namedBody.userData ?? {}), name };
    this.addBody(body);
    return body;
  }

  removeBody(body: CANNON.Body): void {
    this.world.removeBody(body);
    this.bodies = this.bodies.filter(b => b !== body);
  }

  step(dt: number = 0.016): void {
    this.world.step(this.fixedTimeStep, Math.min(dt, 0.05), this.maxSubSteps);
  }

  dispose(): void {
    this.bodies.forEach(body => {
      this.world.removeBody(body);
    });
    this.bodies = [];
    this.groundBody = null;
  }
}
