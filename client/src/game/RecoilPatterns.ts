import type { WeaponId } from './types.js';

// CS 1.6 风格固定后坐力喷射轨迹
// 基于原版 CS 1.6 的武器后坐力数据

interface RecoilStep {
  x: number;
  y: number;
}

function generateCS16AK47Pattern(): RecoilStep[] {
  // AK-47: 经典倒7形，先垂直向上，然后向右
  const steps: RecoilStep[] = [];
  for (let i = 0; i < 30; i++) {
    const p = i / 29;
    if (i < 8) {
      steps.push({ x: p * 0.3, y: p * 4.8 });
    } else if (i < 23) {
      const local = (i - 8) / 14;
      steps.push({ x: 0.3 + local * 3.5, y: 4.8 + local * 1.6 });
    } else {
      const local = (i - 23) / 6;
      steps.push({ x: 3.8 - local * 0.6, y: 6.4 + local * 0.5 });
    }
  }
  return steps;
}

function generateCS16M4A1Pattern(): RecoilStep[] {
  // M4A1: S形，先上后左再右
  const steps: RecoilStep[] = [];
  for (let i = 0; i < 30; i++) {
    const p = i / 29;
    if (i < 9) {
      steps.push({ x: p * 0.25, y: p * 4.2 });
    } else if (i < 19) {
      const local = (i - 9) / 9;
      steps.push({ x: 0.25 - local * 1.1, y: 4.2 + local * 1.7 });
    } else {
      const local = (i - 19) / 10;
      steps.push({ x: -0.85 + local * 1.3, y: 5.9 + local * 1.1 });
    }
  }
  return steps;
}

function generateCS16GalilPattern(): RecoilStep[] {
  // Galil: 类似AK但更散
  const steps: RecoilStep[] = [];
  for (let i = 0; i < 35; i++) {
    const p = i / 34;
    if (i < 9) {
      steps.push({ x: p * 0.35, y: p * 4.5 });
    } else if (i < 21) {
      const local = (i - 9) / 11;
      steps.push({ x: 0.35 + local * 3.8, y: 4.5 + local * 2.0 });
    } else {
      const local = (i - 21) / 13;
      steps.push({ x: 4.15 - local * 0.4, y: 6.5 + local * 0.8 });
    }
  }
  return steps;
}

function generateCS16FAMASPattern(): RecoilStep[] {
  // FAMAS: 前三发极准，然后上跳
  const steps: RecoilStep[] = [];
  for (let i = 0; i < 25; i++) {
    const p = i / 24;
    if (i < 3) {
      steps.push({ x: 0, y: i * 0.12 });
    } else if (i < 13) {
      const local = (i - 3) / 9;
      steps.push({ x: local * 0.85, y: 0.36 + local * 4.8 });
    } else {
      const local = (i - 13) / 11;
      steps.push({ x: 0.85 + local * 1.9, y: 5.16 + local * 1.7 });
    }
  }
  return steps;
}

function generateCS16UMP45Pattern(): RecoilStep[] {
  // UMP-45: SMG中后坐力最大，先左上后右
  const steps: RecoilStep[] = [];
  for (let i = 0; i < 25; i++) {
    const p = i / 24;
    if (i < 11) {
      steps.push({ x: -p * 0.55, y: p * 3.8 });
    } else {
      const local = (i - 11) / 13;
      steps.push({ x: -0.55 + local * 2.8, y: 3.8 + local * 2.2 });
    }
  }
  return steps;
}

function generateCS16P90Pattern(): RecoilStep[] {
  // P90: 先上后快速右飘，弹量大
  const steps: RecoilStep[] = [];
  for (let i = 0; i < 50; i++) {
    const p = i / 49;
    if (i < 9) {
      steps.push({ x: p * 0.22, y: p * 2.8 });
    } else {
      const local = (i - 9) / 40;
      steps.push({ x: 0.22 + local * 4.5, y: 2.8 + local * 2.8 });
    }
  }
  return steps;
}

function generateCS16MP5Pattern(): RecoilStep[] {
  // MP5: CS 1.6中最稳的SMG
  const steps: RecoilStep[] = [];
  for (let i = 0; i < 30; i++) {
    const p = i / 29;
    if (i < 10) {
      steps.push({ x: -p * 0.15, y: p * 2.4 });
    } else {
      const local = (i - 10) / 19;
      steps.push({ x: -0.15 + local * 1.8, y: 2.4 + local * 1.6 });
    }
  }
  return steps;
}

function generateCS16TMPPattern(): RecoilStep[] {
  // TMP: 更稳但伤害低
  const steps: RecoilStep[] = [];
  for (let i = 0; i < 30; i++) {
    const p = i / 29;
    if (i < 12) {
      steps.push({ x: p * 0.18, y: p * 2.2 });
    } else {
      const local = (i - 12) / 17;
      steps.push({ x: 0.18 + local * 1.6, y: 2.2 + local * 1.4 });
    }
  }
  return steps;
}

