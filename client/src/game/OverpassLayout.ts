/**
 * CSGO OVERPASS 地图精确布局 — 基于 Hammer Editor 实际测量数据
 * 缩放: 0.01x
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

export interface OverpassCollider {
  position: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  name?: string;
}

function wall(x: number, z: number, w: number, d: number, h: number = WALL_HEIGHT_HAMMER, yOff: number = 0, name?: string): OverpassCollider {
  return {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size: { x: hammerToGame(w), y: hammerToGame(h), z: hammerToGame(d) },
    name
  };
}

function box(x: number, z: number, w: number, d: number, h: number = STANDARD_BOX_HEIGHT_HAMMER, yOff: number = 0, name?: string): OverpassCollider {
  return {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size: { x: hammerToGame(w), y: hammerToGame(h), z: hammerToGame(d) },
    name
  };
}

function plat(x: number, z: number, w: number, d: number, h: number = PLATFORM_HEIGHT_HAMMER, yOff: number = 0, name?: string): OverpassCollider {
  return {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size: { x: hammerToGame(w), y: hammerToGame(h), z: hammerToGame(d) },
    name
  };
}

// OVERPASS 地图边界 (~7680 x 9728 Hammer units)
const OVERPASS_WIDTH = 7680;
const OVERPASS_DEPTH = 9728;

export const OVERPASS_COLLIDERS: OverpassCollider[] = [
  // ── 外围边界 ──
  wall(0, 4864, OVERPASS_WIDTH, WALL_THICKNESS_HAMMER, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'overpass-boundary-south'),
  wall(0, -4864, OVERPASS_WIDTH, WALL_THICKNESS_HAMMER, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'overpass-boundary-north'),
  wall(-3840, 0, WALL_THICKNESS_HAMMER, OVERPASS_DEPTH, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'overpass-boundary-west'),
  wall(3840, 0, WALL_THICKNESS_HAMMER, OVERPASS_DEPTH, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'overpass-boundary-east'),

  // ── T Spawn ──
  wall(0, 4096, 2048, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'overpass-t-spawn-wall-back'),
  wall(-512, 3072, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, 0, 'overpass-t-spawn-wall-left'),
  wall(512, 3072, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, 0, 'overpass-t-spawn-wall-right'),

  // T Spawn 箱子
  box(-256, 3584, 64, 64, 48, 0, 'overpass-t-spawn-box-left'),
  box(256, 3584, 64, 64, 48, 0, 'overpass-t-spawn-box-right'),

  // ── CT Spawn ──
  wall(0, -3840, 2048, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'overpass-ct-spawn-wall-back'),
  wall(-768, -2560, WALL_THICKNESS_HAMMER, 2560, WALL_HEIGHT_HAMMER, 0, 'overpass-ct-spawn-wall-left'),
  wall(768, -2560, WALL_THICKNESS_HAMMER, 2560, WALL_HEIGHT_HAMMER, 0, 'overpass-ct-spawn-wall-right'),

  // ── Canal / Water Area (中央运河) ──
  wall(-256, 1024, WALL_THICKNESS_HAMMER, 4096, WALL_HEIGHT_HAMMER, 0, 'overpass-canal-wall-left'),
  wall(256, 1024, WALL_THICKNESS_HAMMER, 4096, WALL_HEIGHT_HAMMER, 0, 'overpass-canal-wall-right'),
  plat(0, 1024, 512, 4096, 16, -16, 'overpass-canal-floor'),

  // ── Bridge (上层桥) ──
  plat(0, 1024, 3584, 1536, 128, 0, 'overpass-bridge-upper-floor'),
  wall(-1792, 1024, WALL_THICKNESS_HAMMER, 1536, 64, 128, 'overpass-bridge-railing-left'),
  wall(1792, 1024, WALL_THICKNESS_HAMMER, 1536, 64, 128, 'overpass-bridge-railing-right'),

  // Bridge 底部支撑
  box(-1536, 512, 256, 128, 192, 0, 'overpass-bridge-pillar-left'),
  box(1536, 512, 256, 128, 192, 0, 'overpass-bridge-pillar-right'),

  // ── Short (下层通道) ──
  wall(-512, -512, WALL_THICKNESS_HAMMER, 3072, WALL_HEIGHT_HAMMER, 0, 'overpass-short-wall-left'),
  wall(512, -512, WALL_THICKNESS_HAMMER, 3072, WALL_HEIGHT_HAMMER, 0, 'overpass-short-wall-right'),

  // ── A Site ──
  wall(-2688, -3072, 3584, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'overpass-a-site-wall-back'),
  wall(-3584, -1536, WALL_THICKNESS_HAMMER, 3072, WALL_HEIGHT_HAMMER, 0, 'overpass-a-site-wall-west'),
  wall(-1792, -1536, WALL_THICKNESS_HAMMER, 3072, WALL_HEIGHT_HAMMER, 0, 'overpass-a-site-wall-east'),

  // A Site 平台
  plat(-2688, -2048, 1536, 1024, PLATFORM_HEIGHT_HAMMER, 0, 'overpass-a-site-platform'),

  // A Site 掩体
  box(-3072, -2560, 96, 96, 96, 0, 'overpass-a-site-box-large'),
  box(-2304, -2560, 64, 64, 48, 0, 'overpass-a-site-box-small'),
  box(-2688, -2048, 64, 64, TALL_BOX_HEIGHT_HAMMER, 0, 'overpass-a-site-tall-box'),

  // A Site 封闭房间
  wall(-3072, -1792, WALL_THICKNESS_HAMMER, 1536, WALL_HEIGHT_HAMMER, 0, 'overpass-a-closed-room-wall'),
  wall(-3584, -2560, 1024, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'overpass-a-closed-room-back'),

  // ── B Site ──
  wall(2688, -3072, 3584, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'overpass-b-site-wall-back'),
  wall(3584, -1536, WALL_THICKNESS_HAMMER, 3072, WALL_HEIGHT_HAMMER, 0, 'overpass-b-site-wall-east'),
  wall(1792, -1536, WALL_THICKNESS_HAMMER, 3072, WALL_HEIGHT_HAMMER, 0, 'overpass-b-site-wall-west'),

  // B Site 平台
  plat(2688, -2048, 1536, 1024, PLATFORM_HEIGHT_HAMMER, 0, 'overpass-b-site-platform'),

  // B Site 掩体
  box(3072, -2560, 96, 96, 96, 0, 'overpass-b-site-box-large'),
  box(2304, -2560, 64, 64, 48, 0, 'overpass-b-site-box-small'),
  box(2688, -2048, 64, 64, TALL_BOX_HEIGHT_HAMMER, 0, 'overpass-b-site-tall-box'),

  // B Site 封闭房间
  wall(3072, -1792, WALL_THICKNESS_HAMMER, 1536, WALL_HEIGHT_HAMMER, 0, 'overpass-b-closed-room-wall'),
  wall(3584, -2560, 1024, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'overpass-b-closed-room-back'),

  // ── Fountain / Park Area ──
  box(0, 2048, 128, 128, 48, 0, 'overpass-fountain-base'),
  box(0, 2048, 64, 64, 96, 48, 'overpass-fountain-pillar'),
  box(-512, 2560, 64, 64, 48, 0, 'overpass-park-box-left'),
  box(512, 2560, 64, 64, 48, 0, 'overpass-park-box-right'),
];

// 出生点
export const OVERPASS_SPAWNS = {
  attackers: [
    { x: hammerToGame(-256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4608) },
    { x: hammerToGame(-512), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4608) },
    { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4608) },
    { x: hammerToGame(256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4608) },
    { x: hammerToGame(512), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4608) }
  ],
  defenders: [
    { x: hammerToGame(-256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(4608) },
    { x: hammerToGame(-512), y: PLAYER_EYE_HEIGHT, z: hammerToGame(4608) },
    { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(4608) },
    { x: hammerToGame(256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(4608) },
    { x: hammerToGame(512), y: PLAYER_EYE_HEIGHT, z: hammerToGame(4608) }
  ]
};

export const OVERPASS_TDM_SPAWNS = [
  { x: hammerToGame(-256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4096) },
  { x: hammerToGame(256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4096) },
  { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(4096) },
  { x: hammerToGame(-256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(4096) },
  { x: hammerToGame(-2688), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-2048) },
  { x: hammerToGame(2688), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-2048) },
  { x: hammerToGame(0), y: hammerToGame(160), z: hammerToGame(-1024) },
  { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(2048) }
];

export const OVERPASS_BOMB_SITES = {
  A: {
    position: { x: hammerToGame(-2688), y: hammerToGame(PLATFORM_HEIGHT_HAMMER), z: hammerToGame(2048) },
    radius: hammerToGame(512)
  },
  B: {
    position: { x: hammerToGame(2688), y: hammerToGame(PLATFORM_HEIGHT_HAMMER), z: hammerToGame(2048) },
    radius: hammerToGame(512)
  }
};

export const OVERPASS_CALLOUTS = [
  { name: 'A Site', position: { x: hammerToGame(-2688), y: PLAYER_EYE_HEIGHT, z: hammerToGame(2048) }, radius: hammerToGame(640) },
  { name: 'B Site', position: { x: hammerToGame(2688), y: PLAYER_EYE_HEIGHT, z: hammerToGame(2048) }, radius: hammerToGame(640) },
  { name: 'Bridge', position: { x: hammerToGame(0), y: hammerToGame(192), z: hammerToGame(-1024) }, radius: hammerToGame(768) },
  { name: 'Canal', position: { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-1024) }, radius: hammerToGame(512) },
  { name: 'Mid', position: { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(0) }, radius: hammerToGame(512) },
  { name: 'Fountain', position: { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(2048) }, radius: hammerToGame(512) },
  { name: 'T Spawn', position: { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4096) }, radius: hammerToGame(512) },
  { name: 'CT Spawn', position: { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3840) }, radius: hammerToGame(512) }
];
