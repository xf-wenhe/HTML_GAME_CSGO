/**
 * CSGO WAREHOUSE 地图精确布局 — 基于 Hammer Editor 实际测量数据
 * 缩放: 0.01x
 * Warehouse 特点: 工业仓库风格，多层货架，叉车通道
 */

import {
  hammerToGame,
  WALL_HEIGHT_HAMMER,
  BOUNDARY_WALL_HEIGHT_HAMMER,
  PLATFORM_HEIGHT_HAMMER,
  STANDARD_BOX_HEIGHT_HAMMER,
  TALL_BOX_HEIGHT_HAMMER,
  WALL_THICKNESS_HAMMER,
  PLAYER_EYE_HEIGHT
} from './constants/MapUnits.js';

export interface WarehouseCollider {
  position: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  name?: string;
}

function wall(x: number, z: number, w: number, d: number, h: number = WALL_HEIGHT_HAMMER, yOff: number = 0, name?: string): WarehouseCollider {
  return {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size: { x: hammerToGame(w), y: hammerToGame(h), z: hammerToGame(d) },
    name
  };
}

function box(x: number, z: number, w: number, d: number, h: number = STANDARD_BOX_HEIGHT_HAMMER, yOff: number = 0, name?: string): WarehouseCollider {
  return {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size: { x: hammerToGame(w), y: hammerToGame(h), z: hammerToGame(d) },
    name
  };
}

function plat(x: number, z: number, w: number, d: number, h: number = PLATFORM_HEIGHT_HAMMER, yOff: number = 0, name?: string): WarehouseCollider {
  return {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size: { x: hammerToGame(w), y: hammerToGame(h), z: hammerToGame(d) },
    name
  };
}

// WAREHOUSE 地图边界 (~6144 x 8192 Hammer units)
const WAREHOUSE_WIDTH = 6144;
const WAREHOUSE_DEPTH = 8192;

// 二楼高度
const UPPER_FLOOR_Y = 256;

export const WAREHOUSE_COLLIDERS: WarehouseCollider[] = [
  // ── 外围边界 ──
  wall(0, 4096, WAREHOUSE_WIDTH, WALL_THICKNESS_HAMMER, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'warehouse-boundary-south'),
  wall(0, -4096, WAREHOUSE_WIDTH, WALL_THICKNESS_HAMMER, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'warehouse-boundary-north'),
  wall(-3072, 0, WALL_THICKNESS_HAMMER, WAREHOUSE_DEPTH, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'warehouse-boundary-west'),
  wall(3072, 0, WALL_THICKNESS_HAMMER, WAREHOUSE_DEPTH, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'warehouse-boundary-east'),

  // ── T Spawn ──
  wall(0, 3840, 2048, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'warehouse-t-spawn-wall-back'),
  wall(-512, 2816, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, 0, 'warehouse-t-spawn-wall-left'),
  wall(512, 2816, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, 0, 'warehouse-t-spawn-wall-right'),

  // T Spawn 箱子
  box(-256, 3328, 64, 64, 48, 0, 'warehouse-t-spawn-box-left'),
  box(256, 3328, 64, 64, 48, 0, 'warehouse-t-spawn-box-right'),

  // ── CT Spawn ──
  wall(0, -3584, 2048, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'warehouse-ct-spawn-wall-back'),
  wall(-512, -2304, WALL_THICKNESS_HAMMER, 2560, WALL_HEIGHT_HAMMER, 0, 'warehouse-ct-spawn-wall-left'),
  wall(512, -2304, WALL_THICKNESS_HAMMER, 2560, WALL_HEIGHT_HAMMER, 0, 'warehouse-ct-spawn-wall-right'),

  // ── 货架通道 (Forklift Lanes) ──
  // 左侧货架区
  box(-2048, 1024, 256, 128, 256, 0, 'warehouse-rack-left-1'),
  box(-2048, 0, 256, 128, 256, 0, 'warehouse-rack-left-2'),
  box(-2048, -1024, 256, 128, 256, 0, 'warehouse-rack-left-3'),
  box(-2048, -2048, 256, 128, 256, 0, 'warehouse-rack-left-4'),

  // 右侧货架区
  box(2048, 1024, 256, 128, 256, 0, 'warehouse-rack-right-1'),
  box(2048, 0, 256, 128, 256, 0, 'warehouse-rack-right-2'),
  box(2048, -1024, 256, 128, 256, 0, 'warehouse-rack-right-3'),
  box(2048, -2048, 256, 128, 256, 0, 'warehouse-rack-right-4'),

  // 中央通道掩体
  box(-512, 1024, 64, 64, 48, 0, 'warehouse-mid-box-left'),
  box(512, 1024, 64, 64, 48, 0, 'warehouse-mid-box-right'),
  box(0, 512, 96, 64, TALL_BOX_HEIGHT_HAMMER, 0, 'warehouse-mid-tall-box'),

  // ── 上层走廊 (Catwalk) ──
  plat(0, 0, 3072, 1024, 256, 0, 'warehouse-catwalk-central'),
  wall(-1536, 0, WALL_THICKNESS_HAMMER, 1024, 64, 256, 'warehouse-catwalk-railing-left'),
  wall(1536, 0, WALL_THICKNESS_HAMMER, 1024, 64, 256, 'warehouse-catwalk-railing-right'),

  // 上层平台
  plat(-2048, 0, 1024, 4096, 256, 0, 'warehouse-upper-left-platform'),
  plat(2048, 0, 1024, 4096, 256, 0, 'warehouse-upper-right-platform'),

  // ── A Site ──
  wall(-1536, -2816, 3072, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'warehouse-a-site-wall-back'),
  wall(-3072, -1536, WALL_THICKNESS_HAMMER, 2560, WALL_HEIGHT_HAMMER, 0, 'warehouse-a-site-wall-west'),
  wall(0, -1536, WALL_THICKNESS_HAMMER, 2560, WALL_HEIGHT_HAMMER, 0, 'warehouse-a-site-wall-east'),

  // A Site 平台
  plat(-1536, -2048, 1536, 1024, PLATFORM_HEIGHT_HAMMER, 0, 'warehouse-a-site-platform'),

  // A Site 掩体
  box(-2304, -2304, 128, 96, 96, 0, 'warehouse-a-site-forklift'),
  box(-768, -2304, 64, 64, 48, 0, 'warehouse-a-site-pallet'),
  box(-2816, -1792, 64, 96, 48, 0, 'warehouse-a-site-sandbag'),

  // A Site 封闭房间 (Office)
  wall(-2560, -1280, WALL_THICKNESS_HAMMER, 1536, WALL_HEIGHT_HAMMER, 0, 'warehouse-a-closed-room-wall'),
  wall(-3072, -2048, 1024, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'warehouse-a-closed-room-back'),

  // ── B Site ──
  wall(1536, -2816, 3072, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'warehouse-b-site-wall-back'),
  wall(3072, -1536, WALL_THICKNESS_HAMMER, 2560, WALL_HEIGHT_HAMMER, 0, 'warehouse-b-site-wall-east'),
  wall(0, -1536, WALL_THICKNESS_HAMMER, 2560, WALL_HEIGHT_HAMMER, 0, 'warehouse-b-site-wall-west'),

  // B Site 平台
  plat(1536, -2048, 1536, 1024, PLATFORM_HEIGHT_HAMMER, 0, 'warehouse-b-site-platform'),

  // B Site 掩体
  box(2304, -2304, 128, 96, 96, 0, 'warehouse-b-site-forklift'),
  box(768, -2304, 64, 64, 48, 0, 'warehouse-b-site-pallet'),
  box(2816, -1792, 64, 96, 48, 0, 'warehouse-b-site-sandbag'),

  // B Site 封闭房间 (Storage)
  wall(2560, -1280, WALL_THICKNESS_HAMMER, 1536, WALL_HEIGHT_HAMMER, 0, 'warehouse-b-closed-room-wall'),
  wall(3072, -2048, 1024, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'warehouse-b-closed-room-back'),
];

