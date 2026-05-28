/**
 * CSGO DUST2 精确布局 — 实体雕刻重制版
 *
 * 修复：移除阻挡路径的隐形空气墙，加入真正的楼梯、斜坡和立体高度。
 * 采用了“建筑块雕刻法”，保证A大道、中路、B洞等路线绝对连通且流畅。
 */

import {
  hammerToGame,
  PLAYER_EYE_HEIGHT,
} from './constants/MapUnits.js';
import {
  DUST2_SPAWNS as HAMMER_SPAWNS,
  DUST2_BOMB_SITES as HAMMER_BOMB_SITES,
  DUST2_CALLOUTS as HAMMER_CALLOUTS,
  DUST2_MATERIAL_ZONES as HAMMER_MATERIAL_ZONES
} from './constants/Dust2HammerData.js';

// === 类型 ===
export interface ArenaCollider {
  position: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  name?: string;
}

// === 核心构建辅助函数 ===

/** * 万能建筑块 (Crate/Block) 
 * x, z 为中心坐标；w, d 为宽和深；h 为高度；yOff 为离地高度
 */
function crt(x: number, z: number, w: number, d: number, h: number = 64, yOff: number = 0, name?: string): ArenaCollider {
  return {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size: { x: hammerToGame(w), y: hammerToGame(h), z: hammerToGame(d) },
    name
  };
}

/** 天花板/过道封顶 */
function ceil(x: number, z: number, w: number, d: number, yOff: number, name?: string): ArenaCollider {
  return crt(x, z, w, d, 16, yOff, name);
}

/** * 沿 X 轴的平滑楼梯/斜坡生成器 (例如 A小道、B洞)
 */
function stairsX(startX: number, z: number, w: number, d: number, startH: number, endH: number, steps: number, name?: string): ArenaCollider[] {
  const arr: ArenaCollider[] = [];
  const stepW = w / steps;
  const stepH = (endH - startH) / steps;
  for (let i = 0; i < steps; i++) {
    const currentX = startX + (stepW * i) + (stepW / 2);
    const currentH = startH + (stepH * (i + 1));
    arr.push(crt(currentX, z, stepW, d, currentH, 0, `${name}-step-${i}`));
  }
  return arr;
}

/** * 沿 Z 轴的平滑楼梯/斜坡生成器 (例如 警家去A平台的斜坡)
 */
function stairsZ(x: number, startZ: number, w: number, d: number, startH: number, endH: number, steps: number, name?: string): ArenaCollider[] {
  const arr: ArenaCollider[] = [];
  const stepD = d / steps;
  const stepH = (endH - startH) / steps;
  for (let i = 0; i < steps; i++) {
    const currentZ = startZ + (stepD * i) + (stepD / 2);
    const currentH = startH + (stepH * (i + 1));
    arr.push(crt(x, currentZ, w, stepD, currentH, 0, `${name}-step-${i}`));
  }
  return arr;
}

// ═══════════════════════════════════════════════════════════════
// DUST2 物理碰撞矩阵重制版 (保证路径绝对连通)
// ═══════════════════════════════════════════════════════════════

