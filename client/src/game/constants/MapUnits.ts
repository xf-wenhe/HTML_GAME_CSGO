/**
 * CSGO 单位系统常量
 *
 * 参考: Valve Hammer Editor
 * - 1 Hammer unit = 1英寸 (1 inch) ≈ 0.0254米
 * - 16 Hammer units = 1英尺 (1 foot)
 * - 32 Hammer units ≈ 1米 (估算)
 */

// === 基础单位换算 ===
export const HAMMER_UNIT_INCHES = 1;            // 1 Hammer unit = 1英寸
export const HAMMER_UNIT_METERS = 0.0254;       // 1 Hammer unit ≈ 0.0254米
export const HAMMER_UNIT_FEET = 1 / 12;         // 1 Hammer unit ≈ 0.083英尺

// === 游戏单位换算比例 ===
// 使用0.01的缩放比例使地图适合游戏引擎
export const HAMMER_TO_GAME_UNIT_SCALE = 0.01;  // 1 Hammer unit = 0.01游戏单位
export const GAME_TO_HAMMER_UNIT_SCALE = 100;   // 1游戏单位 = 100 Hammer units

// === 玩家相关尺寸（CSGO标准）===
export const PLAYER_HEIGHT_HAMMER = 72;         // 站立高度 72 units (~1.83m)
export const PLAYER_EYE_HEIGHT_HAMMER = 64;     // 眼睛高度 64 units (~1.63m)
export const PLAYER_CROUCH_HEIGHT_HAMMER = 36;  // 蹲下高度 36 units (~0.91m)
export const PLAYER_WIDTH_HAMMER = 32;          // 宽度 32 units (~0.81m)
export const PLAYER_RADIUS_HAMMER = 16;         // 碰撞半径 16 units (~0.41m)

// === 玩家移动速度（CSGO标准）===
export const PLAYER_RUN_SPEED_HAMMER = 250;     // 跑步 ~250 units/秒 (~6.35m/s)
export const PLAYER_WALK_SPEED_HAMMER = 110;    // 步行 ~110 units/秒 (~2.79m/s)
export const PLAYER_CROUCH_SPEED_HAMMER = 85;   // 蹲下 ~85 units/秒 (~2.16m/s)
export const PLAYER_JUMP_HEIGHT_HAMMER = 57;    // 跳跃高度 57 units (~1.45m)
export const PLAYER_JUMP_TIME = 0.8;            // 跳跃持续时间（秒）

// === 地图元素标准尺寸 ===
export const WALL_HEIGHT_HAMMER = 128;          // 标准墙高 128 units (~3.25m)
export const WALL_THICKNESS_HAMMER = 16;        // 墙厚 16 units (~0.41m)
export const BOUNDARY_WALL_HEIGHT_HAMMER = 256; // 边界墙高 256 units (~6.5m)
export const DOOR_HEIGHT_HAMMER = 96;           // 门高 96 units (~2.44m)
export const DOOR_WIDTH_HAMMER = 64;            // 门宽 64 units (~1.63m)

// === 掩体标准尺寸 ===
export const STANDARD_BOX_HEIGHT_HAMMER = 48;   // 标准箱子高 48 units (~1.22m)
export const TALL_BOX_HEIGHT_HAMMER = 96;       // 高箱子高 96 units (~2.44m)
export const LOW_COVER_HEIGHT_HAMMER = 32;      // 低掩体高 32 units (~0.81m)
export const PLATFORM_HEIGHT_HAMMER = 16;       // 平台高 16 units (~0.41m)

// === 楼梯标准尺寸 ===
export const STEP_HEIGHT_HAMMER = 16;           // 楼梯级高 16 units (~0.41m)
export const STEP_DEPTH_HAMMER = 32;            // 楼梯级深 32 units (~0.81m)

// === 换算到游戏单位 ===
export const PLAYER_HEIGHT = PLAYER_HEIGHT_HAMMER * HAMMER_TO_GAME_UNIT_SCALE;
export const PLAYER_EYE_HEIGHT = PLAYER_EYE_HEIGHT_HAMMER * HAMMER_TO_GAME_UNIT_SCALE;
export const PLAYER_CROUCH_HEIGHT = PLAYER_CROUCH_HEIGHT_HAMMER * HAMMER_TO_GAME_UNIT_SCALE;
export const PLAYER_WIDTH = PLAYER_WIDTH_HAMMER * HAMMER_TO_GAME_UNIT_SCALE;
export const PLAYER_RADIUS = PLAYER_RADIUS_HAMMER * HAMMER_TO_GAME_UNIT_SCALE;

export const PLAYER_RUN_SPEED = PLAYER_RUN_SPEED_HAMMER * HAMMER_TO_GAME_UNIT_SCALE;
export const PLAYER_WALK_SPEED = PLAYER_WALK_SPEED_HAMMER * HAMMER_TO_GAME_UNIT_SCALE;
export const PLAYER_CROUCH_SPEED = PLAYER_CROUCH_SPEED_HAMMER * HAMMER_TO_GAME_UNIT_SCALE;
export const PLAYER_JUMP_HEIGHT = PLAYER_JUMP_HEIGHT_HAMMER * HAMMER_TO_GAME_UNIT_SCALE;

