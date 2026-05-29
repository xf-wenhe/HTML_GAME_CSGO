/**
 * CS:GO de_bloodstrike — 1:1 经典死斗地图重制
 *
 * Blood Strike 是 CS 1.6 时代的经典死斗地图：
 * - 中心十字形走廊连接四个角落
 * - 两侧各有一条连接走廊
 * - CT 出生在地图北端，T 出生在南端
 * - 整体尺寸约 3072×3072 Hammer units
 * - 大量标准高度掩体，适合近中距离混战
 */

import { hammerToGame, PLAYER_EYE_HEIGHT } from './constants/MapUnits.js';

export interface BloodStrikeCollider {
  position: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  name?: string;
}

// ── 辅助构建函数 ──
// x,z 为中心坐标（Hammer units），w=宽，d=深，h=高，yOff=地面偏移
function wall(x: number, z: number, w: number, d: number, h = 256, yOff = 0, name?: string): BloodStrikeCollider {
  return {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size: { x: hammerToGame(w), y: hammerToGame(h), z: hammerToGame(d) },
    name
  };
}

function box(x: number, z: number, w: number, d: number, h = 48, yOff = 0, name?: string): BloodStrikeCollider {
  return {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size: { x: hammerToGame(w), y: hammerToGame(h), z: hammerToGame(d) },
    name
  };
}

// ══════════════════════════════════════════════════════════════════
// BLOOD STRIKE 碰撞体
// 地图中心在 (0,0)；CT spawn 在 z=-1280；T spawn 在 z=+1280
// 主走廊宽约 256 units；横向走廊宽约 192 units
// ══════════════════════════════════════════════════════════════════

