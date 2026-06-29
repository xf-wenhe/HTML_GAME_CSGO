const CS16_BASE_RUN_SPEED_HU = 250;

export interface Cs16WeaponMovement {
  normalHu: number;
  scopedHu: number;
}

export const CS16_WEAPON_MOVEMENT: Record<string, Cs16WeaponMovement> = {
  glock: { normalHu: 250, scopedHu: 250 },
  usp: { normalHu: 250, scopedHu: 250 },
  p228: { normalHu: 250, scopedHu: 250 },
  deagle: { normalHu: 250, scopedHu: 250 },
  five_seven: { normalHu: 250, scopedHu: 250 },
  mp5: { normalHu: 250, scopedHu: 250 },
  tmp: { normalHu: 250, scopedHu: 250 },
  p90: { normalHu: 245, scopedHu: 245 },
  mac10: { normalHu: 250, scopedHu: 250 },
  ump45: { normalHu: 250, scopedHu: 250 },
  m3: { normalHu: 230, scopedHu: 230 },
  xm1014: { normalHu: 240, scopedHu: 240 },
  galil: { normalHu: 240, scopedHu: 240 },
  famas: { normalHu: 240, scopedHu: 240 },
  ak47: { normalHu: 221, scopedHu: 221 },
  m4a1: { normalHu: 230, scopedHu: 230 },
  sg552: { normalHu: 235, scopedHu: 200 },
  aug: { normalHu: 240, scopedHu: 240 },
  scout: { normalHu: 260, scopedHu: 220 },
  awp: { normalHu: 210, scopedHu: 150 },
  g3sg1: { normalHu: 210, scopedHu: 150 },
  sg550: { normalHu: 210, scopedHu: 150 },
  m249: { normalHu: 220, scopedHu: 220 },
  knife: { normalHu: 250, scopedHu: 250 },
  hegrenade: { normalHu: 250, scopedHu: 250 }
};

export function getCs16WeaponMovementMultipliers(weaponId: string): { normal: number; scoped: number } | undefined {
  const movement = CS16_WEAPON_MOVEMENT[weaponId];
  if (!movement) return undefined;
  return {
    normal: movement.normalHu / CS16_BASE_RUN_SPEED_HU,
    scoped: movement.scopedHu / CS16_BASE_RUN_SPEED_HU
  };
}
