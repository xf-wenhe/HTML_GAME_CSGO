import * as THREE from 'three';
import { Physics } from './Physics.js';

export interface RaycastResult {
  hit: boolean;
  point?: THREE.Vector3;
  normal?: THREE.Vector3;
  distance?: number;
}

export class ProjectileSystem {
  private scene: THREE.Scene;
  private physics: Physics;

  constructor(scene: THREE.Scene, physics: Physics) {
    this.scene = scene;
    this.physics = physics;
  }

  fireRaycast(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number): RaycastResult {
    const raycaster = new THREE.Raycaster(origin, direction, 0, maxDistance);
    const intersects = raycaster.intersectObjects(this.getRaycastTargets(), false);

    if (intersects.length > 0) {
      return {
        hit: true,
        point: intersects[0].point.clone(),
        normal: intersects[0].face?.normal.clone(),
        distance: intersects[0].distance
      };
    }

    return { hit: false };
  }

  fireHitscan(origin: THREE.Vector3, direction: THREE.Vector3, damage: number): RaycastResult & { damage: number } {
    const result = this.fireRaycast(origin, direction, 1000);
    return {
      ...result,
      damage: result.hit ? damage : 0
    };
  }

  dispose(): void {}

  private getRaycastTargets(): THREE.Object3D[] {
    const targets: THREE.Object3D[] = [];
    this.scene.traverse(object => {
      if (!object.visible) return;
      if (object instanceof THREE.Sprite) return;
      if (object.userData?.raycastIgnore) return;
      if ((object as THREE.Mesh).isMesh) targets.push(object);
    });
    return targets;
  }
}
