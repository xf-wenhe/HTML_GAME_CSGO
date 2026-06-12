import type { WeaponId } from './types.js';

export type Cs16WeaponRole = 'pistol' | 'smg' | 'rifle' | 'sniper' | 'grenade' | 'armor' | 'melee';

export interface Cs16WeaponRule {
  id: WeaponId;
  price: number;
  role: Cs16WeaponRole;
  killReward: number;
  scoped: boolean;
}

export const CS16_STARTING_MONEY = 800;
export const CS16_MAX_MONEY = 16000;
export const CS16_KILL_REWARD = 300;
export const CS16_ROUND_WIN_REWARD = 3250;
export const CS16_ROUND_LOSS_REWARD = 1400;

export const CS16_WEAPON_RULES: Record<string, Cs16WeaponRule> = {
  pistol: { id: 'pistol', price: 400, role: 'pistol', killReward: 300, scoped: false },
  usp_s: { id: 'usp_s', price: 500, role: 'pistol', killReward: 300, scoped: false },
  deagle: { id: 'deagle', price: 650, role: 'pistol', killReward: 300, scoped: false },
  mp5sd: { id: 'mp5sd', price: 1500, role: 'smg', killReward: 300, scoped: false },
  ak47: { id: 'ak47', price: 2500, role: 'rifle', killReward: 300, scoped: false },
  m4a4: { id: 'm4a4', price: 3100, role: 'rifle', killReward: 300, scoped: false },
  awp: { id: 'awp', price: 4750, role: 'sniper', killReward: 300, scoped: true },
  knife: { id: 'knife', price: 0, role: 'melee', killReward: 1500, scoped: false },
};

export const CS16_ALLOWED_WEAPON_IDS = new Set(Object.keys(CS16_WEAPON_RULES));

export function getCs16WeaponRule(weaponId: string): Cs16WeaponRule | null {
  return CS16_WEAPON_RULES[weaponId] ?? null;
}

export function isCs16Weapon(weaponId: string): boolean {
  return CS16_ALLOWED_WEAPON_IDS.has(weaponId);
}

export function canCs16WeaponScope(weaponId: string): boolean {
  return CS16_WEAPON_RULES[weaponId]?.scoped === true;
}

export function clampCs16Money(value: number): number {
  return Math.max(0, Math.min(CS16_MAX_MONEY, Math.round(value)));
}