function generateCS16MAC10Pattern(): RecoilStep[] {
  // MAC-10: MP5的镜像但更跳
  const steps: RecoilStep[] = [];
  for (let i = 0; i < 30; i++) {
    const p = i / 29;
    if (i < 9) {
      steps.push({ x: p * 0.35, y: p * 3.2 });
    } else {
      const local = (i - 9) / 20;
      steps.push({ x: 0.35 + local * 2.4, y: 3.2 + local * 2.4 });
    }
  }
  return steps;
}

function generateCS16AWPPattern(): RecoilStep[] {
  // AWP: 每次射击后坐力巨大，但间隔长
  const steps: RecoilStep[] = [];
  for (let i = 0; i < 10; i++) {
    steps.push({ x: (i - 5) * 0.18, y: i * 1.8 });
  }
  return steps;
}

function generateCS16ScoutPattern(): RecoilStep[] {
  // Scout: 轻型狙击，后坐力中等
  const steps: RecoilStep[] = [];
  for (let i = 0; i < 15; i++) {
    steps.push({ x: (i - 7) * 0.15, y: i * 1.4 });
  }
  return steps;
}

function generateCS16G3SG1Pattern(): RecoilStep[] {
  // G3SG1: 连狙，后坐力较大
  const steps: RecoilStep[] = [];
  for (let i = 0; i < 20; i++) {
    const p = i / 19;
    if (i < 8) {
      steps.push({ x: -p * 0.25, y: p * 2.8 });
    } else {
      const local = (i - 8) / 11;
      steps.push({ x: -0.25 - local * 1.2, y: 2.8 + local * 1.2 });
    }
  }
  return steps;
}

function generateCS16SG550Pattern(): RecoilStep[] {
  // SG550: 另一个连狙
  const steps: RecoilStep[] = [];
  for (let i = 0; i < 20; i++) {
    const p = i / 19;
    if (i < 8) {
      steps.push({ x: p * 0.28, y: p * 3.0 });
    } else {
      const local = (i - 8) / 11;
      steps.push({ x: 0.28 + local * 1.4, y: 3.0 + local * 1.3 });
    }
  }
  return steps;
}

function generateCS16SG552Pattern(): RecoilStep[] {
  // SG552: 带镜步枪，后坐力可控
  const steps: RecoilStep[] = [];
  for (let i = 0; i < 30; i++) {
    const p = i / 29;
    if (i < 9) {
      steps.push({ x: p * 0.22, y: p * 3.4 });
    } else if (i < 20) {
      const local = (i - 9) / 10;
      steps.push({ x: 0.22 + local * 1.6, y: 3.4 + local * 1.4 });
    } else {
      const local = (i - 20) / 9;
      steps.push({ x: 1.82 - local * 0.25, y: 4.8 + local * 0.6 });
    }
  }
  return steps;
}

function generateCS16AUGPattern(): RecoilStep[] {
  // AUG: CT带镜步枪
  const steps: RecoilStep[] = [];
  for (let i = 0; i < 30; i++) {
    const p = i / 29;
    if (i < 9) {
      steps.push({ x: -p * 0.2, y: p * 3.2 });
    } else if (i < 20) {
      const local = (i - 9) / 10;
      steps.push({ x: -0.2 - local * 1.3, y: 3.2 + local * 1.3 });
    } else {
      const local = (i - 20) / 9;
      steps.push({ x: -1.5 + local * 0.2, y: 4.5 + local * 0.5 });
    }
  }
  return steps;
}

function generateCS16DeaglePattern(): RecoilStep[] {
  // Desert Eagle: 单发巨大后坐力
  const steps: RecoilStep[] = [];
  for (let i = 0; i < 7; i++) {
    steps.push({ x: (i - 3) * 0.2, y: i * 2.0 });
  }
  return steps;
}

function generateCS16USPPattern(): RecoilStep[] {
  // USP: CT初始手枪，很稳
  const steps: RecoilStep[] = [];
  for (let i = 0; i < 12; i++) {
    steps.push({ x: (i - 6) * 0.1, y: i * 1.0 });
  }
  return steps;
}

function generateCS16GlockPattern(): RecoilStep[] {
  // Glock: T初始手枪，可连射
  const steps: RecoilStep[] = [];
  for (let i = 0; i < 20; i++) {
    const p = i / 19;
    if (i < 8) {
      steps.push({ x: p * 0.18, y: p * 1.8 });
    } else {
      const local = (i - 8) / 11;
      steps.push({ x: 0.18 + local * 1.5, y: 1.8 + local * 1.2 });
    }
  }
  return steps;
}

function generateCS16P228Pattern(): RecoilStep[] {
  // P228: 另一个手枪
  const steps: RecoilStep[] = [];
  for (let i = 0; i < 13; i++) {
    steps.push({ x: (i - 6) * 0.12, y: i * 1.1 });
  }
  return steps;
}

