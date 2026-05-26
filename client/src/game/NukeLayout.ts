/**
 * CSGO NUKE 地图精确布局 — 基于 Hammer Editor 实际测量数据
 * 缩放: 0.01x
 * Nuke 特点: 双层结构（上层 A Site、下层 B Site）
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

export interface NukeCollider {
  position: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  name?: string;
}

function wall(x: number, z: number, w: number, d: number, h: number = WALL_HEIGHT_HAMMER, yOff: number = 0, name?: string): NukeCollider {
  return {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size: { x: hammerToGame(w), y: hammerToGame(h), z: hammerToGame(d) },
    name
  };
}

function box(x: number, z: number, w: number, d: number, h: number = STANDARD_BOX_HEIGHT_HAMMER, yOff: number = 0, name?: string): NukeCollider {
  return {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size: { x: hammerToGame(w), y: hammerToGame(h), z: hammerToGame(d) },
    name
  };
}

function plat(x: number, z: number, w: number, d: number, h: number = PLATFORM_HEIGHT_HAMMER, yOff: number = 0, name?: string): NukeCollider {
  return {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size: { x: hammerToGame(w), y: hammerToGame(h), z: hammerToGame(d) },
    name
  };
}

// NUKE 地图边界 (~7168 x 8704 Hammer units)
const NUKE_WIDTH = 7168;
const NUKE_DEPTH = 8704;

// B Site 层高偏移 (-256 Hammer units 低于地面)
const B_SITE_FLOOR_Y = -256;

export const NUKE_COLLIDERS: NukeCollider[] = [
  // ── 外围边界 ──
  wall(0, 4352, NUKE_WIDTH, WALL_THICKNESS_HAMMER, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'nuke-boundary-south'),
  wall(0, -4352, NUKE_WIDTH, WALL_THICKNESS_HAMMER, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'nuke-boundary-north'),
  wall(-3584, 0, WALL_THICKNESS_HAMMER, NUKE_DEPTH, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'nuke-boundary-west'),
  wall(3584, 0, WALL_THICKNESS_HAMMER, NUKE_DEPTH, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'nuke-boundary-east'),

  // ── T Spawn ──
  wall(0, 4096, 2048, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'nuke-t-spawn-wall-back'),
  wall(-768, 3072, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, 0, 'nuke-t-spawn-wall-left'),
  wall(768, 3072, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, 0, 'nuke-t-spawn-wall-right'),

  // T Spawn 箱子
  box(-256, 3584, 64, 64, 48, 0, 'nuke-t-spawn-box-left'),
  box(256, 3584, 64, 64, 48, 0, 'nuke-t-spawn-box-right'),

  // ── CT Spawn / Outside ──
  wall(0, -3840, 2048, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'nuke-ct-spawn-wall-back'),
  wall(-768, -2560, WALL_THICKNESS_HAMMER, 2560, WALL_HEIGHT_HAMMER, 0, 'nuke-ct-spawn-wall-left'),
  wall(768, -2560, WALL_THICKNESS_HAMMER, 2560, WALL_HEIGHT_HAMMER, 0, 'nuke-ct-spawn-wall-right'),

  // Outside area (CT到A Site通道)
  wall(-768, 0, WALL_THICKNESS_HAMMER, 4096, WALL_HEIGHT_HAMMER, 0, 'nuke-outside-wall-left'),
  wall(768, 0, WALL_THICKNESS_HAMMER, 4096, WALL_HEIGHT_HAMMER, 0, 'nuke-outside-wall-right'),

  // ── 主建筑外墙 (Nuke 核电站主体) ──
  wall(-1792, -1024, WALL_THICKNESS_HAMMER, 4096, WALL_HEIGHT_HAMMER, 0, 'nuke-main-building-wall-west'),
  wall(1792, -1024, WALL_THICKNESS_HAMMER, 4096, WALL_HEIGHT_HAMMER, 0, 'nuke-main-building-wall-east'),
  wall(0, 1024, 3584, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'nuke-main-building-wall-north'),
  wall(0, -3072, 3584, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'nuke-main-building-wall-south'),

  // ── A Site (上层) ──
  // A Site 地板 (主层)
  plat(0, -1024, 3584, 2048, 16, 0, 'nuke-a-site-floor'),
  wall(-1536, -1024, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, 0, 'nuke-a-site-wall-inner-left'),
  wall(1536, -1024, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, 0, 'nuke-a-site-wall-inner-right'),

  // A Site 掩体
  box(-768, -1536, 128, 96, 96, 0, 'nuke-a-site-box-large'),
  box(768, -1536, 128, 96, 96, 0, 'nuke-a-site-box-right'),
  box(0, -2048, 64, 64, 48, 0, 'nuke-a-site-small-box'),
  box(-1280, -2304, 96, 64, TALL_BOX_HEIGHT_HAMMER, 0, 'nuke-a-site-tall-box'),

  // A Site 封闭房间 (CT Room)
  wall(-2688, -2048, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, 0, 'nuke-a-closed-room-wall-west'),
  wall(-1792, -2816, 1792, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'nuke-a-closed-room-wall-back'),

  // ── Ramp (下层斜坡) ──
  plat(0, 0, 1536, 512, 16, 0, 'nuke-ramp-floor'),
  wall(-768, 0, WALL_THICKNESS_HAMMER, 512, WALL_HEIGHT_HAMMER, 0, 'nuke-ramp-wall-left'),
  wall(768, 0, WALL_THICKNESS_HAMMER, 512, WALL_HEIGHT_HAMMER, 0, 'nuke-ramp-wall-right'),

  // ── B Site (下层 -256 offset) ──
  // B Site 地板
  plat(0, -1024, 3584, 2048, 16, B_SITE_FLOOR_Y, 'nuke-b-site-floor'),
  wall(-1536, -1024, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, B_SITE_FLOOR_Y, 'nuke-b-site-wall-left'),
  wall(1536, -1024, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, B_SITE_FLOOR_Y, 'nuke-b-site-wall-right'),
  wall(0, 0, 3584, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, B_SITE_FLOOR_Y, 'nuke-b-site-wall-north'),
  wall(0, -2048, 3584, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, B_SITE_FLOOR_Y, 'nuke-b-site-wall-south'),

  // B Site 掩体
  box(-768, -1536, 128, 96, 96, B_SITE_FLOOR_Y, 'nuke-b-site-box-large'),
  box(768, -1536, 128, 96, 96, B_SITE_FLOOR_Y, 'nuke-b-site-box-right'),
  box(0, -2048, 64, 64, 48, B_SITE_FLOOR_Y, 'nuke-b-site-small-box'),

  // B Site 封闭房间 (Secret)
  wall(-2688, -1024, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, B_SITE_FLOOR_Y, 'nuke-b-closed-room-wall'),
  wall(-1792, -2048, 1792, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, B_SITE_FLOOR_Y, 'nuke-b-closed-room-back'),

  // ── Upper (二楼区域) ──
  plat(0, -1024, 1536, 2048, 256, 0, 'nuke-upper-second-floor'),
  wall(-768, -1024, WALL_THICKNESS_HAMMER, 2048, 64, 256, 'nuke-upper-railing-left'),
  wall(768, -1024, WALL_THICKNESS_HAMMER, 2048, 64, 256, 'nuke-upper-railing-right'),

  // ── Hut (外部小屋) ──
  box(-2688, 2048, 512, 512, 192, 0, 'nuke-hut-building'),
  box(2688, 2048, 512, 512, 192, 0, 'nuke-silo-building'),
];

// 出生点
export const NUKE_SPAWNS = {
  attackers: [
    { x: hammerToGame(-256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4352) },
    { x: hammerToGame(-512), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4352) },
    { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4352) },
    { x: hammerToGame(256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4352) },
    { x: hammerToGame(512), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4352) }
  ],
  defenders: [
    { x: hammerToGame(-256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(4352) },
    { x: hammerToGame(-512), y: PLAYER_EYE_HEIGHT, z: hammerToGame(4352) },
    { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(4352) },
    { x: hammerToGame(256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(4352) },
    { x: hammerToGame(512), y: PLAYER_EYE_HEIGHT, z: hammerToGame(4352) }
  ]
};

export const NUKE_TDM_SPAWNS = [
  { x: hammerToGame(-256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4096) },
  { x: hammerToGame(256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4096) },
  { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(4096) },
  { x: hammerToGame(-256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(4096) },
  { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-1024) },
  { x: hammerToGame(0), y: hammerToGame(B_SITE_FLOOR_Y + 64), z: hammerToGame(-1024) },
  { x: hammerToGame(-768), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-2048) },
  { x: hammerToGame(768), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-2048) }
];

export const NUKE_BOMB_SITES = {
  A: {
    position: { x: hammerToGame(0), y: hammerToGame(PLATFORM_HEIGHT_HAMMER), z: hammerToGame(1024) },
    radius: hammerToGame(512)
  },
  B: {
    position: { x: hammerToGame(0), y: hammerToGame(B_SITE_FLOOR_Y + PLATFORM_HEIGHT_HAMMER), z: hammerToGame(1024) },
    radius: hammerToGame(512)
  }
};

export const NUKE_CALLOUTS = [
  { name: 'A Site', position: { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(1024) }, radius: hammerToGame(640) },
  { name: 'B Site', position: { x: hammerToGame(0), y: hammerToGame(B_SITE_FLOOR_Y + 64), z: hammerToGame(1024) }, radius: hammerToGame(640) },
  { name: 'Upper', position: { x: hammerToGame(0), y: hammerToGame(320), z: hammerToGame(1024) }, radius: hammerToGame(640) },
  { name: 'Outside', position: { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(0) }, radius: hammerToGame(768) },
  { name: 'Mid', position: { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(768) }, radius: hammerToGame(512) },
  { name: 'Ramp', position: { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-256) }, radius: hammerToGame(512) },
  { name: 'T Spawn', position: { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4096) }, radius: hammerToGame(512) },
  { name: 'CT Spawn', position: { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3840) }, radius: hammerToGame(512) }
];
