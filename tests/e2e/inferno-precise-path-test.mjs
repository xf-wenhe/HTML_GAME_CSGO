// Inferno 地图精确路径测试 - 使用真实地图坐标
// 测试所有关键路径：楼梯、斜坡、箱子、二楼跳下等

import { chromium } from 'playwright';

const TEST_URL = 'http://localhost:5173/';

// Inferno 真实地图坐标（转换为游戏单位：Hammer × 0.01）
// 注意: Z 坐标取反，因为代码中使用 hammerToGame(-z)
const INFERNO_WAYPOINTS = {
  // ========== T 出生点区域 ==========
  tSpawn: {
    name: 'T 出生点',
    pos: { x: -1.28, z: -30.72 }, // attackers spawn: hammerToGame(-3072)
  },

  // ========== Mid (中路) 区域 ==========
  midRampBottom: {
    name: '中路斜坡底部',
    pos: { x: 0, z: -10.24 }, // stairsZ(0, 1024, ...) → z = hammerToGame(-1024)
  },
  midRampTop: {
    name: '中路斜坡顶部',
    pos: { x: 0, z: -2.56 },
  },
  midBox: {
    name: '中路木箱',
    pos: { x: 0, z: 2.56 }, // box(0, -256, ...) → z = hammerToGame(256)
  },

  // ========== A Long (A 大) 区域 ==========
  aRampBottom: {
    name: 'A 斜坡底部',
    pos: { x: -30.72, z: -12.80 }, // stairsZ(-3072, 1280, ...)
  },
  aRampTop: {
    name: 'A 斜坡顶部',
    pos: { x: -30.72, z: -7.68 },
  },
  aLongCrate: {
    name: 'A 大木箱',
    pos: { x: -33.28, z: -10.24 }, // box(-3328, 1024, ...)
  },

  // ========== A Site (A 包点) 区域 ==========
  aSitePlatform: {
    name: 'A 平台',
    pos: { x: -15.36, z: 20.48 }, // plat(-1536, -2048, ...) → z = hammerToGame(2048)
  },
  aSiteCar: {
    name: 'A 点汽车',
    pos: { x: -20.48, z: 23.04 }, // box(-2048, -2304, ...)
  },
  aSiteBox: {
    name: 'A 点箱子',
    pos: { x: -10.24, z: 23.04 }, // box(-1024, -2304, ...)
  },

  // ========== Banana (香蕉道) 区域 ==========
  bananaRampBottom: {
    name: '香蕉道斜坡底部',
    pos: { x: -28.16, z: -17.92 }, // stairsZ(-2816, 1792, ...)
  },
  bananaBoxLarge: {
    name: '香蕉道大箱子',
    pos: { x: -28.16, z: -10.24 }, // box(-2816, 1024, ...)
  },

  // ========== Apartments (公寓) 区域 ==========
  apartmentsEntryStairsBottom: {
    name: '公寓入口楼梯底部',
    pos: { x: -33.28, z: 5.12 }, // stairsX(-3328, -512, ...) → z = hammerToGame(512)
  },
  apartmentsUpperFloor: {
    name: '公寓二楼',
    pos: { x: -15.36, z: 5.12 }, // plat(-1536, -512, ...)
  },

  // ========== B Site (B 包点) 区域 ==========
  bRampBottom: {
    name: 'B 斜坡底部',
    pos: { x: 26.88, z: -12.80 }, // stairsZ(2688, 1280, ...)
  },
  bSitePlatform: {
    name: 'B 平台',
    pos: { x: 15.36, z: 20.48 }, // plat(1536, -2048, ...)
  },
  bSiteBoxLarge: {
    name: 'B 点大箱子',
    pos: { x: 20.48, z: 23.04 }, // box(2048, -2304, ...)
  },

  // ========== CT 出生点区域 ==========
  ctSpawn: {
    name: 'CT 出生点',
    pos: { x: -1.28, z: 38.40 }, // defenders spawn: hammerToGame(-3840)
  },
};

