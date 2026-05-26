// CS:GO 风格固定后坐力喷射轨迹
// 每把武器 30 发完整轨迹 (x=水平, y=垂直, 正值=上/右)
// 实际游戏中取反 Y 轴 (武器上跳)

interface RecoilStep {
  x: number;
  y: number;
}

function generateAkPattern(): RecoilStep[] {
  // AK-47: 倒 7 形 — 先直上, 第8发开始右横拉, 第23发后左回
  const steps: RecoilStep[] = [];
  for (let i = 0; i < 30; i++) {
    const p = i / 29;
    if (i < 7) {
      steps.push({ x: p * 0.4, y: p * 4.5 });
    } else if (i < 22) {
      const local = (i - 7) / 14;
      steps.push({ x: 0.4 + local * 3.2, y: 4.5 + local * 1.8 });
    } else {
      const local = (i - 22) / 7;
      steps.push({ x: 3.6 - local * 0.8, y: 6.3 + local * 0.7 });
    }
  }
  return steps;
}

function generateM4Pattern(): RecoilStep[] {
  // M4A4: S 形 — 先上, 微右, 再左回, 再右稳
  const steps: RecoilStep[] = [];
  for (let i = 0; i < 30; i++) {
    const p = i / 29;
    if (i < 8) {
      steps.push({ x: p * 0.3, y: p * 3.8 });
    } else if (i < 18) {
      const local = (i - 8) / 9;
      steps.push({ x: 0.3 - local * 1.0, y: 3.8 + local * 1.8 });
    } else {
      const local = (i - 18) / 11;
      steps.push({ x: -0.7 + local * 1.2, y: 5.6 + local * 1.2 });
    }
  }
  return steps;
}

function generateM4A1SPattern(): RecoilStep[] {
  // M4A1-S: 比 M4A4 紧凑 15%
  const m4 = generateM4Pattern();
  return m4.map(s => ({ x: s.x * 0.85, y: s.y * 0.85 }));
}

function generateGalilPattern(): RecoilStep[] {
  // Galil: 类似 AK 但末端更分散
  const steps: RecoilStep[] = [];
  for (let i = 0; i < 35; i++) {
    const p = i / 34;
    if (i < 8) {
      steps.push({ x: p * 0.35, y: p * 4.2 });
    } else if (i < 20) {
      const local = (i - 8) / 11;
      steps.push({ x: 0.35 + local * 3.5, y: 4.2 + local * 2.2 });
    } else {
      const local = (i - 20) / 14;
      steps.push({ x: 3.85 - local * 0.5, y: 6.4 + local * 1.0 });
    }
  }
  return steps;
}

function generateFamasPattern(): RecoilStep[] {
  // FAMAS: 前3发极紧密 (burst), 后续上跳剧烈
  const steps: RecoilStep[] = [];
  for (let i = 0; i < 25; i++) {
    const p = i / 24;
    if (i < 3) {
      steps.push({ x: 0, y: i * 0.15 });
    } else if (i < 12) {
      const local = (i - 3) / 8;
      steps.push({ x: local * 0.8, y: 0.45 + local * 4.5 });
    } else {
      const local = (i - 12) / 12;
      steps.push({ x: 0.8 + local * 1.8, y: 4.95 + local * 1.8 });
    }
  }
  return steps;
}

function generateUmpPattern(): RecoilStep[] {
  // UMP-45: SMG 中后坐力最大, 先左上后右
  const steps: RecoilStep[] = [];
  for (let i = 0; i < 25; i++) {
    const p = i / 24;
    if (i < 10) {
      steps.push({ x: -p * 0.5, y: p * 3.5 });
    } else {
      const local = (i - 10) / 14;
      steps.push({ x: -0.5 + local * 2.5, y: 3.5 + local * 2.0 });
    }
  }
  return steps;
}

