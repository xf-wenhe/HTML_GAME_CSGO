import { Weapon } from './Weapon.js';

export const WEAPON_DEFINITIONS: Record<string, Weapon> = {
  // ── 手枪 ──────────────────────────────────────────────────────────────────
  pistol: new Weapon({
    id: 'pistol', name: 'Glock-18', displayName: 'Glock-18',
    damage: 28, fireRate: 5, magazineSize: 20, reloadTime: 2.2, spread: 0.04,
    projectileSpeed: 50, switchTime: 0.24, range: 48, reserveAmmo: 120,
    armorPenetration: 0.47, adsSpreadMultiplier: 0.52
  }),
  usp_s: new Weapon({
    id: 'usp_s', name: 'USP-S', displayName: 'USP-S',
    damage: 35, fireRate: 4, magazineSize: 12, reloadTime: 2.2, spread: 0.03,
    projectileSpeed: 55, switchTime: 0.25, range: 52, reserveAmmo: 24,
    armorPenetration: 0.5, adsSpreadMultiplier: 0.44
  }),
  p250: new Weapon({
    id: 'p250', name: 'P250', displayName: 'P250',
    damage: 38, fireRate: 4.5, magazineSize: 13, reloadTime: 2.2, spread: 0.04,
    projectileSpeed: 52, switchTime: 0.25, range: 50, reserveAmmo: 26,
    armorPenetration: 0.52, adsSpreadMultiplier: 0.5
  }),
  five_seven: new Weapon({
    id: 'five_seven', name: 'Five-SeveN', displayName: 'Five-SeveN',
    damage: 32, fireRate: 5.5, magazineSize: 20, reloadTime: 2.3, spread: 0.035,
    projectileSpeed: 58, switchTime: 0.26, range: 55, reserveAmmo: 100,
    armorPenetration: 0.91, adsSpreadMultiplier: 0.48
  }),
  deagle: new Weapon({
    id: 'deagle', name: 'Desert Eagle', displayName: '沙漠之鹰',
    damage: 55, fireRate: 2.2, magazineSize: 7, reloadTime: 2.2, spread: 0.05,
    projectileSpeed: 70, switchTime: 0.3, range: 65, reserveAmmo: 35,
    armorPenetration: 0.93, adsSpreadMultiplier: 0.42
  }),
  dual_berettas: new Weapon({
    id: 'dual_berettas', name: 'Dual Berettas', displayName: '双枪贝雷塔',
    damage: 26, fireRate: 6, magazineSize: 30, reloadTime: 2.7, spread: 0.045,
    projectileSpeed: 48, switchTime: 0.28, range: 42, reserveAmmo: 120,
    armorPenetration: 0.38, adsSpreadMultiplier: 0.55
  }),
  r8: new Weapon({
    id: 'r8', name: 'R8 Revolver', displayName: 'R8 左轮',
    damage: 86, fireRate: 1.0, magazineSize: 8, reloadTime: 2.7, spread: 0.02,
    projectileSpeed: 75, switchTime: 0.35, range: 78, reserveAmmo: 16,
    armorPenetration: 0.88, adsSpreadMultiplier: 0.3
  }),
  cz75: new Weapon({
    id: 'cz75', name: 'CZ75-Auto', displayName: 'CZ75 自动',
    damage: 31, fireRate: 12, magazineSize: 12, reloadTime: 2.4, spread: 0.055,
    projectileSpeed: 50, switchTime: 0.22, range: 40, reserveAmmo: 12,
    armorPenetration: 0.77, adsSpreadMultiplier: 0.6
  }),
  tec9: new Weapon({
    id: 'tec9', name: 'Tec-9', displayName: 'Tec-9',
    damage: 33, fireRate: 8, magazineSize: 18, reloadTime: 2.3, spread: 0.05,
    projectileSpeed: 52, switchTime: 0.26, range: 44, reserveAmmo: 90,
    armorPenetration: 0.9, adsSpreadMultiplier: 0.56
  }),
  p2000: new Weapon({
    id: 'p2000', name: 'P2000', displayName: 'P2000',
    damage: 32, fireRate: 4.5, magazineSize: 13, reloadTime: 2.2, spread: 0.035,
    projectileSpeed: 52, switchTime: 0.24, range: 50, reserveAmmo: 52,
    armorPenetration: 0.5, adsSpreadMultiplier: 0.48
  }),

  // ── 微型冲锋枪 ────────────────────────────────────────────────────────────
  mp9: new Weapon({
    id: 'mp9', name: 'MP9', displayName: 'MP9',
    damage: 26, fireRate: 14, magazineSize: 30, reloadTime: 2.1, spread: 0.07,
    projectileSpeed: 62, switchTime: 0.28, range: 48, reserveAmmo: 120,
    armorPenetration: 0.6, adsSpreadMultiplier: 0.58
  }),
  mac10: new Weapon({
    id: 'mac10', name: 'MAC-10', displayName: 'MAC-10',
    damage: 29, fireRate: 15, magazineSize: 30, reloadTime: 2.2, spread: 0.08,
    projectileSpeed: 60, switchTime: 0.26, range: 40, reserveAmmo: 100,
    armorPenetration: 0.45, adsSpreadMultiplier: 0.62
  }),
  pp_bizon: new Weapon({
    id: 'pp_bizon', name: 'PP-Bizon', displayName: 'PP-野牛',
    damage: 27, fireRate: 11, magazineSize: 64, reloadTime: 2.6, spread: 0.075,
    projectileSpeed: 60, switchTime: 0.3, range: 42, reserveAmmo: 128,
    armorPenetration: 0.32, adsSpreadMultiplier: 0.6
  }),
  mp7: new Weapon({
    id: 'mp7', name: 'MP7', displayName: 'MP7',
    damage: 29, fireRate: 13, magazineSize: 30, reloadTime: 2.1, spread: 0.065,
    projectileSpeed: 64, switchTime: 0.28, range: 50, reserveAmmo: 120,
    armorPenetration: 0.6, adsSpreadMultiplier: 0.55
  }),
  ump45: new Weapon({
    id: 'ump45', name: 'UMP-45', displayName: 'UMP-45',
    damage: 35, fireRate: 9, magazineSize: 25, reloadTime: 2.3, spread: 0.07,
    projectileSpeed: 58, switchTime: 0.3, range: 46, reserveAmmo: 100,
    armorPenetration: 0.65, adsSpreadMultiplier: 0.57
  }),
  p90: new Weapon({
    id: 'p90', name: 'P90', displayName: 'P90',
    damage: 26, fireRate: 16, magazineSize: 50, reloadTime: 2.6, spread: 0.065,
    projectileSpeed: 66, switchTime: 0.3, range: 52, reserveAmmo: 100,
    armorPenetration: 0.69, adsSpreadMultiplier: 0.54
  }),

  // ── 步枪 ──────────────────────────────────────────────────────────────────
  rifle: new Weapon({
    id: 'rifle', name: 'AK-47', displayName: 'AK-47',
    damage: 36, fireRate: 9.5, magazineSize: 30, reloadTime: 2.35, spread: 0.055,
    projectileSpeed: 80, switchTime: 0.42, range: 90, reserveAmmo: 90,
    armorPenetration: 0.78, adsSpreadMultiplier: 0.46
  }),
  ak47: new Weapon({
    id: 'ak47', name: 'AK-47', displayName: 'AK-47',
    damage: 36, fireRate: 9.5, magazineSize: 30, reloadTime: 2.35, spread: 0.055,
    projectileSpeed: 80, switchTime: 0.42, range: 90, reserveAmmo: 90,
    armorPenetration: 0.78, adsSpreadMultiplier: 0.46
  }),
  m4a1s: new Weapon({
    id: 'm4a1s', name: 'M4A1-S', displayName: 'M4A1-S',
    damage: 38, fireRate: 9, magazineSize: 20, reloadTime: 2.35, spread: 0.04,
    projectileSpeed: 82, switchTime: 0.42, range: 95, reserveAmmo: 60,
    armorPenetration: 0.7, adsSpreadMultiplier: 0.42
  }),
  m4a4: new Weapon({
    id: 'm4a4', name: 'M4A4', displayName: 'M4A4',
    damage: 33, fireRate: 10.5, magazineSize: 30, reloadTime: 2.25, spread: 0.045,
    projectileSpeed: 80, switchTime: 0.4, range: 88, reserveAmmo: 90,
    armorPenetration: 0.7, adsSpreadMultiplier: 0.44
  }),
  defender_rifle: new Weapon({
    id: 'defender_rifle', name: 'M4A4', displayName: 'M4A4',
    damage: 33, fireRate: 10, magazineSize: 30, reloadTime: 2.25, spread: 0.045,
    projectileSpeed: 80, switchTime: 0.4, range: 86, reserveAmmo: 90,
    armorPenetration: 0.74, adsSpreadMultiplier: 0.44
  }),
  famas: new Weapon({
    id: 'famas', name: 'FAMAS', displayName: 'FAMAS',
    damage: 30, fireRate: 11, magazineSize: 25, reloadTime: 2.3, spread: 0.05,
    projectileSpeed: 78, switchTime: 0.38, range: 80, reserveAmmo: 75,
    armorPenetration: 0.7, adsSpreadMultiplier: 0.46
  }),
  galil: new Weapon({
    id: 'galil', name: 'Galil AR', displayName: 'Galil AR',
    damage: 30, fireRate: 11, magazineSize: 35, reloadTime: 2.25, spread: 0.055,
    projectileSpeed: 76, switchTime: 0.38, range: 78, reserveAmmo: 105,
    armorPenetration: 0.72, adsSpreadMultiplier: 0.48
  }),
  sg553: new Weapon({
    id: 'sg553', name: 'SG 553', displayName: 'SG 553',
    damage: 34, fireRate: 9.5, magazineSize: 30, reloadTime: 2.4, spread: 0.048,
    projectileSpeed: 82, switchTime: 0.44, range: 95, reserveAmmo: 90,
    armorPenetration: 0.76, adsSpreadMultiplier: 0.38
  }),
  aug: new Weapon({
    id: 'aug', name: 'AUG', displayName: 'AUG',
    damage: 32, fireRate: 10, magazineSize: 30, reloadTime: 2.35, spread: 0.042,
    projectileSpeed: 82, switchTime: 0.42, range: 95, reserveAmmo: 90,
    armorPenetration: 0.73, adsSpreadMultiplier: 0.38
  }),

  // ── 狙击枪 ────────────────────────────────────────────────────────────────
  sniper: new Weapon({
    id: 'sniper', name: 'AWP', displayName: 'AWP',
    damage: 115, fireRate: 0.8, magazineSize: 5, reloadTime: 3.3, spread: 0.015,
    projectileSpeed: 120, switchTime: 0.64, range: 130, reserveAmmo: 30,
    armorPenetration: 0.98, adsSpreadMultiplier: 0.08
  }),
  awp: new Weapon({
    id: 'awp', name: 'AWP', displayName: 'AWP',
    damage: 115, fireRate: 0.8, magazineSize: 5, reloadTime: 3.3, spread: 0.015,
    projectileSpeed: 120, switchTime: 0.64, range: 130, reserveAmmo: 30,
    armorPenetration: 0.98, adsSpreadMultiplier: 0.08
  }),
  ssg08: new Weapon({
    id: 'ssg08', name: 'SSG 08', displayName: 'SSG 08',
    damage: 88, fireRate: 1.1, magazineSize: 10, reloadTime: 3.0, spread: 0.02,
    projectileSpeed: 110, switchTime: 0.56, range: 120, reserveAmmo: 30,
    armorPenetration: 0.96, adsSpreadMultiplier: 0.1
  }),
  scar20: new Weapon({
    id: 'scar20', name: 'SCAR-20', displayName: 'SCAR-20',
    damage: 80, fireRate: 3.0, magazineSize: 20, reloadTime: 3.2, spread: 0.025,
    projectileSpeed: 105, switchTime: 0.6, range: 115, reserveAmmo: 60,
    armorPenetration: 0.95, adsSpreadMultiplier: 0.12
  }),
  g3sg1: new Weapon({
    id: 'g3sg1', name: 'G3SG1', displayName: 'G3SG1',
    damage: 80, fireRate: 3.0, magazineSize: 20, reloadTime: 3.2, spread: 0.025,
    projectileSpeed: 105, switchTime: 0.6, range: 115, reserveAmmo: 60,
    armorPenetration: 0.95, adsSpreadMultiplier: 0.12
  }),

  // ── 重型/霰弹枪/机枪 ──────────────────────────────────────────────────────
  shotgun: new Weapon({
    id: 'shotgun', name: 'Nova', displayName: 'Nova',
    damage: 18, fireRate: 1.1, magazineSize: 8, reloadTime: 2.8, spread: 0.22,
    projectileSpeed: 40, switchTime: 0.45, range: 26, reserveAmmo: 32,
    armorPenetration: 0.3, adsSpreadMultiplier: 0.62, pellets: 8
  }),
  nova: new Weapon({
    id: 'nova', name: 'Nova', displayName: 'Nova',
    damage: 20, fireRate: 1.1, magazineSize: 8, reloadTime: 2.8, spread: 0.22,
    projectileSpeed: 40, switchTime: 0.45, range: 28, reserveAmmo: 32,
    armorPenetration: 0.3, adsSpreadMultiplier: 0.62, pellets: 8
  }),
  mag7: new Weapon({
    id: 'mag7', name: 'MAG-7', displayName: 'MAG-7',
    damage: 30, fireRate: 1.2, magazineSize: 5, reloadTime: 2.5, spread: 0.18,
    projectileSpeed: 44, switchTime: 0.44, range: 30, reserveAmmo: 25,
    armorPenetration: 0.5, adsSpreadMultiplier: 0.6, pellets: 8
  }),
  xm1014: new Weapon({
    id: 'xm1014', name: 'XM1014', displayName: 'XM1014',
    damage: 19, fireRate: 1.8, magazineSize: 7, reloadTime: 3.0, spread: 0.2,
    projectileSpeed: 42, switchTime: 0.48, range: 24, reserveAmmo: 32,
    armorPenetration: 0.25, adsSpreadMultiplier: 0.65, pellets: 8
  }),
  m249: new Weapon({
    id: 'm249', name: 'M249', displayName: 'M249',
    damage: 32, fireRate: 11, magazineSize: 100, reloadTime: 5.0, spread: 0.075,
    projectileSpeed: 76, switchTime: 0.6, range: 80, reserveAmmo: 200,
    armorPenetration: 0.8, adsSpreadMultiplier: 0.52
  }),
  negev: new Weapon({
    id: 'negev', name: 'Negev', displayName: 'Negev',
    damage: 35, fireRate: 13, magazineSize: 150, reloadTime: 5.5, spread: 0.1,
    projectileSpeed: 74, switchTime: 0.65, range: 72, reserveAmmo: 300,
    armorPenetration: 0.85, adsSpreadMultiplier: 0.55
  }),

  // ── SMG (旧别名保留兼容) ──────────────────────────────────────────────────
  smg: new Weapon({
    id: 'smg', name: 'MP7', displayName: 'MP7',
    damage: 22, fireRate: 13, magazineSize: 30, reloadTime: 2, spread: 0.075,
    projectileSpeed: 62, switchTime: 0.28, range: 45, reserveAmmo: 120,
    armorPenetration: 0.45, adsSpreadMultiplier: 0.6
  }),

  // ── 近战 ──────────────────────────────────────────────────────────────────
  knife: new Weapon({
    id: 'knife', name: 'Knife', displayName: '战术刀',
    damage: 55, fireRate: 1.8, magazineSize: 1, reloadTime: 0, spread: 0,
    projectileSpeed: 0, ammoConsumed: false, isMelee: true,
    switchTime: 0.18, range: 2.35, reserveAmmo: 0,
    armorPenetration: 0.2, adsSpreadMultiplier: 1
  }),

  // ── 旧别名兼容（保持现有购买菜单ID可用） ────────────────────────────────
  sidearm:     new Weapon({ id: 'sidearm',     name: 'Glock-18',  displayName: 'Glock-18',  damage: 28, fireRate: 5,    magazineSize: 20, reloadTime: 2.2, spread: 0.04,  projectileSpeed: 50, switchTime: 0.24, range: 48,  reserveAmmo: 120, armorPenetration: 0.47, adsSpreadMultiplier: 0.52 }),
  heavy_pistol:new Weapon({ id: 'heavy_pistol',name: 'Desert Eagle',displayName: '沙漠之鹰',damage: 55, fireRate: 2.2, magazineSize: 7,  reloadTime: 1.9, spread: 0.05,  projectileSpeed: 58, switchTime: 0.3,  range: 65,  reserveAmmo: 21,  armorPenetration: 0.72, adsSpreadMultiplier: 0.48 }),
  vandal:      new Weapon({ id: 'vandal',      name: 'AK-47',     displayName: 'AK-47',     damage: 36, fireRate: 9.5, magazineSize: 30, reloadTime: 2.35,spread: 0.055, projectileSpeed: 80, switchTime: 0.42, range: 90,  reserveAmmo: 90,  armorPenetration: 0.78, adsSpreadMultiplier: 0.46 }),
  sentinel:    new Weapon({ id: 'sentinel',    name: 'M4A1-S',    displayName: 'M4A1-S',    damage: 38, fireRate: 9,   magazineSize: 20, reloadTime: 2.35,spread: 0.04,  projectileSpeed: 82, switchTime: 0.42, range: 95,  reserveAmmo: 60,  armorPenetration: 0.7,  adsSpreadMultiplier: 0.42 }),
  operator:    new Weapon({ id: 'operator',    name: 'AWP',       displayName: 'AWP',       damage: 115,fireRate: 0.8, magazineSize: 5,  reloadTime: 3.3, spread: 0.015, projectileSpeed: 120,switchTime: 0.64, range: 130, reserveAmmo: 30,  armorPenetration: 0.98, adsSpreadMultiplier: 0.08 }),
  specter:     new Weapon({ id: 'specter',     name: 'MP9',       displayName: 'MP9',       damage: 26, fireRate: 14,  magazineSize: 30, reloadTime: 2.1, spread: 0.07,  projectileSpeed: 62, switchTime: 0.28, range: 48,  reserveAmmo: 120, armorPenetration: 0.6,  adsSpreadMultiplier: 0.58 }),
  bulldog:     new Weapon({ id: 'bulldog',     name: 'Nova',      displayName: 'Nova',      damage: 18, fireRate: 1.1, magazineSize: 8,  reloadTime: 2.8, spread: 0.22,  projectileSpeed: 40, switchTime: 0.45, range: 26,  reserveAmmo: 32,  armorPenetration: 0.3,  adsSpreadMultiplier: 0.62, pellets: 8 }),
};
