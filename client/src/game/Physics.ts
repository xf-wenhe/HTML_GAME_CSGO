import * as CANNON from 'cannon-es';

export class Physics {
  private world: CANNON.World;
  private bodies: CANNON.Body[] = [];

  constructor() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, -9.82, 0);

    const defaultMaterial = new CANNON.Material('default');
    const defaultContactMaterial = new CANNON.ContactMaterial(
      defaultMaterial,
      defaultMaterial,
      { friction: 0.1, restitution: 0.3 }
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