export const CS16_PRIMARY_FIRE_CYCLE_SECONDS: Record<string, number> = {
  glock: 0.15,
  usp: 0.15,
  p228: 0.15,
  deagle: 0.225,
  five_seven: 0.15,
  mp5: 0.075,
  tmp: 0.07,
  p90: 0.066,
  mac10: 0.07,
  ump45: 0.1,
  m3: 0.875,
  xm1014: 0.25,
  galil: 0.0875,
  famas: 0.0825,
  ak47: 0.0955,
  m4a1: 0.0875,
  sg552: 0.0825,
  aug: 0.0825,
  scout: 1.25,
  awp: 1.45,
  g3sg1: 0.25,
  sg550: 0.25,
  m249: 0.1
};

export const CS16_SCOPED_PRIMARY_FIRE_CYCLE_SECONDS: Record<string, number> = {
  sg552: 0.135,
  aug: 0.135
};

export const CS16_RELOAD_SECONDS: Record<string, number> = {
  glock: 2.2,
  usp: 2.7,
  p228: 2.7,
  deagle: 2.2,
  five_seven: 2.7,
  mp5: 2.63,
  tmp: 2.12,
  p90: 3.4,
  mac10: 3.15,
  ump45: 3.5,
  galil: 2.45,
  famas: 3.3,
  ak47: 2.45,
  m4a1: 3.05,
  sg552: 3,
  aug: 3.3,
  scout: 2,
  awp: 2.5,
  g3sg1: 3.5,
  sg550: 3.35,
  m249: 4.7
};

export interface Cs16ShotgunReloadTiming {
  startSeconds: number;
  shellSeconds: number;
}

export interface Cs16BurstTiming {
  primaryCycleSeconds: number;
  firstDelaySeconds: number;
  followupDelaySeconds: number;
  followupSpread?: number;
  primaryDamage?: number;
  followupDamage?: number;
}

export interface Cs16SilencerTiming {
  adjustSeconds: number;
  unsilencedDamage: number;
  silencedDamage: number;
}

export const CS16_SHOTGUN_RELOAD_TIMING: Record<string, Cs16ShotgunReloadTiming> = {
  m3: { startSeconds: 0.55, shellSeconds: 0.45 },
  xm1014: { startSeconds: 0.55, shellSeconds: 0.3 }
};

export const CS16_BURST_TIMING: Record<string, Cs16BurstTiming> = {
  glock: { primaryCycleSeconds: 0.5, firstDelaySeconds: 0.1, followupDelaySeconds: 0.1, followupSpread: 0.05 },
  famas: { primaryCycleSeconds: 0.55, firstDelaySeconds: 0.05, followupDelaySeconds: 0.1, primaryDamage: 34, followupDamage: 30 }
};

export const CS16_SILENCER_TIMING: Record<string, Cs16SilencerTiming> = {
  m4a1: { adjustSeconds: 2, unsilencedDamage: 32, silencedDamage: 33 },
  usp: { adjustSeconds: 3, unsilencedDamage: 34, silencedDamage: 30 }
};

export const CS16_SCOPED_WEAPON_IDS = new Set([
  'sg552',
  'aug',
  'scout',
  'awp',
  'g3sg1',
  'sg550'
]);

export const PLAYER_INPUT_BUTTON_SCOPE = 8;
export const PLAYER_INPUT_BUTTON_SILENCER = 16;
export const PLAYER_INPUT_BUTTON_BURST = 32;

export function getCs16PrimaryFireCycleSeconds(weaponId: string, scoped = false): number | undefined {
  if (scoped) {
    const scopedCycle = CS16_SCOPED_PRIMARY_FIRE_CYCLE_SECONDS[weaponId];
    if (scopedCycle) return scopedCycle;
  }
  return CS16_PRIMARY_FIRE_CYCLE_SECONDS[weaponId];
}

export function getCs16PrimaryFireRate(weaponId: string): number | undefined {
  const cycle = getCs16PrimaryFireCycleSeconds(weaponId);
  return cycle ? 1 / cycle : undefined;
}

export function getCs16ReloadSeconds(weaponId: string): number | undefined {
  return CS16_RELOAD_SECONDS[weaponId];
}

export function getCs16ShotgunReloadTiming(weaponId: string): Cs16ShotgunReloadTiming | undefined {
  return CS16_SHOTGUN_RELOAD_TIMING[weaponId];
}

export function getCs16BurstTiming(weaponId: string): Cs16BurstTiming | undefined {
  return CS16_BURST_TIMING[weaponId];
}

export function isCs16BurstWeapon(weaponId: string): boolean {
  return weaponId in CS16_BURST_TIMING;
}

export function getCs16SilencerTiming(weaponId: string): Cs16SilencerTiming | undefined {
  return CS16_SILENCER_TIMING[weaponId];
}

export function isCs16SilencerWeapon(weaponId: string): boolean {
  return weaponId in CS16_SILENCER_TIMING;
}

export function isCs16ScopedWeapon(weaponId: string): boolean {
  return CS16_SCOPED_WEAPON_IDS.has(weaponId);
}