export const DUST2_COLLIDERS: ArenaCollider[] = [
  // ── 1. 外围空气墙 (Boundaries) ──
  crt(-3350, 1500, 500, 10000, 1000, 0, 'west-boundary'),
  crt(3350, 1500, 500, 10000, 1000, 0, 'east-boundary'),
  crt(0, -3750, 8000, 500, 1000, 0, 'north-boundary'),
  crt(0, 6750, 8000, 500, 1000, 0, 'south-boundary'),

  // ── 2. 核心建筑实体 (定义无法通行的建筑区块，留出路就是连贯的图) ──
  // A Long 与 Mid 之间的南部巨大建筑 (T家到中门)
  crt(-1350, 4250, 2300, 4500, 500, 0, 'a-long-mid-south-block'),
  
  // A Long 与 A小道(Catwalk) 之间的北部建筑
  crt(-2000, 1000, 1000, 2000, 500, 0, 'a-long-catwalk-north-block'),
  
  // Mid 与 A小道(Catwalk) 之间的建筑
  crt(-650, 900, 900, 1800, 500, 0, 'mid-catwalk-north-block'),

  // Mid 与 B洞(B Tunnels) 之间的南部建筑
  crt(1450, 4450, 2500, 4100, 500, 0, 'mid-btunnels-south-block'),
  
  // Mid 与 B洞 之间的中部建筑 (隔开下层B洞与B区)
  crt(1450, 1000, 2500, 2000, 500, 0, 'mid-btunnels-mid-block'),

  // A Site 后方与 CT Spawn 之间的建筑
  crt(-2550, -2500, 1100, 2000, 500, 0, 'asite-ct-divider'),
  
  // CT Mid (警家) 与 A Site 之间的建筑 (靠着A斜坡)
  crt(-1000, -1250, 1000, 2500, 500, 0, 'ctmid-asite-divider'),

  // CT Mid (警家) 与 B Site 之间的墙体 (这里有 B门 和 B窗口)
  crt(1000, -1850, 1000, 1300, 500, 0, 'ctmid-bsite-north-wall'), // 窗口北边
  crt(1000, -950, 1000, 100, 500, 0, 'ctmid-bsite-mid-wall'),     // 窗口与B门之间
  crt(1000, -350, 1000, 700, 500, 0, 'ctmid-bsite-south-wall'),   // B门南边
  crt(1000, -1200, 1000, 200, 64, 0, 'b-window-crouch-wall'),     // B窗口可以蹲下的矮墙！

  // B Site 后方与 CT Spawn 之间的建筑
  crt(2300, -2500, 1600, 2000, 500, 0, 'bsite-ct-divider'),

  // ── 3. 门洞与隧道封顶 (Ceilings) ──
  ceil(-2700, 2000, 200, 200, 128, 'a-long-doors-roof'),     // A门顶
  ceil(0, 2000, 200, 200, 128, 'mid-doors-roof'),            // 中门顶
  ceil(1000, -800, 1000, 200, 128, 'b-doors-roof'),          // B门顶
  ceil(1000, -1200, 1000, 200, 128, 'b-window-roof'),        // B窗顶
  ceil(2900, 1000, 400, 2000, 256, 'upper-tunnels-roof'),    // B二层洞顶
  ceil(1450, 2200, 2500, 400, 200, 'lower-tunnels-roof'),    // B一层洞顶

  // ── 4. 平台与真实斜坡/楼梯 (Platforms & Smooth Ramps) ──
  // A Site (A包点大平台)
  crt(-2000, -750, 1000, 1500, 96, 0, 'a-site-platform'),
  
  // ✅ 警家去A的斜坡 (CT to A Ramp) - 采用 16 级细腻阶梯模拟平滑斜坡，不卡脚
  ...stairsZ(-1750, -2500, 500, 1000, 0, 96, 16, 'a-ramp'),

  // Catwalk (A小道长廊)
  crt(-1300, 1000, 400, 2000, 96, 0, 'catwalk-platform'),
  
  // ✅ 中路 Xbox 上 A小道的楼梯
  ...stairsX(-1100, 1900, 900, 200, 96, 0, 12, 'catwalk-stairs'),

  // B Site (B包点大平台)
  crt(2000, -750, 1000, 1500, 64, 0, 'b-site-platform'),
  
  // Upper Tunnels (B洞二层平台)
  crt(2900, 1000, 400, 2000, 128, 0, 'upper-tunnels-platform'),
  
  // ✅ B洞一层上二层的旋转楼梯
  ...stairsX(2300, 2200, 400, 400, 0, 128, 16, 'b-tunnel-stairs'),
  
  // ✅ B洞二层出B区的下坡/台阶
  ...stairsZ(2900, -200, 400, 200, 64, 128, 8, 'b-tunnel-exit-stairs'),

  // ── 5. 经典掩体与箱子 (Covers & Crates) ──
  // T Spawn (T家后置箱子)
  crt(0, 6400, 100, 100, 64, 0, 't-spawn-box'),
  
  // Mid / Suicide (中路)
  crt(0, 1900, 150, 150, 96, 0, 'xbox'),                      // 经典 Xbox 掩体
  crt(-150, 2800, 80, 80, 64, 0, 'suicide-box'),
  
  // A Long (A大道)
  crt(-2600, 1500, 128, 128, 96, 0, 'long-blue-box'),         // A门外大蓝箱
  crt(-2800, 200, 100, 100, 64, 0, 'pit-box'),                // 大坑掩体
  
  // A Site (包点上方的掩体，yOff 提升至平台高度)
  crt(-2400, -1400, 100, 100, 96, 96, 'goose-box'),           // 鹅角 (Goose)
  crt(-1700, -200, 100, 100, 64, 96, 'ninja-box'),            // 忍者位 (Ninja)
  crt(-2100, -750, 128, 128, 64, 96, 'a-default-boxes'),      // A包点常规箱子
  
  // Lower Tunnels (B洞一层)
  crt(1000, 2200, 100, 100, 64, 0, 'lower-tunnel-box'),
  
  // Upper Tunnels (B洞二层箱子)
  crt(2900, 1800, 80, 80, 64, 128, 'upper-tunnel-box'),
  
  // B Site (B包点掩体)
  crt(1700, -200, 150, 80, 64, 64, 'b-car'),                  // B车 (Car)
  crt(2000, -1000, 100, 100, 64, 64, 'b-default-box'),        // B区默认下包箱子
  crt(2200, -1200, 128, 128, 128, 64, 'b-big-box'),           // B死角大箱子
  crt(2300, -1300, 400, 400, 32, 64, 'b-back-plat'),          // B后排高台 (Back plat)
  
  // CT Spawn (警家箱子)
  crt(0, -2800, 128, 128, 64, 0, 'ct-box'),

  // ── 6. 细节碰撞：A Pit 坑区、Palace 内部、B洞岔路 ──
  // ✅ A Pit — A大道旁的下沉坑区（玩家可以跳进去的区域）
  crt(-2900, 450, 64, 600, 64, 0, 'a-pit-north-wall'),    // 北墙
  crt(-2700, 450, 64, 600, 64, 0, 'a-pit-south-wall'),    // 南墙
  crt(-2800, 150, 400, 64, 64, 0, 'a-pit-west-wall'),      // 西墙（靠近A门）
  // A Pit 内部阶梯 — 3级缓坡方便爬出
  ...stairsZ(-2800, 350, 200, 200, 0, 64, 3, 'a-pit-stairs'),

  // ✅ Palace — A点旁的宫殿建筑内部（A Long 与 Catwalk 之间）
  crt(-1950, 600, 64, 400, 300, 0, 'palace-west-wall'),     // 西墙
  crt(-1700, 600, 64, 400, 300, 0, 'palace-east-wall'),     // 东墙
  crt(-1825, 400, 300, 64, 300, 0, 'palace-south-wall'),    // 南墙（靠A大道侧）
  crt(-1825, 850, 300, 64, 300, 0, 'palace-north-wall'),    // 北墙（靠Catwalk侧）
  // Palace 内部柱子（绕柱对枪经典场景）
  crt(-1920, 500, 48, 48, 256, 0, 'palace-pillar-nw'),
  crt(-1720, 500, 48, 48, 256, 0, 'palace-pillar-ne'),
  crt(-1920, 720, 48, 48, 256, 0, 'palace-pillar-sw'),
  crt(-1720, 720, 48, 48, 256, 0, 'palace-pillar-se'),
  // Palace 窗户掩体（靠A大道一侧可透过窗户射击）
  crt(-1830, 390, 160, 20, 120, 64, 'palace-window-south'),
  // Palace 天花板
  ceil(-1825, 625, 400, 500, 300, 'palace-ceiling'),

  // ✅ B洞下层岔路（Lower B Tunnels fork）— 去B区 vs 去CT中路
  crt(1200, 1800, 64, 400, 200, 0, 'b-tunnel-fork-wall'),   // 分叉墙
  crt(1050, 2000, 64, 32, 220, 0, 'b-tunnel-fork-door-left'), // 左侧门框
  crt(1350, 2000, 64, 32, 220, 0, 'b-tunnel-fork-door-right'), // 右侧门框
  ceil(1200, 1800, 400, 200, 200, 'b-tunnel-fork-ceiling'),   // 岔路天花板

  // B洞下层去楼梯的小走廊（Lower B → stairs junction）
  crt(1450, 2800, 64, 400, 200, 0, 'b-lower-to-stairs-wall'),
  ceil(1450, 2800, 400, 200, 200, 'b-lower-to-stairs-ceiling'),
];

