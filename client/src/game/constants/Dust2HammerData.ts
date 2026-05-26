/**
 * CSGO DUST2 地图精确数据（Hammer units）
 *
 * 数据来源: 基于公开的CSGO地图测量数据和VMF文件分析
 * 坐标系: Hammer Editor坐标系 (X=左右, Y=高度, Z=前后)
 * 单位: Hammer units (1 unit = 1英寸 ≈ 0.0254米)
 */

import { HammerPosition } from './MapUnits.js';

// === 地图边界 ===
export const DUST2_BOUNDS = {
  xMin: -4096,
  xMax: 4096,
  zMin: -3584,
  zMax: 6656,
  width: 8192,
  depth: 10240,
  boundaryHeight: 512
} as const;

// === T Spawn (恐怖分子出生点) ===
export const T_SPAWN = {
  center: { x: 0, y: 0, z: 6144 } as HammerPosition,
  width: 1024,
  depth: 768,
  walls: [
    { x: -512, z: 6144, width: 16, depth: 768, height: 128 },  // 左墙
    { x: 512, z: 6144, width: 16, depth: 768, height: 128 },   // 右墙
    { x: 0, z: 6528, width: 1024, depth: 16, height: 128 }     // 后墙
  ],
  exits: [
    { x: -256, z: 5760, width: 256, depth: 64 },  // A Long出口
    { x: 0, z: 5760, width: 256, depth: 64 },    // Mid出口
    { x: 256, z: 5760, width: 256, depth: 64 }    // B Tunnels出口
  ],
  cover: [
    { x: -256, z: 6400, width: 64, depth: 64, height: 48 },   // 左箱子
    { x: 256, z: 6400, width: 64, depth: 64, height: 48 },    // 右箱子
    { x: 0, z: 6464, width: 64, depth: 64, height: 32 },      // 中间桶
    { x: -384, z: 6080, width: 48, depth: 48, height: 48 },   // A角箱
    { x: 384, z: 6080, width: 48, depth: 48, height: 48 }     // B角箱
  ]
} as const;

// === CT Spawn (反恐分子出生点) ===
export const CT_SPAWN = {
  center: { x: 0, y: 0, z: -3328 } as HammerPosition,
  width: 1024,
  depth: 768,
  walls: [
    { x: -512, z: -3328, width: 16, depth: 768, height: 128 },  // 左墙
    { x: 512, z: -3328, width: 16, depth: 768, height: 128 },   // 右墙
    { x: 0, z: -3712, width: 1024, depth: 16, height: 128 }     // 后墙
  ],
  exits: [
    { x: -256, z: -2944, width: 256, depth: 64 },  // A出口
    { x: 0, z: -2944, width: 256, depth: 64 },     // Mid出口
    { x: 256, z: -2944, width: 256, depth: 64 }     // B出口
  ],
  cover: [
    { x: 0, z: -3456, width: 96, depth: 64, height: 48 },    // 中央掩体
    { x: -384, z: -3136, width: 48, depth: 48, height: 48 }, // A侧掩体
    { x: 384, z: -3136, width: 48, depth: 48, height: 48 }   // B侧掩体
  ]
} as const;

// === A Long (长走廊) ===
export const A_LONG = {
  startX: -3840,
  endX: -2560,
  startZ: -1280,
  endZ: 6144,
  width: 320,
  wallHeight: 128,
  doors: {
    z: 2048,          // A Doors位置
    width: 192,       // 门开口宽度
    frameThickness: 16
  },
  pit: {
    startZ: -512,     // Pit开始位置
    endZ: 0,          // Pit结束位置
    depth: 64,        // Pit深度
    width: 320
  },
  cover: [
    { x: -3520, z: 4096, width: 64, depth: 64, height: 48 },  // 走廊中段箱子
    { x: -3520, z: 2304, width: 48, depth: 64, height: 48 },  // A Doors附近箱子
    { x: -3456, z: 0, width: 64, depth: 64, height: 96 },     // 走廊北段高箱
    { x: -3520, z: -256, width: 64, depth: 48, height: 48 },  // Pit内箱子
    { x: -3584, z: 512, width: 48, depth: 48, height: 48 },   // Pit入口箱子
    { x: -3328, z: 5376, width: 64, depth: 64, height: 96 },  // A Long入口大箱
    { x: -3456, z: 5120, width: 48, depth: 48, height: 48 }   // 中转区掩体
  ]
} as const;