export const BLOODSTRIKE_COLLIDERS: BloodStrikeCollider[] = [

  // ── 1. 外围边界墙 ──────────────────────────────────────────────
  wall(0, -1600, 3200, 32, 576, 0, 'bs-boundary-north'),
  wall(0,  1600, 3200, 32, 576, 0, 'bs-boundary-south'),
  wall(-1600, 0, 32, 3200, 576, 0, 'bs-boundary-west'),
  wall( 1600, 0, 32, 3200, 576, 0, 'bs-boundary-east'),

  // ── 2. CT 出生区 (北端) ────────────────────────────────────────
  // CT 出生后方内墙
  wall(0, -1408, 1536, 32, 256, 0, 'ct-spawn-back-wall'),
  // CT 出生区左右侧墙（进入中路前）
  wall(-640, -1216, 32, 384, 256, 0, 'ct-spawn-wall-left'),
  wall( 640, -1216, 32, 384, 256, 0, 'ct-spawn-wall-right'),

  // ── 3. T 出生区 (南端) ─────────────────────────────────────────
  wall(0,  1408, 1536, 32, 256, 0, 't-spawn-back-wall'),
  wall(-640,  1216, 32, 384, 256, 0, 't-spawn-wall-left'),
  wall( 640,  1216, 32, 384, 256, 0, 't-spawn-wall-right'),

  // ── 4. 中央十字走廊 ────────────────────────────────────────────
  // 竖向主走廊（南北向）两侧墙
  wall(-128, 0, 32, 2560, 256, 0, 'main-corridor-wall-west'),
  wall( 128, 0, 32, 2560, 256, 0, 'main-corridor-wall-east'),

  // 横向主走廊（东西向）两侧墙，中心区域
  wall(0, -128, 2560, 32, 256, 0, 'cross-corridor-wall-north'),
  wall(0,  128, 2560, 32, 256, 0, 'cross-corridor-wall-south'),

  // 中心交叉口四角填充墙（防止玩家卡角）
  wall(-192, -192, 96, 96, 256, 0, 'center-corner-nw'),
  wall( 192, -192, 96, 96, 256, 0, 'center-corner-ne'),
  wall(-192,  192, 96, 96, 256, 0, 'center-corner-sw'),
  wall( 192,  192, 96, 96, 256, 0, 'center-corner-se'),

  // ── 5. 西侧室内区域 ────────────────────────────────────────────
  // 西侧大房间外墙
  wall(-1408, -512, 32, 768, 256, 0, 'west-room-north-wall'),
  wall(-1408,  512, 32, 768, 256, 0, 'west-room-south-wall'),
  wall(-1216, -896, 384, 32, 256, 0, 'west-room-top-wall'),
  wall(-1216,  896, 384, 32, 256, 0, 'west-room-bottom-wall'),

  // 西侧内隔墙（分割为多个小间）
  wall(-896, -512, 32, 512, 256, 0, 'west-inner-divider-north'),
  wall(-896,  512, 32, 512, 256, 0, 'west-inner-divider-south'),
  wall(-1152, 0,   512, 32, 256, 0, 'west-mid-cross-wall'),

  // 西侧走道连接墙
  wall(-640, -640, 32, 256, 256, 0, 'west-alley-wall-n1'),
  wall(-640,  640, 32, 256, 256, 0, 'west-alley-wall-s1'),
  wall(-640, -384, 32, 128, 256, 0, 'west-alley-wall-n2'),
  wall(-640,  384, 32, 128, 256, 0, 'west-alley-wall-s2'),

  // ── 6. 东侧室内区域（对称）──────────────────────────────────────
  wall( 1408, -512, 32, 768, 256, 0, 'east-room-north-wall'),
  wall( 1408,  512, 32, 768, 256, 0, 'east-room-south-wall'),
  wall( 1216, -896, 384, 32, 256, 0, 'east-room-top-wall'),
  wall( 1216,  896, 384, 32, 256, 0, 'east-room-bottom-wall'),

  wall( 896, -512, 32, 512, 256, 0, 'east-inner-divider-north'),
  wall( 896,  512, 32, 512, 256, 0, 'east-inner-divider-south'),
  wall( 1152, 0,   512, 32, 256, 0, 'east-mid-cross-wall'),

  wall( 640, -640, 32, 256, 256, 0, 'east-alley-wall-n1'),
  wall( 640,  640, 32, 256, 256, 0, 'east-alley-wall-s1'),
  wall( 640, -384, 32, 128, 256, 0, 'east-alley-wall-n2'),
  wall( 640,  384, 32, 128, 256, 0, 'east-alley-wall-s2'),

  // ── 7. 北侧（CT方向）横向走道 ──────────────────────────────────
  wall(-512, -768, 768, 32, 256, 0, 'ct-side-corridor-wall-w'),
  wall( 512, -768, 768, 32, 256, 0, 'ct-side-corridor-wall-e'),
  wall( 0,  -896, 256, 32, 256, 0, 'ct-side-back-block'),

  // ── 8. 南侧（T方向）横向走道 ───────────────────────────────────
  wall(-512, 768, 768, 32, 256, 0, 't-side-corridor-wall-w'),
  wall( 512, 768, 768, 32, 256, 0, 't-side-corridor-wall-e'),
  wall( 0,   896, 256, 32, 256, 0, 't-side-back-block'),

  // ── 9. 中央交叉口掩体柱（经典血迹地图特征）──────────────────────
  wall(-320,    0, 64, 64, 256, 0, 'center-pillar-west'),
  wall( 320,    0, 64, 64, 256, 0, 'center-pillar-east'),
  wall(   0, -320, 64, 64, 256, 0, 'center-pillar-north'),
  wall(   0,  320, 64, 64, 256, 0, 'center-pillar-south'),

  // ── 10. 主走廊掩体箱子 ─────────────────────────────────────────
  // CT侧中路掩体
  box(  0, -640, 96, 64, 48, 0, 'ct-side-cover-box-1'),
  box(-64, -512, 64, 64, 48, 0, 'ct-side-cover-box-2'),
  box( 64, -512, 64, 64, 48, 0, 'ct-side-cover-box-3'),

  // T侧中路掩体
  box(  0,  640, 96, 64, 48, 0, 't-side-cover-box-1'),
  box(-64,  512, 64, 64, 48, 0, 't-side-cover-box-2'),
  box( 64,  512, 64, 64, 48, 0, 't-side-cover-box-3'),

  // 中央区域掩体
  box(  0,    0, 80, 80, 64, 0, 'center-main-box'),
  box(-256,   0, 64, 64, 48, 0, 'center-flank-box-w'),
  box( 256,   0, 64, 64, 48, 0, 'center-flank-box-e'),

  // 横向走廊中央掩体
  box(-640,   0, 64, 64, 48, 0, 'west-corridor-mid-box'),
  box( 640,   0, 64, 64, 48, 0, 'east-corridor-mid-box'),

  // ── 11. 西侧房间内部掩体 ────────────────────────────────────────
  box(-1152, -640, 96, 64, 96, 0, 'west-room-tall-box-n'),
  box(-1152,  640, 96, 64, 96, 0, 'west-room-tall-box-s'),
  box(-1280, 0,    64, 96, 48, 0, 'west-room-low-box-mid'),
  box(-1024, -256, 64, 64, 48, 0, 'west-room-box-nw'),
  box(-1024,  256, 64, 64, 48, 0, 'west-room-box-sw'),

  // ── 12. 东侧房间内部掩体（对称）─────────────────────────────────
  box( 1152, -640, 96, 64, 96, 0, 'east-room-tall-box-n'),
  box( 1152,  640, 96, 64, 96, 0, 'east-room-tall-box-s'),
  box( 1280,    0, 64, 96, 48, 0, 'east-room-low-box-mid'),
  box( 1024, -256, 64, 64, 48, 0, 'east-room-box-ne'),
  box( 1024,  256, 64, 64, 48, 0, 'east-room-box-se'),

  // ── 13. 出生区内部掩体 ─────────────────────────────────────────
  // CT 出生区
  box(-384, -1280, 64, 64, 48, 0, 'ct-spawn-box-left'),
  box( 384, -1280, 64, 64, 48, 0, 'ct-spawn-box-right'),
  box(   0, -1280, 96, 64, 64, 0, 'ct-spawn-box-center'),

  // T 出生区
  box(-384,  1280, 64, 64, 48, 0, 't-spawn-box-left'),
  box( 384,  1280, 64, 64, 48, 0, 't-spawn-box-right'),
  box(   0,  1280, 96, 64, 64, 0, 't-spawn-box-center'),
];

