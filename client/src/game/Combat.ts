// client/src/game/Combat.ts
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

// 修复：完全同步 CS:GO 身体各部位伤害倍率
export const DEFAULT_HIT_MULTIPLIERS: Record<HitRegion, number> = {
  head: 4,
  chest: 1,
  stomach: 1.25,
  arm: 1,       // CSGO中手臂是1.0倍伤害 (原为0.8)
  leg: 0.75     // 腿部0.75倍
};

export function calculateDamage(
  profile: DamageProfile,
  region: HitRegion,
  armor: number,
  hasHelmet: boolean = true // 新增头盔判定，默认true兼容老代码
): DamageResult {
  // 1. 计算基础原始伤害 (基础伤害 x 部位倍率)
  const multiplier = profile.multipliers[region] ?? DEFAULT_HIT_MULTIPLIERS[region];
  const rawDamage = profile.baseDamage * multiplier;

  // 2. 判定该部位是否受到防弹衣/头盔保护
  let isArmored = false;
  if (armor > 0) {
    if (region === 'head' && hasHelmet) isArmored = true;
    // 胸部、腹部、手臂 受防弹衣保护
    if (region === 'chest' || region === 'stomach' || region === 'arm') isArmored = true;
    // 注意：腿部(leg)永远不受防弹衣保护
  }

  let healthDamage = rawDamage;
  let armorDamage = 0;

  // 3. 护甲减伤计算 (还原 CS:GO 真实护甲公式)
  if (isArmored) {
    // 对血量造成的实际伤害 = 原始伤害 * 武器的护甲穿透率
    healthDamage = rawDamage * profile.armorPenetration;
    // 护甲吸收的伤害量
    const damageBlocked = rawDamage - healthDamage;
    // 护甲耐久损耗 = 吸收伤害量的一半
    armorDamage = damageBlocked / 2;

    // 如果当前护甲值不足以抵挡这次计算出的吸收量，则剩余未挡住的伤害继续扣血
    if (armor < armorDamage) {
      armorDamage = armor;
      healthDamage = rawDamage - (armorDamage * 2);
    }
  }

  return {
    healthDamage: Math.max(1, Math.round(healthDamage)),
    armorDamage: Math.round(armorDamage),
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