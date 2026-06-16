// Dust2 路径行走测试 - 验证地图移动和碰撞
// 修复内容:
// 1. main.ts - 修复 lineOfSightColliders 未定义导致的游戏循环错误
// 2. Physics.ts - 地面从 Plane 改为 Box (cannon-es Plane raycast 不工作)
// 3. PlayerController.ts - 延长 canJump raycast 距离并限制 snapDown 距离

import { chromium } from 'playwright';

const TEST_URL = 'http://localhost:5173/';

class SimplePathTest {
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

  async waitFor(conditionFn, timeout = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await conditionFn()) return true;
      await this.page.waitForTimeout(100);
    }
    return false;
  }

  async getState() {
    return this.page.evaluate(() => window.__debugInputState?.());
  }

  async getPosition() {
    return this.page.evaluate(() => window.__debugPlayerPosition?.());
  }

  async pressKey(key, duration = 100) {
    await this.page.keyboard.down(key);
    await this.page.waitForTimeout(duration);
    await this.page.keyboard.up(key);
  }

  async navigateToGame(mode = 'solo') {
    console.log('  加载游戏页面...');
    await this.page.goto(TEST_URL, { waitUntil: 'domcontentloaded' });

    console.log('  等待菜单加载...');
    await this.waitFor(async () => {
      const btn = await this.page.$('[data-action="solo"]');
      return !!btn;
    }, 15000);

    console.log('  选择 Dust2 地图...');
    await this.page.click('[data-map="dust2"]');
    await this.page.waitForTimeout(500);

    console.log(`  启动 ${mode} 模式...`);
    await this.page.click(`[data-action="${mode}"]`);
    await this.page.waitForTimeout(10000);  // Wait for freeze time

    await this.page.evaluate(() => {
      window.__debugAllowPointerLockBypassForTests?.();
    });
    await this.page.waitForTimeout(1000);
  }

  async testMovement() {
    console.log('  测试移动 (先左移离开出生点障碍物)...');
    
    // Move left first to clear spawn obstacles
    await this.pressKey('KeyA', 1500);
    
    const pos1 = await this.getPosition();
    console.log(`    左移后: x=${pos1.x.toFixed(2)}, z=${pos1.z.toFixed(2)}`);
    
    // Now move forward
    await this.pressKey('KeyW', 1500);
    const pos2 = await this.getPosition();
    
    const dist = Math.abs(pos2.z - pos1.z);
    console.log(`    前移后: z=${pos2.z.toFixed(2)}, 距离=${dist.toFixed(2)}`);
    
    return dist > 1.0;
  }

  async testJump() {
    console.log('  测试跳跃...');
    await this.pressKey('Space', 150);
    await this.page.waitForTimeout(500);
    const state = await this.getState();
    console.log(`    落地: ${state?.grounded ? '✓' : '✗'}`);
    return state?.grounded;
  }

  async testMode(mode) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`测试模式: ${mode}`);
    console.log('='.repeat(60));

    await this.navigateToGame(mode);
    
    const pos = await this.getPosition();
    const state = await this.getState();
    console.log(`  出生点: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`);
    console.log(`  初始状态: grounded=${state?.grounded}, phase=${state?.cs16BotMatch?.phase}`);

    const movementOk = await this.testMovement();
    const jumpOk = await this.testJump();
    
    console.log(`\n  移动测试: ${movementOk ? '✓' : '✗'}`);
    console.log(`  跳跃测试: ${jumpOk ? '✓' : '✗'}`);

    this.results.push({ mode, movementOk, jumpOk });
  }

  printSummary() {
    console.log('\n' + '='.repeat(80));
    console.log('DUST2 修复验证测试总结');
    console.log('='.repeat(80));
    console.log('\n【修复内容】');
    console.log('  1. main.ts: 修复 lineOfSightColliders 未定义变量');
    console.log('  2. Physics.ts: 地面改为 Box (cannon-es Plane raycast 无效)');
    console.log('  3. PlayerController.ts: 延长 canJump 射线距离并限制 snapDown');

    for (const result of this.results) {
      console.log(`\n【${result.mode}】`);
      console.log(`  移动: ${result.movementOk ? '✓' : '✗'}`);
      console.log(`  跳跃: ${result.jumpOk ? '✓' : '✗'}`);
    }

    const allOk = this.results.every(r => r.movementOk && r.jumpOk);
    console.log('\n' + '='.repeat(80));
    console.log(`状态: ${allOk ? '✅ 全部通过' : '⚠️ 部分失败'}`);
    console.log('='.repeat(80));
    return allOk;
  }
}

async function main() {
  const test = new SimplePathTest();

  try {
    console.log('启动 DUST2 修复验证测试...');
    await test.setup();
    console.log('浏览器已启动');

    await test.testMode('solo');

    const passed = test.printSummary();
    process.exit(passed ? 0 : 1);

  } catch (error) {
    console.error('\n测试执行失败:', error.message);
    process.exit(1);
  } finally {
    await test.teardown();
  }
}

main();
