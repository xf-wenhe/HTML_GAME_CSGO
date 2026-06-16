/**
 * CS1.6 Inferno map reconstruction.
 *
 * Coordinate system:
 * - X: left/right
 * - Y: height in game units
 * - Z: depth, positive toward defenders/CT side
 *
 * Scale: 1 Hammer unit = 0.01 game unit
 */

import {
  hammerToGame,
  WALL_HEIGHT_HAMMER,
  BOUNDARY_WALL_HEIGHT_HAMMER,
  PLATFORM_HEIGHT_HAMMER,
  STANDARD_BOX_HEIGHT_HAMMER,
  TALL_BOX_HEIGHT_HAMMER,
  WALL_THICKNESS_HAMMER,
  PLAYER_EYE_HEIGHT,
  STEP_HEIGHT_HAMMER,
  STEP_DEPTH_HAMMER,
} from './constants/MapUnits.js';
import {
  MapCollider,
  wall,
  box,
  plat,
  stairsZ,
  stairsX,
  stairsL,
} from './MapGeometryUtils.js';

// 类型别名，保持向后兼容
export type InfernoCollider = MapCollider;

const INFERNO_WIDTH = 7168;
const INFERNO_DEPTH = 8192;

export const INFERNO_COLLIDERS: InfernoCollider[] = [
  // ── 边界墙 ─────────────────────────────────────────────────────────
  wall(0, 4096, INFERNO_WIDTH, WALL_THICKNESS_HAMMER, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'inferno-boundary-south'),
  wall(0, -4096, INFERNO_WIDTH, WALL_THICKNESS_HAMMER, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'inferno-boundary-north'),
  wall(-3584, 0, WALL_THICKNESS_HAMMER, INFERNO_DEPTH, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'inferno-boundary-west'),
  wall(3584, 0, WALL_THICKNESS_HAMMER, INFERNO_DEPTH, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'inferno-boundary-east'),

  // ── 地面碰撞体（关键修复：确保各区域有正确高度的地面）──
  // 重要提示：plat(x, z, width, depth, height, yOffset, name)
  // 注意：plat 内部会对 z 做 hammerToGame(-z) 转换，所以传入的 z 需要取反
  //
  // T Spawn 出生点游戏坐标: x=-15.44~-17.44, z=-2.64~-7.20
  // → Hammer: x=-1544~-1744, z=264~720 (因为会被取反)
  // T Spawn 地面: y = -16 HU = -0.16 游戏单位
  plat(-1664, 512, 1024, 1024, 16, -16, 'inferno-t-spawn-ground'),

  // CT Spawn 出生点游戏坐标: x=23.04~24.00, z=-19.04~-24.64
  // → Hammer: x=2304~2400, z=1904~2464 (因为会被取反)
  // CT Spawn 地面: y = 128 HU = 1.28 游戏单位
  plat(2368, 2304, 1024, 1536, 16, 128, 'inferno-ct-spawn-ground'),

  // Mid 区域游戏坐标: x=-10~10, z=-10~10
  // → Hammer: x=-1000~1000, z=-1000~1000
  // Mid 区域地面: y = 128 HU = 1.28 游戏单位
  plat(0, 0, 2048, 2048, 16, 128, 'inferno-mid-ground'),

  // Banana 通道游戏坐标: x=-28左右, z=-20~20
  // → Hammer: x=-2800左右, z=-2000~2000
  // Banana 通道地面: y = 0 HU = 0 游戏单位
  plat(-2816, 0, 1024, 4096, 16, 0, 'inferno-banana-ground'),

  // A Long 通道: y = 0 HU = 0 游戏单位
  plat(-3200, 0, 768, 2048, 16, 0, 'inferno-a-long-ground'),

  // B Short 通道游戏坐标: x=25.60, z=10.24 → Hammer: x=2560, z=-1024
  // B Short 通道: y = 128 HU = 1.28 游戏单位
  plat(2560, -1024, 1024, 2048, 16, 128, 'inferno-b-short-ground'),

  // A Site 区域游戏坐标: x=-20左右, z=-15左右 → 炸弹点位置: x=-20.48, z=-15.36
  // → Hammer: x=-2048左右, z=1536左右 (因为 z 会被取反)
  // A Site 地面 (平台基础): y = 0 HU = 0 游戏单位
  plat(-2048, 1536, 1536, 1536, 16, 0, 'inferno-a-site-ground'),

  // B Site 区域游戏坐标: x=16左右, z=-10左右 → 炸弹点位置: x=16.64, z=-10.24
  // → Hammer: x=1664左右, z=1024左右 (因为 z 会被取反)
  // B Site 地面 (平台基础): y = 128 HU = 1.28 游戏单位
  plat(1664, 1024, 1536, 1536, 16, 128, 'inferno-b-site-ground'),

  // Apartments 下层地面: y = 128 HU = 1.28 游戏单位
  plat(-1280, 1280, 1024, 2560, 16, 128, 'inferno-apartments-lower-ground'),

  // ── T Spawn 区域 ─────────────────────────────────────────────────────────
  wall(-512, 3072, WALL_THICKNESS_HAMMER, 1536, WALL_HEIGHT_HAMMER, 0, 'inferno-t-spawn-wall-left'),
  wall(512, 3072, WALL_THICKNESS_HAMMER, 1536, WALL_HEIGHT_HAMMER, 0, 'inferno-t-spawn-wall-right'),

  wall(-2560, 2048, WALL_THICKNESS_HAMMER, 4096, WALL_HEIGHT_HAMMER, 0, 'inferno-banana-wall-east'),
  wall(-3072, 2048, WALL_THICKNESS_HAMMER, 4096, WALL_HEIGHT_HAMMER, 0, 'inferno-banana-wall-west'),

  wall(-1024, 2048, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, 0, 'inferno-apartments-wall-east'),
  wall(-1536, 2048, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, 0, 'inferno-apartments-wall-west'),

  wall(-512, -3840, 2048, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'inferno-ct-spawn-wall-back'),
  wall(-768, -2560, WALL_THICKNESS_HAMMER, 2560, WALL_HEIGHT_HAMMER, 0, 'inferno-ct-spawn-wall-left'),
  wall(512, -3072, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, 0, 'inferno-ct-spawn-wall-right'),

  wall(-1536, -3072, 3072, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'inferno-a-site-wall-back'),
  wall(-3072, -1536, WALL_THICKNESS_HAMMER, 3072, WALL_HEIGHT_HAMMER, 0, 'inferno-a-site-wall-west'),
  wall(0, -1536, WALL_THICKNESS_HAMMER, 3072, WALL_HEIGHT_HAMMER, 0, 'inferno-a-site-wall-east'),

  wall(1536, -3072, 3072, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'inferno-b-site-wall-back'),
  wall(3072, -1536, WALL_THICKNESS_HAMMER, 3072, WALL_HEIGHT_HAMMER, 0, 'inferno-b-site-wall-east'),
  wall(0, -1536, WALL_THICKNESS_HAMMER, 3072, WALL_HEIGHT_HAMMER, 0, 'inferno-b-site-wall-west'),

  wall(0, 0, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, 0, 'inferno-mid-wall-center'),

  plat(-1536, -2048, 1536, 1024, PLATFORM_HEIGHT_HAMMER, 0, 'inferno-a-site-platform'),
  plat(1536, -2048, 1536, 1024, PLATFORM_HEIGHT_HAMMER, 0, 'inferno-b-site-platform'),
  plat(-1536, -512, 2048, 1536, 192, 0, 'inferno-apartments-upper-floor'),

  box(-2048, -2304, 96, 96, 128, PLATFORM_HEIGHT_HAMMER, 'inferno-a-site-car'),
  box(-1024, -2304, 64, 48, 96, PLATFORM_HEIGHT_HAMMER, 'inferno-a-site-box'),
  box(-2816, -2048, 96, 96, 48, 0, 'inferno-a-site-sandbag'),
  box(-2816, 1024, 96, 64, 96, 0, 'inferno-banana-box-large'),
  box(-2816, 256, 64, 64, 48, 0, 'inferno-banana-sandbag'),
  box(-2688, -512, 48, 48, 48, 0, 'inferno-banana-box-small'),
  box(2048, -2304, 128, 96, 96, PLATFORM_HEIGHT_HAMMER, 'inferno-b-site-box-large'),
  box(1024, -2304, 64, 64, 48, PLATFORM_HEIGHT_HAMMER, 'inferno-b-site-box-small'),
  box(2816, -2048, 96, 64, 96, 0, 'inferno-b-site-ground-box'),
  box(0, -256, 64, 64, 48, 0, 'inferno-mid-box'),

  wall(-1024, -1024, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, 0, 'inferno-a-closed-room-wall-east'),
  wall(-2048, -1024, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, 0, 'inferno-a-closed-room-wall-west'),
  wall(-1536, -2048, 2048, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'inferno-a-closed-room-back'),

  wall(-768, -512, WALL_THICKNESS_HAMMER, 1024, WALL_HEIGHT_HAMMER, 0, 'inferno-ct-mid-wall-left'),
  wall(256, -512, WALL_THICKNESS_HAMMER, 1024, WALL_HEIGHT_HAMMER, 0, 'inferno-ct-mid-wall-right'),

  wall(-3584, 1024, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, 0, 'inferno-long-west-wall'),
  wall(-2816, 1024, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, 0, 'inferno-long-east-wall'),
  wall(-3072, 0, WALL_THICKNESS_HAMMER, 1024, WALL_HEIGHT_HAMMER, 0, 'inferno-long-north-wall'),

  wall(2304, 1024, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, 0, 'inferno-short-west-wall'),
  wall(3072, 1024, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, 0, 'inferno-short-east-wall'),
  wall(2688, 0, WALL_THICKNESS_HAMMER, 1024, WALL_HEIGHT_HAMMER, 0, 'inferno-short-north-wall'),

  ...stairsZ(-3072, 1280, 320, 512, 0, 128, 8, 'inferno-a-ramp'),
  ...stairsZ(2688, 1280, 320, 512, 0, 128, 8, 'inferno-b-ramp'),
  ...stairsZ(0, 1024, 256, 768, 0, 64, 6, 'inferno-mid-ramp-t'),
  ...stairsZ(-2816, 1792, 256, 256, 0, 64, 4, 'inferno-banana-entry-ramp'),
  ...stairsX(-3328, -512, 320, 320, 0, 48, 4, 'inferno-apartments-entry-stairs'),
  ...stairsL('inferno-t-upper-stairs', -384, 1408, 256, 256, 96, 64, -768, 1088),
  ...stairsL('inferno-ct-upper-stairs', 128, 1408, 256, 256, 96, 64, 512, 1088),

  box(-192, 2304, 320, 320, 64, 128, 'inferno-t-upper-platform'),
  box(192, 2304, 320, 320, 64, 128, 'inferno-ct-upper-platform'),
  box(0, 1408, 1024, 320, 16, 64, 'inferno-mid-upper-platform'),

  box(-3328, 1024, 64, 64, 64, 0, 'inferno-a-long-crate-1'),
  box(-3072, 1152, 64, 64, 64, 0, 'inferno-a-long-crate-2'),
  box(3072, 1024, 64, 64, 64, 0, 'inferno-b-long-crate-1'),
  box(3328, 1152, 64, 64, 64, 0, 'inferno-b-long-crate-2'),
  box(-512, 384, 64, 64, 64, 0, 'inferno-mid-left-crate'),
  box(512, 384, 64, 64, 64, 0, 'inferno-mid-right-crate'),
];

