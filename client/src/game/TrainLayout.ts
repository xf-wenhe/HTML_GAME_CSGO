/**
 * CSGO TRAIN 地图精确布局 — 基于 Hammer Editor 实际测量数据
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

export interface TrainCollider {
  position: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  name?: string;
}

function wall(x: number, z: number, w: number, d: number, h: number = WALL_HEIGHT_HAMMER, yOff: number = 0, name?: string): TrainCollider {
  return {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size: { x: hammerToGame(w), y: hammerToGame(h), z: hammerToGame(d) },
    name
  };
}

function box(x: number, z: number, w: number, d: number, h: number = STANDARD_BOX_HEIGHT_HAMMER, yOff: number = 0, name?: string): TrainCollider {
  return {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size: { x: hammerToGame(w), y: hammerToGame(h), z: hammerToGame(d) },
    name
  };
}

function plat(x: number, z: number, w: number, d: number, h: number = PLATFORM_HEIGHT_HAMMER, yOff: number = 0, name?: string): TrainCollider {
  return {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size: { x: hammerToGame(w), y: hammerToGame(h), z: hammerToGame(d) },
    name
  };
}

// TRAIN 地图边界 (~7168 x 9728 Hammer units)
const TRAIN_WIDTH = 7168;
const TRAIN_DEPTH = 9728;

export const TRAIN_COLLIDERS: TrainCollider[] = [
  // ── 外围边界 ──
  wall(0, 4864, TRAIN_WIDTH, WALL_THICKNESS_HAMMER, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'train-boundary-south'),
  wall(0, -4864, TRAIN_WIDTH, WALL_THICKNESS_HAMMER, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'train-boundary-north'),
  wall(-3584, 0, WALL_THICKNESS_HAMMER, TRAIN_DEPTH, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'train-boundary-west'),
  wall(3584, 0, WALL_THICKNESS_HAMMER, TRAIN_DEPTH, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'train-boundary-east'),

  // ── T Spawn ──
  wall(512, 4096, WALL_THICKNESS_HAMMER, 1536, WALL_HEIGHT_HAMMER, 0, 'train-t-spawn-wall-right'),
  wall(-512, 4096, WALL_THICKNESS_HAMMER, 1536, WALL_HEIGHT_HAMMER, 0, 'train-t-spawn-wall-left'),
  wall(0, 4864, 1024, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'train-t-spawn-wall-back'),

  // T Spawn 箱子
  box(256, 4608, 64, 64, 48, 0, 'train-t-spawn-box-right'),
  box(-256, 4608, 64, 64, 48, 0, 'train-t-spawn-box-left'),

  // ── CT Spawn ──
  wall(-512, -3840, 2048, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'train-ct-spawn-wall-back'),
  wall(-768, -2560, WALL_THICKNESS_HAMMER, 2560, WALL_HEIGHT_HAMMER, 0, 'train-ct-spawn-wall-left'),
  wall(512, -3072, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, 0, 'train-ct-spawn-wall-right'),

  // ── Train Cars (标志性火车车厢) ──
  box(-1792, 0, 512, 128, 192, 0, 'train-car-left-1'),
  box(-1792, -1024, 512, 128, 192, 0, 'train-car-left-2'),
  box(-1792, -2048, 512, 128, 192, 0, 'train-car-left-3'),
  box(1792, 0, 512, 128, 192, 0, 'train-car-right-1'),
  box(1792, -1024, 512, 128, 192, 0, 'train-car-right-2'),
  box(1792, -2048, 512, 128, 192, 0, 'train-car-right-3'),

  // Train Cars 顶部平台
  plat(-1792, 0, 512, 3072, 192, 0, 'train-car-left-top-platform'),
  plat(1792, 0, 512, 3072, 192, 0, 'train-car-right-top-platform'),

  // ── Ladder Room (上层区域) ──
  wall(-2560, 3072, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, 0, 'train-ladder-room-wall-west'),
  wall(-1024, 3072, WALL_THICKNESS_HAMMER, 2048, WALL_HEIGHT_HAMMER, 0, 'train-ladder-room-wall-east'),
  wall(-1792, 2048, 3072, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'train-ladder-room-wall-south'),
  wall(-1792, 4096, 3072, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'train-ladder-room-wall-north'),
  box(-1792, 3072, 96, 64, TALL_BOX_HEIGHT_HAMMER, 0, 'train-ladder-room-box'),

  // ── A Site ──
  wall(-2688, -3584, 4096, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'train-a-site-wall-back'),
  wall(-3584, -1792, WALL_THICKNESS_HAMMER, 3584, WALL_HEIGHT_HAMMER, 0, 'train-a-site-wall-west'),
  wall(-1792, -1792, WALL_THICKNESS_HAMMER, 3584, WALL_HEIGHT_HAMMER, 0, 'train-a-site-wall-east'),

  // A Site 封闭房间
  wall(-3072, -2048, WALL_THICKNESS_HAMMER, 1536, WALL_HEIGHT_HAMMER, 0, 'train-a-closed-room-wall'),
  wall(-3584, -2816, 1024, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'train-a-closed-room-back'),

  // A Site 掩体
  box(-3072, -2816, 128, 128, 96, 0, 'train-a-site-box-large'),
  box(-2304, -2816, 64, 64, 48, 0, 'train-a-site-box-small'),

  // ── B Site ──
  wall(2688, -3584, 4096, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'train-b-site-wall-back'),
  wall(3584, -1792, WALL_THICKNESS_HAMMER, 3584, WALL_HEIGHT_HAMMER, 0, 'train-b-site-wall-east'),
  wall(1792, -1792, WALL_THICKNESS_HAMMER, 3584, WALL_HEIGHT_HAMMER, 0, 'train-b-site-wall-west'),

  // B Site 封闭房间
  wall(3072, -2048, WALL_THICKNESS_HAMMER, 1536, WALL_HEIGHT_HAMMER, 0, 'train-b-closed-room-wall'),
  wall(3584, -2816, 1024, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'train-b-closed-room-back'),

  // B Site 掩体
  box(3072, -2816, 128, 128, 96, 0, 'train-b-site-box-large'),
  box(2304, -2816, 64, 64, 48, 0, 'train-b-site-box-small'),

  // ── Upper Train (上层) ──
  plat(0, -512, 2048, 1024, 256, 0, 'train-upper-second-floor'),
  box(0, -1536, 96, 64, TALL_BOX_HEIGHT_HAMMER, 0, 'train-upper-box'),
];

// 出生点
export const TRAIN_SPAWNS = {
  attackers: [
    { x: hammerToGame(512), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4096) },
    { x: hammerToGame(256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4096) },
    { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4096) },
    { x: hammerToGame(1024), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4096) },
    { x: hammerToGame(1280), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4096) }
  ],
  defenders: [
    { x: hammerToGame(-128), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3840) },
    { x: hammerToGame(-256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3840) },
    { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3840) },
    { x: hammerToGame(128), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3840) },
    { x: hammerToGame(256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3840) }
  ]
};

export const TRAIN_TDM_SPAWNS = [
  { x: hammerToGame(512), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4096) },
  { x: hammerToGame(-128), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3840) },
  { x: hammerToGame(-1792), y: hammerToGame(256), z: hammerToGame(-512) },
  { x: hammerToGame(1792), y: hammerToGame(256), z: hammerToGame(-512) },
  { x: hammerToGame(-2688), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-2816) },
  { x: hammerToGame(2688), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-2816) },
  { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-2048) },
  { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(0) }
];

export const TRAIN_BOMB_SITES = {
  A: {
    position: { x: hammerToGame(-2688), y: hammerToGame(PLATFORM_HEIGHT_HAMMER), z: hammerToGame(1792) },
    radius: hammerToGame(512)
  },
  B: {
    position: { x: hammerToGame(2688), y: hammerToGame(PLATFORM_HEIGHT_HAMMER), z: hammerToGame(1792) },
    radius: hammerToGame(512)
  }
};

export const TRAIN_CALLOUTS = [
  { name: 'A Site', position: { x: hammerToGame(-2688), y: PLAYER_EYE_HEIGHT, z: hammerToGame(1792) }, radius: hammerToGame(640) },
  { name: 'B Site', position: { x: hammerToGame(2688), y: PLAYER_EYE_HEIGHT, z: hammerToGame(1792) }, radius: hammerToGame(640) },
  { name: 'Mid', position: { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-512) }, radius: hammerToGame(640) },
  { name: 'Upper Train', position: { x: hammerToGame(0), y: hammerToGame(320), z: hammerToGame(-512) }, radius: hammerToGame(768) },
  { name: 'T Spawn', position: { x: hammerToGame(512), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-4096) }, radius: hammerToGame(512) },
  { name: 'CT Spawn', position: { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3840) }, radius: hammerToGame(512) },
  { name: 'Ladder Room', position: { x: hammerToGame(-1792), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3072) }, radius: hammerToGame(512) }
];