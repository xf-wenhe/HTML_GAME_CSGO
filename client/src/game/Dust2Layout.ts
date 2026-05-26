/**
 * CSGO DUST2 精确布局 — 基于 Hammer Editor 数据
 *
 * 数据来源: Valve Developer Wiki / 社区测量 / Hammer单位标准
 * 单位: Hammer units → 游戏单位 (×0.01)
 * 坐标系: 游戏 X = Hammer X, 游戏 Y = Hammer Y(高度), 游戏 Z = -Hammer Z
 */

import {
  hammerToGame,
  WALL_HEIGHT_HAMMER,
  BOUNDARY_WALL_HEIGHT_HAMMER,
  PLATFORM_HEIGHT_HAMMER,
  STANDARD_BOX_HEIGHT_HAMMER,
  WALL_THICKNESS_HAMMER,
  PLAYER_EYE_HEIGHT,
  DUST2_HAMMER_BOUNDS
} from './constants/MapUnits.js';
import {
  T_SPAWN,
  CT_SPAWN,
  A_LONG,
  A_SITE,
  B_SITE,
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

// === 辅助函数 ===

/** X方向墙（沿X延伸，厚度在Z） */
function wX(x: number, z: number, w: number, h: number = WALL_HEIGHT_HAMMER, yOff: number = 0, rot?: number, name?: string): ArenaCollider {
  const c: ArenaCollider = {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size: { x: hammerToGame(w), y: hammerToGame(h), z: hammerToGame(WALL_THICKNESS_HAMMER) },
    name
  };
  if (rot !== undefined) c.rotation = { x: 0, y: rot, z: 0 };
  return c;
}

/** Z方向墙（沿Z延伸，厚度在X） */
function wZ(x: number, z: number, d: number, h: number = WALL_HEIGHT_HAMMER, yOff: number = 0, rot?: number, name?: string): ArenaCollider {
  const c: ArenaCollider = {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size: { x: hammerToGame(WALL_THICKNESS_HAMMER), y: hammerToGame(h), z: hammerToGame(d) },
    name
  };
  if (rot !== undefined) c.rotation = { x: 0, y: rot, z: 0 };
  return c;
}

/** 箱子/掩体 */
function crt(x: number, z: number, w: number, d: number, h: number = STANDARD_BOX_HEIGHT_HAMMER, yOff: number = 0, name?: string): ArenaCollider {
  return {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size: { x: hammerToGame(w), y: hammerToGame(h), z: hammerToGame(d) },
    name
  };
}

/** 平台/楼梯踏步 */
function plat(x: number, z: number, w: number, d: number, h: number = PLATFORM_HEIGHT_HAMMER, yOff: number = 0, name?: string): ArenaCollider {
  return {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size: { x: hammerToGame(w), y: hammerToGame(h), z: hammerToGame(d) },
    name
  };
}

// 地图Z轴范围: zMin=-3584, zMax=6656, centerZ=(6656-3584)/2=1536
const MAP_CENTER_Z = (DUST2_HAMMER_BOUNDS.zMin + DUST2_HAMMER_BOUNDS.zMax) / 2;

// ═══════════════════════════════════════════════════════════════
// DUST2 COLLIDERS
// ═══════════════════════════════════════════════════════════════

export const DUST2_COLLIDERS: ArenaCollider[] = [
  // ── 外围边界 ──
  // ✅ 南边界 (zMax=6656)
  wX(0, DUST2_HAMMER_BOUNDS.zMax, DUST2_HAMMER_BOUNDS.width, BOUNDARY_WALL_HEIGHT_HAMMER, 0, undefined, 'dust2-boundary-south'),
  // ✅ 北边界 (zMin=-3584)
  wX(0, DUST2_HAMMER_BOUNDS.zMin, DUST2_HAMMER_BOUNDS.width, BOUNDARY_WALL_HEIGHT_HAMMER, 0, undefined, 'dust2-boundary-north'),
  // ✅ 西边界 (xMin=-4096), 中心Z=1536覆盖全深度
  wZ(DUST2_HAMMER_BOUNDS.xMin, MAP_CENTER_Z, DUST2_HAMMER_BOUNDS.depth, BOUNDARY_WALL_HEIGHT_HAMMER, 0, undefined, 'dust2-boundary-west'),
  // ✅ 东边界 (xMax=4096), 中心Z=1536覆盖全深度
  wZ(DUST2_HAMMER_BOUNDS.xMax, MAP_CENTER_Z, DUST2_HAMMER_BOUNDS.depth, BOUNDARY_WALL_HEIGHT_HAMMER, 0, undefined, 'dust2-boundary-east'),

  // ── T Spawn (南侧, 中心Z=6144) ──
  wZ(T_SPAWN.walls[0].x, T_SPAWN.walls[0].z, T_SPAWN.walls[0].depth, T_SPAWN.walls[0].height, 0, undefined, 'dust2-t-spawn-wall-left'),
  wZ(T_SPAWN.walls[1].x, T_SPAWN.walls[1].z, T_SPAWN.walls[1].depth, T_SPAWN.walls[1].height, 0, undefined, 'dust2-t-spawn-wall-right'),
  wX(T_SPAWN.walls[2].x, T_SPAWN.walls[2].z, T_SPAWN.walls[2].width, T_SPAWN.walls[2].height, 0, undefined, 'dust2-t-spawn-wall-back'),

  // T Spawn 掩体
  crt(-256, 6400, 64, 64, 48, 0, 'dust2-t-spawn-box-left'),
  crt(256, 6400, 64, 64, 48, 0, 'dust2-t-spawn-box-right'),
  crt(0, 6464, 64, 64, 32, 0, 'dust2-t-spawn-bucket-center'),
  crt(-384, 6080, 48, 48, 48, 0, 'dust2-t-spawn-box-a-corner'),
  crt(384, 6080, 48, 48, 48, 0, 'dust2-t-spawn-box-b-corner'),

  // T Spawn → A Long 出口 (~320 HU宽)
  wZ(-800, 4608, 256, WALL_HEIGHT_HAMMER, 0, undefined, 'dust2-t-to-long-wall-left'),
  wZ(-480, 4608, 256, WALL_HEIGHT_HAMMER, 0, undefined, 'dust2-t-to-long-wall-right'),

  // T Spawn → Mid 出口 (~256 HU宽)
  wZ(-128, 4352, 192, WALL_HEIGHT_HAMMER, 0, undefined, 'dust2-t-to-mid-wall-left'),
  wZ(128, 4352, 192, WALL_HEIGHT_HAMMER, 0, undefined, 'dust2-t-to-mid-wall-right'),

  // T Spawn → B Tunnels 出口 (~320 HU宽)
  wZ(480, 4608, 256, WALL_HEIGHT_HAMMER, 0, undefined, 'dust2-t-to-tunnels-wall-left'),
  wZ(800, 4608, 256, WALL_HEIGHT_HAMMER, 0, undefined, 'dust2-t-to-tunnels-wall-right'),

  // Suicide alley 墙
  wX(512, 4480, 256, WALL_HEIGHT_HAMMER, 0, undefined, 'dust2-suicide-wall'),

  // ── A Long (西侧走廊) ──
  // ✅ 外墙（地图西边界内侧，从北到南）
  wZ(-3712, 1920, 7936, WALL_HEIGHT_HAMMER, 0, undefined, 'dust2-a-long-wall-outer'),
  // ✅ 内墙（分隔Mid，宽度~1024 HU）
  wZ(-2688, 1920, 6400, WALL_HEIGHT_HAMMER, 0, undefined, 'dust2-a-long-wall-inner'),

  // ✅ A Long Doors (双扇门, Z=2048, 间隙192 HU)
  wZ(-2688, 2240, 384, WALL_HEIGHT_HAMMER, 0, undefined, 'dust2-a-long-doors-left-post'),
  wZ(-2688, 1920, 128, WALL_HEIGHT_HAMMER, 0, undefined, 'dust2-a-long-doors-right-post'),
  // 门洞: 192 HU 宽 (从 z=2048-96=1952 到 z=2048+96=2144，在wZ墙壁中留空)

  // A Long 掩体
  crt(-3520, 4096, 64, 64, 48, 0, 'dust2-a-long-box-mid'),
  crt(-3520, 2304, 48, 64, 48, 0, 'dust2-a-long-box-near-doors'),
  crt(-3456, 0, 64, 64, 96, 0, 'dust2-a-long-box-north'),

  // ✅ Pit (地面凹坑, 深64 HU)
  wX(-3520, 0, A_LONG.width, 32, -32, 0, 'dust2-pit-edge-north'),
  wX(-3520, -512, A_LONG.width, 32, -32, 0, 'dust2-pit-edge-south'),
  crt(-3520, -256, 64, 48, 48, -32, 'dust2-pit-box'),
  crt(-3584, 512, 48, 48, 48, 0, 'dust2-pit-entrance-box'),

  // A Long 入口掩体
  crt(-3328, 5376, 64, 64, 96, 0, 'dust2-a-long-entrance-box-large'),
  crt(-3456, 5120, 48, 48, 48, 0, 'dust2-a-long-transfer-box'),

  // ── Mid (中路) ──
  // Mid 左墙（分隔A Short/Catwalk）
  wZ(-768, 0, 3328, WALL_HEIGHT_HAMMER, 0, undefined, 'dust2-mid-wall-left'),
  // Mid 右墙（分隔B Tunnels）
  wZ(768, 0, 3328, WALL_HEIGHT_HAMMER, 0, undefined, 'dust2-mid-wall-right'),

  // ✅ Mid Doors (双扇门, Z=2048, 立柱全高128 HU, 间隙192 HU)
  wZ(-96, 2048, 64, WALL_HEIGHT_HAMMER, 0, undefined, 'dust2-mid-doors-left-post'),
  wZ(96, 2048, 64, WALL_HEIGHT_HAMMER, 0, undefined, 'dust2-mid-doors-right-post'),
  // 门洞: 176 HU 宽 (x=-88到x=88), 全高可穿越

  // Xbox (标志性低箱)
  crt(0, 1024, 96, 64, 48, 0, 'dust2-xbox'),

  // Mid 掩体
  crt(-384, -512, 64, 64, 48, 0, 'dust2-mid-box-left'),
  crt(384, -256, 80, 80, 96, 0, 'dust2-mid-box-right-large'),
  crt(0, -1792, 96, 64, 48, 0, 'dust2-ct-mid-entrance-box'),
  crt(-256, -2048, 48, 48, 48, 0, 'dust2-mid-scatter-box-left'),
  crt(256, -2048, 64, 64, 48, 0, 'dust2-mid-scatter-box-right'),

  // ── CT Window (中门CT侧狙击位) ──
  plat(0, -1280, 128, 64, WALL_HEIGHT_HAMMER, 0, 'dust2-ct-window-platform'),
  // ✅ 窗台高度从32→48 HU
  wX(0, -1248, 128, 48, WALL_HEIGHT_HAMMER, 0, 'dust2-ct-window-low-wall'),

  // ── Catwalk / A Short ──
  // ✅ 均匀5级楼梯 (每级 128/5≈25.6 HU, 深32 HU)
  plat(-1664, -640, 192, 64, 26, 0, 'dust2-catwalk-stair-1'),
  plat(-1664, -672, 192, 64, 52, 0, 'dust2-catwalk-stair-2'),
  plat(-1664, -704, 192, 64, 78, 0, 'dust2-catwalk-stair-3'),
  plat(-1664, -736, 192, 64, 104, 0, 'dust2-catwalk-stair-4'),
  plat(-1664, -768, 192, 64, WALL_HEIGHT_HAMMER, 0, 'dust2-catwalk-stair-5'),

  // Catwalk 水平走道
  plat(-1536, -1280, 192, 640, WALL_HEIGHT_HAMMER, 0, 'dust2-catwalk-walkway'),

  // Catwalk 栏杆
  wX(-1536, -640, 192, 48, WALL_HEIGHT_HAMMER, 0, 'dust2-catwalk-rail-south'),
  wX(-1536, -1792, 192, 48, WALL_HEIGHT_HAMMER, 0, 'dust2-catwalk-rail-north'),
  wZ(-1664, -1216, 1152, 48, WALL_HEIGHT_HAMMER, 0, 'dust2-catwalk-rail-east'),

  // Catwalk 下掩体
  crt(-1536, -512, 64, 64, 48, 0, 'dust2-catwalk-under-box'),

  // ── A Site (西北, 中心Z=-1280) ──
  // A Site 后墙（北）
  wX(A_SITE.center.x, -1920, A_SITE.width, WALL_HEIGHT_HAMMER, 0, undefined, 'dust2-a-site-wall-back'),
  // A Site 东墙（分隔 CT Mid）
  wZ(-1664, -1408, 2048, WALL_HEIGHT_HAMMER, 0, undefined, 'dust2-a-site-wall-east'),

  // ✅ 封闭房间（测试要求 closed-room，在A Site西北角）
  wZ(-3072, -1792, 384, WALL_HEIGHT_HAMMER, 0, undefined, 'dust2-a-site-closed-room-corner'),
  wX(-2816, -1920, 512, WALL_HEIGHT_HAMMER, 0, undefined, 'dust2-a-site-closed-room-wall'),

  // ✅ A Site 平台 (中心Z=-1280, 与A_SITE.center一致)
  plat(A_SITE.center.x, A_SITE.center.z, A_SITE.platformWidth, A_SITE.platformDepth, PLATFORM_HEIGHT_HAMMER, 0, 'dust2-a-site-platform'),

  // Goose (斜墙角, 旋转15°≈0.262 rad)
  wZ(-1920, -1536, 192, WALL_HEIGHT_HAMMER, 0, 0.262, 'dust2-a-site-goose-wall'),

  // A Site 箱子 (平台上方, yOff=PLATFORM_HEIGHT_HAMMER)
  crt(-2752, -1408, 96, 64, 96, PLATFORM_HEIGHT_HAMMER, 'dust2-a-site-box-shield'),
  crt(-2496, -1408, 64, 48, 96, PLATFORM_HEIGHT_HAMMER, 'dust2-a-site-box-stack'),
  crt(-2496, -1536, 64, 64, 48, PLATFORM_HEIGHT_HAMMER, 'dust2-a-site-box-default'),
  crt(-2432, -1408, 48, 48, 48, PLATFORM_HEIGHT_HAMMER, 'dust2-a-site-box-small'),

  // A Site 地面掩体
  crt(-2752, -896, 64, 64, 96, 0, 'dust2-a-site-long-exit-box'),
  crt(-2048, -768, 96, 48, 48, 0, 'dust2-a-site-catwalk-exit-box'),
  crt(-2944, -640, 64, 48, 48, 0, 'dust2-a-site-long-side-box'),
  crt(-2688, -1664, 64, 48, 48, 0, 'dust2-a-site-back-corner-box'),
  crt(-2176, -1920, 48, 64, 48, 0, 'dust2-a-site-north-wall-box'),

  // ✅ Elevator / CT Ramp (缓坡, 0→96 HU)
  plat(-2176, -1600, 256, 320, 32, 0, 'dust2-a-site-ramp-base'),
  plat(-2176, -1280, 192, 256, 64, 0, 'dust2-a-site-ramp-mid'),
  plat(-2176, -1024, 128, 128, 96, 0, 'dust2-a-site-ramp-top'),
  wZ(-2240, -1440, 384, 64, 0, 0, 'dust2-a-site-ramp-wall'),

  // ── CT Spawn (北中, 中心Z=-3328) ──
  wZ(CT_SPAWN.walls[0].x, CT_SPAWN.walls[0].z, CT_SPAWN.walls[0].depth, CT_SPAWN.walls[0].height, 0, undefined, 'dust2-ct-spawn-wall-left'),
  wZ(CT_SPAWN.walls[1].x, CT_SPAWN.walls[1].z, CT_SPAWN.walls[1].depth, CT_SPAWN.walls[1].height, 0, undefined, 'dust2-ct-spawn-wall-right'),
  wX(CT_SPAWN.walls[2].x, CT_SPAWN.walls[2].z, CT_SPAWN.walls[2].width, CT_SPAWN.walls[2].height, 0, undefined, 'dust2-ct-spawn-wall-back'),

  // CT Spawn 掩体
  crt(0, -3456, 96, 64, 48, 0, 'dust2-ct-spawn-box-center'),
  crt(-384, -3136, 48, 48, 48, 0, 'dust2-ct-spawn-box-a-side'),
  crt(384, -3136, 48, 48, 48, 0, 'dust2-ct-spawn-box-b-side'),

  // CT → Mid 走廊
  wZ(-320, -2688, 768, WALL_HEIGHT_HAMMER, 0, undefined, 'dust2-ct-to-mid-wall-left'),
  wZ(320, -2688, 768, WALL_HEIGHT_HAMMER, 0, undefined, 'dust2-ct-to-mid-wall-right'),

  // CT → A Site 走廊
  wZ(-960, -2688, 768, WALL_HEIGHT_HAMMER, 0, undefined, 'dust2-ct-to-a-wall-left'),
  wZ(-640, -2688, 256, WALL_HEIGHT_HAMMER, 0, undefined, 'dust2-ct-to-a-wall-right'),
  crt(-768, -2432, 64, 48, 48, 0, 'dust2-ct-to-a-box'),

  // CT → B Site 走廊
  wZ(640, -2688, 256, WALL_HEIGHT_HAMMER, 0, undefined, 'dust2-ct-to-b-wall-left'),
  wZ(960, -2688, 768, WALL_HEIGHT_HAMMER, 0, undefined, 'dust2-ct-to-b-wall-right'),

  // ── B Tunnels (东侧, 宽度~320 HU) ──
  // ✅ 内侧墙 (分隔Mid, x=2880)
  wZ(2880, 1280, 4352, WALL_HEIGHT_HAMMER, 0, undefined, 'dust2-b-tunnels-wall-inner'),
  // ✅ 新增外墙 (x=3200)
  wZ(3200, 1280, 4352, WALL_HEIGHT_HAMMER, 0, undefined, 'dust2-b-tunnels-wall-outer'),

  // Lower Tunnels 掩体
  crt(3040, 4352, 64, 64, 48, 0, 'dust2-b-tunnels-lower-mid-box'),
  crt(3104, 2816, 48, 64, 48, 0, 'dust2-b-tunnels-lower-near-stairs-box'),
  crt(3040, 2432, 64, 48, 96, 0, 'dust2-b-tunnels-lower-corner-box'),
  crt(3104, 5504, 64, 64, 96, 0, 'dust2-b-tunnels-entrance-box-large'),
  crt(3040, 5120, 48, 48, 48, 0, 'dust2-b-tunnels-transfer-box'),

  // ✅ B Tunnels 楼梯 (4级, 每级32 HU, 总高128 HU)
  plat(3040, 1792, 224, 256, 32, 0, 'dust2-b-tunnels-stair-1'),
  plat(3040, 1536, 224, 256, 64, 0, 'dust2-b-tunnels-stair-2'),
  plat(3040, 1280, 224, 256, 96, 0, 'dust2-b-tunnels-stair-3'),
  plat(3040, 1024, 224, 256, WALL_HEIGHT_HAMMER, 0, 'dust2-b-tunnels-stair-4-platform'),

  // 楼梯侧墙
  wZ(2880, 1408, 768, 192, 0, undefined, 'dust2-b-tunnels-stair-wall'),

  // ✅ Upper Tunnels (升高128 HU)
  wZ(2880, 256, 1280, WALL_HEIGHT_HAMMER, 128, undefined, 'dust2-b-tunnels-upper-wall-inner'),
  // ✅ 新增 Upper 外墙
  wZ(3200, 256, 1280, WALL_HEIGHT_HAMMER, 128, undefined, 'dust2-b-tunnels-upper-wall-outer'),

  // Upper Dark 掩体
  crt(3104, 0, 80, 80, 96, 128, 'dust2-b-tunnels-upper-dark-box'),
  crt(3040, -896, 64, 48, 48, 128, 'dust2-b-tunnels-upper-exit-box'),

  // Upper → B Site 出口斜墙 (旋转25°≈0.436 rad)
  wZ(2880, -1024, 768, WALL_HEIGHT_HAMMER, 128, 0.436, 'dust2-b-tunnels-upper-ramp-wall'),

  // ── B Site (东北, 中心Z=-1280) ──
  // B Site 后墙（北）
  wX(B_SITE.center.x, -1920, B_SITE.width, WALL_HEIGHT_HAMMER, 0, undefined, 'dust2-b-site-wall-back'),
  // B Site 西墙（分隔 CT Mid）
  wZ(1792, -1408, 2048, WALL_HEIGHT_HAMMER, 0, undefined, 'dust2-b-site-wall-west'),

  // ✅ B Site 平台 (中心Z=-1280)
  plat(B_SITE.center.x, B_SITE.center.z, B_SITE.platformWidth, B_SITE.platformDepth, PLATFORM_HEIGHT_HAMMER, 0, 'dust2-b-site-platform'),

  // Car (标志性汽车掩体)
  crt(2688, -1408, 128, 64, 40, PLATFORM_HEIGHT_HAMMER, 'dust2-b-site-car'),

  // ✅ Back Plat (B后部高架, 坐标与B_SITE数据对齐)
  plat(B_SITE.backPlat!.x, B_SITE.backPlat!.z, B_SITE.backPlat!.width, B_SITE.backPlat!.depth, B_SITE.backPlat!.height, 0, 'dust2-b-site-back-plat'),
  plat(B_SITE.backPlat!.x, -1664, 96, 64, 30, 0, 'dust2-b-site-back-plat-stair-1'),
  plat(B_SITE.backPlat!.x, -1696, 96, 64, 60, 0, 'dust2-b-site-back-plat-stair-2'),
  plat(B_SITE.backPlat!.x, -1728, 96, 64, B_SITE.backPlat!.height, 0, 'dust2-b-site-back-plat-stair-3'),

  // B Site 箱子 (平台上方)
  crt(2368, -1408, 64, 64, 96, PLATFORM_HEIGHT_HAMMER, 'dust2-b-site-box-double-stack'),
  crt(2368, -1536, 64, 64, 48, PLATFORM_HEIGHT_HAMMER, 'dust2-b-site-box-default'),
  crt(2688, -1664, 64, 48, 96, PLATFORM_HEIGHT_HAMMER, 'dust2-b-site-box-right-back'),
  // ✅ 小掩体 (与B_SITE数据对齐: x=2176, z=-1344)
  crt(B_SITE.cover[3].x, B_SITE.cover[3].z, B_SITE.cover[3].width, B_SITE.cover[3].depth, B_SITE.cover[3].height, PLATFORM_HEIGHT_HAMMER, 'dust2-b-site-box-small'),

  // B Site 地面掩体
  crt(2176, -896, 64, 64, 96, 0, 'dust2-b-site-tunnel-exit-box'),
  crt(2496, -768, 64, 48, 48, 0, 'dust2-b-site-right-front-box'),
  crt(2880, -640, 96, 48, 48, 0, 'dust2-b-site-right-corridor-box'),
  crt(2752, -1664, 64, 48, 48, 0, 'dust2-b-site-back-corner-box'),
  // ✅ 北墙箱 (与B_SITE数据对齐: x=2176, z=-1920)
  crt(B_SITE.cover[4].x, B_SITE.cover[4].z, B_SITE.cover[4].width, B_SITE.cover[4].depth, B_SITE.cover[4].height, 0, 'dust2-b-site-north-wall-box'),

  // B Window (CT侧狙击位)
  plat(1920, -1248, 96, 64, WALL_HEIGHT_HAMMER, 0, 'dust2-b-window-platform'),
  wX(1920, -1216, 96, 48, WALL_HEIGHT_HAMMER, 0, 'dust2-b-window-low-wall'),

  // ✅ B Doors (CT → B Site通道, 立柱高度64 HU)
  wZ(1792, -1536, 128, 64, 0, undefined, 'dust2-b-doors-left-post'),
  wZ(1888, -1536, 128, 64, 0, undefined, 'dust2-b-doors-right-post'),
  crt(1840, -1536, 16, WALL_THICKNESS_HAMMER, 64, 0, 'dust2-b-doors-center-post'),

  // ── 额外细节 ──
  crt(-256, -1024, 64, 64, 48, 0, 'dust2-mid-scatter-box-near-window'),
  crt(256, -3584, 64, 64, 48, 0, 'dust2-mid-scatter-box-near-b-entrance'),
  crt(-3200, 3584, 48, 48, 48, 0, 'dust2-a-long-extra-box-1'),
  crt(-3328, 3840, 48, 48, 48, 0, 'dust2-a-long-extra-box-2'),
  crt(3040, 4096, 48, 48, 48, 0, 'dust2-b-tunnels-extra-box-1'),
  crt(3040, 4672, 48, 48, 48, 0, 'dust2-b-tunnels-extra-box-2'),
];

// ═══════════════════════════════════════════════════════════════
// 地面材质区域
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

// ═══════════════════════════════════════════════════════════════
// 包点
// ═══════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════
// 出生点
// ═══════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════
// 标注点
// ═══════════════════════════════════════════════════════════════

export const DUST2_CALLOUTS = HAMMER_CALLOUTS.map(callout => ({
  name: callout.name,
  position: {
    x: hammerToGame(callout.position.x),
    y: hammerToGame(callout.position.y),
    z: hammerToGame(-callout.position.z)
  },
  radius: hammerToGame(callout.radius)
}));