// 出生点
export const WAREHOUSE_SPAWNS = {
  attackers: [
    { x: hammerToGame(-256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-3840) },
    { x: hammerToGame(-512), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-3840) },
    { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-3840) },
    { x: hammerToGame(256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-3840) },
    { x: hammerToGame(512), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-3840) }
  ],
  defenders: [
    { x: hammerToGame(-256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3840) },
    { x: hammerToGame(-512), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3840) },
    { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3840) },
    { x: hammerToGame(256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3840) },
    { x: hammerToGame(512), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3840) }
  ]
};

export const WAREHOUSE_TDM_SPAWNS = [
  { x: hammerToGame(-256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-3840) },
  { x: hammerToGame(256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-3840) },
  { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3840) },
  { x: hammerToGame(-256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3840) },
  { x: hammerToGame(0), y: hammerToGame(UPPER_FLOOR_Y + 64), z: hammerToGame(0) },
  { x: hammerToGame(-2048), y: hammerToGame(UPPER_FLOOR_Y + 64), z: hammerToGame(0) },
  { x: hammerToGame(-1536), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-2048) },
  { x: hammerToGame(1536), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-2048) }
];

export const WAREHOUSE_BOMB_SITES = {
  A: {
    position: { x: hammerToGame(-1536), y: hammerToGame(PLATFORM_HEIGHT_HAMMER), z: hammerToGame(2048) },
    radius: hammerToGame(512)
  },
  B: {
    position: { x: hammerToGame(1536), y: hammerToGame(PLATFORM_HEIGHT_HAMMER), z: hammerToGame(2048) },
    radius: hammerToGame(512)
  }
};

export const WAREHOUSE_CALLOUTS = [
  { name: 'A Site', position: { x: hammerToGame(-1536), y: PLAYER_EYE_HEIGHT, z: hammerToGame(2048) }, radius: hammerToGame(640) },
  { name: 'B Site', position: { x: hammerToGame(1536), y: PLAYER_EYE_HEIGHT, z: hammerToGame(2048) }, radius: hammerToGame(640) },
  { name: 'Catwalk', position: { x: hammerToGame(0), y: hammerToGame(UPPER_FLOOR_Y + 64), z: hammerToGame(0) }, radius: hammerToGame(640) },
  { name: 'Mid', position: { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(0) }, radius: hammerToGame(640) },
  { name: 'Left Racks', position: { x: hammerToGame(-2048), y: PLAYER_EYE_HEIGHT, z: hammerToGame(0) }, radius: hammerToGame(512) },
  { name: 'T Spawn', position: { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-3840) }, radius: hammerToGame(512) },
  { name: 'CT Spawn', position: { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3840) }, radius: hammerToGame(512) }
];
