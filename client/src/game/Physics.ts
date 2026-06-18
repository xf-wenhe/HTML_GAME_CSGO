import * as CANNON from 'cannon-es';

export interface PhysicsBodyUserData {
  name?: string;
  kind?: 'box' | 'trimesh' | 'ground';
  walkable?: boolean;
  collisionKind?: 'floor' | 'ramp' | 'wall' | 'boundary' | 'prop' | 'render' | 'auxiliary' | 'ground';
  sourceBacked?: boolean;
  sourceMap?: string;
}

export type NamedBody = CANNON.Body & { userData?: PhysicsBodyUserData };

export class Physics {
  private world: CANNON.World;
  private bodies: CANNON.Body[] = [];
  private groundBody: CANNON.Body | null = null;
  private defaultMaterial = new CANNON.Material('default');
  private readonly fixedTimeStep = 1 / 100;
  private readonly maxSubSteps = 4;

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
      (groundBody as NamedBody).userData = { name: 'global-ground', kind: 'ground', walkable: true, collisionKind: 'ground' };
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

  hasGlobalGround(): boolean {
    return this.groundBody !== null;
  }

  addBody(body: CANNON.Body): void {
    this.world.addBody(body);
    this.bodies.push(body);
  }

  addStaticBox(
    position: CANNON.Vec3,
    halfExtents: CANNON.Vec3,
    rotation?: { x: number; y: number; z: number },
    name?: string,
    userData: PhysicsBodyUserData = {}
  ): CANNON.Body {
    const body = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(halfExtents),
      position
    });
    if (rotation && (rotation.x !== 0 || rotation.y !== 0 || rotation.z !== 0)) {
      body.quaternion.setFromEuler(rotation.x, rotation.y, rotation.z);
    }
    const namedBody = body as NamedBody;
    namedBody.userData = { ...(namedBody.userData ?? {}), ...userData, name, kind: userData.kind ?? 'box' };
    this.addBody(body);
    return body;
  }

  addStaticTrimesh(vertices: number[], indices: number[], name?: string, userData: PhysicsBodyUserData = {}): CANNON.Body {
    const body = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Trimesh(vertices, indices),
    });
    const namedBody = body as NamedBody;
    namedBody.userData = { ...(namedBody.userData ?? {}), ...userData, name, kind: userData.kind ?? 'trimesh' };
    this.addBody(body);
    return body;
  }

  removeBody(body: CANNON.Body): void {
    this.world.removeBody(body);
    this.bodies = this.bodies.filter(b => b !== body);
  }

  findStaticBoxTopBelow(x: number, z: number, bottomY: number, maxDistance: number): number | null {
    let bestTop: number | null = null;
    this.bodies.forEach(body => {
      if (body.mass !== 0) return;
      const userData = (body as NamedBody).userData;
      if (userData?.walkable === false || userData?.collisionKind === 'boundary' || userData?.collisionKind === 'wall') return;
      const shape = body.shapes[0];
      if (!(shape instanceof CANNON.Box)) return;
      const half = shape.halfExtents;
      if (x < body.position.x - half.x || x > body.position.x + half.x) return;
      if (z < body.position.z - half.z || z > body.position.z + half.z) return;
      const top = body.position.y + half.y;
      const drop = bottomY - top;
      if (drop < -0.5 || drop > maxDistance) return;
      if (bestTop === null || top > bestTop) bestTop = top;
    });
    return bestTop;
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
