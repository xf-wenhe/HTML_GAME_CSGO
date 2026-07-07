import type { ShootRequest, WeaponId } from '../../../shared/types.js';
import type { ShootResult } from '../game/WeaponManager.js';

export function buildShootRequest(result: ShootResult, weaponId: WeaponId, clientTime: number): ShootRequest {
  return {
    origin: { x: result.origin.x, y: result.origin.y, z: result.origin.z },
    direction: { x: result.direction.x, y: result.direction.y, z: result.direction.z },
    weaponId,
    clientTime,
    ...(result.heavyMelee ? { heavyMelee: true } : {})
  };
}