// === Mid (中路) ===
export const MID = {
  xMin: -512,
  xMax: 512,
  zMin: -2048,
  zMax: 2048,
  doors: {
    x: 0,
    z: 2048,
    width: 192,
    frameHeight: 64
  },
  xbox: {
    x: 0,
    z: 1024,
    width: 96,
    depth: 64,
    height: 48  // 可跳上的低箱
  },
  ctWindow: {
    x: 0,
    z: -1280,
    platformHeight: 128,
    platformWidth: 128,
    platformDepth: 64,
    wallHeight: 32
  },
  suicide: {
    x: 512,
    z: 3072,
    width: 256,
    depth: 256
  },
  cover: [
    { x: -384, z: -512, width: 64, depth: 64, height: 48 },  // Mid左箱
    { x: 384, z: -256, width: 80, depth: 80, height: 96 },   // Mid右大箱
    { x: 0, z: -1792, width: 96, depth: 64, height: 48 },    // CT Mid入口箱
    { x: -256, z: -2048, width: 48, depth: 48, height: 48 }, // 窗户下方
    { x: 256, z: -3584, width: 64, depth: 64, height: 48 },  // B侧入口掩体
    { x: -256, z: 4096, width: 64, depth: 64, height: 48 }   // A侧入口掩体
  ]
} as const;

// === Catwalk / A Short ===
export const CATWALK = {
  startX: -1920,
  endX: -1152,
  startZ: -1792,
  endZ: -640,
  stairSteps: 5,
  stairTotalHeight: 128,
  walkwayHeight: 128,
  walkwayWidth: 192,
  walkwayDepth: 1152,
  stairs: [
    { x: -1664, z: -640, height: 32 },   // 第1级
    { x: -1664, z: -704, height: 64 },   // 第2级
    { x: -1664, z: -768, height: 96 },   // 第3级
    { x: -1664, z: -832, height: 112 },  // 第4级
    { x: -1664, z: -896, height: 128 }   // 第5级/走道
  ],
  cover: [
    { x: -1536, z: -512, width: 64, depth: 64, height: 48 }  // 楼梯下方箱子
  ],
  railings: [
    { x: -1536, z: -640, width: 192, depth: 8, height: 48 },   // 南栏
    { x: -1536, z: -1792, width: 192, depth: 8, height: 48 },  // 北栏
    { x: -1664, z: -1216, width: 8, depth: 1152, height: 48 }  // 东栏
  ]
} as const;

// === A Site (A包点) ===
export const A_SITE = {
  center: { x: -2560, y: 0, z: -1280 } as HammerPosition,
  width: 1792,
  depth: 1664,
  platformHeight: 16,
  platformWidth: 768,
  platformDepth: 512,
  goose: {
    x: -1920,
    z: -1536,
    width: 64,
    depth: 192,
    height: 128,
    rotation: 15  // 角度（度）
  },
  car: null,  // A Site没有汽车
  backPlat: null,  // A Site没有Back Plat
  cover: [
    // 平台上方掩体
    { x: -2752, z: -1408, width: 96, depth: 64, height: 96, y: 16 },  // Shield位置大箱
    { x: -2496, z: -1408, width: 64, depth: 48, height: 96, y: 16 },  // 双层堆叠箱
    { x: -2496, z: -1536, width: 64, depth: 64, height: 48, y: 16 },  // Default箱
    { x: -2432, z: -1408, width: 48, depth: 48, height: 48, y: 16 },  // 小掩体箱

    // 地面掩体（非平台区）
    { x: -2752, z: -896, width: 64, depth: 64, height: 96 },          // A Long出口箱
    { x: -2048, z: -768, width: 96, depth: 48, height: 48 },          // Catwalk出口箱
    { x: -2944, z: -640, width: 64, depth: 48, height: 48 },          // A Long侧掩体
    { x: -2688, z: -1664, width: 64, depth: 48, height: 48 },         // A后角箱
    { x: -2176, z: -1920, width: 48, depth: 64, height: 48 }          // A北墙箱
  ],
  elevatorRamp: {
    startX: -2176,
    endX: -1920,
    startZ: -1600,
    endZ: -1280,
    startHeight: 0,
    endHeight: 96
  }
} as const;

