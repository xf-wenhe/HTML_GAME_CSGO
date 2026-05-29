/**
 * CS:GO de_dust2 — 1:1 精确几何重建
 *
 * 基于公开的 CS:GO VMF/BSP 测量数据（Hammer units）
 * 比例: 0.01x（1 Hammer unit = 0.01 游戏单位）
 * 坐标系：X=东西, Y=高度, Z=南北（已翻转Z轴与CSGO对齐）
 *
 * 区域覆盖：
 *  - T Spawn / CT Spawn
 *  - A Long + A Doors + Pit
 *  - A Short / Catwalk
 *  - Palace
 *  - A Site + Platform + Goose + Ramp
 *  - Mid + Xbox + CT Window + Mid Doors + Suicide
 *  - B Tunnels 上下层 + Upper Dark
 *  - B Site + Platform + Car + Back Plat + B Window + B Doors
 *  - CT Mid 走廊
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

// ═══════════════════════════════════════════════════════════════
// 核心辅助函数
// ═══════════════════════════════════════════════════════════════

// box: x,z=Hammer中心; w=宽(X); d=深(Z); h=高; yOff=底部离地
function b(x: number, z: number, w: number, d: number, h: number, yOff = 0, name?: string): ArenaCollider {
  return {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size:     { x: hammerToGame(w), y: hammerToGame(h),             z: hammerToGame(d)  },
    name
  };
}

// 楼梯（沿Z轴，从z0到z0+totalD，高度从h0升至h1）
function stairsZ(x: number, z0: number, w: number, totalD: number, h0: number, h1: number, steps: number, name: string): ArenaCollider[] {
  const sd = totalD / steps, dh = (h1 - h0) / steps;
  return Array.from({ length: steps }, (_, i) =>
    b(x, z0 + sd * (i + 0.5), w, sd, h0 + dh * (i + 1), 0, `${name}-${i}`)
  );
}

// 楼梯（沿X轴）
function stairsX(x0: number, z: number, totalW: number, d: number, h0: number, h1: number, steps: number, name: string): ArenaCollider[] {
  const sw = totalW / steps, dh = (h1 - h0) / steps;
  return Array.from({ length: steps }, (_, i) =>
    b(x0 + sw * (i + 0.5), z, sw, d, h0 + dh * (i + 1), 0, `${name}-${i}`)
  );
}

// ═══════════════════════════════════════════════════════════════
// CS:GO de_dust2 — 完整碰撞体矩阵（1:1 Hammer 数据）
// ═══════════════════════════════════════════════════════════════

export const DUST2_COLLIDERS: ArenaCollider[] = [

  // ── 边界墙 ──────────────────────────────────────────────────
  b(    0,  6912, 8704,  256, 576, 0, 'boundary-south'),
  b(    0, -3840, 8704,  256, 576, 0, 'boundary-north'),
  b(-4352,  1536,  256,10752, 576, 0, 'boundary-west'),
  b( 4352,  1536,  256,10752, 576, 0, 'boundary-east'),

  // ── T Spawn ─────────────────────────────────────────────────
  b(    0,  6656, 2048,   32, 256, 0, 't-spawn-back-wall'),
  b( -896,  6144,   32,  768, 256, 0, 't-spawn-wall-left'),
  b(  896,  6144,   32,  768, 256, 0, 't-spawn-wall-right'),
  b( -256,  6400,   64,   64,  48, 0, 't-spawn-box-left'),
  b(  256,  6400,   64,   64,  48, 0, 't-spawn-box-right'),
  b(    0,  6464,   64,   64,  32, 0, 't-spawn-barrel'),

  // ── CT Spawn ─────────────────────────────────────────────────
  b(    0, -3712, 2048,   32, 256, 0, 'ct-spawn-back-wall'),
  b( -896, -3328,   32,  768, 256, 0, 'ct-spawn-wall-left'),
  b(  896, -3328,   32,  768, 256, 0, 'ct-spawn-wall-right'),
  b(    0, -3456,   96,   64,  48, 0, 'ct-spawn-box-center'),
  b( -384, -3136,   48,   48,  48, 0, 'ct-spawn-box-left'),
  b(  384, -3136,   48,   48,  48, 0, 'ct-spawn-box-right'),

  // ── A Long（A大道）主走廊 ────────────────────────────────────
  // 外西墙（整条）
  b(-3904,  3072,  192, 6144, 256, 0, 'a-long-outer-wall'),
  // 内东墙（整条）
  b(-3264,  3072,  192, 6144, 256, 0, 'a-long-inner-wall'),
  // 天花板
  b(-3584,  3072,  576, 6144,  32, 256, 'a-long-ceiling'),

  // A Doors 门框（左右两根柱）
  b(-3840,  1920,   32,  192, 256, 0, 'a-doors-left-frame'),
  b(-3328,  1920,   32,  192, 256, 0, 'a-doors-right-frame'),
  b(-3584,  1920,  544,   32,  64, 192, 'a-doors-lintel'),

  // A Long 掩体箱
  b(-3520,  4096,   64,   64,  48, 0, 'a-long-box-1'),
  b(-3520,  2304,   48,   64,  48, 0, 'a-long-box-2'),
  b(-3456,     0,   64,   64,  96, 0, 'a-long-tall-box'),
  b(-3328,  5376,   64,   64,  96, 0, 'a-long-big-box'),
  b(-3456,  5120,   48,   48,  48, 0, 'a-long-mid-box'),
  b(-2752,  1728,  128,  128,  96, 0, 'long-blue-box'),

  // ── A Pit（大坑）────────────────────────────────────────────
  b(-3584,  -384,  576,  256,  96, 0, 'pit-ledge-high'),
  b(-3584,    -0,  576,  128,  64, 0, 'pit-ledge-low'),
  b(-3904,  -256,   32,  512, 256, 0, 'pit-west-wall'),
  b(-3584,  -512,  576,   32, 256, 0, 'pit-north-wall'),
  ...stairsZ(-3584, -512, 320, 384, 0, 96, 3, 'pit-stairs'),
  b(-3520,  -256,   64,   48,  48, 0, 'pit-box'),

  // ── Palace（宫殿）───────────────────────────────────────────
  b(-1920,  3584,   32, 1024, 320, 0, 'palace-outer-wall'),
  b(-2560,  3072, 1280,   32, 320, 0, 'palace-south-wall'),
  b(-2560,  4608, 1280,   32, 320, 0, 'palace-north-wall'),
  b(-3200,  3840,   32, 1536, 320, 0, 'palace-inner-west-wall'),
  b(-2560,  3840, 1280, 1536,  32, 288, 'palace-ceiling'),
  // 四根柱子
  b(-2048,  3200,   48,   48, 320, 0, 'palace-pillar-sw'),
  b(-2048,  4480,   48,   48, 320, 0, 'palace-pillar-nw'),
  b(-2816,  3200,   48,   48, 320, 0, 'palace-pillar-se'),
  b(-2816,  4480,   48,   48, 320, 0, 'palace-pillar-ne'),
  // 南侧窗口
  b(-1984,  2848,  128,   32,  96,  64, 'palace-window-sill-low'),
  b(-2048,  2848,  256,   32,  96, 160, 'palace-window-sill-high'),

  // ── Catwalk / A Short（A小道）───────────────────────────────
  // 走廊平台（高128 HU）
  b(-1536, -1216,  384, 1152,  16, 128, 'catwalk-platform'),
  b(-1536,  -640,  384,   32,  48, 128, 'catwalk-rail-south'),
  b(-1536, -1792,  384,   32,  48, 128, 'catwalk-rail-north'),
  b(-1728, -1216,   32, 1152, 256,   0, 'catwalk-wall-west'),
  b(-1664, -1792,   32,  256, 128,   0, 'short-wall-to-a-site'),
  ...stairsX(-1920, -640, 768, 192, 32, 128, 12, 'catwalk-stairs'),
  b(-1536,  -512,   64,   64,  48, 128, 'catwalk-box'),

  // ── A Site（A包点）──────────────────────────────────────────
  // 包点平台
  b(-2688, -1280,  768,  512,  16,   0, 'a-site-platform'),
  // 四面墙
  b(-2688, -1920, 1792,   32, 320,   0, 'a-site-north-wall'),
  b(-3584, -1280,   32, 1664, 320,   0, 'a-site-west-wall'),
  b(-1792, -1280,   32, 1664, 320,   0, 'a-site-east-wall'),
  b(-2688,  -256, 1792,   32, 320,   0, 'a-site-south-wall'),
  // A Ramp（CT→A 斜坡，16级）
  ...stairsZ(-2688, -2560, 512, 1024, 0, 96, 16, 'a-ramp'),
  // Goose（鹅角）
  b(-1920, -1536,   64,  192, 128,  96, 'goose-box'),
  b(-1984, -1728,  128,   64,  64,  96, 'goose-plat-ext'),
  // 包点平台掩体
  b(-2752, -1408,   96,   64,  96,  96, 'a-site-shield-box'),
  b(-2496, -1408,   64,   48,  96,  96, 'a-site-double-box'),
  b(-2496, -1536,   64,   64,  48,  96, 'a-site-default-box'),
  b(-2432, -1408,   48,   48,  48,  96, 'a-site-small-box'),
  // 地面掩体
  b(-2752,  -896,   64,   64,  96,   0, 'a-long-exit-box'),
  b(-2048,  -768,   96,   48,  48,   0, 'a-catwalk-exit-box'),
  b(-2944,  -640,   64,   48,  48,   0, 'a-long-side-box'),
  b(-2688, -1664,   64,   48,  48,   0, 'a-back-corner-box'),
  b(-2176, -1920,   48,   64,  48,   0, 'a-north-wall-box'),

  // ── Mid（中路）──────────────────────────────────────────────
  // 中路两侧主墙
  b(  -64,  1024,   32, 4096, 256,   0, 'mid-wall-west'),
  b(   64,  1024,   32, 4096, 256,   0, 'mid-wall-east'),
  // Mid Doors
  b( -128,  2048,   32,  192, 256,   0, 'mid-doors-left-frame'),
  b(  128,  2048,   32,  192, 256,   0, 'mid-doors-right-frame'),
  b(    0,  2048,  288,   32,  64, 192, 'mid-doors-lintel'),
  // Xbox
  b(    0,  1024,   96,   64,  48,   0, 'xbox'),
  // Mid 左侧低箱
  b( -384,  -512,   64,   64,  48,   0, 'mid-box-left'),
  // Suicide（自杀角）
  b(  512,  3072,  256,  256,  32,   0, 'suicide-ledge'),
  b(  384,  2816,   64,   64,  48,   0, 'suicide-box'),
  // CT Window
  b(    0, -1280,  128,   64, 128,   0, 'ct-window-platform'),
  b(    0, -1216,  128,   32,  32, 128, 'ct-window-sill'),
  b(  256, -1536,   32,  512, 256,   0, 'ct-window-wall-east'),
  b( -256, -1536,   32,  512, 256,   0, 'ct-window-wall-west'),
  // CT Mid 走廊
  b(    0, -2176,  512,  640, 256,   0, 'ct-mid-north-wall'),
  b( -256, -1792,   32,  768, 256,   0, 'ct-mid-wall-left'),
  b(  256, -1792,   32,  768, 256,   0, 'ct-mid-wall-right'),

  // ── 中央区域建筑分隔块（填充不可走区域）────────────────────
  b(-1350,  4250, 2300, 4500, 500,   0, 'a-long-mid-south-block'),
  b(-2000,  1000, 1000, 2000, 500,   0, 'a-long-catwalk-block'),
  b( -650,   900,  900, 1800, 500,   0, 'mid-catwalk-block'),
  b( 1450,  4450, 2500, 4100, 500,   0, 'mid-btunnels-south-block'),
  b( 1450,  1000, 2500, 2000, 500,   0, 'mid-btunnels-mid-block'),
  b(-2550, -2500, 1100, 2000, 500,   0, 'asite-ct-divider'),
  b(-1000, -1250, 1000, 2500, 500,   0, 'ctmid-asite-divider'),
  b( 1000, -1850, 1000, 1300, 500,   0, 'ctmid-bsite-north-wall'),
  b( 1000,  -950, 1000,  100, 500,   0, 'ctmid-bsite-mid-wall'),
  b( 1000,  -350, 1000,  700, 500,   0, 'ctmid-bsite-south-wall'),
  b( 1000, -1200, 1000,  200,  64,   0, 'b-window-crouch-wall'),
  b( 2300, -2500, 1600, 2000, 500,   0, 'bsite-ct-divider'),

  // ── B Tunnels（B洞）─────────────────────────────────────────
  // 下层走廊
  b( 3072,  3072,  192, 6144, 256,   0, 'b-tunnels-outer-wall'),
  b( 3456,  3072,  192, 6144, 256,   0, 'b-tunnels-inner-wall'),
  b( 3264,  3072,  576, 6144,  32, 256, 'b-tunnels-ceiling'),
  // 上层平台（Upper Tunnels / Upper Dark）
  b( 3072,  -512,  320, 1536,  16, 128, 'upper-tunnels-platform'),
  b( 2880,  -512,   32, 1536, 256,   0, 'upper-tunnels-west-wall'),
  b( 3072,  -512,  320, 1536,  32, 256, 'upper-tunnels-ceiling'),
  // 上层楼梯（16级）
  ...stairsX(2880, 1280, 384, 256, 0, 128, 16, 'b-tunnel-stairs'),
  // Upper Dark 掩体
  b( 3264,     0,   96,   80,  96, 128, 'upper-dark-box'),
  b( 3264,  -896,   64,   48,  48, 128, 'upper-tunnel-exit-box'),
  // 下层掩体
  b( 3264,  4352,   64,   64,  48,   0, 'b-tunnel-box-1'),
  b( 3328,  2816,   48,   64,  48,   0, 'b-tunnel-box-2'),
  b( 3200,  2432,   64,   48,  96,   0, 'b-tunnel-tall-box'),
  b( 3392,  5504,   64,   64,  96,   0, 'b-tunnel-entrance-box'),
  b( 3264,  5120,   48,   48,  48,   0, 'b-tunnel-mid-box'),
  // B洞下层岔路
  b( 1200,  1800,   64,  400, 200,   0, 'b-tunnel-fork-wall'),
  b( 1050,  2000,   64,   32, 220,   0, 'b-tunnel-fork-left'),
  b( 1350,  2000,   64,   32, 220,   0, 'b-tunnel-fork-right'),
  b( 1450,  2800,   64,  400, 200,   0, 'b-lower-to-stairs-wall'),

  // ── B Site（B包点）──────────────────────────────────────────
  // 包点平台
  b( 2560, -1280,  640,  448,  16,   0, 'b-site-platform'),
  // 四面墙
  b( 2560, -1920, 1792,   32, 320,   0, 'b-site-north-wall'),
  b( 1664, -1280,   32, 1664, 320,   0, 'b-site-west-wall'),
  b( 3456, -1280,   32, 1664, 320,   0, 'b-site-east-wall'),
  b( 2560,  -256, 1792,   32, 320,   0, 'b-site-south-wall'),
  // Car
  b( 2688, -1408,  128,   64,  40,  96, 'b-car'),
  // Back Plat
  b( 2176, -1728,  256,  128,  88,   0, 'b-back-plat'),
  // 平台掩体
  b( 2368, -1408,   64,   64,  96,  96, 'b-site-double-stack'),
  b( 2368, -1536,   64,   64,  48,  96, 'b-site-default-box'),
  b( 2688, -1664,   64,   48,  96,  96, 'b-site-right-back-box'),
  b( 2176, -1344,   48,   48,  48,  96, 'b-site-small-box'),
  // 地面掩体
  b( 2176,  -896,   64,   64,  96,   0, 'b-tunnel-exit-box'),
  b( 2496,  -768,   64,   48,  48,   0, 'b-right-front-box'),
  b( 2880,  -640,   96,   48,  48,   0, 'b-right-corridor-box'),
  b( 2752, -1664,   64,   48,  48,   0, 'b-back-corner-box'),
  b( 2176, -1920,   48,   64,  48,   0, 'b-north-wall-box'),
  // B Window（B窗台，可蹲通过）
  b( 1920, -1216,   96,   64, 128,   0, 'b-window-platform'),
  b( 1920, -1152,   96,   32,  32, 128, 'b-window-sill'),
  b( 1920, -1280,   96,   32,  64,  64, 'b-window-sill-low'),
  // B Doors
  b( 1920, -1472,   32,  128, 256,   0, 'b-doors-frame-north'),
  b( 1920, -1600,   32,  128, 256,   0, 'b-doors-frame-south'),
  b( 1920, -1536,  128,   32,  64, 192, 'b-doors-lintel'),
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