import { MapId, Team, Vector3, WeaponBalance, WeaponId } from '../shared/types.js';

export const WEAPON_BALANCE: Record<WeaponId, WeaponBalance> = {
  // Old aliases (keep for backward compat)
  sidearm: { id: 'sidearm', name: 'Glock-18', price: 200, teams: 'both', buyCategory: 'pistol', killReward: 300, damage: 28, fireRate: 5, magazineSize: 20, maxReserveAmmo: 120, reloadTime: 2.2, spread: 0.04, movementSpeedMultiplier: 1, armorPenetration: 0.47, headshotMultiplier: 3.5, range: 48, recoilKick: 0.8, moveInaccuracy: 0.05 },
  heavy_pistol: { id: 'heavy_pistol', name: 'Desert Eagle', price: 700, teams: 'both', buyCategory: 'pistol', killReward: 300, damage: 55, fireRate: 2.2, magazineSize: 7, maxReserveAmmo: 35, reloadTime: 2.2, spread: 0.05, movementSpeedMultiplier: 0.95, armorPenetration: 0.93, headshotMultiplier: 3.2, range: 65, recoilKick: 1.35, moveInaccuracy: 0.08 },
  vandal: { id: 'vandal', name: 'AK-47', price: 2500, teams: ['attackers'], buyCategory: 'rifle', killReward: 300, damage: 36, fireRate: 7.5, magazineSize: 30, maxReserveAmmo: 90, reloadTime: 2.35, spread: 0.075, movementSpeedMultiplier: 0.88, armorPenetration: 0.78, headshotMultiplier: 4, range: 90, recoilKick: 1.15, moveInaccuracy: 0.12 },
  sentinel: { id: 'sentinel', name: 'M4A1-S', price: 2900, teams: ['defenders'], buyCategory: 'rifle', killReward: 300, damage: 38, fireRate: 9, magazineSize: 20, maxReserveAmmo: 60, reloadTime: 2.35, spread: 0.04, movementSpeedMultiplier: 0.9, armorPenetration: 0.7, headshotMultiplier: 4, range: 95, recoilKick: 1.05, moveInaccuracy: 0.1 },
  operator: { id: 'operator', name: 'AWP', price: 4750, teams: 'both', buyCategory: 'sniper', killReward: 100, damage: 115, fireRate: 0.8, magazineSize: 5, maxReserveAmmo: 30, reloadTime: 3.3, spread: 0.015, movementSpeedMultiplier: 0.72, armorPenetration: 0.98, headshotMultiplier: 2, range: 130, recoilKick: 2.3, moveInaccuracy: 0.3 },
  specter: { id: 'specter', name: 'MP9', price: 1250, teams: 'both', buyCategory: 'smg', killReward: 600, damage: 26, fireRate: 14, magazineSize: 30, maxReserveAmmo: 120, reloadTime: 2.1, spread: 0.07, movementSpeedMultiplier: 0.98, armorPenetration: 0.6, headshotMultiplier: 2.6, range: 48, recoilKick: 0.75, moveInaccuracy: 0.08 },
  bulldog: { id: 'bulldog', name: 'Nova', price: 1050, teams: 'both', buyCategory: 'shotgun', killReward: 900, damage: 20, fireRate: 1.1, magazineSize: 8, maxReserveAmmo: 32, reloadTime: 2.8, spread: 0.22, movementSpeedMultiplier: 0.86, armorPenetration: 0.3, headshotMultiplier: 1.5, range: 28, recoilKick: 1.7, moveInaccuracy: 0.18 },
  knife: { id: 'knife', name: 'Tactical Knife', price: 0, teams: 'both', buyCategory: 'melee', killReward: 1500, damage: 55, fireRate: 1.8, magazineSize: 1, maxReserveAmmo: 0, reloadTime: 0, spread: 0, movementSpeedMultiplier: 1, armorPenetration: 0.2, headshotMultiplier: 1, range: 2.4, recoilKick: 0, moveInaccuracy: 0 },
  // New weapons
  glock: { id: 'glock', name: 'Glock-18', price: 400, teams: ['attackers'], buyCategory: 'pistol', killReward: 300, damage: 28, fireRate: 5, magazineSize: 20, maxReserveAmmo: 120, reloadTime: 2.2, spread: 0.04, movementSpeedMultiplier: 1, armorPenetration: 0.47, headshotMultiplier: 3.5, range: 48, recoilKick: 0.8, moveInaccuracy: 0.05 },
  pistol: { id: 'pistol', name: 'Glock-18', price: 200, teams: 'both', buyCategory: 'pistol', killReward: 300, damage: 28, fireRate: 5, magazineSize: 20, maxReserveAmmo: 120, reloadTime: 2.2, spread: 0.04, movementSpeedMultiplier: 1, armorPenetration: 0.47, headshotMultiplier: 3.5, range: 48, recoilKick: 0.8, moveInaccuracy: 0.05 },
  usp: { id: 'usp', name: 'USP .45', price: 500, teams: ['defenders'], buyCategory: 'pistol', killReward: 300, damage: 30, fireRate: 5.5, magazineSize: 12, maxReserveAmmo: 100, reloadTime: 2.0, spread: 0.06, movementSpeedMultiplier: 1, armorPenetration: 0.5, headshotMultiplier: 3.5, range: 52, recoilKick: 0.75, moveInaccuracy: 0.04 },
  usp_s: { id: 'usp_s', name: 'USP .45', price: 500, teams: ['defenders'], buyCategory: 'pistol', killReward: 300, damage: 30, fireRate: 5.5, magazineSize: 12, maxReserveAmmo: 100, reloadTime: 2.0, spread: 0.06, movementSpeedMultiplier: 1, armorPenetration: 0.5, headshotMultiplier: 3.5, range: 52, recoilKick: 0.75, moveInaccuracy: 0.04 },
  p250: { id: 'p250', name: 'P250', price: 300, teams: 'both', buyCategory: 'pistol', killReward: 300, damage: 38, fireRate: 4.5, magazineSize: 13, maxReserveAmmo: 26, reloadTime: 2.2, spread: 0.04, movementSpeedMultiplier: 1, armorPenetration: 0.52, headshotMultiplier: 3.5, range: 50, recoilKick: 0.8, moveInaccuracy: 0.05 },
  p228: { id: 'p228', name: 'P228', price: 600, teams: 'both', buyCategory: 'pistol', killReward: 300, damage: 38, fireRate: 4.5, magazineSize: 13, maxReserveAmmo: 52, reloadTime: 2.2, spread: 0.04, movementSpeedMultiplier: 1, armorPenetration: 0.52, headshotMultiplier: 3.5, range: 50, recoilKick: 0.8, moveInaccuracy: 0.05 },
  five_seven: { id: 'five_seven', name: 'Five-SeveN', price: 750, teams: ['defenders'], buyCategory: 'pistol', killReward: 300, damage: 32, fireRate: 5.5, magazineSize: 20, maxReserveAmmo: 100, reloadTime: 2.3, spread: 0.035, movementSpeedMultiplier: 0.98, armorPenetration: 0.91, headshotMultiplier: 3, range: 55, recoilKick: 0.7, moveInaccuracy: 0.03 },
  deagle: { id: 'deagle', name: 'Desert Eagle', price: 650, teams: 'both', buyCategory: 'pistol', killReward: 300, damage: 55, fireRate: 2.2, magazineSize: 7, maxReserveAmmo: 35, reloadTime: 2.2, spread: 0.05, movementSpeedMultiplier: 0.95, armorPenetration: 0.93, headshotMultiplier: 3.2, range: 65, recoilKick: 1.35, moveInaccuracy: 0.08 },
  dual_berettas: { id: 'dual_berettas', name: 'Dual Berettas', price: 400, teams: 'both', buyCategory: 'pistol', killReward: 300, damage: 26, fireRate: 6, magazineSize: 30, maxReserveAmmo: 120, reloadTime: 2.7, spread: 0.045, movementSpeedMultiplier: 0.98, armorPenetration: 0.38, headshotMultiplier: 3, range: 42, recoilKick: 0.65, moveInaccuracy: 0.06 },
  r8: { id: 'r8', name: 'R8 Revolver', price: 600, teams: 'both', buyCategory: 'pistol', killReward: 300, damage: 86, fireRate: 1, magazineSize: 8, maxReserveAmmo: 16, reloadTime: 2.7, spread: 0.02, movementSpeedMultiplier: 0.93, armorPenetration: 0.88, headshotMultiplier: 2, range: 78, recoilKick: 1.5, moveInaccuracy: 0.1 },
  cz75: { id: 'cz75', name: 'CZ75-Auto', price: 500, teams: 'both', buyCategory: 'pistol', killReward: 100, damage: 31, fireRate: 12, magazineSize: 12, maxReserveAmmo: 12, reloadTime: 2.4, spread: 0.055, movementSpeedMultiplier: 0.97, armorPenetration: 0.77, headshotMultiplier: 3, range: 40, recoilKick: 0.9, moveInaccuracy: 0.07 },
  tec9: { id: 'tec9', name: 'Tec-9', price: 500, teams: ['attackers'], buyCategory: 'pistol', killReward: 300, damage: 33, fireRate: 8, magazineSize: 18, maxReserveAmmo: 90, reloadTime: 2.3, spread: 0.05, movementSpeedMultiplier: 0.97, armorPenetration: 0.9, headshotMultiplier: 3, range: 44, recoilKick: 0.8, moveInaccuracy: 0.06 },
  p2000: { id: 'p2000', name: 'P2000', price: 200, teams: 'both', buyCategory: 'pistol', killReward: 300, damage: 32, fireRate: 4.5, magazineSize: 13, maxReserveAmmo: 52, reloadTime: 2.2, spread: 0.035, movementSpeedMultiplier: 1, armorPenetration: 0.5, headshotMultiplier: 3.5, range: 50, recoilKick: 0.75, moveInaccuracy: 0.04 },
  mp9: { id: 'mp9', name: 'MP9', price: 1250, teams: ['defenders'], buyCategory: 'smg', killReward: 600, damage: 26, fireRate: 14, magazineSize: 30, maxReserveAmmo: 120, reloadTime: 2.1, spread: 0.07, movementSpeedMultiplier: 0.98, armorPenetration: 0.6, headshotMultiplier: 2.6, range: 48, recoilKick: 0.75, moveInaccuracy: 0.08 },
  mac10: { id: 'mac10', name: 'MAC-10', price: 1400, teams: ['attackers'], buyCategory: 'smg', killReward: 300, damage: 29, fireRate: 15, magazineSize: 30, maxReserveAmmo: 100, reloadTime: 2.2, spread: 0.08, movementSpeedMultiplier: 1, armorPenetration: 0.45, headshotMultiplier: 2.5, range: 40, recoilKick: 0.7, moveInaccuracy: 0.07 },
  pp_bizon: { id: 'pp_bizon', name: 'PP-Bizon', price: 1400, teams: 'both', buyCategory: 'smg', killReward: 600, damage: 27, fireRate: 11, magazineSize: 64, maxReserveAmmo: 128, reloadTime: 2.6, spread: 0.075, movementSpeedMultiplier: 1, armorPenetration: 0.32, headshotMultiplier: 2.5, range: 42, recoilKick: 0.65, moveInaccuracy: 0.08 },
  mp7: { id: 'mp7', name: 'MP7', price: 1500, teams: 'both', buyCategory: 'smg', killReward: 600, damage: 29, fireRate: 13, magazineSize: 30, maxReserveAmmo: 120, reloadTime: 2.1, spread: 0.065, movementSpeedMultiplier: 0.98, armorPenetration: 0.6, headshotMultiplier: 2.5, range: 50, recoilKick: 0.7, moveInaccuracy: 0.07 },
  ump45: { id: 'ump45', name: 'UMP-45', price: 1700, teams: 'both', buyCategory: 'smg', killReward: 300, damage: 35, fireRate: 9, magazineSize: 25, maxReserveAmmo: 100, reloadTime: 2.3, spread: 0.07, movementSpeedMultiplier: 0.98, armorPenetration: 0.65, headshotMultiplier: 2.6, range: 46, recoilKick: 0.8, moveInaccuracy: 0.07 },
  p90: { id: 'p90', name: 'P90', price: 2350, teams: 'both', buyCategory: 'smg', killReward: 300, damage: 26, fireRate: 16, magazineSize: 50, maxReserveAmmo: 100, reloadTime: 2.6, spread: 0.065, movementSpeedMultiplier: 0.98, armorPenetration: 0.69, headshotMultiplier: 2.4, range: 52, recoilKick: 0.75, moveInaccuracy: 0.06 },
  rifle: { id: 'rifle', name: 'AK-47', price: 2500, teams: ['attackers'], buyCategory: 'rifle', killReward: 300, damage: 36, fireRate: 7.5, magazineSize: 30, maxReserveAmmo: 90, reloadTime: 2.35, spread: 0.075, movementSpeedMultiplier: 0.88, armorPenetration: 0.78, headshotMultiplier: 4, range: 90, recoilKick: 1.15, moveInaccuracy: 0.12 },
  ak47: { id: 'ak47', name: 'AK-47', price: 2500, teams: ['attackers'], buyCategory: 'rifle', killReward: 300, damage: 36, fireRate: 7.5, magazineSize: 30, maxReserveAmmo: 90, reloadTime: 2.35, spread: 0.075, movementSpeedMultiplier: 0.88, armorPenetration: 0.78, headshotMultiplier: 4, range: 90, recoilKick: 1.15, moveInaccuracy: 0.12 },
  m4a1s: { id: 'm4a1s', name: 'M4A1-S', price: 2900, teams: ['defenders'], buyCategory: 'rifle', killReward: 300, damage: 38, fireRate: 9, magazineSize: 20, maxReserveAmmo: 60, reloadTime: 2.35, spread: 0.04, movementSpeedMultiplier: 0.9, armorPenetration: 0.7, headshotMultiplier: 4, range: 95, recoilKick: 1.0, moveInaccuracy: 0.1 },
  m4a4: { id: 'm4a4', name: 'M4A4', price: 3100, teams: ['defenders'], buyCategory: 'rifle', killReward: 300, damage: 33, fireRate: 10.5, magazineSize: 30, maxReserveAmmo: 90, reloadTime: 2.25, spread: 0.045, movementSpeedMultiplier: 0.9, armorPenetration: 0.7, headshotMultiplier: 4, range: 88, recoilKick: 1.1, moveInaccuracy: 0.1 },
  m4a1: { id: 'm4a1', name: 'M4A1', price: 3100, teams: ['defenders'], buyCategory: 'rifle', killReward: 300, damage: 33, fireRate: 10, magazineSize: 30, maxReserveAmmo: 90, reloadTime: 2.25, spread: 0.045, movementSpeedMultiplier: 0.9, armorPenetration: 0.7, headshotMultiplier: 4, range: 88, recoilKick: 1.1, moveInaccuracy: 0.1 },
  defender_rifle: { id: 'defender_rifle', name: 'M4A4', price: 3100, teams: ['defenders'], buyCategory: 'rifle', killReward: 300, damage: 33, fireRate: 10, magazineSize: 30, maxReserveAmmo: 90, reloadTime: 2.25, spread: 0.045, movementSpeedMultiplier: 0.9, armorPenetration: 0.74, headshotMultiplier: 4, range: 86, recoilKick: 1.1, moveInaccuracy: 0.1 },
  famas: { id: 'famas', name: 'FAMAS', price: 2250, teams: ['defenders'], buyCategory: 'rifle', killReward: 300, damage: 30, fireRate: 11, magazineSize: 25, maxReserveAmmo: 75, reloadTime: 2.3, spread: 0.05, movementSpeedMultiplier: 0.9, armorPenetration: 0.7, headshotMultiplier: 3.5, range: 80, recoilKick: 0.95, moveInaccuracy: 0.1 },
  galil: { id: 'galil', name: 'Galil AR', price: 2000, teams: ['attackers'], buyCategory: 'rifle', killReward: 300, damage: 30, fireRate: 11, magazineSize: 35, maxReserveAmmo: 105, reloadTime: 2.25, spread: 0.055, movementSpeedMultiplier: 0.9, armorPenetration: 0.72, headshotMultiplier: 3.5, range: 78, recoilKick: 1.0, moveInaccuracy: 0.1 },
  sg553: { id: 'sg553', name: 'SG 553', price: 3000, teams: ['attackers'], buyCategory: 'rifle', killReward: 300, damage: 34, fireRate: 9.5, magazineSize: 30, maxReserveAmmo: 90, reloadTime: 2.4, spread: 0.048, movementSpeedMultiplier: 0.88, armorPenetration: 0.76, headshotMultiplier: 4, range: 95, recoilKick: 1.1, moveInaccuracy: 0.11 },
  sg552: { id: 'sg552', name: 'SG 552', price: 3500, teams: ['attackers'], buyCategory: 'rifle', killReward: 300, damage: 34, fireRate: 9.5, magazineSize: 30, maxReserveAmmo: 90, reloadTime: 2.4, spread: 0.048, movementSpeedMultiplier: 0.88, armorPenetration: 0.76, headshotMultiplier: 4, range: 95, recoilKick: 1.1, moveInaccuracy: 0.11 },
  aug: { id: 'aug', name: 'AUG', price: 3500, teams: ['defenders'], buyCategory: 'rifle', killReward: 300, damage: 32, fireRate: 10, magazineSize: 30, maxReserveAmmo: 90, reloadTime: 2.35, spread: 0.042, movementSpeedMultiplier: 0.88, armorPenetration: 0.73, headshotMultiplier: 4, range: 95, recoilKick: 1.0, moveInaccuracy: 0.1 },
  sniper: { id: 'sniper', name: 'AWP', price: 4750, teams: 'both', buyCategory: 'sniper', killReward: 100, damage: 115, fireRate: 0.8, magazineSize: 5, maxReserveAmmo: 30, reloadTime: 3.3, spread: 0.015, movementSpeedMultiplier: 0.72, armorPenetration: 0.98, headshotMultiplier: 2, range: 130, recoilKick: 2.3, moveInaccuracy: 0.3 },
  awp: { id: 'awp', name: 'AWP', price: 4750, teams: 'both', buyCategory: 'sniper', killReward: 300, damage: 115, fireRate: 0.8, magazineSize: 10, maxReserveAmmo: 30, reloadTime: 2.5, spread: 0.015, movementSpeedMultiplier: 0.84, armorPenetration: 0.98, headshotMultiplier: 2, range: 130, recoilKick: 2.3, moveInaccuracy: 0.3 },
  scout: { id: 'scout', name: 'Scout', price: 2750, teams: 'both', buyCategory: 'sniper', killReward: 300, damage: 65, fireRate: 1.1, magazineSize: 10, maxReserveAmmo: 90, reloadTime: 2.6, spread: 0.02, movementSpeedMultiplier: 0.85, armorPenetration: 0.8, headshotMultiplier: 4, range: 115, recoilKick: 1.5, moveInaccuracy: 0.2 },
  ssg08: { id: 'ssg08', name: 'SSG 08', price: 1700, teams: 'both', buyCategory: 'sniper', killReward: 300, damage: 88, fireRate: 1.1, magazineSize: 10, maxReserveAmmo: 30, reloadTime: 3, spread: 0.02, movementSpeedMultiplier: 0.85, armorPenetration: 0.96, headshotMultiplier: 1.8, range: 120, recoilKick: 1.8, moveInaccuracy: 0.25 },
  scar20: { id: 'scar20', name: 'SCAR-20', price: 5000, teams: ['defenders'], buyCategory: 'sniper', killReward: 100, damage: 80, fireRate: 3, magazineSize: 20, maxReserveAmmo: 60, reloadTime: 3.2, spread: 0.025, movementSpeedMultiplier: 0.78, armorPenetration: 0.95, headshotMultiplier: 1.8, range: 115, recoilKick: 1.5, moveInaccuracy: 0.15 },
  g3sg1: { id: 'g3sg1', name: 'G3SG1', price: 5000, teams: ['attackers'], buyCategory: 'sniper', killReward: 300, damage: 80, fireRate: 3, magazineSize: 20, maxReserveAmmo: 60, reloadTime: 3.2, spread: 0.025, movementSpeedMultiplier: 0.78, armorPenetration: 0.95, headshotMultiplier: 1.8, range: 115, recoilKick: 1.5, moveInaccuracy: 0.15 },
  sg550: { id: 'sg550', name: 'SG 550', price: 4200, teams: ['defenders'], buyCategory: 'sniper', killReward: 300, damage: 80, fireRate: 3, magazineSize: 20, maxReserveAmmo: 60, reloadTime: 3.2, spread: 0.025, movementSpeedMultiplier: 0.78, armorPenetration: 0.95, headshotMultiplier: 1.8, range: 115, recoilKick: 1.5, moveInaccuracy: 0.15 },
  shotgun: { id: 'shotgun', name: 'Nova', price: 1050, teams: 'both', buyCategory: 'shotgun', killReward: 900, damage: 20, fireRate: 1.1, magazineSize: 8, maxReserveAmmo: 32, reloadTime: 2.8, spread: 0.22, movementSpeedMultiplier: 0.86, armorPenetration: 0.3, headshotMultiplier: 1.5, range: 28, recoilKick: 1.7, moveInaccuracy: 0.18 },
  nova: { id: 'nova', name: 'Nova', price: 1050, teams: 'both', buyCategory: 'shotgun', killReward: 900, damage: 20, fireRate: 1.1, magazineSize: 8, maxReserveAmmo: 32, reloadTime: 2.8, spread: 0.22, movementSpeedMultiplier: 0.86, armorPenetration: 0.3, headshotMultiplier: 1.5, range: 28, recoilKick: 1.7, moveInaccuracy: 0.18 },
  mag7: { id: 'mag7', name: 'MAG-7', price: 1300, teams: ['defenders'], buyCategory: 'shotgun', killReward: 900, damage: 30, fireRate: 1.2, magazineSize: 5, maxReserveAmmo: 25, reloadTime: 2.5, spread: 0.18, movementSpeedMultiplier: 0.86, armorPenetration: 0.5, headshotMultiplier: 1.5, range: 30, recoilKick: 1.6, moveInaccuracy: 0.16 },
  xm1014: { id: 'xm1014', name: 'XM1014', price: 3000, teams: 'both', buyCategory: 'shotgun', killReward: 300, damage: 19, fireRate: 1.8, magazineSize: 7, maxReserveAmmo: 32, reloadTime: 3, spread: 0.2, movementSpeedMultiplier: 0.86, armorPenetration: 0.25, headshotMultiplier: 1.5, range: 24, recoilKick: 1.5, moveInaccuracy: 0.15 },
  m3: { id: 'm3', name: 'M3 Super 90', price: 1700, teams: 'both', buyCategory: 'shotgun', killReward: 300, damage: 22, fireRate: 1.1, magazineSize: 8, maxReserveAmmo: 32, reloadTime: 2.8, spread: 0.22, movementSpeedMultiplier: 0.86, armorPenetration: 0.3, headshotMultiplier: 1.5, range: 28, recoilKick: 1.7, moveInaccuracy: 0.18 },
  m249: { id: 'm249', name: 'M249', price: 5750, teams: 'both', buyCategory: 'rifle', killReward: 300, damage: 32, fireRate: 11, magazineSize: 100, maxReserveAmmo: 200, reloadTime: 5, spread: 0.075, movementSpeedMultiplier: 0.75, armorPenetration: 0.8, headshotMultiplier: 3.5, range: 80, recoilKick: 1.2, moveInaccuracy: 0.15 },
  negev: { id: 'negev', name: 'Negev', price: 1700, teams: 'both', buyCategory: 'rifle', killReward: 300, damage: 35, fireRate: 13, magazineSize: 150, maxReserveAmmo: 300, reloadTime: 5.5, spread: 0.1, movementSpeedMultiplier: 0.72, armorPenetration: 0.85, headshotMultiplier: 3, range: 72, recoilKick: 1.3, moveInaccuracy: 0.16 },
  smg: { id: 'smg', name: 'MP7', price: 1500, teams: 'both', buyCategory: 'smg', killReward: 600, damage: 22, fireRate: 13, magazineSize: 30, maxReserveAmmo: 120, reloadTime: 2, spread: 0.075, movementSpeedMultiplier: 0.98, armorPenetration: 0.45, headshotMultiplier: 2.6, range: 45, recoilKick: 0.75, moveInaccuracy: 0.08 },
  // ── 摘要中待补的3把新武器 ──
  mp5sd: { id: 'mp5sd', name: 'MP5-SD', price: 1500, teams: 'both', buyCategory: 'smg', killReward: 600, damage: 27, fireRate: 11, magazineSize: 30, maxReserveAmmo: 120, reloadTime: 2.2, spread: 0.06, movementSpeedMultiplier: 0.98, armorPenetration: 0.62, headshotMultiplier: 2.6, range: 52, recoilKick: 0.8, moveInaccuracy: 0.06 },
  mp5: { id: 'mp5', name: 'MP5 Navy', price: 1500, teams: 'both', buyCategory: 'smg', killReward: 300, damage: 27, fireRate: 11, magazineSize: 30, maxReserveAmmo: 120, reloadTime: 2.2, spread: 0.06, movementSpeedMultiplier: 0.98, armorPenetration: 0.62, headshotMultiplier: 2.6, range: 52, recoilKick: 0.8, moveInaccuracy: 0.06 },
  tmp: { id: 'tmp', name: 'TMP', price: 1250, teams: ['defenders'], buyCategory: 'smg', killReward: 300, damage: 20, fireRate: 14, magazineSize: 30, maxReserveAmmo: 120, reloadTime: 2.1, spread: 0.075, movementSpeedMultiplier: 0.98, armorPenetration: 0.55, headshotMultiplier: 2.6, range: 44, recoilKick: 0.75, moveInaccuracy: 0.08 },
  sawedoff: { id: 'sawedoff', name: 'Sawed-Off', price: 1100, teams: ['attackers'], buyCategory: 'shotgun', killReward: 900, damage: 22, fireRate: 1.4, magazineSize: 7, maxReserveAmmo: 32, reloadTime: 2.5, spread: 0.24, movementSpeedMultiplier: 0.88, armorPenetration: 0.22, headshotMultiplier: 1.3, range: 18, recoilKick: 1.4, moveInaccuracy: 0.14 },
  zeus: { id: 'zeus', name: 'Zeus x27', price: 200, teams: 'both', buyCategory: 'pistol', killReward: 0, damage: 500, fireRate: 0.2, magazineSize: 1, maxReserveAmmo: 0, reloadTime: 0, spread: 0.01, movementSpeedMultiplier: 0.96, armorPenetration: 1.0, headshotMultiplier: 1, range: 3.5, recoilKick: 0.3, moveInaccuracy: 0.02 },
  hegrenade: { id: 'hegrenade', name: 'HE Grenade', price: 300, teams: 'both', buyCategory: 'grenade', killReward: 300, damage: 100, fireRate: 0.2, magazineSize: 1, maxReserveAmmo: 0, reloadTime: 0, spread: 0, movementSpeedMultiplier: 0.98, armorPenetration: 1.0, headshotMultiplier: 1, range: 50, recoilKick: 0.5, moveInaccuracy: 0 }
};

