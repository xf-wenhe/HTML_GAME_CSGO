import { MapId, Team, Vector3, WeaponBalance, WeaponId } from '../shared/types.js';

export const WEAPON_BALANCE: Record<WeaponId, WeaponBalance> = {
  sidearm: { id: 'sidearm', name: 'S-9 Sidearm', price: 200, teams: 'both', buyCategory: 'pistol', killReward: 300, damage: 28, fireRate: 5, magazineSize: 12, maxReserveAmmo: 36, reloadTime: 1.45, spread: 0.035, movementSpeedMultiplier: 1, armorPenetration: 0.35, headshotMultiplier: 3.5, range: 48, recoilKick: 0.8, moveInaccuracy: 0.05 },
  heavy_pistol: { id: 'heavy_pistol', name: 'Rook Heavy', price: 700, teams: 'both', buyCategory: 'pistol', killReward: 300, damage: 55, fireRate: 2.2, magazineSize: 7, maxReserveAmmo: 35, reloadTime: 1.9, spread: 0.045, movementSpeedMultiplier: 0.95, armorPenetration: 0.72, headshotMultiplier: 3.2, range: 65, recoilKick: 1.35, moveInaccuracy: 0.08 },
  vandal: { id: 'vandal', name: 'Vandal AR', price: 2700, teams: ['attackers'], buyCategory: 'rifle', killReward: 300, damage: 36, fireRate: 9.5, magazineSize: 30, maxReserveAmmo: 90, reloadTime: 2.35, spread: 0.055, movementSpeedMultiplier: 0.88, armorPenetration: 0.78, headshotMultiplier: 4, range: 90, recoilKick: 1.15, moveInaccuracy: 0.12 },
  sentinel: { id: 'sentinel', name: 'Sentinel M4', price: 2900, teams: ['defenders'], buyCategory: 'rifle', killReward: 300, damage: 33, fireRate: 10, magazineSize: 30, maxReserveAmmo: 90, reloadTime: 2.25, spread: 0.045, movementSpeedMultiplier: 0.9, armorPenetration: 0.74, headshotMultiplier: 4, range: 86, recoilKick: 1.05, moveInaccuracy: 0.1 },
  operator: { id: 'operator', name: 'Longbow AWP', price: 4750, teams: 'both', buyCategory: 'sniper', killReward: 100, damage: 115, fireRate: 0.8, magazineSize: 5, maxReserveAmmo: 25, reloadTime: 3.3, spread: 0.015, movementSpeedMultiplier: 0.72, armorPenetration: 0.98, headshotMultiplier: 2, range: 130, recoilKick: 2.3, moveInaccuracy: 0.3 },
  specter: { id: 'specter', name: 'Specter SMG', price: 1600, teams: 'both', buyCategory: 'smg', killReward: 600, damage: 22, fireRate: 13, magazineSize: 30, maxReserveAmmo: 120, reloadTime: 2, spread: 0.075, movementSpeedMultiplier: 0.98, armorPenetration: 0.45, headshotMultiplier: 2.6, range: 45, recoilKick: 0.75, moveInaccuracy: 0.08 },
  bulldog: { id: 'bulldog', name: 'Bulldog Shotgun', price: 1200, teams: 'both', buyCategory: 'shotgun', killReward: 900, damage: 18, fireRate: 1.1, magazineSize: 8, maxReserveAmmo: 32, reloadTime: 2.8, spread: 0.22, movementSpeedMultiplier: 0.86, armorPenetration: 0.3, headshotMultiplier: 1.5, range: 26, recoilKick: 1.7, moveInaccuracy: 0.18 },
  knife: { id: 'knife', name: 'Tactical Knife', price: 0, teams: 'both', buyCategory: 'melee', killReward: 1500, damage: 55, fireRate: 1.8, magazineSize: 1, maxReserveAmmo: 0, reloadTime: 0, spread: 0, movementSpeedMultiplier: 1.05, armorPenetration: 0.2, headshotMultiplier: 1, range: 2.4, recoilKick: 0, moveInaccuracy: 0 }
};

export interface ServerMapConfig {
  id: MapId;
  spawns: Record<Team, Vector3[]>;
  tdmSpawns: Vector3[];
  bombSites: Array<{ id: 'A' | 'B'; position: Vector3; radius: number }>;
}

