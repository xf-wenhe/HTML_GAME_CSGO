import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildShootRequest } from './ShootRequestBuilder.js';

describe('buildShootRequest', () => {
  it('preserves heavy melee attacks for authoritative multiplayer knife stabs', () => {
    const request = buildShootRequest(
      {
        origin: new THREE.Vector3(1, 2, 3),
        direction: new THREE.Vector3(0, 0, -1),
        damage: 65,
        pellets: 1,
        isMelee: true,
        heavyMelee: true,
        range: 1.6,
        spread: 0,
        recoilOffset: { x: 0, y: 0 }
      },
      'knife',
      1234
    );

    expect(request).toEqual({
      origin: { x: 1, y: 2, z: 3 },
      direction: { x: 0, y: 0, z: -1 },
      weaponId: 'knife',
      clientTime: 1234,
      heavyMelee: true
    });
  });
});
