import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GrenadeSystem } from '../GrenadeSystem.js';

describe('GrenadeSystem', () => {
  it('cycles tactical grenades and consumes inventory on throw', () => {
    const scene = new THREE.Scene();
    const system = new GrenadeSystem(scene);
    const camera = new THREE.PerspectiveCamera();

    system.setInventory({ he: 0, smoke: 1 });
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

    system.setInventory({ he: 1 });
    expect(system.throwSelected(camera).success).toBe(true);
    for (let i = 0; i < 130; i++) {
      system.update(1 / 60, new THREE.Vector3(0, 1.7, -3));
    }

    expect(scene.children.length).toBeGreaterThan(0);
  });

  it('renders and detonates server-authoritative grenades thrown by remote players', () => {
    const scene = new THREE.Scene();
    const system = new GrenadeSystem(scene);
    const sync = (system as GrenadeSystem & {
      syncAuthoritativeGrenades?: (
        grenades: Array<{
          id: string;
          type: 'he';
          throwerId: string;
          position: { x: number; y: number; z: number };
          exploded: boolean;
        }>,
        localPlayerId?: string
      ) => void;
    }).syncAuthoritativeGrenades;

    sync?.call(system, [{
      id: 'remote-he',
      type: 'he',
      throwerId: 'remote-player',
      position: { x: 2, y: 1, z: -3 },
      exploded: false
    }], 'local-player');

    expect(scene.children.some(child => child.userData.authoritativeGrenadeId === 'remote-he')).toBe(true);

    sync?.call(system, [{
      id: 'remote-he',
      type: 'he',
      throwerId: 'remote-player',
      position: { x: 3, y: 0.13, z: -4 },
      exploded: true
    }], 'local-player');

    expect(scene.children.some(child => child.userData.authoritativeGrenadeId === 'remote-he')).toBe(false);
    expect(scene.children.some(child => child.userData.kind === 'burst')).toBe(true);
  });
});