function generateP90Pattern(): RecoilStep[] {
  // P90: 先上后快速右飘, 弹量大
  const steps: RecoilStep[] = [];
  for (let i = 0; i < 50; i++) {
    const p = i / 49;
    if (i < 8) {
      steps.push({ x: p * 0.2, y: p * 2.5 });
    } else {
      const local = (i - 8) / 41;
      steps.push({ x: 0.2 + local * 4.0, y: 2.5 + local * 2.5 });
    }
  }
  return steps;
}

function generateMp9Pattern(): RecoilStep[] {
  // MP9: 先上后左飘 (CT 偏向)
  const steps: RecoilStep[] = [];
  for (let i = 0; i < 30; i++) {
    const p = i / 29;
    if (i < 8) {
      steps.push({ x: -p * 0.3, y: p * 2.8 });
    } else {
      const local = (i - 8) / 21;
      steps.push({ x: -0.3 - local * 2.0, y: 2.8 + local * 2.2 });
    }
  }
  return steps;
}

function generateMac10Pattern(): RecoilStep[] {
  // MAC-10: MP9 的镜像 — 先上后右飘 (T 偏向)
  const steps: RecoilStep[] = [];
  for (let i = 0; i < 30; i++) {
    const p = i / 29;
    if (i < 8) {
      steps.push({ x: p * 0.3, y: p * 2.8 });
    } else {
      const local = (i - 8) / 21;
      steps.push({ x: 0.3 + local * 2.0, y: 2.8 + local * 2.2 });
    }
  }
  return steps;
}

function generateSg553Pattern(): RecoilStep[] {
  // SG 553: 有镜, 后坐力更可控
  const steps: RecoilStep[] = [];
  for (let i = 0; i < 30; i++) {
    const p = i / 29;
    if (i < 8) {
      steps.push({ x: p * 0.2, y: p * 3.2 });
    } else if (i < 20) {
      const local = (i - 8) / 11;
      steps.push({ x: 0.2 + local * 1.8, y: 3.2 + local * 1.5 });
    } else {
      const local = (i - 20) / 9;
      steps.push({ x: 2.0 - local * 0.3, y: 4.7 + local * 0.8 });
    }
  }
  return steps;
}

function generateAugPattern(): RecoilStep[] {
  // AUG: CT 有镜步枪
  const steps: RecoilStep[] = [];
  for (let i = 0; i < 30; i++) {
    const p = i / 29;
    if (i < 8) {
      steps.push({ x: -p * 0.2, y: p * 3.0 });
    } else if (i < 20) {
      const local = (i - 8) / 11;
      steps.push({ x: -0.2 - local * 1.5, y: 3.0 + local * 1.5 });
    } else {
      const local = (i - 20) / 9;
      steps.push({ x: -1.7 + local * 0.3, y: 4.5 + local * 0.8 });
    }
  }
  return steps;
}

function generateDeaglePattern(): RecoilStep[] {
  // Deagle: 单发大后座, 恢复慢
  const steps: RecoilStep[] = [];
  for (let i = 0; i < 7; i++) {
    steps.push({ x: (i - 3) * 0.15, y: i * 1.8 });
  }
  return steps;
}

export const RECOIL_PATTERNS: Record<string, RecoilStep[]> = {
  'rifle/ak47': generateAkPattern(),
  'ak47': generateAkPattern(),
  'rifle': generateAkPattern(),
  'vandal': generateAkPattern(),

  'm4a4': generateM4Pattern(),
  'defender_rifle': generateM4Pattern(),

  'm4a1s': generateM4A1SPattern(),
  'sentinel': generateM4A1SPattern(),

  'galil': generateGalilPattern(),
  'famas': generateFamasPattern(),
  'ump45': generateUmpPattern(),
  'p90': generateP90Pattern(),
  'mp9': generateMp9Pattern(),
  'mac10': generateMac10Pattern(),
  'sg553': generateSg553Pattern(),
  'aug': generateAugPattern(),
  'deagle': generateDeaglePattern(),
  'heavy_pistol': generateDeaglePattern(),

  // 其余武器用默认 5 步模式 (保留在 WeaponConfig.recoilPattern)
};
