/**
 * CSGO INFERNO 地图精确布局 — 基于 Hammer Editor 实际测量数据
 * 缩放: 0.01x
 */

import {
  hammerToGame,
  WALL_HEIGHT_HAMMER,
  BOUNDARY_WALL_HEIGHT_HAMMER,
  PLATFORM_HEIGHT_HAMMER,
  STANDARD_BOX_HEIGHT_HAMMER,
  WALL_THICKNESS_HAMMER,
  PLAYER_EYE_HEIGHT
} from './constants/MapUnits.js';

export interface InfernoCollider {
  position: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  name?: string;
}

function wall(x: number, z: number, w: number, d: number, h: number = WALL_HEIGHT_HAMMER, yOff: number = 0, name?: string): InfernoCollider {
  return {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size: { x: hammerToGame(w), y: hammerToGame(h), z: hammerToGame(d) },
    name
  };
}

function box(x: number, z: number, w: number, d: number, h: number = STANDARD_BOX_HEIGHT_HAMMER, yOff: number = 0, name?: string): InfernoCollider {
  return {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size: { x: hammerToGame(w), y: hammerToGame(h), z: hammerToGame(d) },
    name
  };
}

function plat(x: number, z: number, w: number, d: number, h: number = PLATFORM_HEIGHT_HAMMER, yOff: number = 0, name?: string): InfernoCollider {
  return {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size: { x: hammerToGame(w), y: hammerToGame(h), z: hammerToGame(d) },
    name
  };
}

// INFERNO 地图边界 (~7168 x 8192 Hammer units)
const INFERNO_WIDTH = 7168;
const INFERNO_DEPTH = 8192;

export const INFERNO_COLLIDERS: InfernoCollider[] = [
  // ── 外围边界 ──
  wall(0, 4096, INFERNO_WIDTH, WALL_THICKNESS_HAMMER, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'inferno-boundary-south'),
  wall(0, -4096, INFERNO_WIDTH, WALL_THICKNESS_HAMMER, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'inferno-boundary-north'),
  wall(-3584, 0, WALL_THICKNESS_HAMMER, INFERNO_DEPTH, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'inferno-boundary-west'),
  wall(3584, 0, WALL_THICKNESS_HAMMER, INFERNO_DEPTH, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'inferno-boundary-east'),

  // ── T Spawn ──
  wall(0, 3840, 1024, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'inferno-t-spawn-wall-back'),
  wall(-512, 3072, WALL_THICKNESS_HAMMER, 1536, WALL_HEIGHT_HAMMER, 0, 'inferno-t-spawn-wall-left'),
  wall(512, 3072, WALL_THICKNESS_HAMMER, 1536, WALL_HEIGHT_HAMMER, 0, 'inferno-t-spawn-wall-right'),

  // T Spawn 通往Banana走廊
  wall(-2560, 2048, WALL_THICKNESS_HAMMER, 4096, WALL_HEIGHT_HAMMER, 0, 'inferno-banana-wall-east'),
  wall(-3072, 2048, WALL_THICKNESS_HAMMER, 4096, WALL_HEIGHT_HAMMER, 0, 'inferno-banana-wall-west'),

  // T Spawn 通往Apartments
  wall(-1024, 2048, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, 0, 'inferno-apartments-wall-east'),
  wall(-1536, 2048, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, 0, 'inferno-apartments-wall-west'),

  // Banana 走廊（西侧）
  box(-2816, 1024, 96, 64, 96, 0, 'inferno-banana-box-large'),
  box(-2816, 256, 64, 64, 48, 0, 'inferno-banana-sandbag'),
  box(-2688, -512, 48, 48, 48, 0, 'inferno-banana-box-small'),

  // ── CT Spawn ──
  wall(-512, -3840, 2048, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'inferno-ct-spawn-wall-back'),
  wall(-768, -2560, WALL_THICKNESS_HAMMER, 2560, WALL_HEIGHT_HAMMER, 0, 'inferno-ct-spawn-wall-left'),
  wall(512, -3072, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, 0, 'inferno-ct-spawn-wall-right'),

  // ── A Site ──
  wall(-1536, -3072, 3072, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'inferno-a-site-wall-back'),
  wall(-3072, -1536, WALL_THICKNESS_HAMMER, 3072, WALL_HEIGHT_HAMMER, 0, 'inferno-a-site-wall-west'),
  wall(0, -1536, WALL_THICKNESS_HAMMER, 3072, WALL_HEIGHT_HAMMER, 0, 'inferno-a-site-wall-east'),

  // A Platform
  plat(-1536, -2048, 1536, 1024, PLATFORM_HEIGHT_HAMMER, 0, 'inferno-a-site-platform'),

  // A Site 掩体
  box(-2048, -2304, 96, 96, 128, PLATFORM_HEIGHT_HAMMER, 'inferno-a-site-car'),
  box(-1024, -2304, 64, 48, 96, PLATFORM_HEIGHT_HAMMER, 'inferno-a-site-box'),
  box(-2816, -2048, 96, 96, 48, 0, 'inferno-a-site-sandbag'),

  // A Site 封闭房间（Apartments）
  wall(-1024, -1024, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, 0, 'inferno-a-closed-room-wall-east'),
  wall(-2048, -1024, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, 0, 'inferno-a-closed-room-wall-west'),
  wall(-1536, -2048, 2048, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'inferno-a-closed-room-back'),

  // Apartments上层
  plat(-1536, -512, 2048, 1536, 192, 0, 'inferno-apartments-upper-floor'),

  // ── B Site ──
  wall(1536, -3072, 3072, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'inferno-b-site-wall-back'),
  wall(3072, -1536, WALL_THICKNESS_HAMMER, 3072, WALL_HEIGHT_HAMMER, 0, 'inferno-b-site-wall-east'),
  wall(0, -1536, WALL_THICKNESS_HAMMER, 3072, WALL_HEIGHT_HAMMER, 0, 'inferno-b-site-wall-west'),

  // B Platform
  plat(1536, -2048, 1536, 1024, PLATFORM_HEIGHT_HAMMER, 0, 'inferno-b-site-platform'),

  // B Site 掩体
  box(2048, -2304, 128, 96, 96, PLATFORM_HEIGHT_HAMMER, 'inferno-b-site-box-large'),
  box(1024, -2304, 64, 64, 48, PLATFORM_HEIGHT_HAMMER, 'inferno-b-site-box-small'),
  box(2816, -2048, 96, 64, 96, 0, 'inferno-b-site-ground-box'),

  // ── Mid (中路) ──
  wall(0, 0, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, 0, 'inferno-mid-wall-center'),
  box(0, -256, 64, 64, 48, 0, 'inferno-mid-box'),
];