function generateCS16FiveSevenPattern(): RecoilStep[] {
  // Five-SeveN: 大弹匣手枪
  const steps: RecoilStep[] = [];
  for (let i = 0; i < 20; i++) {
    const p = i / 19;
    if (i < 8) {
      steps.push({ x: -p * 0.15, y: p * 1.6 });
    } else {
      const local = (i - 8) / 11;
      steps.push({ x: -0.15 + local * 1.2, y: 1.6 + local * 1.0 });
    }
  }
  return steps;
}

function generateCS16M3Pattern(): RecoilStep[] {
  // M3: 泵动霰弹枪
  const steps: RecoilStep[] = [];
  for (let i = 0; i < 8; i++) {
    steps.push({ x: (i - 4) * 0.4, y: i * 0.8 });
  }
  return steps;
}

function generateCS16XM1014Pattern(): RecoilStep[] {
  // XM1014: 半自动霰弹枪
  const steps: RecoilStep[] = [];
  for (let i = 0; i < 7; i++) {
    steps.push({ x: (i - 3) * 0.45, y: i * 0.85 });
  }
  return steps;
}

function generateCS16M249Pattern(): RecoilStep[] {
  // M249: 大机枪，后坐力很大
  const steps: RecoilStep[] = [];
  for (let i = 0; i < 100; i++) {
    const p = i / 99;
    if (i < 20) {
      steps.push({ x: p * 0.5, y: p * 5.0 });
    } else if (i < 60) {
      const local = (i - 20) / 39;
      steps.push({ x: 0.5 + local * 4.0, y: 5.0 + local * 2.5 });
    } else {
      const local = (i - 60) / 39;
      steps.push({ x: 4.5 - local * 1.0, y: 7.5 + local * 1.0 });
    }
  }
  return steps;
}

export const CS16_RECOIL_PATTERNS: Record<string, RecoilStep[]> = {
  // 手枪
  glock: generateCS16GlockPattern(),
  usp: generateCS16USPPattern(),
  p228: generateCS16P228Pattern(),
  deagle: generateCS16DeaglePattern(),
  five_seven: generateCS16FiveSevenPattern(),

  // SMG
  mp5: generateCS16MP5Pattern(),
  tmp: generateCS16TMPPattern(),
  p90: generateCS16P90Pattern(),
  mac10: generateCS16MAC10Pattern(),
  ump45: generateCS16UMP45Pattern(),

  // 霰弹枪
  m3: generateCS16M3Pattern(),
  xm1014: generateCS16XM1014Pattern(),

  // 步枪
  ak47: generateCS16AK47Pattern(),
  m4a1: generateCS16M4A1Pattern(),
  sg552: generateCS16SG552Pattern(),
  aug: generateCS16AUGPattern(),
  galil: generateCS16GalilPattern(),
  famas: generateCS16FAMASPattern(),

  // 狙击枪
  scout: generateCS16ScoutPattern(),
  awp: generateCS16AWPPattern(),
  sg550: generateCS16SG550Pattern(),
  g3sg1: generateCS16G3SG1Pattern(),

  // 机枪
  m249: generateCS16M249Pattern(),

  // 兼容旧ID
  rifle: generateCS16AK47Pattern(),
  defender_rifle: generateCS16M4A1Pattern(),
  sniper: generateCS16AWPPattern(),
};

// 保持原有CS:GO后坐力模式用于兼容
export const RECOIL_PATTERNS: Record<string, RecoilStep[]> = {
  ...CS16_RECOIL_PATTERNS,
  'rifle/ak47': generateCS16AK47Pattern(),
  'vandal': generateCS16AK47Pattern(),
  'm4a1': generateCS16M4A1Pattern(),
  'm4a1s': generateCS16M4A1Pattern(),
  'm4a4': generateCS16M4A1Pattern(),
  'sentinel': generateCS16M4A1Pattern(),
  'defender_rifle': generateCS16M4A1Pattern(),
  'operator': generateCS16AWPPattern(),
  'specter': generateCS16MP5Pattern(),
  'bulldog': generateCS16M3Pattern(),
  'heavy_pistol': generateCS16DeaglePattern(),
  'sidearm': generateCS16GlockPattern(),
  'nova': generateCS16M3Pattern(),
  'mag7': generateCS16M3Pattern(),
  'sawedoff': generateCS16M3Pattern(),
  'shotgun': generateCS16M3Pattern(),
  'ssg08': generateCS16ScoutPattern(),
  'scar20': generateCS16G3SG1Pattern(),
  'negev': generateCS16M249Pattern(),
  'mp9': generateCS16MP5Pattern(),
  'pp_bizon': generateCS16P90Pattern(),
  'mp7': generateCS16MP5Pattern(),
  'p250': generateCS16P228Pattern(),
  'smg': generateCS16MP5Pattern(),
  'usp_s': generateCS16USPPattern(),
  'pistol': generateCS16GlockPattern(),
};