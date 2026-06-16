/**
 * Shared map geometry utilities.
 * Used by all map layout files to create colliders (walls, boxes, platforms, stairs).
 */

import {
  hammerToGame,
} from './constants/MapUnits.js';
import {
  WALL_HEIGHT_HAMMER,
  PLATFORM_HEIGHT_HAMMER,
  STANDARD_BOX_HEIGHT_HAMMER,
} from './constants/MapLayoutDefaults.js';

// === 类型 ===
export interface MapCollider {
  position: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  name?: string;
  color?: number;
  material?: string;
}

export type MaterialType = 'concrete' | 'wood' | 'brick' | 'metal' | 'sand';

// ═══════════════════════════════════════════════════════════════
// 核心辅助函数
// ═══════════════════════════════════════════════════════════════

/**
 * box/wall: x,z=Hammer中心; w=宽(X); d=深(Z); h=高; yOff=底部离地
 */
export function box(
  x: number,
  z: number,
  w: number,
  d: number,
  h: number,
  yOff = 0,
  name?: string,
  color?: number,
  material?: string
): MapCollider {
  return {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size: { x: hammerToGame(w), y: hammerToGame(h), z: hammerToGame(d) },
    name,
    color,
    material,
  };
}

/**
 * wall: 墙（使用默认墙高度）
 */
export function wall(
  x: number,
  z: number,
  w: number,
  d: number,
  h: number = WALL_HEIGHT_HAMMER,
  yOff = 0,
  name?: string,
  color?: number,
  material: MaterialType = 'concrete'
): MapCollider {
  return box(x, z, w, d, h, yOff, name, color, material);
}

/**
 * plat: 平台/地面（使用默认平台高度）
 */
export function plat(
  x: number,
  z: number,
  w: number,
  d: number,
  h: number = PLATFORM_HEIGHT_HAMMER,
  yOff = 0,
  name?: string
): MapCollider {
  return box(x, z, w, d, h, yOff, name);
}

/**
 * standardBox: 标准箱子（使用默认箱子高度）
 */
export function standardBox(
  x: number,
  z: number,
  w: number,
  d: number,
  yOff = 0,
  name?: string,
  color?: number,
  material: MaterialType = 'wood'
): MapCollider {
  return box(x, z, w, d, STANDARD_BOX_HEIGHT_HAMMER, yOff, name, color, material);
}

/**
 * stairsZ: 楼梯（沿Z轴，从z0到z0+totalD，高度从h0升至h1）
 */
export function stairsZ(
  x: number,
  z0: number,
  w: number,
  totalD: number,
  h0: number,
  h1: number,
  steps: number,
  name: string
): MapCollider[] {
  const sd = totalD / steps;
  const dh = (h1 - h0) / steps;
  return Array.from({ length: steps }, (_, i) =>
    box(x, z0 + sd * (i + 0.5), w, sd, h0 + dh * (i + 1), 0, `${name}-${i}`)
  );
}

/**
 * stairsX: 楼梯（沿X轴）
 */
export function stairsX(
  x0: number,
  z: number,
  totalW: number,
  d: number,
  h0: number,
  h1: number,
  steps: number,
  name: string
): MapCollider[] {
  const sw = totalW / steps;
  const dh = (h1 - h0) / steps;
  return Array.from({ length: steps }, (_, i) =>
    box(x0 + sw * (i + 0.5), z, sw, d, h0 + dh * (i + 1), 0, `${name}-${i}`)
  );
}

/**
 * stairsL: L形楼梯
 */
export function stairsL(
  name: string,
  startX: number,
  startZ: number,
  w: number,
  d: number,
  firstRise: number,
  secondRise: number,
  cornerX: number,
  cornerZ: number
): MapCollider[] {
  const result: MapCollider[] = [];
  const steps1 = Math.abs(firstRise / 16);
  const steps2 = Math.abs(secondRise / 16);

  // 第一段沿Z轴
  if (firstRise !== 0) {
    result.push(...stairsZ(startX, startZ, w, d, 0, firstRise, steps1, `${name}-z`));
  }

  // 第二段沿X轴
  if (secondRise !== 0) {
    result.push(...stairsX(cornerX, cornerZ, w, d, firstRise, firstRise + secondRise, steps2, `${name}-x`));
  }

  return result;
}
