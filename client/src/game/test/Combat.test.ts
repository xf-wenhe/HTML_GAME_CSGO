import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { calculateDamage, closestPointDistanceToRay } from '../Combat.js';
import { WEAPON_DEFINITIONS } from '../Weapons.js';

describe('CSGO-style combat math', () => {
  it('applies hit-region multipliers and armor absorption', () => {
    const rifle = WEAPON_DEFINITIONS.rifle.getDamageProfile();
    const head = calculateDamage(rifle, 'head', 100);
    const leg = calculateDamage(rifle, 'leg', 100);

    expect(head.healthDamage).toBeGreaterThan(leg.healthDamage);
    expect(head.armorDamage).toBeGreaterThan(0);
    expect(leg.armorDamage).toBeLessThan(head.armorDamage);
  });

  it('keeps one ray focused on the closest valid target', () => {
    const origin = new THREE.Vector3(0, 1.7, 0);
    const direction = new THREE.Vector3(0, 0, -1);
    const near = closestPointDistanceToRay(origin, direction, new THREE.Vector3(0.08, 1.7, -6));
    const far = closestPointDistanceToRay(origin, direction, new THREE.Vector3(0.08, 1.7, -12));

    expect(near.distance).toBeLessThan(0.1);
    expect(near.t).toBeLessThan(far.t);
  });
});
