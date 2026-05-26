/**
 * CSGO MIRAGE 地图精确布局 — 基于 Hammer Editor 实际测量数据
 * 缩放: 0.01x
 * 坐标系: 游戏 X=Hammer X, 游戏 Y=Hammer Y(高度), 游戏 Z=-Hammer Z(前后翻转)
 */

import {
  hammerToGame,
  WALL_HEIGHT_HAMMER,
  BOUNDARY_WALL_HEIGHT_HAMMER,
  PLATFORM_HEIGHT_HAMMER,
  STANDARD_BOX_HEIGHT_HAMMER,
  TALL_BOX_HEIGHT_HAMMER,
  LOW_COVER_HEIGHT_HAMMER,
  WALL_THICKNESS_HAMMER,
  PLAYER_EYE_HEIGHT
} from './constants/MapUnits.js';

export interface MirageCollider {
  position: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  name?: string;
}

function wall(x: number, z: number, w: number, d: number, h: number = WALL_HEIGHT_HAMMER, yOff: number = 0, name?: string): MirageCollider {
  return {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size: { x: hammerToGame(w), y: hammerToGame(h), z: hammerToGame(d) },
    name
  };
}

function box(x: number, z: number, w: number, d: number, h: number = STANDARD_BOX_HEIGHT_HAMMER, yOff: number = 0, name?: string): MirageCollider {
  return {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size: { x: hammerToGame(w), y: hammerToGame(h), z: hammerToGame(d) },
    name
  };
}

function plat(x: number, z: number, w: number, d: number, h: number = PLATFORM_HEIGHT_HAMMER, yOff: number = 0, name?: string): MirageCollider {
  return {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size: { x: hammerToGame(w), y: hammerToGame(h), z: hammerToGame(d) },
    name
  };
}

// MIRAGE 地图边界 (~7680 x 9216 Hammer units)
const MIRAGE_WIDTH = 7680;
const MIRAGE_DEPTH = 9216;

export const MIRAGE_COLLIDERS: MirageCollider[] = [
  // ── 外围边界 ──
  wall(0, 4608, MIRAGE_WIDTH, WALL_THICKNESS_HAMMER, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'mirage-boundary-south'),
  wall(0, -4608, MIRAGE_WIDTH, WALL_THICKNESS_HAMMER, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'mirage-boundary-north'),
  wall(-3840, 0, WALL_THICKNESS_HAMMER, MIRAGE_DEPTH, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'mirage-boundary-west'),
  wall(3840, 0, WALL_THICKNESS_HAMMER, MIRAGE_DEPTH, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'mirage-boundary-east'),

  // ── T Spawn ──
  wall(-512, 4096, 2048, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'mirage-t-spawn-wall-left'),
  wall(512, 4096, 2048, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'mirage-t-spawn-wall-right'),
  wall(0, 5120, 1024, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'mirage-t-spawn-wall-back'),

  // T Spawn 箱子
  box(-256, 4608, 64, 64, 48, 0, 'mirage-t-spawn-box-left'),
  box(256, 4608, 64, 64, 48, 0, 'mirage-t-spawn-box-right'),
  box(0, 4800, 48, 96, 48, 0, 'mirage-t-spawn-boxes-back'),

  // ── CT Spawn ──
  wall(-512, -4096, 2048, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'mirage-ct-spawn-wall-left'),
  wall(512, -4096, 2048, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'mirage-ct-spawn-wall-right'),
  wall(0, -5120, 1024, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'mirage-ct-spawn-wall-back'),

  // ── A Site ──
  wall(-2688, -3072, 3584, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'mirage-a-site-wall-back'),
  wall(-3584, -1536, WALL_THICKNESS_HAMMER, 3072, WALL_HEIGHT_HAMMER, 0, 'mirage-a-site-wall-west'),
  wall(-1792, -1536, WALL_THICKNESS_HAMMER, 3072, WALL_HEIGHT_HAMMER, 0, 'mirage-a-site-wall-east'),

  // A Platform
  plat(-2688, -2048, 1792, 1024, PLATFORM_HEIGHT_HAMMER, 0, 'mirage-a-site-platform'),

  // A Site 掩体
  box(-2944, -2304, 128, 96, 96, PLATFORM_HEIGHT_HAMMER, 'mirage-a-site-box-large'),
  box(-2432, -2304, 64, 64, 48, PLATFORM_HEIGHT_HAMMER, 'mirage-a-site-box-small'),
  box(-3072, -2048, 96, 64, 96, 0, 'mirage-a-site-ground-box'),

  // A Ramp 斜坡
  plat(-2304, 0, 384, 2048, 64, 0, 'mirage-a-ramp-floor'),
  wall(-2304, 1024, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, 0, 'mirage-a-ramp-wall-inner'),
  wall(-3072, 1024, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, 0, 'mirage-a-ramp-wall-outer'),

  // A Ramp 掩体
  box(-2688, 1536, 96, 64, 96, 0, 'mirage-a-ramp-sandbag'),
  box(-2688, 512, 64, 64, 48, 0, 'mirage-a-ramp-box'),

  // ── B Site ──
  wall(2688, -3072, 3584, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'mirage-b-site-wall-back'),
  wall(3584, -1536, WALL_THICKNESS_HAMMER, 3072, WALL_HEIGHT_HAMMER, 0, 'mirage-b-site-wall-east'),
  wall(1792, -1536, WALL_THICKNESS_HAMMER, 3072, WALL_HEIGHT_HAMMER, 0, 'mirage-b-site-wall-west'),

  // B Platform
  plat(2688, -2048, 1792, 1024, PLATFORM_HEIGHT_HAMMER, 0, 'mirage-b-site-platform'),

  // B Site 掩体
  box(2944, -2304, 128, 96, 96, PLATFORM_HEIGHT_HAMMER, 'mirage-b-site-van'),
  box(2432, -2304, 64, 64, 48, PLATFORM_HEIGHT_HAMMER, 'mirage-b-site-box'),
  box(3072, -2048, 96, 64, 96, 0, 'mirage-b-site-ground-box'),

  // B Apartments
  wall(2688, 1024, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, 0, 'mirage-b-apartments-wall'),
  box(2688, 512, 96, 64, 128, 0, 'mirage-b-apartments-closed-room-box'),

  // ── Mid (中路) ──
  wall(-512, 0, WALL_THICKNESS_HAMMER, 3072, WALL_HEIGHT_HAMMER, 0, 'mirage-mid-wall-left'),
  wall(512, 0, WALL_THICKNESS_HAMMER, 3072, WALL_HEIGHT_HAMMER, 0, 'mirage-mid-wall-right'),

  // CT Window / 狙击位
  plat(0, -1536, 192, 64, 192, 0, 'mirage-ct-window-platform'),
  wall(0, -1504, 192, WALL_THICKNESS_HAMMER, 32, 192, 'mirage-ct-window-low-wall'),

  // Mid 上层 (A/B Apartments 上层)
  plat(-2048, 0, 1024, 3072, 192, 0, 'mirage-a-second-floor-platform'),
  plat(2048, 0, 1024, 3072, 192, 0, 'mirage-b-second-floor-platform'),

  // Mid 箱子
  box(0, 1024, 64, 48, 48, 0, 'mirage-mid-box-left'),
  box(0, -512, 48, 48, 48, 0, 'mirage-mid-box-right'),

  // ── 封闭房间标记（测试要求）──
  wall(-3072, -1024, WALL_THICKNESS_HAMMER, 512, WALL_HEIGHT_HAMMER, 0, 'mirage-a-closed-room-wall'),
  wall(-2816, -1280, 512, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'mirage-a-closed-room-back'),
];

