// client/src/game/TracerSystem.ts
import * as THREE from 'three';

interface TracerInstance {
  line: THREE.Line;
  createdAt: number;
  lifetime: number;
}

const MAX_TRACERS = 30;
const TRACER_LIFETIME = 0.1; // 100ms

export class TracerSystem {
  private tracers: TracerInstance[] = [];
  private scene: THREE.Scene;
  private tracerMaterial: THREE.LineBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.tracerMaterial = new THREE.LineBasicMaterial({
      color: 0xfff5c0,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
  }

  spawn(from: THREE.Vector3, to: THREE.Vector3): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array([
      from.x, from.y, from.z,
      to.x, to.y, to.z,
    ]);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const line = new THREE.Line(geometry, this.tracerMaterial.clone());
    this.tracers.push({ line, createdAt: performance.now() / 1000, lifetime: TRACER_LIFETIME });
    this.scene.add(line);

    while (this.tracers.length > MAX_TRACERS) {
      const oldest = this.tracers.shift()!;
      this.scene.remove(oldest.line);
      oldest.line.geometry.dispose();
      (oldest.line.material as THREE.Material).dispose();
    }
  }

  update(now: number): void {
    const currentTime = now / 1000;
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const tracer = this.tracers[i];
      const age = currentTime - tracer.createdAt;
      const ratio = age / tracer.lifetime;
      if (ratio >= 1) {
        this.scene.remove(tracer.line);
        tracer.line.geometry.dispose();
        (tracer.line.material as THREE.Material).dispose();
        this.tracers.splice(i, 1);
      } else {
        (tracer.line.material as THREE.LineBasicMaterial).opacity = 0.7 * (1 - ratio);
      }
    }
  }

  dispose(): void {
    this.tracers.forEach(t => {
      this.scene.remove(t.line);
      t.line.geometry.dispose();
      (t.line.material as THREE.Material).dispose();
    });
    this.tracers = [];
    this.tracerMaterial.dispose();
  }
}
