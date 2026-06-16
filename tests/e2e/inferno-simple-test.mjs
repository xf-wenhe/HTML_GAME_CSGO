// Inferno 地图路径简化测试
// 测试三个模式下的地图通行性

import { chromium } from 'playwright';

const TEST_URL = 'http://localhost:5173/';

// 简化的路径测试
const TEST_PATHS = {
  basicMovement: {
    name: '基础移动测试',
    moves: [
      { key: 'KeyW', duration: 1500, desc: '前进' },
      { key: 'KeyA', duration: 1500, desc: '左移' },
      { key: 'KeyS', duration: 1000, desc: '后退' },
      { key: 'KeyD', duration: 1000, desc: '右移' },
    ]
  },
};

class InfernoSimpleTest {
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

  async getState() {
    return this.page.evaluate(() => window.__debugInputState?.());
  }

  async getPosition() {
    return this.page.evaluate(() => window.__debugPlayerPosition?.());
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
    console.log('  加载游戏页面...');
    await this.page.goto(TEST_URL, { waitUntil: 'domcontentloaded' });

    console.log('  等待菜单加载...');
    await this.waitFor(async () => {
      const btn = await this.page.$('[data-action="solo"]');
      return !!btn;
    }, 15000);

    console.log('  选择 Inferno 地图...');
    await this.page.click('[data-map="inferno"]');
    await this.page.waitForTimeout(500);

    console.log(`  启动 ${mode} 模式...`);
    await this.page.click(`[data-action="${mode}"]`);
    await this.page.waitForTimeout(8000);  // Wait for freeze time

    await this.page.evaluate(() => {
      window.__debugAllowPointerLockBypassForTests?.();
    });
    await this.page.waitForTimeout(1000);
  }

  async testSpawnPosition(mode) {
    console.log('  验证出生点...');
    const pos = await this.getPosition();
    const state = await this.getState();

    console.log(`    位置: (${pos?.x?.toFixed(2)}, ${pos?.y?.toFixed(2)}, ${pos?.z?.toFixed(2)})`);
    console.log(`    状态: grounded=${state?.grounded}, health=${state?.health}`);

    const issues = [];

    if (!pos) {
      issues.push('无法获取玩家位置');
    } else {
      // 检查是否在地图外 - Inferno 地图范围较大
      if (Math.abs(pos.x) > 60 || pos.z < -50 || pos.z > 50) {
        issues.push(`玩家可能在地图外: (${pos.x.toFixed(1)}, ${pos.z.toFixed(1)})`);
      }

      // 检查 Y 坐标是否合理
      if (pos.y < -5 || pos.y > 10) {
        issues.push(`Y 坐标异常: y=${pos.y.toFixed(2)}`);
      }
    }

    if (!state?.grounded) {
      issues.push('玩家不在地面上（可能悬浮）');
    }

    if (state?.health !== 100 && state?.health !== undefined) {
      issues.push(`初始生命值异常: ${state?.health}`);
    }

    return { pos, state, issues };
  }

  async testMovement() {
    console.log('  测试移动...');
    const issues = [];

    const pos1 = await this.getPosition();
    if (!pos1) {
      issues.push('无法获取初始位置');
      return issues;
    }

    // 前进
    await this.page.keyboard.down('KeyW');
    await this.page.waitForTimeout(1500);
    await this.page.keyboard.up('KeyW');
    const pos2 = await this.getPosition();

    const distW = Math.abs(pos2.z - pos1.z);
    console.log(`    前进距离: ${distW.toFixed(2)}`);

    if (distW < 1) {
      issues.push('前进距离过短，可能有碰撞问题');
    }

    // 左移
    await this.page.keyboard.down('KeyA');
    await this.page.waitForTimeout(1500);
    await this.page.keyboard.up('KeyA');
    const pos3 = await this.getPosition();

    const distA = Math.abs(pos3.x - pos2.x);
    console.log(`    左移距离: ${distA.toFixed(2)}`);

    if (distA < 1) {
      issues.push('左移距离过短，可能有碰撞问题');
    }

    // 检查是否移出地图 - Inferno 地图范围较大
    if (Math.abs(pos3.x) > 60 || pos3.z < -50 || pos3.z > 50) {
      issues.push(`移动后在地图外: (${pos3.x.toFixed(1)}, ${pos3.z.toFixed(1)})`);
    }

    return issues;
  }

  async testJump() {
    console.log('  测试跳跃...');
    const issues = [];

    await this.page.keyboard.down('Space');
    await this.page.waitForTimeout(150);
    await this.page.keyboard.up('Space');
    await this.page.waitForTimeout(800);

    const state = await this.getState();
    console.log(`    跳跃后 grounded: ${state?.grounded}`);

    if (!state?.grounded) {
      issues.push('跳跃后未能回到地面（可能悬浮）');
    }

    return issues;
  }

  async testMode(mode) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`测试模式: ${mode}`);
    console.log('='.repeat(60));

    await this.navigateToGame(mode);

    // 1. 出生点测试
    const spawnResult = await this.testSpawnPosition(mode);

    // 2. 移动测试
    const movementIssues = await this.testMovement();

    // 3. 跳跃测试
    const jumpIssues = await this.testJump();

    const allIssues = [...spawnResult.issues, ...movementIssues, ...jumpIssues];

    const result = {
      mode,
      spawn: spawnResult,
      passed: allIssues.length === 0,
      issues: allIssues,
    };

    this.results.push(result);
    this.issues.push(...allIssues.map(i => `[${mode}] ${i}`));

    console.log(`\n  结果: ${result.passed ? '✓ 通过' : '✗ 发现问题'}`);
    if (allIssues.length > 0) {
      for (const issue of allIssues) {
        console.log(`    • ${issue}`);
      }
    }

    return result;
  }

  printSummary() {
    console.log('\n' + '='.repeat(80));
    console.log('INFERNO 地图测试总结');
    console.log('='.repeat(80));

    for (const result of this.results) {
      console.log(`\n【${result.mode}】`);
      console.log(`  状态: ${result.passed ? '✓ 通过' : '✗ 失败'}`);
      console.log(`  问题数: ${result.issues.length}`);
      for (const issue of result.issues) {
        console.log(`    - ${issue}`);
      }
    }

    const allPassed = this.results.every(r => r.passed);
    console.log('\n' + '='.repeat(80));
    console.log(`总体状态: ${allPassed ? '✅ 全部通过' : '⚠️ 发现问题'}`);
    console.log(`发现问题总数: ${this.issues.length}`);
    console.log('='.repeat(80));

    return allPassed;
  }
}

async function main() {
  const test = new InfernoSimpleTest();

  try {
    console.log('启动 INFERNO 地图测试...');
    await test.setup();
    console.log('浏览器已启动');

    // 测试三个模式
    await test.testMode('solo');
    await test.testMode('tdm');
    await test.testMode('defusal');

    const allPassed = test.printSummary();

    if (!allPassed) {
      console.error('\n❌ 测试发现问题，请检查上述报告');
      process.exit(1);
    } else {
      console.log('\n✅ 所有测试通过！');
    }

  } catch (error) {
    console.error('测试执行失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await test.teardown();
  }
}

main();