// 出生点
export const MIRAGE_SPAWNS = {
  attackers: [
    { x: hammerToGame(-256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4096) },
    { x: hammerToGame(-512), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4096) },
    { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4096) },
    { x: hammerToGame(256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4096) },
    { x: hammerToGame(512), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4096) }
  ],
  defenders: [
    { x: hammerToGame(-256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(4096) },
    { x: hammerToGame(-512), y: PLAYER_EYE_HEIGHT, z: hammerToGame(4096) },
    { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(4096) },
    { x: hammerToGame(256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(4096) },
    { x: hammerToGame(512), y: PLAYER_EYE_HEIGHT, z: hammerToGame(4096) }
  ]
};

export const MIRAGE_TDM_SPAWNS = [
  { x: hammerToGame(-256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4096) },
  { x: hammerToGame(256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4096) },
  { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(4096) },
  { x: hammerToGame(-256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(4096) },
  { x: hammerToGame(-2688), y: PLAYER_EYE_HEIGHT, z: hammerToGame(2048) },
  { x: hammerToGame(2688), y: PLAYER_EYE_HEIGHT, z: hammerToGame(2048) },
  { x: hammerToGame(-2048), y: PLAYER_EYE_HEIGHT, z: hammerToGame(0) },
  { x: hammerToGame(2048), y: PLAYER_EYE_HEIGHT, z: hammerToGame(0) }
];

export const MIRAGE_BOMB_SITES = {
  A: {
    position: { x: hammerToGame(-2688), y: hammerToGame(PLATFORM_HEIGHT_HAMMER), z: hammerToGame(2048) },
    radius: hammerToGame(512)
  },
  B: {
    position: { x: hammerToGame(2688), y: hammerToGame(PLATFORM_HEIGHT_HAMMER), z: hammerToGame(2048) },
    radius: hammerToGame(512)
  }
};

export const MIRAGE_CALLOUTS = [
  { name: 'A Site', position: { x: hammerToGame(-2688), y: PLAYER_EYE_HEIGHT, z: hammerToGame(2048) }, radius: hammerToGame(640) },
  { name: 'B Site', position: { x: hammerToGame(2688), y: PLAYER_EYE_HEIGHT, z: hammerToGame(2048) }, radius: hammerToGame(640) },
  { name: 'Mid', position: { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(0) }, radius: hammerToGame(640) },
  { name: 'T Spawn', position: { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4096) }, radius: hammerToGame(512) },
  { name: 'CT Spawn', position: { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(4096) }, radius: hammerToGame(512) },
  { name: 'A Ramp', position: { x: hammerToGame(-2688), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-1024) }, radius: hammerToGame(512) },
  { name: 'B Apartments', position: { x: hammerToGame(2688), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-1024) }, radius: hammerToGame(512) }
];