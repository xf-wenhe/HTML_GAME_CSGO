import * as THREE from 'three';

export type HitRegion = 'head' | 'chest' | 'stomach' | 'arm' | 'leg';

export interface DamageProfile {
  baseDamage: number;
  armorPenetration: number;
  multipliers: Record<HitRegion, number>;
}

export interface DamageResult {
  healthDamage: number;
  armorDamage: number;
  totalDamage: number;
  region: HitRegion;
}

export const DEFAULT_HIT_MULTIPLIERS: Record<HitRegion, number> = {
  head: 4,
  chest: 1,
  stomach: 1.25,
  arm: 0.8,
  leg: 0.75
};

export function calculateDamage(profile: DamageProfile, region: HitRegion, armor: number): DamageResult {
  const rawDamage = profile.baseDamage * profile.multipliers[region];
  const armorCoverage = region === 'head' || region === 'chest' || region === 'stomach' ? 1 : 0.45;
  const absorbable = rawDamage * armorCoverage * (1 - profile.armorPenetration);
  const armorDamage = Math.min(armor, Math.round(absorbable));
  const healthDamage = Math.max(1, Math.round(rawDamage - armorDamage * 0.65));

  return {
    healthDamage,
    armorDamage,
    totalDamage: Math.round(rawDamage),
    region
  };
}

export function classifyHitRegion(localY: number, localX = 0): HitRegion {
  if (localY > 1.86) return 'head';
  if (localY > 1.2 && Math.abs(localX) > 0.42) return 'arm';
  if (localY > 1.32) return 'chest';
  if (localY > 0.82) return 'stomach';
  return 'leg';
}

export function closestPointDistanceToRay(origin: THREE.Vector3, direction: THREE.Vector3, point: THREE.Vector3): { distance: number; t: number } {
  const toPoint = new THREE.Vector3().subVectors(point, origin);
  const t = toPoint.dot(direction);
  const closest = origin.clone().addScaledVector(direction, t);
  return { distance: closest.distanceTo(point), t };
}