// CS1.6 de_inferno 真实出生点坐标（BSP 导入数据）
// T 出生点地面高度：y = -0.16，眼睛高度 = -0.16 + 0.64 = 0.48
// CT 出生点地面高度：y = 1.28，眼睛高度 = 1.28 + 0.64 = 1.92
export const INFERNO_SPAWNS = {
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
};

export const INFERNO_TDM_SPAWNS = [
  { x: -15.44, y: 0.48, z: -2.64 },
  { x: -16.56, y: 0.48, z: -5.12 },
  { x: 24.00, y: 1.92, z: -22.08 },
  { x: 23.04, y: 1.92, z: -20.16 },
  { x: -12.80, y: 1.28, z: -12.80 },
  { x: 12.80, y: 1.28, z: -12.80 },
  { x: 0, y: 1.28, z: 0 },
  { x: -6.40, y: 1.28, z: 6.40 },
];

// 基于 CS1.6 de_inferno 实际位置
export const INFERNO_BOMB_SITES = {
  A: {
    position: { x: -20.48, y: 0.64, z: -15.36 },
    radius: 5.12,
  },
  B: {
    position: { x: 16.64, y: 1.28, z: -10.24 },
    radius: 5.12,
  },
};

export const INFERNO_CALLOUTS = [
  { name: 'A Site', position: { x: -20.48, y: 0.64 + 0.64, z: -15.36 }, radius: 6.40 },
  { name: 'B Site', position: { x: 16.64, y: 1.28 + 0.64, z: -10.24 }, radius: 6.40 },
  { name: 'Mid', position: { x: 0, y: 1.28 + 0.64, z: 0 }, radius: 6.40 },
  { name: 'Banana', position: { x: -28.16, y: 0.64, z: -10.24 }, radius: 6.40 },
  { name: 'Apartments', position: { x: -12.80, y: 1.92, z: -5.12 }, radius: 5.12 },
  { name: 'T Spawn', position: { x: -15.44, y: 0.48, z: -2.64 }, radius: 5.12 },
  { name: 'CT Spawn', position: { x: 24.00, y: 1.92, z: -22.08 }, radius: 5.12 },
  { name: 'A Long', position: { x: -30.72, y: 0.64, z: 10.24 }, radius: 6.40 },
  { name: 'B Short', position: { x: 25.60, y: 1.28, z: 10.24 }, radius: 6.40 },
];