// 出生点
export const INFERNO_SPAWNS = {
  attackers: [
    { x: hammerToGame(-128), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-3072) },
    { x: hammerToGame(-256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-3072) },
    { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-3072) },
    { x: hammerToGame(128), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-3072) },
    { x: hammerToGame(256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-3072) }
  ],
  defenders: [
    { x: hammerToGame(-128), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3840) },
    { x: hammerToGame(-256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3840) },
    { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3840) },
    { x: hammerToGame(128), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3840) },
    { x: hammerToGame(256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3840) }
  ]
};

export const INFERNO_TDM_SPAWNS = [
  { x: hammerToGame(-128), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-3072) },
  { x: hammerToGame(128), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-3072) },
  { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3840) },
  { x: hammerToGame(-256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3840) },
  { x: hammerToGame(-2816), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-1024) },
  { x: hammerToGame(-1536), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-512) },
  { x: hammerToGame(1536), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-512) },
  { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-2048) }
];

export const INFERNO_BOMB_SITES = {
  A: {
    position: { x: hammerToGame(-1536), y: hammerToGame(PLATFORM_HEIGHT_HAMMER), z: hammerToGame(2048) },
    radius: hammerToGame(512)
  },
  B: {
    position: { x: hammerToGame(1536), y: hammerToGame(PLATFORM_HEIGHT_HAMMER), z: hammerToGame(2048) },
    radius: hammerToGame(512)
  }
};

export const INFERNO_CALLOUTS = [
  { name: 'A Site', position: { x: hammerToGame(-1536), y: PLAYER_EYE_HEIGHT, z: hammerToGame(2048) }, radius: hammerToGame(640) },
  { name: 'B Site', position: { x: hammerToGame(1536), y: PLAYER_EYE_HEIGHT, z: hammerToGame(2048) }, radius: hammerToGame(640) },
  { name: 'Mid', position: { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(0) }, radius: hammerToGame(640) },
  { name: 'Banana', position: { x: hammerToGame(-2816), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-1024) }, radius: hammerToGame(640) },
  { name: 'Apartments', position: { x: hammerToGame(-1280), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-512) }, radius: hammerToGame(512) },
  { name: 'T Spawn', position: { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-3072) }, radius: hammerToGame(512) },
  { name: 'CT Spawn', position: { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3840) }, radius: hammerToGame(512) }
];