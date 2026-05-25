import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { hasLineOfSight } from '../Enemy.js';

describe('enemy tactical behavior helpers', () => {
  it('blocks line of sight through solid cover', () => {
    const enemy = new THREE.Vector3(0, 1.7, 0);
    const player = new THREE.Vector3(0, 1.7, 10);
    const cover = [{ position: new THREE.Vector3(0, 1.7, 5), size: new THREE.Vector3(3, 3, 1), color: 0 }];

    expect(hasLineOfSight(enemy, player, cover)).toBe(false);
    expect(hasLineOfSight(enemy, player, [])).toBe(true);
  });
});
