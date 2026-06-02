/**
 * CS 1.6 fy_bloodstrike — 1:1 纯正原版几何复刻
 * 修复了 U型出生点地堡、精确的 512x512 中心实体块以及完美对齐的高台阶梯。
 */

import { hammerToGame, PLAYER_EYE_HEIGHT } from './constants/MapUnits.js';

export type MaterialType = 'concrete' | 'wood' | 'brick' | 'metal' | 'sand';

export interface BloodStrikeCollider {
  position: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  name?: string;
  color: number;
  material: MaterialType; 
}

const C_WALL = 0xd4c3a3;     
const C_WOOD = 0x8b5a2b;     
const C_DARK_WALL = 0xa3957b; 
const C_WALKWAY = 0x9ca098;

function wall(x: number, z: number, w: number, d: number, h = 256, yOff = 0, name?: string, color = C_WALL, material: MaterialType = 'concrete'): BloodStrikeCollider {
  return {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size: { x: hammerToGame(w), y: hammerToGame(h), z: hammerToGame(d) },
    name, color, material
  };
}

function box(x: number, z: number, w: number, d: number, h = 64, yOff = 0, name?: string, color = C_WOOD, material: MaterialType = 'wood'): BloodStrikeCollider {
  return {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size: { x: hammerToGame(w), y: hammerToGame(h), z: hammerToGame(d) },
    name, color, material
  };
}

export const BLOODSTRIKE_COLLIDERS: BloodStrikeCollider[] = [
  // ── 1. 外围边界厚墙 (1568 x 1568 内场空间) ──
  wall(0, -800, 1632, 32, 576, 0, 'boundary-north', C_DARK_WALL),
  wall(0,  800, 1632, 32, 576, 0, 'boundary-south', C_DARK_WALL),
  wall(-800, 0, 32, 1568, 576, 0, 'boundary-west', C_DARK_WALL),
  wall( 800, 0, 32, 1568, 576, 0, 'boundary-east', C_DARK_WALL),

  // ── 2. 物理天花板 (用于反弹道具) ──
  box(0, 0, 1632, 1632, 32, 576, 'bs-sky-ceiling', 0x6a8cc7, 'concrete'),

  // ── 3. 绝对中心的实体方块 (512x512) ──
  wall(0, 0, 512, 512, 256, 0, 'center-solid-block', C_WALL),

  // ── 4. 左右两侧被抬高的高台走廊 (高度 64, 宽度 256) ──
  box(-640, 0, 256, 768, 64, 0, 'west-walkway-floor', C_WALKWAY, 'concrete'),
  box( 640, 0, 256, 768, 64, 0, 'east-walkway-floor', C_WALKWAY, 'concrete'),

  // ── 5. 高台内侧的经典矮墙 (爆头线掩体) ──
  // 总高 100，减去高台的 64，刚好高出 36 (CS1.6 完美下蹲隐藏高度)
  wall(-504, 0, 16, 1024, 100, 0, 'west-low-wall', C_WALL),
  wall( 504, 0, 16, 1024, 100, 0, 'east-low-wall', C_WALL),

  // ── 6. 1:1 老家 U型防守地堡 (解决中路对穿的致命错误) ──
  // T老家地堡 (南侧)
  wall(0, 528, 512, 32, 256, 0, 't-bunker-front', C_WALL),     // 正面横墙，彻底阻挡中路视野
  wall(-240, 608, 32, 128, 256, 0, 't-bunker-left', C_WALL),   // 左翼护墙
  wall( 240, 608, 32, 128, 256, 0, 't-bunker-right', C_WALL),  // 右翼护墙
  
  // CT老家地堡 (北侧)
  wall(0, -528, 512, 32, 256, 0, 'ct-bunker-front', C_WALL),
  wall(-240, -608, 32, 128, 256, 0, 'ct-bunker-left', C_WALL),
  wall( 240, -608, 32, 128, 256, 0, 'ct-bunker-right', C_WALL),

  // ── 7. 高台走廊连接阶梯 (三级平滑台阶) ──
  // T侧南阶梯
  box(-640, 400, 256, 32, 48, 0, 't-west-step1', C_WALKWAY, 'concrete'),
  box(-640, 432, 256, 32, 32, 0, 't-west-step2', C_WALKWAY, 'concrete'),
  box(-640, 464, 256, 32, 16, 0, 't-west-step3', C_WALKWAY, 'concrete'),
  box( 640, 400, 256, 32, 48, 0, 't-east-step1', C_WALKWAY, 'concrete'),
  box( 640, 432, 256, 32, 32, 0, 't-east-step2', C_WALKWAY, 'concrete'),
  box( 640, 464, 256, 32, 16, 0, 't-east-step3', C_WALKWAY, 'concrete'),
  
  // CT侧北阶梯
  box(-640, -400, 256, 32, 48, 0, 'ct-west-step1', C_WALKWAY, 'concrete'),
  box(-640, -432, 256, 32, 32, 0, 'ct-west-step2', C_WALKWAY, 'concrete'),
  box(-640, -464, 256, 32, 16, 0, 'ct-west-step3', C_WALKWAY, 'concrete'),
  box( 640, -400, 256, 32, 48, 0, 'ct-east-step1', C_WALKWAY, 'concrete'),
  box( 640, -432, 256, 32, 32, 0, 'ct-east-step2', C_WALKWAY, 'concrete'),
  box( 640, -464, 256, 32, 16, 0, 'ct-east-step3', C_WALKWAY, 'concrete'),

  // ── 8. 标准 64x64 木箱精准分布 ──
  // 中心实体块四角的对枪箱
  box(-288, -288, 64, 64, 64, 0, 'center-crate-nw'),
  box( 288, -288, 64, 64, 64, 0, 'center-crate-ne'),
  box(-288,  288, 64, 64, 64, 0, 'center-crate-sw'),
  box( 288,  288, 64, 64, 64, 0, 'center-crate-se'),

  // 高台走廊正中部的对枪箱 (增加了 yOff: 64，确保放置在高台上方)
  box(-640, 0, 64, 64, 64, 64, 'west-walkway-crate'),
  box( 640, 0, 64, 64, 64, 64, 'east-walkway-crate'),

  // 地堡内部，正对着墙壁用于蹲守和躲避高台火力的掩体箱
  box(0, 576, 64, 64, 64, 0, 't-bunker-crate'),
  box(0, -576, 64, 64, 64, 0, 'ct-bunker-crate'),
];

