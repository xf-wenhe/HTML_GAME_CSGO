/**
 * Dust2 hand-authored placeholder geometry.
 *
 * This file is not a CS1.6 1:1 reconstruction. A source-accurate rebuild must
 * be generated from a legal original CS1.6 de_dust2.bsp/.map/.rmf file via the
 * GoldSrc import pipeline, then converted into the current game coordinate
 * system. See `npm run dust2:preflight` for the source-file gate.
 */

import {
  hammerToGame,
  PLAYER_EYE_HEIGHT,
} from './constants/MapUnits.js';
import {
  DUST2_SPAWNS as HAMMER_SPAWNS,
  DUST2_BOMB_SITES as HAMMER_BOMB_SITES,
  DUST2_CALLOUTS as HAMMER_CALLOUTS,
  DUST2_MATERIAL_ZONES as HAMMER_MATERIAL_ZONES
} from './constants/Dust2HammerData.js';

// === 类型 ===
export interface ArenaCollider {
  position: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  name?: string;
}

// ═══════════════════════════════════════════════════════════════
// 核心辅助函数
// ═══════════════════════════════════════════════════════════════

// box: x,z=Hammer中心; w=宽(X); d=深(Z); h=高; yOff=底部离地
function b(x: number, z: number, w: number, d: number, h: number, yOff = 0, name?: string): ArenaCollider {
  return {
    position: { x: hammerToGame(x), y: hammerToGame(h / 2 + yOff), z: hammerToGame(-z) },
    size:     { x: hammerToGame(w), y: hammerToGame(h),             z: hammerToGame(d)  },
    name
  };
}

// 楼梯（沿Z轴，从z0到z0+totalD，高度从h0升至h1）
function stairsZ(x: number, z0: number, w: number, totalD: number, h0: number, h1: number, steps: number, name: string): ArenaCollider[] {
  const sd = totalD / steps, dh = (h1 - h0) / steps;
  return Array.from({ length: steps }, (_, i) =>
    b(x, z0 + sd * (i + 0.5), w, sd, h0 + dh * (i + 1), 0, `${name}-${i}`)
  );
}

// 楼梯（沿X轴）
function stairsX(x0: number, z: number, totalW: number, d: number, h0: number, h1: number, steps: number, name: string): ArenaCollider[] {
  const sw = totalW / steps, dh = (h1 - h0) / steps;
  return Array.from({ length: steps }, (_, i) =>
    b(x0 + sw * (i + 0.5), z, sw, d, h0 + dh * (i + 1), 0, `${name}-${i}`)
  );
}

// ═══════════════════════════════════════════════════════════════
// Legacy Dust2 placeholder collider matrix.
// These boxes are intentionally superseded by the imported GoldSrc source mesh
// resource. Do not treat these coordinates as CS1.6/CS:GO 1:1 map data.
// ═══════════════════════════════════════════════════════════════

