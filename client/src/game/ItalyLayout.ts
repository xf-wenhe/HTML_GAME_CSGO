/**
 * CSGO ITALY 地图精确布局 — 基于 Hammer Editor 实际测量数据
 * 缩放: 0.01x
 * Italy 特点: 中世纪意大利街道风格，Apartments区域，Market
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

export interface ItalyCollider {
  position: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  name?: string;
}

function wall(x: number, z: number, w: number, d: number, h: number = WALL_HEIGHT_HAMMER, yOff: number = 0, name?: string): ItalyCollider {
  return {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size: { x: hammerToGame(w), y: hammerToGame(h), z: hammerToGame(d) },
    name
  };
}

function box(x: number, z: number, w: number, d: number, h: number = STANDARD_BOX_HEIGHT_HAMMER, yOff: number = 0, name?: string): ItalyCollider {
  return {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size: { x: hammerToGame(w), y: hammerToGame(h), z: hammerToGame(d) },
    name
  };
}

function plat(x: number, z: number, w: number, d: number, h: number = PLATFORM_HEIGHT_HAMMER, yOff: number = 0, name?: string): ItalyCollider {
  return {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size: { x: hammerToGame(w), y: hammerToGame(h), z: hammerToGame(d) },
    name
  };
}

// ITALY 地图边界 (~6656 x 9216 Hammer units)
const ITALY_WIDTH = 6656;
const ITALY_DEPTH = 9216;

// 上层高度偏移
const UPPER_FLOOR_Y = 192;

export const ITALY_COLLIDERS: ItalyCollider[] = [
  // ── 外围边界 ──
  wall(0, 4608, ITALY_WIDTH, WALL_THICKNESS_HAMMER, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'italy-boundary-south'),
  wall(0, -4608, ITALY_WIDTH, WALL_THICKNESS_HAMMER, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'italy-boundary-north'),
  wall(-3328, 0, WALL_THICKNESS_HAMMER, ITALY_DEPTH, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'italy-boundary-west'),
  wall(3328, 0, WALL_THICKNESS_HAMMER, ITALY_DEPTH, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'italy-boundary-east'),

  // ── T Spawn ──
  wall(0, 4096, 2048, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'italy-t-spawn-wall-back'),
  wall(-512, 3072, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, 0, 'italy-t-spawn-wall-left'),
  wall(512, 3072, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, 0, 'italy-t-spawn-wall-right'),

  // T Spawn 箱子
  box(-256, 3584, 64, 64, 48, 0, 'italy-t-spawn-box-left'),
  box(256, 3584, 64, 64, 48, 0, 'italy-t-spawn-box-right'),

  // ── CT Spawn ──
  wall(0, -3840, 2048, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'italy-ct-spawn-wall-back'),
  wall(-512, -2560, WALL_THICKNESS_HAMMER, 2560, WALL_HEIGHT_HAMMER, 0, 'italy-ct-spawn-wall-left'),
  wall(512, -2560, WALL_THICKNESS_HAMMER, 2560, WALL_HEIGHT_HAMMER, 0, 'italy-ct-spawn-wall-right'),

  // ── Market 通道 (中央走廊) ──
  wall(-512, 1024, WALL_THICKNESS_HAMMER, 4096, WALL_HEIGHT_HAMMER, 0, 'italy-market-wall-left'),
  wall(512, 1024, WALL_THICKNESS_HAMMER, 4096, WALL_HEIGHT_HAMMER, 0, 'italy-market-wall-right'),

  // Market 门拱
  wall(0, 1536, 1024, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'italy-market-arch-wall'),
  wall(0, -512, 1024, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'italy-market-mid-wall'),

  // Market 掩体
  box(-256, 512, 64, 64, 48, 0, 'italy-market-crate-left'),
  box(256, 512, 64, 64, 48, 0, 'italy-market-crate-right'),
  box(0, 0, 96, 64, TALL_BOX_HEIGHT_HAMMER, 0, 'italy-market-center-box'),

  // ── Apartments (上层区域) ──
  plat(-1536, 0, 2048, 4096, 192, 0, 'italy-apartments-upper-floor'),
  wall(-2560, 0, WALL_THICKNESS_HAMMER, 4096, WALL_HEIGHT_HAMMER, 0, 'italy-apartments-outer-wall'),
  wall(-512, 0, WALL_THICKNESS_HAMMER, 4096, WALL_HEIGHT_HAMMER, UPPER_FLOOR_Y, 'italy-apartments-inner-wall'),

  // Apartments 房间
  wall(-1536, 2048, 2048, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'italy-apartments-room-divider'),
  box(-1536, 2560, 128, 128, 48, 0, 'italy-apartments-couch-cover'),
  box(-1536, 1024, 96, 64, TALL_BOX_HEIGHT_HAMMER, 0, 'italy-apartments-tall-box'),

  // ── Balcony / Courtyard ──
  plat(1536, 0, 2048, 4096, 192, 0, 'italy-courtyard-upper-floor'),
  wall(2560, 0, WALL_THICKNESS_HAMMER, 4096, WALL_HEIGHT_HAMMER, 0, 'italy-courtyard-outer-wall'),
  wall(512, 0, WALL_THICKNESS_HAMMER, 4096, WALL_HEIGHT_HAMMER, UPPER_FLOOR_Y, 'italy-courtyard-inner-wall'),

  // Courtyard 掩体
  box(1536, 2048, 128, 128, 48, 0, 'italy-courtyard-planter'),
  box(1536, -512, 64, 96, TALL_BOX_HEIGHT_HAMMER, 0, 'italy-courtyard-tall-box'),

  // ── A Site ──
  wall(-1536, -3072, 3072, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'italy-a-site-wall-back'),
  wall(-3072, -1536, WALL_THICKNESS_HAMMER, 3072, WALL_HEIGHT_HAMMER, 0, 'italy-a-site-wall-west'),
  wall(0, -1536, WALL_THICKNESS_HAMMER, 3072, WALL_HEIGHT_HAMMER, 0, 'italy-a-site-wall-east'),

  // A Site 平台
  plat(-1536, -2048, 1536, 1024, PLATFORM_HEIGHT_HAMMER, 0, 'italy-a-site-platform'),

  // A Site 掩体
  box(-2048, -2560, 128, 96, 96, 0, 'italy-a-site-crate-large'),
  box(-1024, -2560, 64, 64, 48, 0, 'italy-a-site-crate-small'),
  box(-2816, -2048, 64, 96, 48, 0, 'italy-a-site-sandbag'),

  // A Site 封闭房间
  wall(-2560, -1792, WALL_THICKNESS_HAMMER, 1536, WALL_HEIGHT_HAMMER, 0, 'italy-a-closed-room-wall'),
  wall(-3072, -2560, 1024, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'italy-a-closed-room-back'),

  // ── B Site ──
  wall(1536, -3072, 3072, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'italy-b-site-wall-back'),
  wall(3072, -1536, WALL_THICKNESS_HAMMER, 3072, WALL_HEIGHT_HAMMER, 0, 'italy-b-site-wall-east'),
  wall(0, -1536, WALL_THICKNESS_HAMMER, 3072, WALL_HEIGHT_HAMMER, 0, 'italy-b-site-wall-west'),

  // B Site 平台
  plat(1536, -2048, 1536, 1024, PLATFORM_HEIGHT_HAMMER, 0, 'italy-b-site-platform'),

  // B Site 掩体
  box(2048, -2560, 128, 96, 96, 0, 'italy-b-site-crate-large'),
  box(1024, -2560, 64, 64, 48, 0, 'italy-b-site-crate-small'),
  box(2816, -2048, 64, 96, 48, 0, 'italy-b-site-sandbag'),
];

// 出生点
export const ITALY_SPAWNS = {
  attackers: [
    { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4608) },
    { x: hammerToGame(-256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4608) },
    { x: hammerToGame(256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4608) },
    { x: hammerToGame(-512), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4608) },
    { x: hammerToGame(512), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4608) }
  ],
  defenders: [
    { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(4608) },
    { x: hammerToGame(-256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(4608) },
    { x: hammerToGame(256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(4608) },
    { x: hammerToGame(-512), y: PLAYER_EYE_HEIGHT, z: hammerToGame(4608) },
    { x: hammerToGame(512), y: PLAYER_EYE_HEIGHT, z: hammerToGame(4608) }
  ]
};

export const ITALY_TDM_SPAWNS = [
  { x: hammerToGame(-256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4096) },
  { x: hammerToGame(256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4096) },
  { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(4096) },
  { x: hammerToGame(-256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(4096) },
  { x: hammerToGame(-1536), y: hammerToGame(UPPER_FLOOR_Y + 64), z: hammerToGame(0) },
  { x: hammerToGame(1536), y: hammerToGame(UPPER_FLOOR_Y + 64), z: hammerToGame(0) },
  { x: hammerToGame(-1536), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-2048) },
  { x: hammerToGame(1536), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-2048) }
];

export const ITALY_BOMB_SITES = {
  A: {
    position: { x: hammerToGame(-1536), y: hammerToGame(PLATFORM_HEIGHT_HAMMER), z: hammerToGame(2048) },
    radius: hammerToGame(512)
  },
  B: {
    position: { x: hammerToGame(1536), y: hammerToGame(PLATFORM_HEIGHT_HAMMER), z: hammerToGame(2048) },
    radius: hammerToGame(512)
  }
};

export const ITALY_CALLOUTS = [
  { name: 'A Site', position: { x: hammerToGame(-1536), y: PLAYER_EYE_HEIGHT, z: hammerToGame(2048) }, radius: hammerToGame(640) },
  { name: 'B Site', position: { x: hammerToGame(1536), y: PLAYER_EYE_HEIGHT, z: hammerToGame(2048) }, radius: hammerToGame(640) },
  { name: 'Market', position: { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(0) }, radius: hammerToGame(640) },
  { name: 'Mid', position: { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-512) }, radius: hammerToGame(512) },
  { name: 'Apartments', position: { x: hammerToGame(-1536), y: hammerToGame(UPPER_FLOOR_Y + 64), z: hammerToGame(0) }, radius: hammerToGame(512) },
  { name: 'Courtyard', position: { x: hammerToGame(1536), y: hammerToGame(UPPER_FLOOR_Y + 64), z: hammerToGame(0) }, radius: hammerToGame(512) },
  { name: 'T Spawn', position: { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4096) }, radius: hammerToGame(512) },
  { name: 'CT Spawn', position: { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3840) }, radius: hammerToGame(512) }
];
