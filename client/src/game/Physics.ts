import * as CANNON from 'cannon-es';

export class Physics {
  private world: CANNON.World;
  private bodies: CANNON.Body[] = [];

  constructor() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, -18, 0);
    this.world.defaultContactMaterial.friction = 0;
    this.world.defaultContactMaterial.restitution = 0;

    const defaultMaterial = new CANNON.Material('default');
    const defaultContactMaterial = new CANNON.ContactMaterial(
      defaultMaterial,
      defaultMaterial,
      { friction: 0, restitution: 0 }
    );
    this.world.addContactMaterial(defaultContactMaterial);

    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0, material: defaultMaterial });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    this.world.addBody(groundBody);
    this.bodies.push(groundBody);
  }

  getWorld(): CANNON.World {
    return this.world;
  }

  addBody(body: CANNON.Body): void {
    this.world.addBody(body);
    this.bodies.push(body);
  }

  addStaticBox(position: CANNON.Vec3, halfExtents: CANNON.Vec3): CANNON.Body {
    const body = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(halfExtents),
      position
    });
    this.addBody(body);
    return body;
  }

  removeBody(body: CANNON.Body): void {
    this.world.removeBody(body);
    this.bodies = this.bodies.filter(b => b !== body);
  }

  step(dt: number = 0.016): void {
    this.world.step(dt);
  }

  dispose(): void {
    this.bodies.forEach(body => {
      this.world.removeBody(body);
    });
    this.bodies = [];
  }
}
