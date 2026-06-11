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
    name,
  };
}

function box(x: number, z: number, w: number, d: number, h: number = STANDARD_BOX_HEIGHT_HAMMER, yOff: number = 0, name?: string): InfernoCollider {
  return {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size: { x: hammerToGame(w), y: hammerToGame(h), z: hammerToGame(d) },
    name,
  };
}

function plat(x: number, z: number, w: number, d: number, h: number = PLATFORM_HEIGHT_HAMMER, yOff: number = 0, name?: string): InfernoCollider {
  return {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size: { x: hammerToGame(w), y: hammerToGame(h), z: hammerToGame(d) },
    name,
  };
}

function stairsZ(x: number, z0: number, w: number, totalD: number, h0: number, h1: number, steps: number, name: string): InfernoCollider[] {
  const sd = totalD / steps;
  const dh = (h1 - h0) / steps;
  return Array.from({ length: steps }, (_, i) => {
    const stepZ = z0 + sd * (i + 0.5);
    const stepH = h0 + dh * (i + 1);
    return box(x, stepZ, w, sd, stepH, 0, `${name}-${i}`);
  });
}

function stairsX(x0: number, z: number, totalW: number, d: number, h0: number, h1: number, steps: number, name: string): InfernoCollider[] {
  const sw = totalW / steps;
  const dh = (h1 - h0) / steps;
  return Array.from({ length: steps }, (_, i) => {
    const stepX = x0 + sw * (i + 0.5);
    const stepH = h0 + dh * (i + 1);
    return box(stepX, z, sw, d, stepH, 0, `${name}-${i}`);
  });
}

function stairsL(name: string, startX: number, startZ: number, w: number, d: number, firstRise: number, secondRise: number, cornerX: number, cornerZ: number): InfernoCollider[] {
  const firstRun = startZ - cornerZ;
  const secondRun = cornerX - startX;
  const firstCount = Math.max(1, Math.round(firstRun / STEP_DEPTH_HAMMER));
  const secondCount = Math.max(1, Math.round(secondRun / STEP_DEPTH_HAMMER));
  const legs = [
    ...stairsZ(startX, startZ - firstRun, w, firstRun, 0, firstRise, firstCount, `${name}-leg1`),
    ...stairsX(cornerX, cornerZ, secondRun, d, firstRise, firstRise + secondRise, secondCount, `${name}-leg2`),
  ];
  return legs;
}

const INFERNO_WIDTH = 7168;
const INFERNO_DEPTH = 8192;

export const INFERNO_COLLIDERS: InfernoCollider[] = [
  wall(0, 4096, INFERNO_WIDTH, WALL_THICKNESS_HAMMER, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'inferno-boundary-south'),
  wall(0, -4096, INFERNO_WIDTH, WALL_THICKNESS_HAMMER, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'inferno-boundary-north'),
  wall(-3584, 0, WALL_THICKNESS_HAMMER, INFERNO_DEPTH, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'inferno-boundary-west'),
  wall(3584, 0, WALL_THICKNESS_HAMMER, INFERNO_DEPTH, BOUNDARY_WALL_HEIGHT_HAMMER, 0, 'inferno-boundary-east'),

  wall(0, 3840, 1024, WALL_THICKNESS_HAMMER, WALL_HEIGHT_HAMMER, 0, 'inferno-t-spawn-wall-back'),
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

export const INFERNO_SPAWNS = {
  attackers: [
    { x: hammerToGame(-128), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-3072) },
    { x: hammerToGame(-256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-3072) },
    { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-3072) },
    { x: hammerToGame(128), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-3072) },
    { x: hammerToGame(256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-3072) },
  ],
  defenders: [
    { x: hammerToGame(-128), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3840) },
    { x: hammerToGame(-256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3840) },
    { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3840) },
    { x: hammerToGame(128), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3840) },
    { x: hammerToGame(256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3840) },
  ],
};

export const INFERNO_TDM_SPAWNS = [
  { x: hammerToGame(-128), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-3072) },
  { x: hammerToGame(128), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-3072) },
  { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3840) },
  { x: hammerToGame(-256), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3840) },
  { x: hammerToGame(-2816), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-1024) },
  { x: hammerToGame(-1536), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-512) },
  { x: hammerToGame(1536), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-512) },
  { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-2048) },
  { x: hammerToGame(-384), y: PLAYER_EYE_HEIGHT, z: hammerToGame(2560) },
  { x: hammerToGame(384), y: PLAYER_EYE_HEIGHT, z: hammerToGame(2560) },
  { x: hammerToGame(-384), y: PLAYER_EYE_HEIGHT, z: hammerToGame(1280) },
  { x: hammerToGame(384), y: PLAYER_EYE_HEIGHT, z: hammerToGame(1280) },
];

export const INFERNO_BOMB_SITES = {
  A: {
    position: { x: hammerToGame(-1536), y: hammerToGame(PLATFORM_HEIGHT_HAMMER), z: hammerToGame(2048) },
    radius: hammerToGame(512),
  },
  B: {
    position: { x: hammerToGame(1536), y: hammerToGame(PLATFORM_HEIGHT_HAMMER), z: hammerToGame(2048) },
    radius: hammerToGame(512),
  },
};

export const INFERNO_CALLOUTS = [
  { name: 'A Site', position: { x: hammerToGame(-1536), y: PLAYER_EYE_HEIGHT, z: hammerToGame(2048) }, radius: hammerToGame(640) },
  { name: 'B Site', position: { x: hammerToGame(1536), y: PLAYER_EYE_HEIGHT, z: hammerToGame(2048) }, radius: hammerToGame(640) },
  { name: 'Mid', position: { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(0) }, radius: hammerToGame(640) },
  { name: 'Banana', position: { x: hammerToGame(-2816), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-1024) }, radius: hammerToGame(640) },
  { name: 'Apartments', position: { x: hammerToGame(-1280), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-512) }, radius: hammerToGame(512) },
  { name: 'T Spawn', position: { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-3072) }, radius: hammerToGame(512) },
  { name: 'CT Spawn', position: { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(3840) }, radius: hammerToGame(512) },
  { name: 'A Long', position: { x: hammerToGame(-3072), y: PLAYER_EYE_HEIGHT, z: hammerToGame(1024) }, radius: hammerToGame(640) },
  { name: 'B Short', position: { x: hammerToGame(3072), y: PLAYER_EYE_HEIGHT, z: hammerToGame(1024) }, radius: hammerToGame(640) },
];
