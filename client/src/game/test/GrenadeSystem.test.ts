import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GrenadeSystem } from '../GrenadeSystem.js';

describe('GrenadeSystem', () => {
  it('cycles tactical grenades and consumes inventory on throw', () => {
    const scene = new THREE.Scene();
    const system = new GrenadeSystem(scene);
    const camera = new THREE.PerspectiveCamera();

    system.select('smoke');
    expect(system.getSelectedLabel()).toBe('烟雾弹');
    expect(system.throwSelected(camera).success).toBe(true);
    expect(system.getInventory().smoke).toBe(0);
    expect(system.throwSelected(camera).success).toBe(false);
  });

  it('detonates grenades into temporary scene effects', () => {
    const scene = new THREE.Scene();
    const system = new GrenadeSystem(scene);
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 1.7, 0);

    expect(system.throwSelected(camera).success).toBe(true);
    for (let i = 0; i < 130; i++) {
      system.update(1 / 60, new THREE.Vector3(0, 1.7, -3));
    }

    expect(scene.children.length).toBeGreaterThan(0);
  });
});
