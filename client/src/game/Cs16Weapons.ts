import type { WeaponId } from './types.js';
import { CS16_WEAPON_DEFINITIONS } from './Cs16WeaponDefs.js';

export type Cs16WeaponRole = 'pistol' | 'smg' | 'shotgun' | 'rifle' | 'sniper' | 'machinegun' | 'grenade' | 'armor' | 'melee';

export interface Cs16WeaponRule {
  id: WeaponId;
  price: number;
  role: Cs16WeaponRole;
  killReward: number;
  scoped: boolean;
  team: 'both' | 't' | 'ct';
}

// CS 1.6 Starting Money
export const CS16_STARTING_MONEY = 800;
export const CS16_MAX_MONEY = 16000;

// Kill Reward Amounts (CS 1.6 Standard)
export const CS16_PISTOL_KILL_REWARD = 300;
export const CS16_SMG_KILL_REWARD = 300;
export const CS16_SHOTGUN_KILL_REWARD = 300;
export const CS16_RIFLE_KILL_REWARD = 300;
export const CS16_SNIPER_KILL_REWARD = 300;
export const CS16_KNIFE_KILL_REWARD = 1500;
export const CS16_KILL_REWARD = 300; // Default for compatibility

// Round Rewards
export const CS16_ROUND_WIN_REWARD = 3250;
export const CS16_ROUND_LOSS_REWARD = 1400;

// CS 1.6 Weapon Rules - 1:1 Pricing and Roles
export const CS16_WEAPON_RULES: Record<string, Cs16WeaponRule> = {
  // Pistols
  glock: {
    id: 'glock',
    price: 400,
    role: 'pistol',
    killReward: CS16_PISTOL_KILL_REWARD,
    scoped: false,
    team: 't',
  },
  usp: {
    id: 'usp',
    price: 500,
    role: 'pistol',
    killReward: CS16_PISTOL_KILL_REWARD,
    scoped: false,
    team: 'ct',
  },
  p228: {
    id: 'p228',
    price: 600,
    role: 'pistol',
    killReward: CS16_PISTOL_KILL_REWARD,
    scoped: false,
    team: 'both',
  },
  deagle: {
    id: 'deagle',
    price: 650,
    role: 'pistol',
    killReward: CS16_PISTOL_KILL_REWARD,
    scoped: false,
    team: 'both',
  },
  five_seven: {
    id: 'five_seven',
    price: 750,
    role: 'pistol',
    killReward: CS16_PISTOL_KILL_REWARD,
    scoped: false,
    team: 'ct',
  },

  // SMGs
  mp5: {
    id: 'mp5',
    price: 1500,
    role: 'smg',
    killReward: CS16_SMG_KILL_REWARD,
    scoped: false,
    team: 'both',
  },
  tmp: {
    id: 'tmp',
    price: 1250,
    role: 'smg',
    killReward: CS16_SMG_KILL_REWARD,
    scoped: false,
    team: 'ct',
  },
  p90: {
    id: 'p90',
    price: 2350,
    role: 'smg',
    killReward: CS16_SMG_KILL_REWARD,
    scoped: false,
    team: 'both',
  },
  mac10: {
    id: 'mac10',
    price: 1400,
    role: 'smg',
    killReward: CS16_SMG_KILL_REWARD,
    scoped: false,
    team: 't',
  },
  ump45: {
    id: 'ump45',
    price: 1700,
    role: 'smg',
    killReward: CS16_SMG_KILL_REWARD,
    scoped: false,
    team: 'both',
  },

  // Shotguns
  m3: {
    id: 'm3',
    price: 1700,
    role: 'shotgun',
    killReward: CS16_SHOTGUN_KILL_REWARD,
    scoped: false,
    team: 'both',
  },
  xm1014: {
    id: 'xm1014',
    price: 3000,
    role: 'shotgun',
    killReward: CS16_SHOTGUN_KILL_REWARD,
    scoped: false,
    team: 'both',
  },

  // Rifles
  ak47: {
    id: 'ak47',
    price: 2500,
    role: 'rifle',
    killReward: CS16_RIFLE_KILL_REWARD,
    scoped: false,
    team: 't',
  },
  m4a1: {
    id: 'm4a1',
    price: 3100,
    role: 'rifle',
    killReward: CS16_RIFLE_KILL_REWARD,
    scoped: false,
    team: 'ct',
  },
  sg552: {
    id: 'sg552',
    price: 3500,
    role: 'rifle',
    killReward: CS16_RIFLE_KILL_REWARD,
    scoped: true,
    team: 't',
  },
  aug: {
    id: 'aug',
    price: 3500,
    role: 'rifle',
    killReward: CS16_RIFLE_KILL_REWARD,
    scoped: true,
    team: 'ct',
  },
  galil: {
    id: 'galil',
    price: 2000,
    role: 'rifle',
    killReward: CS16_RIFLE_KILL_REWARD,
    scoped: false,
    team: 't',
  },
  famas: {
    id: 'famas',
    price: 2250,
    role: 'rifle',
    killReward: CS16_RIFLE_KILL_REWARD,
    scoped: false,
    team: 'ct',
  },

  // Snipers
  scout: {
    id: 'scout',
    price: 2750,
    role: 'sniper',
    killReward: CS16_SNIPER_KILL_REWARD,
    scoped: true,
    team: 'both',
  },
  awp: {
    id: 'awp',
    price: 4750,
    role: 'sniper',
    killReward: CS16_SNIPER_KILL_REWARD,
    scoped: true,
    team: 'both',
  },
  sg550: {
    id: 'sg550',
    price: 4200,
    role: 'sniper',
    killReward: CS16_SNIPER_KILL_REWARD,
    scoped: true,
    team: 't',
  },
  g3sg1: {
    id: 'g3sg1',
    price: 5000,
    role: 'sniper',
    killReward: CS16_SNIPER_KILL_REWARD,
    scoped: true,
    team: 'ct',
  },

  // Machine Gun
  m249: {
    id: 'm249',
    price: 5750,
    role: 'machinegun',
    killReward: CS16_RIFLE_KILL_REWARD,
    scoped: false,
    team: 'both',
  },

  // Melee
  knife: {
    id: 'knife',
    price: 0,
    role: 'melee',
    killReward: CS16_KNIFE_KILL_REWARD,
    scoped: false,
    team: 'both',
  },
};

// All valid CS 1.6 Weapon IDs
export const CS16_ALLOWED_WEAPON_IDS = new Set(Object.keys(CS16_WEAPON_RULES));

// Helper Functions
export function getCs16WeaponRule(weaponId: string): Cs16WeaponRule | null {
  return CS16_WEAPON_RULES[weaponId] ?? null;
}

export function isCs16Weapon(weaponId: string): boolean {
  return CS16_ALLOWED_WEAPON_IDS.has(weaponId);
}

export function canCs16WeaponScope(weaponId: string): boolean {
  return CS16_WEAPON_RULES[weaponId]?.scoped === true;
}

export function isCs16TeamWeapon(weaponId: string, team: 't' | 'ct'): boolean {
  const rule = CS16_WEAPON_RULES[weaponId];
  if (!rule) return false;
  return rule.team === 'both' || rule.team === team;
}

export function getCs16WeaponPrice(weaponId: string): number {
  return CS16_WEAPON_RULES[weaponId]?.price ?? 0;
}

export function clampCs16Money(value: number): number {
  return Math.max(0, Math.min(CS16_MAX_MONEY, Math.round(value)));
}
