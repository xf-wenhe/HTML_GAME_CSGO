// Inferno 坐标校准测试
// 让玩家沿各个方向移动，记录真实坐标范围

import { chromium } from 'playwright';

const TEST_URL = 'http://localhost:5173/';

class InfernoCalibrationTest {
  constructor() {
    this.browser = null;
    this.page = null;
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

  async moveDirection(key, durationMs) {
    await this.page.keyboard.down(key);
    await this.page.waitForTimeout(durationMs);
    await this.page.keyboard.up(key);
  }

  async testCalibration(mode) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`【${mode.toUpperCase()}】模式坐标校准`);
    console.log('='.repeat(70));

    await this.navigateToGame(mode);

    const spawnPos = await this.getPosition();
    console.log(`\n📍 出生点: (${spawnPos.x.toFixed(2)}, ${spawnPos.y.toFixed(2)}, ${spawnPos.z.toFixed(2)})`);

    const positions = [{ desc: '出生点', ...spawnPos }];

    // 测试 W 前进 3 秒
    await this.moveDirection('KeyW', 3000);
    const posW = await this.getPosition();
    const distW = Math.abs(posW.z - spawnPos.z);
    console.log(`  按 W 3秒后: (${posW.x.toFixed(2)}, ${posW.y.toFixed(2)}, ${posW.z.toFixed(2)})`);
    console.log(`    → Z 变化: ${(posW.z - spawnPos.z).toFixed(2)} (前进距离: ${distW.toFixed(2)})`);
    positions.push({ desc: 'W 前进 3s', ...posW });

    // 测试 S 后退 3 秒
    await this.moveDirection('KeyS', 3000);
    const posS = await this.getPosition();
    const distS = Math.abs(posS.z - posW.z);
    console.log(`  按 S 3秒后: (${posS.x.toFixed(2)}, ${posS.y.toFixed(2)}, ${posS.z.toFixed(2)})`);
    console.log(`    → Z 变化: ${(posS.z - posW.z).toFixed(2)} (后退距离: ${distS.toFixed(2)})`);
    positions.push({ desc: 'S 后退 3s', ...posS });

    // 测试 A 左移 3 秒
    await this.moveDirection('KeyA', 3000);
    const posA = await this.getPosition();
    const distA = Math.abs(posA.x - posS.x);
    console.log(`  按 A 3秒后: (${posA.x.toFixed(2)}, ${posA.y.toFixed(2)}, ${posA.z.toFixed(2)})`);
    console.log(`    → X 变化: ${(posA.x - posS.x).toFixed(2)} (左移距离: ${distA.toFixed(2)})`);
    positions.push({ desc: 'A 左移 3s', ...posA });

    // 测试 D 右移 3 秒
    await this.moveDirection('KeyD', 3000);
    const posD = await this.getPosition();
    const distD = Math.abs(posD.x - posA.x);
    console.log(`  按 D 3秒后: (${posD.x.toFixed(2)}, ${posD.y.toFixed(2)}, ${posD.z.toFixed(2)})`);
    console.log(`    → X 变化: ${(posD.x - posA.x).toFixed(2)} (右移距离: ${distD.toFixed(2)})`);
    positions.push({ desc: 'D 右移 3s', ...posD });

    // 测试跳跃
    await this.page.keyboard.down('Space');
    await this.page.waitForTimeout(150);
    await this.page.keyboard.up('Space');
    await this.page.waitForTimeout(300);
    const jumpPeak = await this.getPosition();
    await this.page.waitForTimeout(500);
    const afterJump = await this.getPosition();
    console.log(`  跳跃峰值 Y: ${jumpPeak.y.toFixed(2)}`);
    console.log(`  落地后 Y: ${afterJump.y.toFixed(2)}`);

    // 综合分析
    console.log(`\n📊 坐标范围分析:`);
    const xs = positions.map(p => p.x);
    const zs = positions.map(p => p.z);
    const ys = positions.map(p => p.y);
    console.log(`  X 范围: ${Math.min(...xs).toFixed(2)} ~ ${Math.max(...xs).toFixed(2)}`);
    console.log(`  Z 范围: ${Math.min(...zs).toFixed(2)} ~ ${Math.max(...zs).toFixed(2)}`);
    console.log(`  Y 范围: ${Math.min(...ys).toFixed(2)} ~ ${Math.max(...ys).toFixed(2)}`);

    // 检查方向映射
    console.log(`\n🧭 按键方向映射:`);
    console.log(`  W 键 → Z ${(posW.z - spawnPos.z) > 0 ? '增加' : '减少'} (向 ${(posW.z - spawnPos.z) > 0 ? 'T 侧' : 'CT 侧'})`);
    console.log(`  S 键 → Z ${(posS.z - posW.z) > 0 ? '增加' : '减少'} (向 ${(posS.z - posW.z) > 0 ? 'T 侧' : 'CT 侧'})`);
    console.log(`  A 键 → X ${(posA.x - posS.x) > 0 ? '增加' : '减少'} (向 ${(posA.x - posS.x) > 0 ? '右' : '左'})`);
    console.log(`  D 键 → X ${(posD.x - posA.x) > 0 ? '增加' : '减少'} (向 ${(posD.x - posA.x) > 0 ? '右' : '左'})`);

    return { mode, positions };
  }
}

async function main() {
  const test = new InfernoCalibrationTest();

  try {
    console.log('🔍 启动 INFERNO 坐标校准测试...');
    await test.setup();
    console.log('✅ 浏览器已启动');

    // 测试三个模式
    const results = [];
    results.push(await test.testCalibration('solo'));
    results.push(await test.testCalibration('tdm'));
    results.push(await test.testCalibration('defusal'));

    // 最终总结
    console.log('\n\n' + '='.repeat(80));
    console.log('📋 坐标校准测试总结');
    console.log('='.repeat(80));

    for (const r of results) {
      const spawn = r.positions[0];
      console.log(`\n【${r.mode.toUpperCase()}】`);
      console.log(`  出生点: (${spawn.x.toFixed(2)}, ${spawn.y.toFixed(2)}, ${spawn.z.toFixed(2)})`);
    }

    console.log('\n✅ 坐标校准完成！');
    console.log('   现在可以根据真实坐标设计精确的路径测试。');

  } catch (error) {
    console.error('\n❌ 测试执行失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await test.teardown();
  }
}

main();
