// client/src/game/ShellCasing.ts
import * as THREE from 'three';

interface CasingInstance {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  age: number;
  grounded: boolean;
}

const MAX_CASINGS = 20;
const CASING_LIFETIME = 5; // seconds
const GRAVITY = 9.8;
const GROUND_Y = 0.05;

const casingGeometries: Record<string, THREE.CylinderGeometry> = {
  pistol: new THREE.CylinderGeometry(0.02, 0.02, 0.12, 8),
  rifle: new THREE.CylinderGeometry(0.022, 0.022, 0.16, 8),
  smg: new THREE.CylinderGeometry(0.02, 0.02, 0.14, 8),
  shotgun: new THREE.CylinderGeometry(0.03, 0.03, 0.20, 8),
  sniper: new THREE.CylinderGeometry(0.025, 0.025, 0.20, 8),
};

const casingColors: Record<string, number> = {
  pistol: 0xd4a843,
  rifle: 0xc9953a,
  smg: 0xc9953a,
  shotgun: 0xb8382b,
  sniper: 0xd4a843,
};

function createCasingMesh(weaponType: string): THREE.Mesh {
  const geometry = casingGeometries[weaponType] ?? casingGeometries.rifle;
  const color = casingColors[weaponType] ?? casingColors.rifle;
  const material = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.8,
    roughness: 0.35,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

export class ShellCasingManager {
  private casings: CasingInstance[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  spawn(position: THREE.Vector3, viewDirection: THREE.Vector3, weaponType: string): void {
    const mesh = createCasingMesh(weaponType);
    mesh.position.copy(position);

    const right = new THREE.Vector3().crossVectors(viewDirection, new THREE.Vector3(0, 1, 0)).normalize();
    const ejectDir = new THREE.Vector3()
      .addScaledVector(right, 1.0)
      .addScaledVector(new THREE.Vector3(0, 1, 0), 0.6)
      .addScaledVector(viewDirection, -0.2)
      .normalize();

    const speed = weaponType === 'shotgun' ? 2.5 + Math.random() * 1.5 :
      weaponType === 'rifle' ? 2.0 + Math.random() * 1.5 :
      1.5 + Math.random() * 1.0;

    const velocity = ejectDir.clone().multiplyScalar(speed);
    const angularVelocity = new THREE.Vector3(
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 12,
    );

    this.casings.push({ mesh, position: position.clone(), velocity, angularVelocity, age: 0, grounded: false });
    this.scene.add(mesh);

    while (this.casings.length > MAX_CASINGS) {
      const oldest = this.casings.shift()!;
      this.scene.remove(oldest.mesh);
      (oldest.mesh.material as THREE.Material).dispose();
    }
  }

  update(dt: number): void {
    for (let i = this.casings.length - 1; i >= 0; i--) {
      const casing = this.casings[i];
      casing.age += dt;

      if (casing.age > CASING_LIFETIME) {
        this.scene.remove(casing.mesh);
        (casing.mesh.material as THREE.Material).dispose();
        this.casings.splice(i, 1);
        continue;
      }

      if (!casing.grounded) {
        casing.velocity.y -= GRAVITY * dt;
        casing.position.addScaledVector(casing.velocity, dt);
        casing.mesh.rotation.x += casing.angularVelocity.x * dt;
        casing.mesh.rotation.y += casing.angularVelocity.y * dt;
        casing.mesh.rotation.z += casing.angularVelocity.z * dt;

        if (casing.position.y <= GROUND_Y) {
          casing.position.y = GROUND_Y;
          casing.velocity.y *= -0.3;
          casing.velocity.x *= 0.7;
          casing.velocity.z *= 0.7;
          if (Math.abs(casing.velocity.y) < 0.5) {
            casing.grounded = true;
            casing.velocity.set(0, 0, 0);
          }
        }
      }

      casing.mesh.position.copy(casing.position);
    }
  }

  // 【新增】清理掉落在地上的所有弹壳
  clear(): void {
    this.casings.forEach(c => {
      this.scene.remove(c.mesh);
      (c.mesh.material as THREE.Material).dispose();
    });
    this.casings = [];
  }
  
  dispose(): void {
    this.casings.forEach(c => {
      this.scene.remove(c.mesh);
      (c.mesh.material as THREE.Material).dispose();
    });
    this.casings = [];
  }
}