// ═══════════════════════════════════════════════════════════════
// 地面材质、包点及出生点保持原有 Hammer 映射，不影响游戏主逻辑
// ═══════════════════════════════════════════════════════════════

export const DUST2_MATERIAL_ZONES: Array<{
  name: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}> = HAMMER_MATERIAL_ZONES.map(zone => ({
  name: zone.name,
  minX: hammerToGame(zone.minX),
  maxX: hammerToGame(zone.maxX),
  minZ: hammerToGame(zone.minZ),
  maxZ: hammerToGame(zone.maxZ),
}));

export const DUST2_BOMB_SITES = {
  A: {
    position: {
      x: hammerToGame(HAMMER_BOMB_SITES.A.position.x),
      y: hammerToGame(HAMMER_BOMB_SITES.A.position.y),
      z: hammerToGame(-HAMMER_BOMB_SITES.A.position.z)
    },
    radius: hammerToGame(HAMMER_BOMB_SITES.A.radius)
  },
  B: {
    position: {
      x: hammerToGame(HAMMER_BOMB_SITES.B.position.x),
      y: hammerToGame(HAMMER_BOMB_SITES.B.position.y),
      z: hammerToGame(-HAMMER_BOMB_SITES.B.position.z)
    },
    radius: hammerToGame(HAMMER_BOMB_SITES.B.radius)
  }
};

export const DUST2_SPAWNS = {
  attackers: HAMMER_SPAWNS.attackers.map(spawn => ({
    x: hammerToGame(spawn.x),
    y: PLAYER_EYE_HEIGHT,
    z: hammerToGame(-spawn.z)
  })),
  defenders: HAMMER_SPAWNS.defenders.map(spawn => ({
    x: hammerToGame(spawn.x),
    y: PLAYER_EYE_HEIGHT,
    z: hammerToGame(-spawn.z)
  }))
};

export const DUST2_TDM_SPAWNS = HAMMER_SPAWNS.tdm.map(spawn => ({
  x: hammerToGame(spawn.x),
  y: PLAYER_EYE_HEIGHT,
  z: hammerToGame(-spawn.z)
}));

export const DUST2_CALLOUTS = HAMMER_CALLOUTS.map(callout => ({
  name: callout.name,
  position: {
    x: hammerToGame(callout.position.x),
    y: hammerToGame(callout.position.y),
    z: hammerToGame(-callout.position.z)
  },
  radius: hammerToGame(callout.radius)
}));