// === B Tunnels (B隧道) ===
export const B_TUNNELS = {
  startX: 2816,
  endX: 3456,
  startZ: -1536,
  endZ: 6144,
  lowerWidth: 224,
  upperWidth: 224,
  wallHeight: 128,
  elevation: 128,  // 上下层高度差
  stairs: {
    startZ: 512,
    endZ: 2048,
    steps: 4,
    stepHeight: 32
  },
  lowerCover: [
    { x: 3264, z: 4352, width: 64, depth: 64, height: 48 },  // 下段中段掩体
    { x: 3328, z: 2816, width: 48, depth: 64, height: 48 },  // 下段近楼梯箱
    { x: 3200, z: 2432, width: 64, depth: 48, height: 96 },  // 转弯处高箱
    { x: 3392, z: 5504, width: 64, depth: 64, height: 96 },  // B入口大箱
    { x: 3264, z: 5120, width: 48, depth: 48, height: 48 }   // 中转区掩体
  ],
  upperCover: [
    { x: 3328, z: 0, width: 80, depth: 80, height: 96, y: 128 },    // Upper Dark掩体
    { x: 3264, z: -896, width: 64, depth: 48, height: 48, y: 128 }  // 出口前掩体
  ],
  upperDark: {
    x: 3328,
    z: 0,
    width: 256,
    depth: 384,
    height: 128
  }
} as const;

// === B Site (B包点) ===
export const B_SITE = {
  center: { x: 2560, y: 0, z: -1280 } as HammerPosition,
  width: 1792,
  depth: 1664,
  platformHeight: 16,
  platformWidth: 640,
  platformDepth: 448,
  goose: null,  // B Site没有Goose
  car: {
    x: 2688,
    z: -1408,
    width: 128,
    depth: 64,
    height: 40,
    y: 16
  },
  backPlat: {
    x: 2176,
    z: -1728,
    width: 256,
    depth: 128,
    height: 88
  },
  cover: [
    // 平台上方掩体
    { x: 2368, z: -1408, width: 64, depth: 64, height: 96, y: 16 },  // Double stack
    { x: 2368, z: -1536, width: 64, depth: 64, height: 48, y: 16 },  // Default箱
    { x: 2688, z: -1664, width: 64, depth: 48, height: 96, y: 16 },  // 右后箱
    { x: 2176, z: -1344, width: 48, depth: 48, height: 48, y: 16 },  // 小掩体

    // 地面掩体（非平台区）
    { x: 2176, z: -896, width: 64, depth: 64, height: 96 },          // B Tunnel出口掩体
    { x: 2496, z: -768, width: 64, depth: 48, height: 48 },          // 右前掩体
    { x: 2880, z: -640, width: 96, depth: 48, height: 48 },          // 右侧走廊掩体
    { x: 2752, z: -1664, width: 64, depth: 48, height: 48 },         // B后角箱
    { x: 2176, z: -1920, width: 48, depth: 64, height: 48 }          // B北墙箱
  ],
  bWindow: {
    x: 1920,
    z: -1216,
    platformHeight: 128,
    platformWidth: 96,
    platformDepth: 64,
    wallHeight: 32
  },
  bDoors: {
    x: 1920,
    z: -1536,
    width: 128,
    height: 64,
    frameHeight: 64
  }
} as const;