export const WALL_HEIGHT = WALL_HEIGHT_HAMMER * HAMMER_TO_GAME_UNIT_SCALE;
export const WALL_THICKNESS = WALL_THICKNESS_HAMMER * HAMMER_TO_GAME_UNIT_SCALE;
export const BOUNDARY_WALL_HEIGHT = BOUNDARY_WALL_HEIGHT_HAMMER * HAMMER_TO_GAME_UNIT_SCALE;
export const DOOR_HEIGHT = DOOR_HEIGHT_HAMMER * HAMMER_TO_GAME_UNIT_SCALE;
export const DOOR_WIDTH = DOOR_WIDTH_HAMMER * HAMMER_TO_GAME_UNIT_SCALE;

export const STANDARD_BOX_HEIGHT = STANDARD_BOX_HEIGHT_HAMMER * HAMMER_TO_GAME_UNIT_SCALE;
export const TALL_BOX_HEIGHT = TALL_BOX_HEIGHT_HAMMER * HAMMER_TO_GAME_UNIT_SCALE;
export const LOW_COVER_HEIGHT = LOW_COVER_HEIGHT_HAMMER * HAMMER_TO_GAME_UNIT_SCALE;
export const PLATFORM_HEIGHT = PLATFORM_HEIGHT_HAMMER * HAMMER_TO_GAME_UNIT_SCALE;

export const STEP_HEIGHT = STEP_HEIGHT_HAMMER * HAMMER_TO_GAME_UNIT_SCALE;
export const STEP_DEPTH = STEP_DEPTH_HAMMER * HAMMER_TO_GAME_UNIT_SCALE;

// === CSGO DUST2 地图尺寸（Hammer units）===
export const DUST2_HAMMER_BOUNDS = {
  xMin: -4096,
  xMax: 4096,
  zMin: -3584,
  zMax: 6656,
  width: 8192,
  depth: 10240,
  boundaryHeight: 512
} as const;

export const DUST2_GAME_BOUNDS = {
  xMin: DUST2_HAMMER_BOUNDS.xMin * HAMMER_TO_GAME_UNIT_SCALE,
  xMax: DUST2_HAMMER_BOUNDS.xMax * HAMMER_TO_GAME_UNIT_SCALE,
  zMin: DUST2_HAMMER_BOUNDS.zMin * HAMMER_TO_GAME_UNIT_SCALE,
  zMax: DUST2_HAMMER_BOUNDS.zMax * HAMMER_TO_GAME_UNIT_SCALE,
  width: DUST2_HAMMER_BOUNDS.width * HAMMER_TO_GAME_UNIT_SCALE,
  depth: DUST2_HAMMER_BOUNDS.depth * HAMMER_TO_GAME_UNIT_SCALE,
  boundaryHeight: DUST2_HAMMER_BOUNDS.boundaryHeight * HAMMER_TO_GAME_UNIT_SCALE,
  centerZ: ((DUST2_HAMMER_BOUNDS.zMin + DUST2_HAMMER_BOUNDS.zMax) / 2) * HAMMER_TO_GAME_UNIT_SCALE
} as const;

// === 换算函数 ===

/**
 * 将Hammer units转换为游戏单位
 */
export function hammerToGame(value: number): number {
  return value * HAMMER_TO_GAME_UNIT_SCALE;
}

/**
 * 将游戏单位转换为Hammer units
 */
export function gameToHammer(value: number): number {
  return value * GAME_TO_HAMMER_UNIT_SCALE;
}

/**
 * 将Hammer位置转换为游戏位置
 * CSGO坐标系: Y=高度, Z=前后, X=左右
 * 游戏坐标系: Y=高度, Z=前后, X=左右
 * 注意: 游戏中Z轴可能需要翻转
 */
export interface HammerPosition {
  x: number;
  y: number;
  z: number;
}

export interface GamePosition {
  x: number;
  y: number;
  z: number;
}

/**
 * 转换Hammer位置到游戏位置
 * @param hammerPos Hammer单位位置
 * @param flipZ 是否翻转Z轴（通常需要，因为坐标系方向可能相反）
 */
export function hammerPositionToGame(hammerPos: HammerPosition, flipZ: boolean = true): GamePosition {
  return {
    x: hammerToGame(hammerPos.x),
    y: hammerToGame(hammerPos.y),
    z: flipZ ? hammerToGame(-hammerPos.z) : hammerToGame(hammerPos.z)
  };
}

/**
 * 转换游戏位置到Hammer位置
 */
export function gamePositionToHammer(gamePos: GamePosition, flipZ: boolean = true): HammerPosition {
  return {
    x: gameToHammer(gamePos.x),
    y: gameToHammer(gamePos.y),
    z: flipZ ? gameToHammer(-gamePos.z) : gameToHammer(gamePos.z)
  };
}

/**
 * 验证位置是否在DUST2地图边界内
 */
export function isPositionInDust2Bounds(pos: GamePosition): boolean {
  return pos.x >= DUST2_GAME_BOUNDS.xMin &&
         pos.x <= DUST2_GAME_BOUNDS.xMax &&
         pos.z >= DUST2_GAME_BOUNDS.zMin &&
         pos.z <= DUST2_GAME_BOUNDS.zMax;
}

/**
 * 计算两点之间的距离（2D，忽略高度）
 */
export function distance2D(a: GamePosition, b: GamePosition): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/**
 * 计算两点之间的距离（3D）
 */
export function distance3D(a: GamePosition, b: GamePosition): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
