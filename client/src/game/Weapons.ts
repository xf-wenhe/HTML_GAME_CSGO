import { Weapon } from './Weapon.js';

export const WEAPON_DEFINITIONS: Record<string, Weapon> = {
  // ── CS 1.6 手枪 ──────────────────────────────────────────────────────────────────
  glock: new Weapon({
    id: 'glock', name: 'Glock-18', displayName: 'Glock-18',
    damage: 25, fireRate: 5.5, magazineSize: 20, reloadTime: 2.2, spread: 0.045,
    projectileSpeed: 48, switchTime: 0.24, range: 46, reserveAmmo: 120,
    armorPenetration: 0.42, adsSpreadMultiplier: 0.55
  }),
  pistol: new Weapon({
    id: 'pistol', name: 'Glock-18', displayName: 'Glock-18',
    damage: 25, fireRate: 5.5, magazineSize: 20, reloadTime: 2.2, spread: 0.045,
    projectileSpeed: 48, switchTime: 0.24, range: 46, reserveAmmo: 120,
    armorPenetration: 0.42, adsSpreadMultiplier: 0.55
  }),
  usp: new Weapon({
    id: 'usp', name: 'USP .45', displayName: 'USP .45',
    damage: 30, fireRate: 4.2, magazineSize: 12, reloadTime: 2.1, spread: 0.03,
    projectileSpeed: 52, switchTime: 0.25, range: 50, reserveAmmo: 100,
    armorPenetration: 0.5, adsSpreadMultiplier: 0.44
  }),
  usp_s: new Weapon({
    id: 'usp_s', name: 'USP .45', displayName: 'USP .45',
    damage: 30, fireRate: 4.2, magazineSize: 12, reloadTime: 2.1, spread: 0.03,
    projectileSpeed: 52, switchTime: 0.25, range: 50, reserveAmmo: 100,
    armorPenetration: 0.5, adsSpreadMultiplier: 0.44
  }),
  p228: new Weapon({
    id: 'p228', name: 'P228', displayName: 'P228',
    damage: 28, fireRate: 4.5, magazineSize: 13, reloadTime: 2.2, spread: 0.038,
    projectileSpeed: 50, switchTime: 0.25, range: 48, reserveAmmo: 52,
    armorPenetration: 0.48, adsSpreadMultiplier: 0.5
  }),
  p250: new Weapon({
    id: 'p250', name: 'P228', displayName: 'P228',
    damage: 28, fireRate: 4.5, magazineSize: 13, reloadTime: 2.2, spread: 0.038,
    projectileSpeed: 50, switchTime: 0.25, range: 48, reserveAmmo: 52,
    armorPenetration: 0.48, adsSpreadMultiplier: 0.5
  }),
  five_seven: new Weapon({
    id: 'five_seven', name: 'Five-SeveN', displayName: 'Five-SeveN',
    damage: 30, fireRate: 5.0, magazineSize: 20, reloadTime: 2.3, spread: 0.035,
    projectileSpeed: 55, switchTime: 0.26, range: 54, reserveAmmo: 100,
    armorPenetration: 0.92, adsSpreadMultiplier: 0.48
  }),
  deagle: new Weapon({
    id: 'deagle', name: 'Desert Eagle', displayName: '沙漠之鹰',
    damage: 54, fireRate: 2.2, magazineSize: 7, reloadTime: 2.2, spread: 0.05,
    projectileSpeed: 68, switchTime: 0.3, range: 64, reserveAmmo: 35,
    armorPenetration: 0.93, adsSpreadMultiplier: 0.42
  }),
  heavy_pistol: new Weapon({
    id: 'heavy_pistol', name: 'Desert Eagle', displayName: '沙漠之鹰',
    damage: 54, fireRate: 2.2, magazineSize: 7, reloadTime: 2.2, spread: 0.05,
    projectileSpeed: 68, switchTime: 0.3, range: 64, reserveAmmo: 35,
    armorPenetration: 0.93, adsSpreadMultiplier: 0.42
  }),

  // ── CS 1.6 微型冲锋枪 ────────────────────────────────────────────────────────────
  tmp: new Weapon({
    id: 'tmp', name: 'TMP', displayName: 'TMP',
    damage: 20, fireRate: 14, magazineSize: 30, reloadTime: 2.1, spread: 0.075,
    projectileSpeed: 60, switchTime: 0.26, range: 44, reserveAmmo: 120,
    armorPenetration: 0.55, adsSpreadMultiplier: 0.6
  }),
  mp9: new Weapon({
    id: 'mp9', name: 'TMP', displayName: 'TMP',
    damage: 20, fireRate: 14, magazineSize: 30, reloadTime: 2.1, spread: 0.075,
    projectileSpeed: 60, switchTime: 0.26, range: 44, reserveAmmo: 120,
    armorPenetration: 0.55, adsSpreadMultiplier: 0.6
  }),
  mac10: new Weapon({
    id: 'mac10', name: 'MAC-10', displayName: 'MAC-10',
    damage: 25, fireRate: 15, magazineSize: 30, reloadTime: 2.2, spread: 0.085,
    projectileSpeed: 58, switchTime: 0.26, range: 40, reserveAmmo: 100,
    armorPenetration: 0.45, adsSpreadMultiplier: 0.62
  }),
  mp5: new Weapon({
    id: 'mp5', name: 'MP5 Navy', displayName: 'MP5 Navy',
    damage: 26, fireRate: 13, magazineSize: 30, reloadTime: 2.2, spread: 0.06,
    projectileSpeed: 64, switchTime: 0.28, range: 52, reserveAmmo: 120,
    armorPenetration: 0.62, adsSpreadMultiplier: 0.52
  }),
  mp5sd: new Weapon({
    id: 'mp5sd', name: 'MP5 Navy', displayName: 'MP5 Navy',
    damage: 26, fireRate: 13, magazineSize: 30, reloadTime: 2.2, spread: 0.06,
    projectileSpeed: 64, switchTime: 0.28, range: 52, reserveAmmo: 120,
    armorPenetration: 0.62, adsSpreadMultiplier: 0.52
  }),
  ump45: new Weapon({
    id: 'ump45', name: 'UMP-45', displayName: 'UMP-45',
    damage: 30, fireRate: 9.5, magazineSize: 25, reloadTime: 2.3, spread: 0.07,
    projectileSpeed: 58, switchTime: 0.3, range: 46, reserveAmmo: 100,
    armorPenetration: 0.65, adsSpreadMultiplier: 0.58
  }),
  p90: new Weapon({
    id: 'p90', name: 'P90', displayName: 'P90',
    damage: 24, fireRate: 16, magazineSize: 50, reloadTime: 2.6, spread: 0.068,
    projectileSpeed: 66, switchTime: 0.3, range: 52, reserveAmmo: 100,
    armorPenetration: 0.72, adsSpreadMultiplier: 0.55
  }),
  pp_bizon: new Weapon({
    id: 'pp_bizon', name: 'P90', displayName: 'P90',
    damage: 24, fireRate: 16, magazineSize: 50, reloadTime: 2.6, spread: 0.068,
    projectileSpeed: 66, switchTime: 0.3, range: 52, reserveAmmo: 100,
    armorPenetration: 0.72, adsSpreadMultiplier: 0.55
  }),
  mp7: new Weapon({
    id: 'mp7', name: 'MP5 Navy', displayName: 'MP5 Navy',
    damage: 26, fireRate: 13, magazineSize: 30, reloadTime: 2.2, spread: 0.06,
    projectileSpeed: 64, switchTime: 0.28, range: 52, reserveAmmo: 120,
    armorPenetration: 0.62, adsSpreadMultiplier: 0.52
  }),
  smg: new Weapon({
    id: 'smg', name: 'MP5 Navy', displayName: 'MP5 Navy',
    damage: 26, fireRate: 13, magazineSize: 30, reloadTime: 2.2, spread: 0.06,
    projectileSpeed: 64, switchTime: 0.28, range: 52, reserveAmmo: 120,
    armorPenetration: 0.62, adsSpreadMultiplier: 0.52
  }),

  // ── CS 1.6 霰弹枪 ──────────────────────────────────────────────────────────────
  m3: new Weapon({
    id: 'm3', name: 'M3 Super 90', displayName: 'M3 Super 90',
    damage: 22, fireRate: 1.1, magazineSize: 8, reloadTime: 2.8, spread: 0.22,
    projectileSpeed: 40, switchTime: 0.45, range: 28, reserveAmmo: 32,
    armorPenetration: 0.3, adsSpreadMultiplier: 0.62, pellets: 8
  }),
  nova: new Weapon({
    id: 'nova', name: 'M3 Super 90', displayName: 'M3 Super 90',
    damage: 22, fireRate: 1.1, magazineSize: 8, reloadTime: 2.8, spread: 0.22,
    projectileSpeed: 40, switchTime: 0.45, range: 28, reserveAmmo: 32,
    armorPenetration: 0.3, adsSpreadMultiplier: 0.62, pellets: 8
  }),
  mag7: new Weapon({
    id: 'mag7', name: 'M3 Super 90', displayName: 'M3 Super 90',
    damage: 22, fireRate: 1.1, magazineSize: 8, reloadTime: 2.8, spread: 0.22,
    projectileSpeed: 40, switchTime: 0.45, range: 28, reserveAmmo: 32,
    armorPenetration: 0.3, adsSpreadMultiplier: 0.62, pellets: 8
  }),
  xm1014: new Weapon({
    id: 'xm1014', name: 'XM1014', displayName: 'XM1014',
    damage: 19, fireRate: 1.8, magazineSize: 7, reloadTime: 3.0, spread: 0.2,
    projectileSpeed: 42, switchTime: 0.48, range: 24, reserveAmmo: 32,
    armorPenetration: 0.25, adsSpreadMultiplier: 0.65, pellets: 8
  }),
  sawedoff: new Weapon({
    id: 'sawedoff', name: 'M3 Super 90', displayName: 'M3 Super 90',
    damage: 22, fireRate: 1.1, magazineSize: 8, reloadTime: 2.8, spread: 0.22,
    projectileSpeed: 40, switchTime: 0.45, range: 28, reserveAmmo: 32,
    armorPenetration: 0.3, adsSpreadMultiplier: 0.62, pellets: 8
  }),
  shotgun: new Weapon({
    id: 'shotgun', name: 'M3 Super 90', displayName: 'M3 Super 90',
    damage: 22, fireRate: 1.1, magazineSize: 8, reloadTime: 2.8, spread: 0.22,
    projectileSpeed: 40, switchTime: 0.45, range: 28, reserveAmmo: 32,
    armorPenetration: 0.3, adsSpreadMultiplier: 0.62, pellets: 8
  }),

  // ── CS 1.6 步枪 ──────────────────────────────────────────────────────────────────
  galil: new Weapon({
    id: 'galil', name: 'Galil AR', displayName: 'Galil AR',
    damage: 30, fireRate: 11, magazineSize: 35, reloadTime: 2.25, spread: 0.055,
    projectileSpeed: 76, switchTime: 0.38, range: 78, reserveAmmo: 105,
    armorPenetration: 0.72, adsSpreadMultiplier: 0.48
  }),
  famas: new Weapon({
    id: 'famas', name: 'FAMAS', displayName: 'FAMAS',
    damage: 30, fireRate: 11.5, magazineSize: 25, reloadTime: 2.3, spread: 0.05,
    projectileSpeed: 78, switchTime: 0.38, range: 80, reserveAmmo: 75,
    armorPenetration: 0.7, adsSpreadMultiplier: 0.46
  }),
  ak47: new Weapon({
    id: 'ak47', name: 'AK-47', displayName: 'AK-47',
    damage: 36, fireRate: 9.5, magazineSize: 30, reloadTime: 2.35, spread: 0.055,
    projectileSpeed: 80, switchTime: 0.42, range: 90, reserveAmmo: 90,
    armorPenetration: 0.78, adsSpreadMultiplier: 0.46
  }),
  rifle: new Weapon({
    id: 'rifle', name: 'AK-47', displayName: 'AK-47',
    damage: 36, fireRate: 9.5, magazineSize: 30, reloadTime: 2.35, spread: 0.055,
    projectileSpeed: 80, switchTime: 0.42, range: 90, reserveAmmo: 90,
    armorPenetration: 0.78, adsSpreadMultiplier: 0.46
  }),
  m4a1: new Weapon({
    id: 'm4a1', name: 'M4A1', displayName: 'M4A1',
    damage: 33, fireRate: 10, magazineSize: 30, reloadTime: 2.25, spread: 0.045,
    projectileSpeed: 80, switchTime: 0.4, range: 88, reserveAmmo: 90,
    armorPenetration: 0.7, adsSpreadMultiplier: 0.44
  }),
  m4a1s: new Weapon({
    id: 'm4a1s', name: 'M4A1', displayName: 'M4A1',
    damage: 33, fireRate: 10, magazineSize: 30, reloadTime: 2.25, spread: 0.045,
    projectileSpeed: 80, switchTime: 0.4, range: 88, reserveAmmo: 90,
    armorPenetration: 0.7, adsSpreadMultiplier: 0.44
  }),
  m4a4: new Weapon({
    id: 'm4a4', name: 'M4A1', displayName: 'M4A1',
    damage: 33, fireRate: 10, magazineSize: 30, reloadTime: 2.25, spread: 0.045,
    projectileSpeed: 80, switchTime: 0.4, range: 88, reserveAmmo: 90,
    armorPenetration: 0.7, adsSpreadMultiplier: 0.44
  }),
  sg552: new Weapon({
    id: 'sg552', name: 'SG 552', displayName: 'SG 552',
    damage: 34, fireRate: 9.5, magazineSize: 30, reloadTime: 2.4, spread: 0.048,
    projectileSpeed: 82, switchTime: 0.44, range: 95, reserveAmmo: 90,
    armorPenetration: 0.76, adsSpreadMultiplier: 0.38
  }),
  sg553: new Weapon({
    id: 'sg553', name: 'SG 552', displayName: 'SG 552',
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
  defender_rifle: new Weapon({
    id: 'defender_rifle', name: 'M4A1', displayName: 'M4A1',
    damage: 33, fireRate: 10, magazineSize: 30, reloadTime: 2.25, spread: 0.045,
    projectileSpeed: 80, switchTime: 0.4, range: 88, reserveAmmo: 90,
    armorPenetration: 0.7, adsSpreadMultiplier: 0.44
  }),

  // ── CS 1.6 狙击枪 ────────────────────────────────────────────────────────────────
  scout: new Weapon({
    id: 'scout', name: 'Scout', displayName: 'Scout',
    damage: 68, fireRate: 1.1, magazineSize: 10, reloadTime: 3.0, spread: 0.02,
    projectileSpeed: 110, switchTime: 0.56, range: 120, reserveAmmo: 60,
    armorPenetration: 0.96, adsSpreadMultiplier: 0.1
  }),
  ssg08: new Weapon({
    id: 'ssg08', name: 'Scout', displayName: 'Scout',
    damage: 68, fireRate: 1.1, magazineSize: 10, reloadTime: 3.0, spread: 0.02,
    projectileSpeed: 110, switchTime: 0.56, range: 120, reserveAmmo: 60,
    armorPenetration: 0.96, adsSpreadMultiplier: 0.1
  }),
  awp: new Weapon({
    id: 'awp', name: 'AWP', displayName: 'AWP',
    damage: 115, fireRate: 0.8, magazineSize: 5, reloadTime: 3.3, spread: 0.015,
    projectileSpeed: 120, switchTime: 0.64, range: 130, reserveAmmo: 30,
    armorPenetration: 0.98, adsSpreadMultiplier: 0.08
  }),
  sniper: new Weapon({
    id: 'sniper', name: 'AWP', displayName: 'AWP',
    damage: 115, fireRate: 0.8, magazineSize: 5, reloadTime: 3.3, spread: 0.015,
    projectileSpeed: 120, switchTime: 0.64, range: 130, reserveAmmo: 30,
    armorPenetration: 0.98, adsSpreadMultiplier: 0.08
  }),
  g3sg1: new Weapon({
    id: 'g3sg1', name: 'G3SG1', displayName: 'G3SG1',
    damage: 80, fireRate: 3.0, magazineSize: 20, reloadTime: 3.2, spread: 0.025,
    projectileSpeed: 105, switchTime: 0.6, range: 115, reserveAmmo: 60,
    armorPenetration: 0.95, adsSpreadMultiplier: 0.12
  }),
  sg550: new Weapon({
    id: 'sg550', name: 'SG 550', displayName: 'SG 550',
    damage: 80, fireRate: 3.0, magazineSize: 20, reloadTime: 3.2, spread: 0.025,
    projectileSpeed: 105, switchTime: 0.6, range: 115, reserveAmmo: 60,
    armorPenetration: 0.95, adsSpreadMultiplier: 0.12
  }),
  scar20: new Weapon({
    id: 'scar20', name: 'G3SG1', displayName: 'G3SG1',
    damage: 80, fireRate: 3.0, magazineSize: 20, reloadTime: 3.2, spread: 0.025,
    projectileSpeed: 105, switchTime: 0.6, range: 115, reserveAmmo: 60,
    armorPenetration: 0.95, adsSpreadMultiplier: 0.12
  }),

  // ── CS 1.6 机枪 ──────────────────────────────────────────────────────────────
  m249: new Weapon({
    id: 'm249', name: 'M249', displayName: 'M249',
    damage: 32, fireRate: 11, magazineSize: 100, reloadTime: 5.0, spread: 0.075,
    projectileSpeed: 76, switchTime: 0.6, range: 80, reserveAmmo: 200,
    armorPenetration: 0.8, adsSpreadMultiplier: 0.52
  }),
  negev: new Weapon({
    id: 'negev', name: 'M249', displayName: 'M249',
    damage: 32, fireRate: 11, magazineSize: 100, reloadTime: 5.0, spread: 0.075,
    projectileSpeed: 76, switchTime: 0.6, range: 80, reserveAmmo: 200,
    armorPenetration: 0.8, adsSpreadMultiplier: 0.52
  }),

  // ── CS 1.6 近战/装备 ──────────────────────────────────────────────────────────
  knife: new Weapon({
    id: 'knife', name: 'Knife', displayName: '战术刀',
    damage: 55, fireRate: 1.8, magazineSize: 1, reloadTime: 0, spread: 0,
    projectileSpeed: 0, ammoConsumed: false, isMelee: true,
    switchTime: 0.18, range: 2.35, reserveAmmo: 0,
    armorPenetration: 0.2, adsSpreadMultiplier: 1
  }),
  zeus: new Weapon({
    id: 'zeus', name: 'Zeus x27', displayName: 'Zeus x27',
    damage: 500, fireRate: 0.2, magazineSize: 1, reloadTime: 0, spread: 0.01,
    projectileSpeed: 60, ammoConsumed: true,
    switchTime: 0.35, range: 3.5, reserveAmmo: 0,
    armorPenetration: 1.0, adsSpreadMultiplier: 1
  }),
  hegrenade: new Weapon({
    id: 'hegrenade', name: 'HE Grenade', displayName: '高爆手雷',
    damage: 100, fireRate: 0.2, magazineSize: 1, reloadTime: 0, spread: 0,
    projectileSpeed: 50, ammoConsumed: true,
    switchTime: 0.4, range: 50, reserveAmmo: 0,
    armorPenetration: 1.0, adsSpreadMultiplier: 1
  }),

  // ── 旧别名兼容（保持现有购买菜单ID可用） ────────────────────────────────
  sidearm: new Weapon({
    id: 'sidearm', name: 'Glock-18', displayName: 'Glock-18',
    damage: 25, fireRate: 5.5, magazineSize: 20, reloadTime: 2.2, spread: 0.045,
    projectileSpeed: 48, switchTime: 0.24, range: 46, reserveAmmo: 120,
    armorPenetration: 0.42, adsSpreadMultiplier: 0.55
  }),
  vandal: new Weapon({
    id: 'vandal', name: 'AK-47', displayName: 'AK-47',
    damage: 36, fireRate: 9.5, magazineSize: 30, reloadTime: 2.35, spread: 0.055,
    projectileSpeed: 80, switchTime: 0.42, range: 90, reserveAmmo: 90,
    armorPenetration: 0.78, adsSpreadMultiplier: 0.46
  }),
  sentinel: new Weapon({
    id: 'sentinel', name: 'M4A1', displayName: 'M4A1',
    damage: 33, fireRate: 10, magazineSize: 30, reloadTime: 2.25, spread: 0.045,
    projectileSpeed: 80, switchTime: 0.4, range: 88, reserveAmmo: 90,
    armorPenetration: 0.7, adsSpreadMultiplier: 0.44
  }),
  operator: new Weapon({
    id: 'operator', name: 'AWP', displayName: 'AWP',
    damage: 115, fireRate: 0.8, magazineSize: 5, reloadTime: 3.3, spread: 0.015,
    projectileSpeed: 120, switchTime: 0.64, range: 130, reserveAmmo: 30,
    armorPenetration: 0.98, adsSpreadMultiplier: 0.08
  }),
  specter: new Weapon({
    id: 'specter', name: 'TMP', displayName: 'TMP',
    damage: 20, fireRate: 14, magazineSize: 30, reloadTime: 2.1, spread: 0.075,
    projectileSpeed: 60, switchTime: 0.26, range: 44, reserveAmmo: 120,
    armorPenetration: 0.55, adsSpreadMultiplier: 0.6
  }),
  bulldog: new Weapon({
    id: 'bulldog', name: 'M3 Super 90', displayName: 'M3 Super 90',
    damage: 22, fireRate: 1.1, magazineSize: 8, reloadTime: 2.8, spread: 0.22,
    projectileSpeed: 40, switchTime: 0.45, range: 28, reserveAmmo: 32,
    armorPenetration: 0.3, adsSpreadMultiplier: 0.62, pellets: 8
  }),
};
