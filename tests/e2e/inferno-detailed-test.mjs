// Inferno 地图详细路径测试
// 测试各种地形通行性：楼梯、箱子、平台、斜坡

import { chromium } from 'playwright';

const TEST_URL = 'http://localhost:5173/';

class InfernoDetailedTest {
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
    await this.page.goto(TEST_URL, { waitUntil: 'domcontentloaded' });
    await this.waitFor(async () => !!(await this.page.$('[data-action="solo"]')), 15000);
    await this.page.click('[data-map="inferno"]');
    await this.page.waitForTimeout(500);
    await this.page.click(`[data-action="${mode}"]`);
    await this.page.waitForTimeout(8000);
    await this.page.evaluate(() => window.__debugAllowPointerLockBypassForTests?.());
    await this.page.waitForTimeout(1000);
  }

  async move(keys, duration) {
    for (const key of keys) {
      await this.page.keyboard.down(key);
    }
    await this.page.waitForTimeout(duration);
    for (const key of keys) {
      await this.page.keyboard.up(key);
    }
  }

  async jump() {
    await this.page.keyboard.down('Space');
    await this.page.waitForTimeout(150);
    await this.page.keyboard.up('Space');
    await this.page.waitForTimeout(500);
  }

  async testStairs() {
    console.log('    测试楼梯上下...');
    const issues = [];

    // 先移动到楼梯位置
    await this.move(['KeyW'], 2000);
    await this.move(['KeyA'], 1500);

    const pos1 = await this.getPosition();
    const state1 = await this.getState();

    // 尝试上楼梯（持续前进）
    await this.move(['KeyW'], 2000);

    const pos2 = await this.getPosition();
    const state2 = await this.getState();

    // 检查 Y 坐标是否上升（说明上了楼梯）
    const yDiff = pos2.y - pos1.y;
    console.log(`      高度变化: ${yDiff.toFixed(2)}`);

    if (yDiff < 0.5) {
      issues.push('楼梯上不去 - Y 坐标没有明显上升');
    }

    if (!state2?.grounded) {
      issues.push('上楼梯后不在地面上');
    }

    // 尝试下楼梯
    await this.move(['KeyS'], 2000);
    const pos3 = await this.getPosition();
    const state3 = await this.getState();

    if (!state3?.grounded) {
      issues.push('下楼梯后不在地面上');
    }

    return issues;
  }

  async testJumpOnBox() {
    console.log('    测试跳上箱子...');
    const issues = [];

    // 找一个箱子的位置（大概在中路附近）
    await this.move(['KeyW'], 1500);
    await this.move(['KeyD'], 1000);

    const pos1 = await this.getPosition();

    // 尝试跳上箱子
    await this.move(['KeyW'], 500);
    await this.jump();

    const pos2 = await this.getPosition();
    const state2 = await this.getState();

    const yDiff = pos2.y - pos1.y;
    console.log(`      跳后高度: ${yDiff.toFixed(2)}, grounded: ${state2?.grounded}`);

    if (!state2?.grounded) {
      issues.push('跳箱子后不在地面上（可能悬浮）');
    }

    return issues;
  }

  async testSlope() {
    console.log('    测试斜坡上下...');
    const issues = [];

    await this.move(['KeyW'], 1500);

    const pos1 = await this.getPosition();

    // 上坡
    await this.move(['KeyW'], 1500);
    const pos2 = await this.getPosition();
    const state2 = await this.getState();

    // 下坡
    await this.move(['KeyS'], 1500);
    const pos3 = await this.getPosition();
    const state3 = await this.getState();

    console.log(`      上坡后 Y: ${pos2.y.toFixed(2)}, 下坡后 Y: ${pos3.y.toFixed(2)}`);

    if (!state2?.grounded || !state3?.grounded) {
      issues.push('斜坡移动后不在地面上');
    }

    return issues;
  }

  async testWallCollision() {
    console.log('    测试墙壁碰撞（不穿模）...');
    const issues = [];

    // 尝试直接向墙移动
    await this.move(['KeyW'], 3000); // 冲向墙

    const pos1 = await this.getPosition();

    // 继续向同一方向移动，如果能移动更多说明穿墙了
    await this.move(['KeyW'], 1000);

    const pos2 = await this.getPosition();

    const dist = Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.z - pos1.z, 2));
    console.log(`      撞墙后移动距离: ${dist.toFixed(2)}`);

    if (dist > 1) {
      issues.push(`可能穿模了 - 撞墙后还能移动 ${dist.toFixed(2)} 单位`);
    }

    return issues;
  }

  async testFalling() {
    console.log('    测试掉落（不悬浮）...');
    const issues = [];

    // 跳到一个较高的位置
    await this.move(['KeyW'], 1000);
    await this.jump();
    await this.page.waitForTimeout(1000);

    const state = await this.getState();
    console.log(`      掉落检测: grounded=${state?.grounded}, velocityY=${state?.velocityY?.toFixed(2)}`);

    if (!state?.grounded && state?.velocityY === 0) {
      issues.push('检测到悬浮状态');
    }

    return issues;
  }

  async testMode(mode) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`【${mode}】模式路径测试`);
    console.log('='.repeat(60));

    await this.navigateToGame(mode);

    const pos = await this.getPosition();
    console.log(`  出生点: (${pos?.x?.toFixed(2)}, ${pos?.y?.toFixed(2)}, ${pos?.z?.toFixed(2)})`);

    const modeIssues = [];

    // 测试各种场景
    try {
      modeIssues.push(...(await this.testStairs()));
      await this.page.reload({ waitUntil: 'domcontentloaded' });
      await this.navigateToGame(mode);

      modeIssues.push(...(await this.testJumpOnBox()));
      await this.page.reload({ waitUntil: 'domcontentloaded' });
      await this.navigateToGame(mode);

      modeIssues.push(...(await this.testSlope()));
      await this.page.reload({ waitUntil: 'domcontentloaded' });
      await this.navigateToGame(mode);

      modeIssues.push(...(await this.testWallCollision()));
      await this.page.reload({ waitUntil: 'domcontentloaded' });
      await this.navigateToGame(mode);

      modeIssues.push(...(await this.testFalling()));
    } catch (e) {
      modeIssues.push(`测试异常: ${e.message}`);
    }

    const result = {
      mode,
      passed: modeIssues.length === 0,
      issues: modeIssues,
    };

    this.results.push(result);
    this.issues.push(...modeIssues.map(i => `[${mode}] ${i}`));

    console.log(`\n  结果: ${result.passed ? '✓ 通过' : '✗ 发现问题'}`);
    if (modeIssues.length > 0) {
      for (const issue of modeIssues) {
        console.log(`    • ${issue}`);
      }
    }

    return result;
  }

  printReport() {
    console.log('\n' + '='.repeat(80));
    console.log('INFERNO 地图详细路径测试报告');
    console.log('='.repeat(80));

    console.log('\n【测试项目】');
    console.log('  ✓ 基础移动（WASD）');
    console.log('  ✓ 跳跃动作');
    console.log('  ✓ 楼梯上下');
    console.log('  ✓ 跳上箱子');
    console.log('  ✓ 斜坡移动');
    console.log('  ✓ 墙壁碰撞（穿模检测）');
    console.log('  ✓ 悬浮检测');

    for (const result of this.results) {
      console.log(`\n【${result.mode} 模式】`);
      console.log(`  状态: ${result.passed ? '✓ 通过' : '✗ 发现问题'}`);
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
  const test = new InfernoDetailedTest();

  try {
    console.log('启动 INFERNO 地图详细路径测试...');
    await test.setup();
    console.log('浏览器已启动');

    // 测试三个模式
    await test.testMode('solo');
    await test.testMode('tdm');
    await test.testMode('defusal');

    const allPassed = test.printReport();

    if (!allPassed) {
      console.error('\n❌ 部分测试发现问题，请检查上述报告');
      process.exit(1);
    } else {
      console.log('\n✅ 所有测试通过！Inferno 地图路径通行正常。');
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