export const DUST2_COLLIDERS: ArenaCollider[] = [

  // ── 边界墙 ──────────────────────────────────────────────────
  b(    0,  6912, 8704,  256, 576, 0, 'boundary-south'),
  b(    0, -3840, 8704,  256, 576, 0, 'boundary-north'),
  b(-4352,  1536,  256,10752, 576, 0, 'boundary-west'),
  b( 4352,  1536,  256,10752, 576, 0, 'boundary-east'),

  // ── T Spawn ─────────────────────────────────────────────────
  b(    0,  6656, 2048,   32, 256, 0, 't-spawn-back-wall'),
  b( -896,  6144,   32,  768, 256, 0, 't-spawn-wall-left'),
  b(  896,  6144,   32,  768, 256, 0, 't-spawn-wall-right'),
  b( -256,  6400,   64,   64,  48, 0, 't-spawn-box-left'),
  b(  256,  6400,   64,   64,  48, 0, 't-spawn-box-right'),
  b(    0,  6464,   64,   64,  32, 0, 't-spawn-barrel'),

  // ── CT Spawn placeholder room ─────────────────────────────────────────
  // Legacy hand-authored fallback only.
  // 后墙（北墙，z=-3712）
  b(    0, -3712, 1024,   16, 256, 0, 'ct-spawn-back-wall'),
  // 左墙（西墙，x=-512）
  b( -512, -3328,   16,  768, 256, 0, 'ct-spawn-wall-left'),
  // 右墙（东墙，x=512）
  b(  512, -3328,   16,  768, 256, 0, 'ct-spawn-wall-right'),
  // 前墙（南墙，z=-2944）- 分三段留两个出口（左出口宽384，右出口宽384）
  // 左段（A Ramp 出口左侧墙）
  b( -768, -2944,   256,   16, 256, 0, 'ct-spawn-front-wall-left'),
  // 中段（两出口之间的分隔墙）
  b(    0, -2944,   256,   16, 256, 0, 'ct-spawn-front-wall-mid'),
  // 右段（B Site 出口右侧墙）
  b(  768, -2944,   256,   16, 256, 0, 'ct-spawn-front-wall-right'),
  // 屋顶（封闭顶部，厚度32，底部偏移240使屋顶在墙顶256高度）
  b(    0, -3328, 1040,  784,   32, 240, 'ct-spawn-ceiling'),
  // 出口走廊延伸墙（使出口更明确，延伸384深度）
  // A Ramp 出口（左侧）
  b( -512, -2560,   16,  384, 256, 0, 'ct-spawn-a-exit-outer'),
  b( -256, -2560,   16,  384, 256, 0, 'ct-spawn-a-exit-inner'),
  // B Site 出口（右侧）
  b(  256, -2560,   16,  384, 256, 0, 'ct-spawn-b-exit-inner'),
  b(  512, -2560,   16,  384, 256, 0, 'ct-spawn-b-exit-outer'),
  // 内部掩体箱
  b(    0, -3456,   96,   64,  48, 0, 'ct-spawn-box-center'),
  b( -384, -3136,   48,   48,  48, 0, 'ct-spawn-box-left'),
  b(  384, -3136,   48,   48,  48, 0, 'ct-spawn-box-right'),

  // ── A Long（A大道）主走廊 ────────────────────────────────────
  // 外西墙（整条）— 320 HU增强走廊封闭感
  b(-3904,  3072,  192, 6144, 320, 0, 'a-long-outer-wall'),
  // 内东墙（整条）
  b(-3264,  3072,  192, 6144, 320, 0, 'a-long-inner-wall'),
  // 天花板（对齐墙高320）
  b(-3584,  3072,  576, 6144,  32, 320, 'a-long-ceiling'),

  // A Doors 门框（左右两根柱）
  b(-3840,  1920,   32,  192, 256, 0, 'a-doors-left-frame'),
  b(-3328,  1920,   32,  192, 256, 0, 'a-doors-right-frame'),
  b(-3584,  1920,  256,   32,  64, 192, 'a-doors-lintel-l'),
  b(-3328,  1920,  256,   32,  64, 192, 'a-doors-lintel-r'),

  // A Long 掩体箱
  b(-3520,  4096,   64,   64,  48, 0, 'a-long-box-1'),
  b(-3520,  2304,   48,   64,  48, 0, 'a-long-box-2'),
  b(-3456,     0,   64,   64,  96, 0, 'a-long-tall-box'),
  b(-3328,  5376,   64,   64,  96, 0, 'a-long-big-box'),
  b(-3456,  5120,   48,   48,  48, 0, 'a-long-mid-box'),
  b(-2752,  1728,  128,  128,  96, 0, 'long-blue-box'),

  // ── A Pit（大坑）────────────────────────────────────────────
  b(-3584,  -384,  576,  256,  96, 0, 'pit-ledge-high'),
  b(-3584,    -0,  576,  128,  64, 0, 'pit-ledge-low'),
  b(-3904,  -256,   32,  512, 256, 0, 'pit-west-wall'),
  b(-3584,  -512,  576,   32, 256, 0, 'pit-north-wall'),
  ...stairsZ(-3584, -512, 320, 384, 0, 96, 3, 'pit-stairs'),
  b(-3520,  -256,   64,   48,  48, 0, 'pit-box'),

  // ── Legacy non-Dust2 placeholder block kept only for fallback mode
  b(-1920,  3584,   32, 1024, 384, 0, 'palace-outer-wall'),
  b(-2560,  3072, 1280,   32, 384, 0, 'palace-south-wall'),
  b(-2560,  4608, 1280,   32, 384, 0, 'palace-north-wall'),
  b(-3200,  3840,   32, 1536, 384, 0, 'palace-inner-west-wall'),
  b(-2560,  3840, 1280, 1536,  32, 352, 'palace-ceiling'),
  // 四根柱子
  b(-2048,  3200,   48,   48, 384, 0, 'palace-pillar-sw'),
  b(-2048,  4480,   48,   48, 384, 0, 'palace-pillar-nw'),
  b(-2816,  3200,   48,   48, 384, 0, 'palace-pillar-se'),
  b(-2816,  4480,   48,   48, 384, 0, 'palace-pillar-ne'),
  // 南侧窗口
  b(-1984,  2848,  128,   32,  96,  64, 'palace-window-sill-low'),
  b(-2048,  2848,  256,   32,  96, 160, 'palace-window-sill-high'),

  // ── Catwalk / A Short（A小道）───────────────────────────────
  // 走廊平台（高128 HU）
  b(-1536, -1216,  384, 1152,  16, 128, 'catwalk-platform'),
  b(-1536,  -640,  384,   32,  48, 128, 'catwalk-rail-south'),
  b(-1536, -1792,  384,   32,  48, 128, 'catwalk-rail-north'),
  b(-1728, -1216,   32, 1152, 256,   0, 'catwalk-wall-west'),
  b(-1664, -1792,   32,  256, 128,   0, 'short-wall-to-a-site'),
  ...stairsX(-1920, -640, 768, 192, 32, 128, 12, 'catwalk-stairs'),
  b(-1664,  -512,   64,   64,  48, 128, 'catwalk-box'),

  // ── A Site（A包点）──────────────────────────────────────────
  // 包点平台（32 HU 高，更接近原版 Dust2）
  b(-2688, -1280,  768,  512,  32,   0, 'a-site-platform-base'),
  b(-2688, -1024,  768,   64,  16,  32, 'a-site-platform-front-lip'),
  b(-2688, -1536,  640,   64,  16,  32, 'a-site-platform-rear-lip'),
  // 平台侧边压条
  b(-3072, -1280,   32,  512,  16,  32, 'a-site-platform-left-edge'),
  b(-2304, -1280,   32,  512,  16,  32, 'a-site-platform-right-edge'),
  // 四面墙（入口留 5.12 宽通道，中央偏 A Ramp 侧）
  b(-3264, -1920,  640,  128,  384,   0, 'a-site-north-wall-l'),
  b(-2112, -1920,  640,  128,  384,   0, 'a-site-north-wall-r'),
  b(-2688, -1920, 1792,  128,   32,  384, 'a-site-north-lintel'),
  b(-3328, -1856,  640,   32, 384,   0, 'a-site-north-entry-l'),
  b(-2048, -1856,  640,   32, 384,   0, 'a-site-north-entry-r'),
  b(-3584, -1280,   32, 1664, 384,   0, 'a-site-west-wall'),
  b(-1792, -1280,   32, 1664, 384,   0, 'a-site-east-wall'),
  b(-2688,  -256, 1792,   32, 384,   0, 'a-site-south-wall'),
  // A Ramp（CT→A 斜坡，16级，顶部衔接32 HU平台）
  ...stairsZ(-2688, -2560, 512, 1024, 0, 128, 16, 'a-ramp'),
  // Ramp 顶部过渡块
  b(-2688, -1664,  512,   96,  16,  32, 'a-ramp-top-transition'),
  b(-2560, -1760,  256,   64,  16,  48, 'a-ramp-top-transition-2'),
  // Goose（鹅角）— 地面层高台
  b(-1984, -1600,  160,  224,  96,   0, 'goose-main-face'),
  b(-1920, -1760,   96,   64,  64,   0, 'goose-rear-step'),
  b(-2048, -1536,   64,  160,  96,   0, 'goose-side-thickness'),
  b(-1984,  -768,  160,   32,  16,  96, 'goose-front-edge'),
  // 包点平台掩体（放在32 HU平台上）
  b(-2816, -1408,  128,   96,  96,  32, 'a-site-shield-box'),
  b(-2560, -1408,  192,  128,  24,  32, 'a-site-default-base'),
  b(-2496, -1472,   64,   64,  48,  56, 'a-site-default-upper'),
  b(-2432, -1408,   64,   48,  40,  32, 'a-site-small-box'),
  b(-2368, -1408,   64,   64,  96,  32, 'a-site-double-box-left'),
  b(-2304, -1472,   64,   64,  96,  32, 'a-site-double-box-right'),
  // 地面掩体
  b(-2752,  -896,   64,   64,  96,   0, 'a-long-exit-box'),
  b(-2048,  -768,   96,   48,  48,   0, 'a-catwalk-exit-box'),
  b(-2944,  -640,   64,   48,  48,   0, 'a-long-side-box'),
  b(-2688, -1664,   64,   48,  48,   0, 'a-back-corner-box'),
  b(-2176, -1920,   48,   64,  48,   0, 'a-north-wall-box'),
  // Short 出 A 视线组织
  b(-2432, -1792,  192,   64,  48,   0, 'short-exit-low-block'),
  b(-2240, -1728,  128,   64,  64,   0, 'short-exit-side-block'),
  b(-2144, -1664,   64,  128,  48,   0, 'short-exit-vision-guide'),

  // ── Mid（中路）──────────────────────────────────────────────
  // 中路两侧主墙 — 320 HU增强中路建筑压迫感
  b( -128,  1024,  128, 4096, 320,   0, 'mid-wall-west'),
  b(  128,  1024,  128, 4096, 320,   0, 'mid-wall-east'),
  // Top Mid 两侧体量 — 384 HU增强建筑体量感
  b( -512,  1536,  256,  768, 384,   0, 'top-mid-west-mass-1'),
  b( -768,  2048,  256,  512, 384,   0, 'top-mid-west-mass-2'),
  b(  512,  1536,  256,  768, 384,   0, 'top-mid-east-mass-1'),
  b(  768,  2048,  256,  512, 384,   0, 'top-mid-east-mass-2'),
  // Mid Doors — 门框加高至320，确保中门对狙通道清晰
  b( -128,  2048,   32,  192, 320,   0, 'mid-doors-left-frame'),
  b(  128,  2048,   32,  192, 320,   0, 'mid-doors-right-frame'),
  b(    0,  2048,  288,   32,  64, 256, 'mid-doors-lintel'),
  // Mid Doors 房体厚度 — 加高与门框对齐
  b( -320,  2048,  160,  256, 320,   0, 'mid-doors-thickness-west'),
  b(  320,  2048,  160,  256, 320,   0, 'mid-doors-thickness-east'),
  b( -192,  1856,  128,  128, 128,   0, 'mid-doors-inner-depth-w'),
  b(  192,  1856,  128,  128, 128,   0, 'mid-doors-inner-depth-e'),
  // Xbox
  b( -128,  1024,   96,   64,  48,   0, 'xbox'),
  b( -192,   896,  128,  128,  64,   0, 'xbox-side-block-w'),
  b(  192,   896,  128,  128,  64,   0, 'xbox-side-block-e'),
  b(  -96,   768,   96,   64,  32,   0, 'xbox-front-lip-l'),
  b(   96,   768,   96,   64,  32,   0, 'xbox-front-lip-r'),
  // Mid 左侧低箱
  b( -384,  -512,   64,   64,  48,   0, 'mid-box-left'),
  b( -320,  1152,   96,  160,  64,   0, 'mid-cover-west'),
  b(  320,  1088,   96,  160,  64,   0, 'mid-cover-east'),
  // Suicide（自杀角）
  b(  512,  3072,  256,  256,  32,   0, 'suicide-ledge'),
  b(  384,  2816,   64,   64,  48,   0, 'suicide-box'),
  // CT Window
  b(  -64, -1280,   64,   64, 128,   0, 'ct-window-platform-w'),
  b(   64, -1280,   64,   64, 128,   0, 'ct-window-platform-e'),
  b(  -64, -1216,   64,   32,  32, 128, 'ct-window-sill-w'),
  b(   64, -1216,   64,   32,  32, 128, 'ct-window-sill-e'),
  b(  256, -1536,   32,  512, 256,   0, 'ct-window-wall-east'),
  b( -256, -1536,   32,  512, 256,   0, 'ct-window-wall-west'),
  // CT Mid 走廊（北墙分两段，留中央通道给 Mid→CT 路线）
  b( -448, -2240,  256,  512, 224,   0, 'ct-mid-north-wall-w'),
  b( 1152, -2240,  512,  512, 224,   0, 'ct-mid-north-wall-e'),
  b( -64, -1664,   64,  256,  160,   0, 'ct-mid-opening-guide-w'),
  b(   64, -1664,   64,  256,  160,   0, 'ct-mid-opening-guide-e'),

  // ── 中央区域建筑分隔块（保留CT Mid以南的隔离，不干扰走廊通行）────────────────────
  b( 1000, -1200, 1000,  200,  64,   0, 'b-window-crouch-wall'),

  // ── Zone C: Mid ↔ B Tunnel 分隔墙（核心空间骨架）────────────────
  // 在 x=768 处建南北贯穿分隔墙，把 Mid 和 B Tunnel 区域隔开
  // 北段: z=5376~6912（连接T Spawn北侧到北边界）
  b(  768,  6144,   32, 1536, 320,   0, 'mid-b-divider-north'),
  // 中段（留门洞）: z=3072~3840
  // 南半段: z=1024~3072
  b(  768,  2048,   32, 2048, 320,   0, 'mid-b-divider-mid-south'),
  // 北半段: z=3840~4352
  b(  768,  4096,   32, 1024, 320,   0, 'mid-b-divider-mid-north'),
  // 南段: z=-512~1024（连接到CT Mid区域）
  b(  768,   256,   32, 1536, 320,   0, 'mid-b-divider-south'),
  // 门洞结构（z=3072~3840之间，允许B Tunnel→Mid Doors后方穿行）
  b(  640,  3456,   32,  768, 320,   0, 'mid-b-gateway-l'),
  b(  896,  3456,   32,  768, 320,   0, 'mid-b-gateway-r'),
  b(  768,  3456,  288,   32,  64, 256, 'mid-b-gateway-lintel'),

  // ── B Tunnels（B洞）─────────────────────────────────────────
  // 下层走廊 — 断面变化版
  b( 3072,  5760,  192,  768, 256,   0, 'b-lower-outer-entrance'),
  b( 3072,  4608,  192, 1536, 256,   0, 'b-lower-outer-mid'),
  b( 2944,  3584,  192,  768, 256,   0, 'b-lower-outer-narrow'),
  b( 3072,  2816,  192, 1536, 256,   0, 'b-lower-outer-exit'),
  b( 3456,  5760,  192,  768, 256,   0, 'b-lower-inner-entrance'),
  b( 3456,  4608,  192, 1536, 256,   0, 'b-lower-inner-mid'),
  b( 3488,  3584,  128,  768, 256,   0, 'b-lower-inner-narrow'),
  b( 3456,  2816,  192, 1536, 256,   0, 'b-lower-inner-exit'),
  b( 3264,  3072,  576, 6144,  32, 256, 'b-tunnels-ceiling'),
  // Zone D: B下层走廊封口
  // 北端封口（z=6144，留入口通道供T Spawn→B Tunnel通行）
  b( 3008,  6144,  128,   32, 320,   0, 'b-lower-north-wall-l'),
  b( 3392,  6144,  128,   32, 320,   0, 'b-lower-north-wall-r'),
  b(  3200,  6144,  512,   32,  64, 256, 'b-lower-north-lintel'),
  // 南端封口（z=2048，连接到B Outside区域）
  b(  3200,  2048,  384,   32, 256,   0, 'b-lower-south-wall'),
  b(  3264,  2016,  128,   32,  64, 192, 'b-lower-south-lintel'),
  // B洞出口框景
  b( 3072,  1920,  256,   64,  32, 224, 'b-tunnel-exit-lintel-l'),
  b( 3456,  1920,  256,   64,  32, 224, 'b-tunnel-exit-lintel-r'),
  b( 3072,  1984,  192,  128, 256,   0, 'b-tunnel-exit-frame-w'),
  b( 3456,  1984,  192,  128, 256,   0, 'b-tunnel-exit-frame-e'),
  // 上层平台（Upper Tunnels / Upper Dark）— 精雕版
  b( 3072,  -512,  320, 1536,  16, 128, 'upper-tunnels-platform-base'),
  b( 3072,  -256,  320,   64,  10, 144, 'upper-tunnels-platform-front-lip'),
  b( 3072, -1024,  320,   64,  10, 144, 'upper-tunnels-platform-rear-lip'),
  b( 2880,  -512,   32, 1536, 256,   0, 'upper-tunnels-west-wall'),
  b( 3072,  -512,  320, 1536,  32, 256, 'upper-tunnels-ceiling'),
  // Zone F: Upper Tunnels 封口（北/东/南墙）
  // 北墙（z=256，留通往旋转楼梯出口）
  b(  3072,   384,  256,   32, 256, 128, 'upper-tunnels-north-wall-l'),
  b(  3264,   384,   96,   32, 256, 128, 'upper-tunnels-north-wall-r'),
  // 东墙（x=3392）
  b(  3392,  -512,   32, 1536, 256,   0, 'upper-tunnels-east-wall'),
  // 南墙（z=-1280，留通往B Site出口通道）
  b(  3072, -1280,  256,   32, 256, 128, 'upper-tunnels-south-wall-l'),
  b(  3264, -1280,   96,   32, 256, 128, 'upper-tunnels-south-wall-r'),
  // Upper Dark — 更强收口
  b( 2944,   128,  192,  512, 256,   0, 'upper-dark-south-wall'),
  b( 3072,   384,  320,   32, 256, 128, 'upper-dark-inner-wall'),
  b( 3264,   192,   96,  192,  96, 128, 'upper-dark-box-refined'),
  b( 3200,    64,   64,   64,  64, 128, 'upper-dark-corner-block'),
  b( 3264,  -896,   64,   48,  48, 128, 'upper-tunnel-exit-box'),
  // ── B洞旋转楼梯（替换原直行楼梯）─────────────────────
  // Legacy hand-authored lower-to-upper tunnel approximation.
  // 阶段1: 直行段 (z: 1280→896, 从地面上升到 h=64)
  b( 2944, 1232,  64,  64,  24,   0, 'b-spiral-stair-s1-0'),
  b( 2944, 1168,  64,  64,  24,  16, 'b-spiral-stair-s1-1'),
  b( 2944, 1104,  64,  64,  24,  32, 'b-spiral-stair-s1-2'),
  b( 2944, 1040,  64,  64,  24,  48, 'b-spiral-stair-s1-3'),
  // 阶段2: 旋转平台 (z≈896, h=64)
  b( 3024,   896,  192,  128,  16,  64, 'b-spiral-platform'),
  // 阶段2护栏
  b( 2928,   896,   32,  128,  48,  64, 'b-spiral-platform-rail-w'),
  // 阶段3: 转向段 (从平台向X方向延伸, x: 2944→3200, 继续上升到 h=128)
  b( 2976,   832,  64,  64,  24,  64, 'b-spiral-stair-s3-0'),
  b( 3040,   832,  64,  64,  24,  80, 'b-spiral-stair-s3-1'),
  b( 3104,   832,  64,  64,  24,  96, 'b-spiral-stair-s3-2'),
  b( 3168,   832,  64,  64,  24, 112, 'b-spiral-stair-s3-3'),
  // 转弯连接段 (x: 3200→3264, z: 832→768, 上升到 h=128 上层)
  b( 3200,   800,  64,  64,  24, 112, 'b-spiral-stair-turn-0'),
  b( 3200,   768,  64,  64,  24, 120, 'b-spiral-stair-turn-1'),
  // 旋转楼梯侧墙（形成封闭走廊感）
  b( 2880,  1024,   32,  512, 256,   0, 'b-spiral-wall-west'),
  b( 3328,  1024,   32,  256, 256,   0, 'b-spiral-wall-east-1'),
  b( 3264,   768,   32,  128, 256,   0, 'b-spiral-wall-east-2'),
  // 旋转楼梯拐角掩体
  b( 3072,   896,   48,  48,  48,  64, 'b-spiral-corner-box-1'),
  b( 3200,   800,   48,  48,  48, 112, 'b-spiral-corner-box-2'),
  // 下层补充箱子（楼梯底部）
  b( 2880,  1344,   48,  48,  48,   0, 'b-spiral-base-box-1'),
  b( 2880,  1408,   48,  48,  96,   0, 'b-spiral-base-box-2'),
  // 上层护栏（连接旋转楼梯出口到上层平台）
  b( 3072,   640,  320,   32,  48, 128, 'b-spiral-upper-rail'),
  // 下层掩体
  b( 3072,  4352,   64,   64,  48,   0, 'b-tunnel-box-1'),
  b( 3328,  2816,   48,   64,  48,   0, 'b-tunnel-box-2'),
  b( 3200,  2432,   64,   48,  96,   0, 'b-tunnel-tall-box'),
  b( 3392,  5504,   64,   64,  96,   0, 'b-tunnel-entrance-box'),
  b( 3456,  5120,   48,   48,  48,   0, 'b-tunnel-mid-box'),
  // B洞下层岔路
  // [旧岔路墙体已移除，由 Zone G 新结构替代]
  // Zone G: 新岔路口结构（连接分隔墙门洞到B下层/旋转楼梯）
  b( 1152,  2304,  384,   32, 256,   0, 'b-fork-north-wall'),
  b( 1152,  1792,  384,   32, 256,   0, 'b-fork-south-wall'),
  b( 1344,  2048,   32,  512, 256,   0, 'b-fork-corridor-e'),
  b( 1216,  2176,   64,   64,  48,   0, 'b-fork-box-1'),
  b( 1216,  1920,   64,   64,  96,   0, 'b-fork-box-2'),
  // ── B Site（B包点）──────────────────────────────────────────
  // 包点平台 — 向后移256 HU更靠北墙
  b( 2560, -1536,  512,  384,  16,   0, 'b-site-platform-base'),
  b( 2560, -1152,  512,   64,  10,  16, 'b-site-platform-front-lip'),
  b( 2560, -1792,  384,   64,  10,  16, 'b-site-platform-rear-lip'),
  // 平台侧边压条
  b( 2304, -1536,   32,  384,  16,  16, 'b-site-platform-left-edge'),
  b( 2816, -1536,   32,  384,  16,  16, 'b-site-platform-right-edge'),
  // 四面墙 — 384 HU增强B区封闭感
  b( 2560, -1920, 1792,   32, 384,   0, 'b-site-north-wall'),
  b( 1664, -1280,   32, 1664, 384,   0, 'b-site-west-wall'),
  b( 3456, -1280,   32, 1664, 384,   0, 'b-site-east-wall'),
  b( 2560,  -256, 1792,   32, 384,   0, 'b-site-south-wall'),
  // Car — 移到平台右侧后方
  b( 2688, -1664,  128,   64,  40,  96, 'b-car-body'),
  b( 2688, -1600,   96,   32,  16, 136, 'b-car-hood'),
  b( 2688, -1728,   96,   32,  16, 136, 'b-car-trunk'),
  // Back Plat — 移到左后角
  b( 2112, -1856,  256,  128,  88,   0, 'b-back-plat-base'),
  b( 2112, -1920,  192,   64,  32,  88, 'b-back-plat-step'),
  b( 2112, -1984,  256,   32,  64,  88, 'b-back-plat-rear-wall'),
  // Default — 移到平台右前
  b( 2496, -1408,   64,  128,  20,  96, 'b-site-default-base'),
  b( 2496, -1472,   64,   64,  48, 116, 'b-site-default-upper'),
  // Double stack — 移到平台左前
  b( 2272, -1408,   64,   64,  48,  96, 'b-site-double-lower'),
  b( 2272, -1408,   48,   48,  48, 144, 'b-site-double-upper'),
  // 其余掩体
  b( 2688, -1792,   64,   48,  96,  96, 'b-site-right-back-box'),
  b( 2176, -1344,   48,   48,  48,  96, 'b-site-small-box'),
  // 地面掩体
  b( 2176,  -896,   64,   64,  96,   0, 'b-tunnel-exit-box'),
  b( 2496,  -768,   64,   48,  48,   0, 'b-right-front-box'),
  b( 2880,  -640,   96,   48,  48,   0, 'b-right-corridor-box'),
  b( 2752, -1792,   64,   48,  48,   0, 'b-back-corner-box'),
  b( 2112, -1920,   48,   64,  48,   0, 'b-north-wall-box'),
  // B Window — 更清晰的窗洞结构
  b( 1920, -1024,   96,   64, 128,   0, 'b-window-platform'),
  b( 1920,  -960,   96,   32,  32, 128, 'b-window-sill-top'),
  b( 1920, -1088,   96,   32,  64,  64, 'b-window-sill-low'),
  b( 1888, -1024,   32,   64, 128,   0, 'b-window-side-block-w'),
  b( 1952, -1024,   32,   64, 128,   0, 'b-window-side-block-e'),
  // B Doors — 更厚的门洞
  b( 1920, -1472,   32,  128, 256,   0, 'b-doors-frame-north'),
  b( 1920, -1600,   32,  128, 256,   0, 'b-doors-frame-south'),
  b( 1920, -1536,  128,   32,  64, 192, 'b-doors-lintel'),
  b( 1856, -1536,   64,  256, 256,   0, 'b-doors-thickness-w'),
  b( 1984, -1536,   64,  256, 256,   0, 'b-doors-thickness-e'),

  // ── 新增：B Outside（T家→B外侧路线）───────────────────────
  // B Outside 主走廊外墙（T家右侧绕行）
  b( 1920,  5632,   32, 1024, 256,   0, 'b-outside-outer-wall-n'),
  b( 1920,  4608,   32, 1024, 256,   0, 'b-outside-outer-wall-s'),
  b( 2560,  5120,  1280,   32, 256,   0, 'b-outside-back-wall'),
  // B Outside 走廊顶
  b( 2240,  5120, 640, 1024,   32, 256, 'b-outside-ceiling'),
  // B Outside 掩体
  b( 2048,  4352,   64,   64,  48,   0, 'b-outside-box-1'),
  b( 2432,  4864,   64,   64,  96,   0, 'b-outside-box-2'),
  // Zone E: B Outside 半开放庭院（下层出口到B Site之间）
  // 东侧围墙（限定B Outside范围）
  b(  3904,  1280,   32, 2560, 256,   0, 'b-outside-east-wall'),
  // East-side placeholder massing.
  b(  3712,  1792,  384,  512, 256,   0, 'b-outside-east-mass-1'),
  b(  3712,   896,  384,  512, 256,   0, 'b-outside-east-mass-2'),
  b(  3712,  -128,  384,  640, 256,   0, 'b-outside-east-mass-3'),
  // 南侧围墙（连接到B Site北边界）
  b(  3200,  -256, 1408,   32, 256,   0, 'b-outside-south-wall'),
  // 庭院掩体
  b(  3456,  1536,  128,  128,  96,   0, 'b-outside-box-large'),
  b(  3328,   768,   64,   64,  48,   0, 'b-outside-box-mid'),

  // ── 新增：A Long Corner（转角墙）────────────────────────────
  // Long Corner — A大道进入A Site前的拐角遮蔽墙
  b(-3136,  -256,   32,  512, 256,   0, 'a-long-corner-wall'),
  b(-2944,  -512, 384,    32, 256,   0, 'a-long-corner-south-wall'),
  // Long Corner 箱子（玩家常用反扒位）
  b(-3072,  -384,   96,   64,  96,   0, 'a-long-corner-box'),

  // ── 新增：Short Boost Wall（Catwalk上方可跳台阶）──────────
  b(-1280, -1792,  256,   32,  64, 128, 'short-boost-wall'),
  b(-1152, -1792,  128,   64,  96, 128, 'short-double-stack'),

  // ── 新增：Ninja 忍者位（A Site 西北角夹角）──────────────────
  b(-3456, -1760,   32,  320, 96,   0, 'a-ninja-wall-refined'),
  b(-3328, -1888,  224,   32, 96,   0, 'a-ninja-back-edge'),
  b(-3264, -1760,   64,  128, 48,   0, 'a-ninja-floor-stop'),

  // ── 新增：CT Mid → B 连接走廊（绕行路线）────────────────────
  b(  640, -2048,   32,  512, 256,   0, 'ct-to-b-corridor-wall-e'),
  b(  384, -2048,   32,  512, 256,   0, 'ct-to-b-corridor-wall-w'),
  b(  512, -2304,  512,   32, 256,   0, 'ct-to-b-corridor-north'),

  // ── 新增：T Mid 拱门结构（T家出口遮蔽）─────────────────────
  b( -192,  5760,  192,   32, 256,   0, 't-mid-arch-base-l'),
  b(  192,  5760,  192,   32, 256,   0, 't-mid-arch-base-r'),
  b( -192,  5632,   32,  256, 256,   0, 't-mid-arch-left'),
  b(  192,  5632,   32,  256, 256,   0, 't-mid-arch-right'),

  // ── 新增：Mid 斜坡（T Spawn→Mid Doors 阶梯式下降）──
  // Placeholder height cue: T Spawn sits above Mid Doors.
  // 使用固定厚度平台、递减 yOff 实现下降
  // 总下降: 96 HU (从 120→24), 8段, 每段下降12 HU
  b(   0,  5504,  128,  384,  24,  108, 'mid-ramp-0'),
  b(   0,  5120,  128,  384,  24,   96, 'mid-ramp-1'),
  b(   0,  4736,  128,  384,  24,   84, 'mid-ramp-2'),
  b(   0,  4352,  128,  384,  24,   72, 'mid-ramp-3'),
  b(   0,  3968,  128,  384,  24,   60, 'mid-ramp-4'),
  b(   0,  3584,  128,  384,  24,   48, 'mid-ramp-5'),
  b(   0,  3200,  128,  384,  24,   36, 'mid-ramp-6'),
  b(   0,  2816,  128,  384,  24,   24, 'mid-ramp-7'),
  // Mid 斜坡两侧护墙
  b( -192,  4160,   32, 2304,  64,   0, 'mid-ramp-wall-west'),
  b(  192,  4160,   32, 2304,  64,   0, 'mid-ramp-wall-east'),

  // ── Zone A: T Spawn → A Long 引导墙 ──────────────────────────
  // T Spawn 左墙(x=-896)向南延伸至A Long入口区
  b( -896,  4864,   32, 1792, 320,   0, 't-spawn-to-a-long-wall'),

  // ── Zone B: T Spawn → B Outside 右侧走廊 ─────────────────────
  // T Spawn 右墙(x=896)向东延伸到 B Outside 入口
  b(  1408,  5888, 1024,   32, 320,   0, 't-spawn-to-b-wall'),
  // B Outside 入口通道
  b(  896,  5632,   32,  512, 320,   0, 'b-outside-entry-l'),
  b( 1408,  5632,   32,  512, 320,   0, 'b-outside-entry-r'),

  // ── 新增：Mid Boost Wall（中路西侧可跳矮墙）────────────────
  b( -320,   512,   32,  256,  64,   0, 'mid-boost-wall'),

  // ── 新增：Pit 下沉地面（比主地面低64 HU）────────────────────
  // Pit 坑底（玩家跳入后站立区域，低于A Long地面）
  b(-3584,  -256,  576,  512,  16, -64, 'pit-floor'),
  // Pit 东侧上台阶（从pit爬回A Long的台阶）
  b(-3264,  -256,   32,  512, 256,   0, 'pit-east-wall'),
  ...stairsZ(-3392, -512, 192, 256, -64, 0, 4, 'pit-climb-stairs'),

  // ── 新增：A Site Ninja 夹角（后角藏身位）────────────────────
  b(-3520, -1728,   32,  384, 256,   0, 'a-site-ninja-corner-wall'),
];