export const BLOODSTRIKE_SPAWNS = {
  defenders: [  // CT 藏于北侧地堡
    { x: hammerToGame(-128), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-704) },
    { x: hammerToGame(-64),  y: PLAYER_EYE_HEIGHT, z: hammerToGame(-704) },
    { x: hammerToGame(0),    y: PLAYER_EYE_HEIGHT, z: hammerToGame(-704) },
    { x: hammerToGame(64),   y: PLAYER_EYE_HEIGHT, z: hammerToGame(-704) },
    { x: hammerToGame(128),  y: PLAYER_EYE_HEIGHT, z: hammerToGame(-704) },
  ],
  attackers: [  // T 藏于南侧地堡
    { x: hammerToGame(-128), y: PLAYER_EYE_HEIGHT, z: hammerToGame(704)  },
    { x: hammerToGame(-64),  y: PLAYER_EYE_HEIGHT, z: hammerToGame(704)  },
    { x: hammerToGame(0),    y: PLAYER_EYE_HEIGHT, z: hammerToGame(704)  },
    { x: hammerToGame(64),   y: PLAYER_EYE_HEIGHT, z: hammerToGame(704)  },
    { x: hammerToGame(128),  y: PLAYER_EYE_HEIGHT, z: hammerToGame(704)  },
  ]
};

export const BLOODSTRIKE_TDM_SPAWNS = [
  ...BLOODSTRIKE_SPAWNS.defenders,
  ...BLOODSTRIKE_SPAWNS.attackers,
  { x: hammerToGame(-640), y: hammerToGame(64) + PLAYER_EYE_HEIGHT, z: hammerToGame(0) },
  { x: hammerToGame(640),  y: hammerToGame(64) + PLAYER_EYE_HEIGHT, z: hammerToGame(0) },
];

export const BLOODSTRIKE_BOMB_SITES = {
  A: { position: { x: hammerToGame(-640), y: hammerToGame(64), z: hammerToGame(0) }, radius: hammerToGame(192) },
  B: { position: { x: hammerToGame(640),  y: hammerToGame(64), z: hammerToGame(0) }, radius: hammerToGame(192) }
};

export const BLOODSTRIKE_CALLOUTS = [
  { name: 'CT Spawn', position: { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-704) }, radius: hammerToGame(400) },
  { name: 'T Spawn',  position: { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(704) }, radius: hammerToGame(400) },
  { name: 'Mid',      position: { x: hammerToGame(0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(0) }, radius: hammerToGame(300) },
  { name: 'West Walkway', position: { x: hammerToGame(-640), y: hammerToGame(64), z: hammerToGame(0) }, radius: hammerToGame(400) },
  { name: 'East Walkway', position: { x: hammerToGame(640),  y: hammerToGame(64), z: hammerToGame(0) }, radius: hammerToGame(400) },
];