// === 出生点位置 ===
export const DUST2_SPAWNS = {
  attackers: [
    { x: 0, y: 64, z: 6144 },      // T Spawn中心
    { x: -128, y: 64, z: 6208 },   // T Spawn左后
    { x: 128, y: 64, z: 6208 },    // T Spawn右后
    { x: -256, y: 64, z: 6080 },   // T Spawn左前
    { x: 256, y: 64, z: 6080 }     // T Spawn右前
  ],
  defenders: [
    { x: 0, y: 64, z: -3328 },     // CT Spawn中心
    { x: -128, y: 64, z: -3392 },  // CT Spawn左后
    { x: 128, y: 64, z: -3392 },   // CT Spawn右后
    { x: -256, y: 64, z: -3264 },  // CT Spawn左前
    { x: 256, y: 64, z: -3264 }    // CT Spawn右前
  ],
  tdm: [
    { x: 0, y: 64, z: 6144 },      // T Spawn
    { x: -256, y: 64, z: 6080 },   // T Spawn
    { x: 0, y: 64, z: -3328 },     // CT Spawn
    { x: -128, y: 64, z: -3392 },  // CT Spawn
    { x: -2560, y: 64, z: -1280 }, // A Site
    { x: 2560, y: 64, z: -1280 },  // B Site
    { x: -3520, y: 64, z: 0 },     // A Long
    { x: 3328, y: 64, z: 2560 }    // B Tunnels
  ]
} as const;

// === 包点位置 ===
export const DUST2_BOMB_SITES = {
  A: {
    position: { x: -2560, y: 16, z: -1280 },
    radius: 384
  },
  B: {
    position: { x: 2560, y: 16, z: -1280 },
    radius: 384
  }
} as const;

// === 标注点 (Callouts) ===
export const DUST2_CALLOUTS = [
  { name: 'A Site', position: { x: -2560, y: 64, z: -1280 }, radius: 512 },
  { name: 'B Site', position: { x: 2560, y: 64, z: -1280 }, radius: 512 },
  { name: 'Mid', position: { x: 0, y: 64, z: 0 }, radius: 640 },
  { name: 'T Spawn', position: { x: 0, y: 64, z: 6144 }, radius: 512 },
  { name: 'CT Spawn', position: { x: 0, y: 64, z: -3328 }, radius: 512 },
  { name: 'A Long', position: { x: -3520, y: 64, z: 3072 }, radius: 256 },
  { name: 'Pit', position: { x: -3520, y: 64, z: -256 }, radius: 192 },
  { name: 'A Short', position: { x: -1536, y: 64, z: -1024 }, radius: 256 },
  { name: 'Catwalk', position: { x: -1536, y: 64, z: -1216 }, radius: 192 },
  { name: 'Goose', position: { x: -1920, y: 64, z: -1536 }, radius: 128 },
  { name: 'Mid Doors', position: { x: 0, y: 64, z: 2048 }, radius: 192 },
  { name: 'Xbox', position: { x: 0, y: 64, z: 1024 }, radius: 128 },
  { name: 'CT Window', position: { x: 0, y: 64, z: -1280 }, radius: 192 },
  { name: 'Suicide', position: { x: 512, y: 64, z: 3072 }, radius: 192 },
  { name: 'B Tunnels', position: { x: 3328, y: 64, z: 4096 }, radius: 320 },
  { name: 'Upper Dark', position: { x: 3328, y: 64, z: 0 }, radius: 192 },
  { name: 'B Window', position: { x: 1920, y: 64, z: -1216 }, radius: 192 },
  { name: 'B Doors', position: { x: 1920, y: 64, z: -1536 }, radius: 128 },
  { name: 'Car', position: { x: 2688, y: 64, z: -1408 }, radius: 128 },
  { name: 'Back Plat', position: { x: 2176, y: 64, z: -1728 }, radius: 192 }
] as const;

// === 材质区域 ===
export const DUST2_MATERIAL_ZONES = [
  { name: 'sand', minX: -4096, maxX: 4096, minZ: -3584, maxZ: 6656 },
  { name: 'concrete', minX: -3072, maxX: -2048, minZ: -1920, maxZ: -640 },
  { name: 'concrete', minX: 2048, maxX: 3072, minZ: -1920, maxZ: -640 },
  { name: 'metal', minX: -2048, maxX: -1024, minZ: -1920, maxZ: -640 },
  { name: 'concrete', minX: -512, maxX: 512, minZ: -3712, maxZ: -2944 }
] as const;