// ═══════════════════════════════════════════════════════════════
// 地面材质、包点及出生点保持原有 Hammer 映射，不影响游戏主逻辑
// ═══════════════════════════════════════════════════════════════

export const DUST2_MATERIAL_ZONES: Array<{
  name: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}> = HAMMER_MATERIAL_ZONES.map(zone => ({
  name: zone.name,
  minX: hammerToGame(zone.minX),
  maxX: hammerToGame(zone.maxX),
  minZ: hammerToGame(zone.minZ),
  maxZ: hammerToGame(zone.maxZ),
}));

export const DUST2_BOMB_SITES = {
  A: {
    position: {
      x: hammerToGame(HAMMER_BOMB_SITES.A.position.x),
      y: hammerToGame(HAMMER_BOMB_SITES.A.position.y),
      z: hammerToGame(-HAMMER_BOMB_SITES.A.position.z)
    },
    radius: hammerToGame(HAMMER_BOMB_SITES.A.radius)
  },
  B: {
    position: {
      x: hammerToGame(HAMMER_BOMB_SITES.B.position.x),
      y: hammerToGame(HAMMER_BOMB_SITES.B.position.y),
      z: hammerToGame(-HAMMER_BOMB_SITES.B.position.z)
    },
    radius: hammerToGame(HAMMER_BOMB_SITES.B.radius)
  }
};

export const DUST2_SPAWNS = {
  attackers: HAMMER_SPAWNS.attackers.map(spawn => ({
    x: hammerToGame(spawn.x),
    y: hammerToGame(spawn.y) + PLAYER_EYE_HEIGHT,
    z: hammerToGame(-spawn.z)
  })),
  defenders: HAMMER_SPAWNS.defenders.map(spawn => ({
    x: hammerToGame(spawn.x),
    y: hammerToGame(spawn.y) + PLAYER_EYE_HEIGHT,
    z: hammerToGame(-spawn.z)
  }))
};

export const DUST2_TDM_SPAWNS = HAMMER_SPAWNS.tdm.map(spawn => ({
  x: hammerToGame(spawn.x),
  y: hammerToGame(spawn.y) + PLAYER_EYE_HEIGHT,
  z: hammerToGame(-spawn.z)
}));

export const DUST2_CALLOUTS = HAMMER_CALLOUTS.map(callout => ({
  name: callout.name,
  position: {
    x: hammerToGame(callout.position.x),
    y: hammerToGame(callout.position.y),
    z: hammerToGame(-callout.position.z)
  },
  radius: hammerToGame(callout.radius)
}));