export const CS16_DEFUSAL_WEAPON_IDS = new Set<WeaponId>([
  'glock', 'usp', 'p228', 'deagle', 'five_seven',
  'mp5', 'tmp', 'p90', 'mac10', 'ump45',
  'm3', 'xm1014',
  'galil', 'famas', 'ak47', 'm4a1', 'sg552', 'aug',
  'scout', 'awp', 'g3sg1', 'sg550',
  'm249',
]);

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
        { x: -8.32, y: 1.92, z: 8.00 },  // T Spawn stable lane
        { x: -8.32, y: 1.92, z: 7.04 },  // T Spawn edge lane
        { x: -8.32, y: 1.92, z: 8.96 },  // T Spawn
        { x: -7.36, y: 1.92, z: 8.96 },  // T Spawn
        { x: -6.40, y: 1.92, z: 8.96 }   // T Spawn
      ],
      defenders: [
        { x: 4.48, y: -0.24, z: -24.64 }, // CT Spawn (eye height: ground -0.88 + 0.64)
        { x: 3.52, y: -0.24, z: -24.64 }, // CT Spawn
        { x: 2.56, y: -0.24, z: -24.64 }, // CT Spawn
        { x: 4.48, y: -0.24, z: -21.12 }, // CT Spawn
        { x: 1.60, y: -0.24, z: -24.64 }  // CT Spawn
      ]
    },
    tdmSpawns: [
      // T Spawn area
      { x: -8.32, y: 1.92, z: 8.00 },
      { x: -7.36, y: 1.92, z: 8.96 },
      // CT Spawn area
      { x: 4.48, y: -0.24, z: -24.64 },
      { x: 3.52, y: -0.24, z: -21.12 },
      // A Site area
      { x: -26.88, y: 0.36, z: -12.80 }, // platform height ~-0.28 + 0.64
      // B Site area
      { x: 25.60, y: -0.24, z: -15.36 }, // ground ~-0.88 + 0.64
      // A Long area
      { x: -35.20, y: 0.64, z: 0 },
      // Mid area
      { x: -4.00, y: 1.92, z: 10.00 }
    ],
    bombSites: [
      { id: 'A', position: { x: -26.88, y: 0.36, z: -12.80 }, radius: 6 },
      { id: 'B', position: { x: 25.60, y: -0.24, z: -15.36 }, radius: 6 }
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
  },
  mirage: {
    id: 'mirage',
    spawns: {
      attackers: [
        { x: -10, y: 1.7, z: 32 }, { x: -5, y: 1.7, z: 32 }, { x: 0, y: 1.7, z: 32 }, { x: 5, y: 1.7, z: 32 }, { x: 10, y: 1.7, z: 32 }
      ],
      defenders: [
        { x: -10, y: 1.7, z: -46 }, { x: -5, y: 1.7, z: -46 }, { x: 0, y: 1.7, z: -46 }, { x: 5, y: 1.7, z: -46 }, { x: 10, y: 1.7, z: -46 }
      ]
    },
    tdmSpawns: [
      { x: -30, y: 1.7, z: 26 }, { x: 30, y: 1.7, z: 26 },
      { x: -30, y: 1.7, z: -40 }, { x: 30, y: 1.7, z: -40 },
      { x: -14, y: 3.1, z: -2 }, { x: 14, y: 3.1, z: -2 },
      { x: -8, y: 1.7, z: 8 }, { x: 8, y: 1.7, z: -20 }
    ],
    bombSites: [
      { id: 'A', position: { x: -24, y: 1.7, z: -27 }, radius: 6 },
      { id: 'B', position: { x: 24, y: 1.7, z: -27 }, radius: 6 }
    ]
  },
  inferno: {
    id: 'inferno',
    spawns: {
      attackers: [
        { x: -15.44, y: 0.48, z: -2.64 },
        { x: -16.56, y: 0.48, z: -5.12 },
        { x: -17.44, y: 0.48, z: -7.20 },
        { x: -15.44, y: 0.48, z: -6.16 },
        { x: -16.56, y: 0.48, z: -3.68 },
      ],
      defenders: [
        { x: 24.00, y: 1.92, z: -22.08 },
        { x: 24.00, y: 1.92, z: -23.52 },
        { x: 23.04, y: 1.92, z: -20.16 },
        { x: 24.00, y: 1.92, z: -24.64 },
        { x: 23.04, y: 1.92, z: -19.04 },
      ],
    },
    tdmSpawns: [
      { x: -15.44, y: 0.48, z: -2.64 },
      { x: -16.56, y: 0.48, z: -5.12 },
      { x: 24.00, y: 1.92, z: -22.08 },
      { x: 23.04, y: 1.92, z: -20.16 },
      { x: -12.80, y: 1.28, z: -12.80 },
      { x: 12.80, y: 1.28, z: -12.80 },
      { x: 0, y: 1.28, z: 0 },
      { x: -6.40, y: 1.28, z: 6.40 },
    ],
    bombSites: [
      { id: 'A', position: { x: -22.56, y: 1.28, z: -12.80 }, radius: 6 },
      { id: 'B', position: { x: 18.56, y: 1.28, z: -15.36 }, radius: 6 },
    ],
  },
  nuke: {
    id: 'nuke',
    spawns: {
      attackers: [
        { x: -10, y: 1.7, z: 29 }, { x: -5, y: 1.7, z: 29 }, { x: 0, y: 1.7, z: 29 }, { x: 5, y: 1.7, z: 29 }, { x: 10, y: 1.7, z: 29 }
      ],
      defenders: [
        { x: -10, y: 1.7, z: -46 }, { x: -5, y: 1.7, z: -46 }, { x: 0, y: 1.7, z: -46 }, { x: 5, y: 1.7, z: -46 }, { x: 10, y: 1.7, z: -46 }
      ]
    },
    tdmSpawns: [
      { x: -30, y: 1.7, z: 25 }, { x: 30, y: 1.7, z: 25 },
      { x: 0, y: 6.7, z: -4 }, { x: -12, y: 1.7, z: -8 },
      { x: -30, y: 1.7, z: -40 }, { x: 30, y: 1.7, z: -40 },
      { x: 0, y: 1.7, z: -20 }, { x: 0, y: 1.7, z: 8 }
    ],
    bombSites: [
      { id: 'A', position: { x: -24, y: 1.7, z: -27 }, radius: 6 },
      { id: 'B', position: { x: 24, y: 1.7, z: -27 }, radius: 6 }
    ]
  },
  train: {
    id: 'train',
    spawns: {
      attackers: [
        { x: 10, y: 1.7, z: 30 }, { x: 5, y: 1.7, z: 30 }, { x: 0, y: 1.7, z: 30 }, { x: 15, y: 1.7, z: 30 }, { x: 20, y: 1.7, z: 30 }
      ],
      defenders: [
        { x: -10, y: 1.7, z: -46 }, { x: -5, y: 1.7, z: -46 }, { x: 0, y: 1.7, z: -46 }, { x: 5, y: 1.7, z: -46 }, { x: 10, y: 1.7, z: -46 }
      ]
    },
    tdmSpawns: [
      { x: 10, y: 1.7, z: 28 }, { x: -10, y: 1.7, z: -44 },
      { x: -16, y: 3.3, z: -8 }, { x: 16, y: 3.3, z: -8 },
      { x: -28, y: 1.7, z: -22 }, { x: 28, y: 1.7, z: -22 },
      { x: 0, y: 1.7, z: -20 }, { x: 0, y: 1.7, z: 8 }
    ],
    bombSites: [
      { id: 'A', position: { x: -24, y: 1.7, z: -27 }, radius: 6 },
      { id: 'B', position: { x: 24, y: 1.7, z: -27 }, radius: 6 }
    ]
  },
  overpass: {
    id: 'overpass',
    spawns: {
      attackers: [
        { x: -10, y: 1.7, z: 31 }, { x: -5, y: 1.7, z: 31 }, { x: 0, y: 1.7, z: 31 }, { x: 5, y: 1.7, z: 31 }, { x: 10, y: 1.7, z: 31 }
      ],
      defenders: [
        { x: -10, y: 1.7, z: -46 }, { x: -5, y: 1.7, z: -46 }, { x: 0, y: 1.7, z: -46 }, { x: 5, y: 1.7, z: -46 }, { x: 10, y: 1.7, z: -46 }
      ]
    },
    tdmSpawns: [
      { x: -5, y: 1.7, z: 28 }, { x: 5, y: 1.7, z: 28 },
      { x: -30, y: 1.7, z: -40 }, { x: 30, y: 1.7, z: -40 },
      { x: 0, y: 3.85, z: 10 }, { x: -8, y: 1.7, z: -4 },
      { x: 0, y: 1.7, z: -20 }, { x: 0, y: 1.7, z: 14 }
    ],
    bombSites: [
      { id: 'A', position: { x: -24, y: 1.7, z: -27 }, radius: 6 },
      { id: 'B', position: { x: 24, y: 1.7, z: -27 }, radius: 6 }
    ]
  },
  bloodstrike: {
    id: 'bloodstrike',
    spawns: {
      attackers: [
        { x: -3.84, y: 1.7, z: 13.44 }, { x: -1.92, y: 1.7, z: 13.12 },
        { x:  0,    y: 1.7, z: 13.44 }, { x:  1.92, y: 1.7, z: 13.12 },
        { x:  3.84, y: 1.7, z: 13.44 }
      ],
      defenders: [
        { x: -3.84, y: 1.7, z: -13.44 }, { x: -1.92, y: 1.7, z: -13.12 },
        { x:  0,    y: 1.7, z: -13.44 }, { x:  1.92, y: 1.7, z: -13.12 },
        { x:  3.84, y: 1.7, z: -13.44 }
      ]
    },
    tdmSpawns: [
      { x: -3.84, y: 1.7, z:  13.44 }, { x:  3.84, y: 1.7, z:  13.44 },
      { x: -3.84, y: 1.7, z: -13.44 }, { x:  3.84, y: 1.7, z: -13.44 },
      { x: -11.52, y: 1.7, z: 0 },    { x:  11.52, y: 1.7, z: 0 },
      { x:  0,    y: 1.7, z:  0 },    { x: -6.4,  y: 1.7, z: -6.4 },
      { x:  6.4,  y: 1.7, z: -6.4 },  { x: -6.4,  y: 1.7, z:  6.4 },
      { x:  6.4,  y: 1.7, z:  6.4 }
    ],
    bombSites: [
      { id: 'A', position: { x: -11.52, y: 1.7, z: 0 }, radius: 1.92 },
      { id: 'B', position: { x:  11.52, y: 1.7, z: 0 }, radius: 1.92 }
    ]
  }
};