// 完整测试路径
const TEST_PATHS = {
  // 路径 1: T Spawn -> Mid -> A Site
  tSpawnToMidToASite: {
    name: 'T Spawn -> Mid -> A Site',
    waypoints: [
      'tSpawn',
      'midRampBottom',
      'midRampTop',
      'midBox',
      'aSitePlatform',
    ],
  },

  // 路径 2: T Spawn -> Banana -> A Site
  tSpawnToBananaToASite: {
    name: 'T Spawn -> Banana -> A Site',
    waypoints: [
      'tSpawn',
      'bananaRampBottom',
      'bananaBoxLarge',
      'aSitePlatform',
    ],
  },

  // 路径 3: T Spawn -> Apartments (上楼下楼)
  tSpawnToApartmentsStairs: {
    name: 'T Spawn -> Apartments (上下楼梯)',
    waypoints: [
      'tSpawn',
      'apartmentsEntryStairsBottom',
      'apartmentsUpperFloor',
      'apartmentsEntryStairsBottom',
    ],
  },

  // 路径 4: CT Spawn -> B Site
  ctSpawnToBSite: {
    name: 'CT Spawn -> B Site',
    waypoints: [
      'ctSpawn',
      'bRampBottom',
      'bSitePlatform',
    ],
  },

  // 路径 5: A Site Car 跳箱子测试
  aSiteJumpOnCar: {
    name: 'A Site 跳上汽车 + 跳下',
    waypoints: [
      'aSitePlatform',
      'aSiteCar',
      'aSitePlatform',
    ],
  },

  // 路径 6: 二楼跳下测试 (Apartments -> 地面)
  apartmentsJumpDown: {
    name: '公寓二楼跳下',
    waypoints: [
      'apartmentsUpperFloor',
      'apartmentsEntryStairsBottom',
    ],
  },

  // 路径 7: Mid 跳箱子测试
  midJumpOnBox: {
    name: 'Mid 跳上木箱',
    waypoints: [
      'midRampTop',
      'midBox',
    ],
  },

  // 路径 8: Banana 完整路线测试
  bananaFullRoute: {
    name: 'Banana 完整路线 (斜坡 + 箱子)',
    waypoints: [
      'bananaRampBottom',
      'bananaBoxLarge',
      'aSitePlatform',
    ],
  },
};

class InfernoPrecisePathTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = [];
    this.issues = [];
  }

  async setup() {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
    });
    this.page = await this.browser.newPage({ viewport: { width: 1280, height: 720 } });
  }

  async teardown() {
    if (this.browser) await this.browser.close();
  }

  async getPosition() {
    return this.page.evaluate(() => window.__debugPlayerPosition?.());
  }

  async getState() {
    return this.page.evaluate(() => window.__debugInputState?.());
  }

  async waitFor(conditionFn, timeout = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await conditionFn()) return true;
      await this.page.waitForTimeout(100);
    }
    return false;
  }

  async navigateToGame(mode = 'solo') {
    await this.page.goto(TEST_URL, { waitUntil: 'domcontentloaded' });
    await this.waitFor(async () => !!(await this.page.$('[data-action="solo"]')), 15000);
    await this.page.click('[data-map="inferno"]');
    await this.page.waitForTimeout(500);
    await this.page.click(`[data-action="${mode}"]`);
    await this.page.waitForTimeout(8000);
    await this.page.evaluate(() => window.__debugAllowPointerLockBypassForTests?.());
    await this.page.waitForTimeout(1000);
  }

  // 精确移动到目标位置
  async moveToTarget(targetX, targetZ, maxTime = 5000, tolerance = 2.0) {
    const start = Date.now();
    let lastPos = null;
    let stuckCount = 0;

    while (Date.now() - start < maxTime) {
      const pos = await this.getPosition();
      if (!pos) break;

      const dx = targetX - pos.x;
      const dz = targetZ - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < tolerance) return { reached: true, finalPos: pos };

      // 检测卡住
      if (lastPos && Math.abs(pos.x - lastPos.x) < 0.1 && Math.abs(pos.z - lastPos.z) < 0.1) {
        stuckCount++;
        if (stuckCount > 10) break; // 卡住了，退出
      } else {
        stuckCount = 0;
      }
      lastPos = pos;

      // 计算方向并按键
      const keys = [];
      if (Math.abs(dx) > 0.3) {
        keys.push(dx > 0 ? 'KeyD' : 'KeyA');
      }
      if (Math.abs(dz) > 0.3) {
        keys.push(dz > 0 ? 'KeyW' : 'KeyS'); // Z 正方向 = W 前进
      }

      for (const key of keys) {
        await this.page.keyboard.down(key);
      }
      await this.page.waitForTimeout(100);
      for (const key of keys) {
        await this.page.keyboard.up(key);
      }
    }

    const finalPos = await this.getPosition();
    return { reached: false, finalPos };
  }

  async jump() {
    await this.page.keyboard.down('Space');
    await this.page.waitForTimeout(150);
    await this.page.keyboard.up('Space');
    await this.page.waitForTimeout(600);
  }

  // 测试单个路径
  async testPath(pathName, pathKey, mode) {
    const path = TEST_PATHS[pathKey];
    console.log(`    📍 ${path.name}`);

    const pathIssues = [];
    const positions = [];

    for (let i = 0; i < path.waypoints.length; i++) {
      const wpKey = path.waypoints[i];
      const wp = INFERNO_WAYPOINTS[wpKey];

      // 向目标移动
      const result = await this.moveToTarget(wp.pos.x, wp.pos.z, 4000, 3.0);
      const pos = result.finalPos;
      const state = await this.getState();

      positions.push(pos);

      if (!result.reached) {
        const dist = pos ? Math.sqrt(
          Math.pow(wp.pos.x - pos.x, 2) + Math.pow(wp.pos.z - pos.z, 2)
        ) : 'N/A';
        pathIssues.push(`无法到达 ${wp.name}，距离目标 ${typeof dist === 'number' ? dist.toFixed(2) : dist} 单位`);
      }

      // 检查 Y 坐标变化（如果是上楼梯/斜坡）
      if (i > 0 && positions[i - 1] && pos) {
        const yDiff = pos.y - positions[i - 1].y;

        // 如果目标位置应该有高度提升（比如斜坡顶部、二楼）
        const shouldRise = [
          'midRampTop',
          'aRampTop',
          'apartmentsUpperFloor',
          'bananaBoxLarge',
          'aSiteCar',
        ].includes(wpKey);

        if (shouldRise && yDiff < 0.3) {
          pathIssues.push(`${wp.name} 高度提升不足 (ΔY=${yDiff.toFixed(2)})，可能楼梯/斜坡有问题`);
        }
      }

      // 检查是否悬浮
      if (!state?.grounded) {
        pathIssues.push(`${wp.name} 处不在地面上（可能悬浮）`);
      }

      // 检查是否在地图外
      if (pos && (Math.abs(pos.x) > 40 || pos.z < -45 || pos.z > 45)) {
        pathIssues.push(`${wp.name} 处可能在地图外: (${pos.x.toFixed(1)}, ${pos.z.toFixed(1)})`);
      }

      // 对于特定位置测试跳跃（箱子、汽车等）
      const shouldJump = ['aSiteCar', 'midBox', 'bananaBoxLarge'].includes(wpKey);
      if (shouldJump && i === path.waypoints.length - 1) {
        await this.jump();
        const afterJumpState = await this.getState();
        if (!afterJumpState?.grounded) {
          pathIssues.push(`${wp.name} 跳跃后不在地面上`);
        }
      }

      console.log(`      ✓ 到达: ${wp.name} (Y=${pos?.y?.toFixed(2)})`);
    }

    return pathIssues;
  }

  // 测试整个模式
  async testMode(mode) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`【${mode.toUpperCase()}】模式完整路径测试`);
    console.log('='.repeat(70));

    await this.navigateToGame(mode);

    const startPos = await this.getPosition();
    console.log(`\n  🎯 出生点: (${startPos?.x?.toFixed(2)}, ${startPos?.y?.toFixed(2)}, ${startPos?.z?.toFixed(2)})`);

    const modeIssues = [];
    const pathResults = [];

    // 测试所有路径
    for (const [pathKey, path] of Object.entries(TEST_PATHS)) {
      // 重置位置（重新加载）
      await this.page.reload({ waitUntil: 'domcontentloaded' });
      await this.navigateToGame(mode);

      const issues = await this.testPath(pathKey, pathKey, mode);
      pathResults.push({ name: path.name, issues, passed: issues.length === 0 });

      if (issues.length > 0) {
        modeIssues.push(...issues.map(i => `${path.name}: ${i}`));
      }
    }

    // 总结模式结果
    const passedPaths = pathResults.filter(p => p.passed).length;
    const totalPaths = pathResults.length;

    console.log(`\n  📊 路径测试结果: ${passedPaths}/${totalPaths} 通过`);
    for (const pr of pathResults) {
      const status = pr.passed ? '✅' : '❌';
      console.log(`     ${status} ${pr.name}`);
      for (const issue of pr.issues) {
        console.log(`        • ${issue}`);
      }
    }

    const result = {
      mode,
      passed: modeIssues.length === 0,
      pathResults,
      issues: modeIssues,
    };

    this.results.push(result);
    this.issues.push(...modeIssues.map(i => `[${mode}] ${i}`));

    return result;
  }

  // 生成最终报告
  printFinalReport() {
    console.log('\n\n' + '='.repeat(80));
    console.log('🔍 INFERNO 地图完整路径测试报告');
    console.log('='.repeat(80));

    console.log('\n📋 测试覆盖的路径:');
    Object.values(TEST_PATHS).forEach(p => {
      console.log(`  • ${p.name}`);
    });

    console.log('\n🏗️  测试的地形类型:');
    console.log('  • 斜坡 (Ramp) - Mid/A/B');
    console.log('  • 楼梯 (Stairs) - Apartments');
    console.log('  • 平台 (Platform) - A Site/B Site');
    console.log('  • 箱子跳跃 (Box Jump) - Mid/Banana/A Site');
    console.log('  • 二楼跳下 (Fall) - Apartments');
    console.log('  • 汽车跳跃 (Car Jump) - A Site');

    // 每个模式的详细结果
    for (const result of this.results) {
      console.log(`\n\n${'─'.repeat(80)}`);
      console.log(`【${result.mode.toUpperCase()} 模式】`);
      console.log('─'.repeat(80));
      console.log(`  状态: ${result.passed ? '✅ 全部通过' : '❌ 发现问题'}`);
      console.log(`  路径: ${result.pathResults.filter(p => p.passed).length}/${result.pathResults.length} 通过`);

      if (result.issues.length > 0) {
        console.log(`\n  ⚠️  问题列表 (${result.issues.length} 项):`);
        for (const issue of result.issues) {
          console.log(`    • ${issue}`);
        }
      }

      // 详细路径结果
      console.log(`\n  📍 详细路径结果:`);
      for (const pr of result.pathResults) {
        const status = pr.passed ? '✅' : '❌';
        console.log(`     ${status} ${pr.name}`);
      }
    }

    // 总体总结
    const totalPassedModes = this.results.filter(r => r.passed).length;
    const totalPaths = this.results.reduce((sum, r) => sum + r.pathResults.length, 0);
    const totalPassedPaths = this.results.reduce((sum, r) => sum + r.pathResults.filter(p => p.passed).length, 0);

    console.log('\n\n' + '='.repeat(80));
    console.log('📊 总体总结');
    console.log('='.repeat(80));
    console.log(`  测试模式: ${totalPassedModes}/${this.results.length} 全部通过`);
    console.log(`  测试路径: ${totalPassedPaths}/${totalPaths} 全部通过`);
    console.log(`  发现问题: ${this.issues.length} 项`);
    console.log(`  总体状态: ${this.issues.length === 0 ? '✅ 完美通过' : '⚠️  存在问题需要修复'}`);
    console.log('='.repeat(80));

    return this.issues.length === 0;
  }
}

async function main() {
  const test = new InfernoPrecisePathTest();

  try {
    console.log('🚀 启动 INFERNO 地图精确路径测试...');
    console.log('📍 使用 InfernoLayout.ts 中的真实地图坐标');
    console.log('🎯 测试内容: 斜坡、楼梯、箱子、平台、二楼跳下');
    await test.setup();
    console.log('✅ 浏览器已启动');

    // 测试三个模式
    await test.testMode('solo');
    await test.testMode('tdm');
    await test.testMode('defusal');

    const allPassed = test.printFinalReport();

    if (!allPassed) {
      console.error('\n\n❌ 部分测试未通过，请检查上述问题列表');
      process.exit(1);
    } else {
      console.log('\n\n🎉 恭喜！Inferno 地图所有路径在三个模式下全部正常！');
      console.log('   可以正常使用 WASD 上下楼梯、跳箱子、从二楼跳下，无穿模和悬浮问题。');
    }

  } catch (error) {
    console.error('\n❌ 测试执行失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await test.teardown();
  }
}

main();