// ── 出生点（Hammer units → 游戏单位）────────────────────────────
// CT 出生点（北端，defenders）
// T  出生点（南端，attackers）

export const BLOODSTRIKE_SPAWNS = {
  defenders: [  // CT
    { x: hammerToGame(-384), y: PLAYER_EYE_HEIGHT, z: hammerToGame(1280)  },
    { x: hammerToGame(-192), y: PLAYER_EYE_HEIGHT, z: hammerToGame(1312)  },
    { x: hammerToGame(   0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(1344)  },
    { x: hammerToGame( 192), y: PLAYER_EYE_HEIGHT, z: hammerToGame(1312)  },
    { x: hammerToGame( 384), y: PLAYER_EYE_HEIGHT, z: hammerToGame(1280)  },
  ],
  attackers: [  // T
    { x: hammerToGame(-384), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-1280) },
    { x: hammerToGame(-192), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-1312) },
    { x: hammerToGame(   0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-1344) },
    { x: hammerToGame( 192), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-1312) },
    { x: hammerToGame( 384), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-1280) },
  ]
};

// 死斗出生点（分布在地图各角落及中路）
export const BLOODSTRIKE_TDM_SPAWNS = [
  { x: hammerToGame(-384), y: PLAYER_EYE_HEIGHT, z: hammerToGame(1280)  },
  { x: hammerToGame( 384), y: PLAYER_EYE_HEIGHT, z: hammerToGame(1280)  },
  { x: hammerToGame(-384), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-1280) },
  { x: hammerToGame( 384), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-1280) },
  { x: hammerToGame(-1152), y: PLAYER_EYE_HEIGHT, z: hammerToGame(0)    },
  { x: hammerToGame( 1152), y: PLAYER_EYE_HEIGHT, z: hammerToGame(0)    },
  { x: hammerToGame(   0), y: PLAYER_EYE_HEIGHT, z: hammerToGame(0)     },
  { x: hammerToGame(-640), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-640)  },
  { x: hammerToGame( 640), y: PLAYER_EYE_HEIGHT, z: hammerToGame(-640)  },
  { x: hammerToGame(-640), y: PLAYER_EYE_HEIGHT, z: hammerToGame( 640)  },
  { x: hammerToGame( 640), y: PLAYER_EYE_HEIGHT, z: hammerToGame( 640)  },
];

// 无炸弹目标（死斗模式不用炸弹，设置两个占位点）
export const BLOODSTRIKE_BOMB_SITES = {
  A: { position: { x: hammerToGame(-1152), y: 0, z: hammerToGame(0) }, radius: hammerToGame(192) },
  B: { position: { x: hammerToGame( 1152), y: 0, z: hammerToGame(0) }, radius: hammerToGame(192) }
};

// 地图标注点（callouts）
export const BLOODSTRIKE_CALLOUTS = [
  { name: 'CT Spawn',    position: { x: hammerToGame(0),     y: PLAYER_EYE_HEIGHT, z: hammerToGame( 1312) }, radius: hammerToGame(400) },
  { name: 'T Spawn',     position: { x: hammerToGame(0),     y: PLAYER_EYE_HEIGHT, z: hammerToGame(-1312) }, radius: hammerToGame(400) },
  { name: 'Mid',         position: { x: hammerToGame(0),     y: PLAYER_EYE_HEIGHT, z: hammerToGame(0)     }, radius: hammerToGame(300) },
  { name: 'West Room',   position: { x: hammerToGame(-1152), y: PLAYER_EYE_HEIGHT, z: hammerToGame(0)     }, radius: hammerToGame(400) },
  { name: 'East Room',   position: { x: hammerToGame( 1152), y: PLAYER_EYE_HEIGHT, z: hammerToGame(0)     }, radius: hammerToGame(400) },
  { name: 'CT Corridor', position: { x: hammerToGame(0),     y: PLAYER_EYE_HEIGHT, z: hammerToGame( 640)  }, radius: hammerToGame(250) },
  { name: 'T Corridor',  position: { x: hammerToGame(0),     y: PLAYER_EYE_HEIGHT, z: hammerToGame(-640)  }, radius: hammerToGame(250) },
];