export const MAP_CONFIGS: Record<MapId, ServerMapConfig> = {
  dust2: {
    id: 'dust2',
    spawns: {
      attackers: [
        { x: -10, y: 1.7, z: 30 },
        { x: -5, y: 1.7, z: 30 },
        { x: 0, y: 1.7, z: 30 },
        { x: 5, y: 1.7, z: 30 },
        { x: 10, y: 1.7, z: 30 }
      ],
      defenders: [
        { x: -10, y: 1.7, z: -46 },
        { x: -5, y: 1.7, z: -46 },
        { x: 0, y: 1.7, z: -46 },
        { x: 5, y: 1.7, z: -46 },
        { x: 10, y: 1.7, z: -46 }
      ]
    },
    tdmSpawns: [
      { x: -30, y: 1.7, z: 25 },
      { x: 30, y: 1.7, z: 25 },
      { x: -30, y: 1.7, z: -40 },
      { x: 30, y: 1.7, z: -40 },
      { x: -8, y: 1.7, z: 8 },
      { x: 8, y: 1.7, z: -22 },
      { x: -24, y: 1.7, z: -8 },
      { x: 24, y: 1.7, z: -8 }
    ],
    bombSites: [
      { id: 'A', position: { x: -24, y: 1.7, z: -27 }, radius: 6 },
      { id: 'B', position: { x: 24, y: 1.7, z: -27 }, radius: 6 }
    ]
  },
  warehouse: {
    id: 'warehouse',
    spawns: {
      attackers: [
        { x: -30, y: 1.7, z: 28 },
        { x: -25, y: 1.7, z: 28 },
        { x: -20, y: 1.7, z: 28 },
        { x: -15, y: 1.7, z: 28 },
        { x: -10, y: 1.7, z: 28 }
      ],
      defenders: [
        { x: 30, y: 1.7, z: -46 },
        { x: 25, y: 1.7, z: -46 },
        { x: 20, y: 1.7, z: -46 },
        { x: 15, y: 1.7, z: -46 },
        { x: 10, y: 1.7, z: -46 }
      ]
    },
    tdmSpawns: [
      { x: -30, y: 1.7, z: 28 },
      { x: -25, y: 1.7, z: 28 },
      { x: 30, y: 1.7, z: -46 },
      { x: 25, y: 1.7, z: -46 },
      { x: -28, y: 1.7, z: -8 },
      { x: 28, y: 1.7, z: -8 },
      { x: -8, y: 1.7, z: 8 },
      { x: 8, y: 1.7, z: -22 }
    ],
    bombSites: [
      { id: 'A', position: { x: -24, y: 1.7, z: -27 }, radius: 6 },
      { id: 'B', position: { x: 24, y: 1.7, z: -27 }, radius: 6 }
    ]
  },
  italy: {
    id: 'italy',
    spawns: {
      attackers: [
        { x: 0, y: 1.7, z: 32 },
        { x: -5, y: 1.7, z: 32 },
        { x: 5, y: 1.7, z: 32 },
        { x: -10, y: 1.7, z: 32 },
        { x: 10, y: 1.7, z: 32 }
      ],
      defenders: [
        { x: 0, y: 1.7, z: -48 },
        { x: -5, y: 1.7, z: -48 },
        { x: 5, y: 1.7, z: -48 },
        { x: -10, y: 1.7, z: -48 },
        { x: 10, y: 1.7, z: -48 }
      ]
    },
    tdmSpawns: [
      { x: 0, y: 1.7, z: 32 },
      { x: -5, y: 1.7, z: 32 },
      { x: 0, y: 1.7, z: -48 },
      { x: 5, y: 1.7, z: -48 },
      { x: -24, y: 1.7, z: -8 },
      { x: 24, y: 1.7, z: -8 },
      { x: -8, y: 1.7, z: 8 },
      { x: 8, y: 1.7, z: -22 }
    ],
    bombSites: [
      { id: 'A', position: { x: -24, y: 1.7, z: -27 }, radius: 6 },
      { id: 'B', position: { x: 24, y: 1.7, z: -27 }, radius: 6 }
    ]
  }
};
