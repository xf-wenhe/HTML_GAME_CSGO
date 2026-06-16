// Inferno 智能探索测试 - 从出生点开始真实探索
// 探测墙壁、斜坡、箱子、楼梯的实际位置

import { chromium } from 'playwright';

const TEST_URL = 'http://localhost:5173/';

class InfernoSmartExplorer {
  constructor() {
    this.browser = null;
    this.page = null;
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

  async move(key, durationMs) {
    await this.page.keyboard.down(key);
    await this.page.waitForTimeout(durationMs);
    await this.page.keyboard.up(key);
  }

  async jump() {
    await this.page.keyboard.down('Space');
    await this.page.waitForTimeout(150);
    await this.page.keyboard.up('Space');
    await this.page.waitForTimeout(500);
  }

  // 探测碰撞：向一个方向移动，看能走多远
  async probeDirection(key, maxTimeMs = 2000, stepMs = 200) {
    const start = await this.getPosition();
    let lastPos = start;
    let stuckCount = 0;
    const positions = [start];

    for (let elapsed = 0; elapsed < maxTimeMs; elapsed += stepMs) {
      await this.move(key, stepMs);
      const pos = await this.getPosition();
      positions.push(pos);

      const dist = Math.sqrt(
        Math.pow(pos.x - lastPos.x, 2) + Math.pow(pos.z - lastPos.z, 2)
      );

      if (dist < 0.1) stuckCount++;
      else stuckCount = 0;

      if (stuckCount >= 3) break; // 卡住了（撞墙）
      lastPos = pos;
    }

    return { start, end: lastPos, positions, hitWall: stuckCount >= 3 };
  }

  // 测试地形高度变化（探测斜坡/楼梯）
  async testHeightChange(forwardKey, durationMs = 3000) {
    const startPos = await this.getPosition();
    const startState = await this.getState();

    await this.move(forwardKey, durationMs);

    const endPos = await this.getPosition();
    const endState = await this.getState();

    const heightChange = endPos.y - startPos.y;
    const distMoved = Math.sqrt(
      Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.z - startPos.z, 2)
    );

    return {
      startY: startPos.y,
      endY: endPos.y,
      heightChange,
      distance: distMoved,
      groundedAtEnd: endState?.grounded,
      hasSlope: Math.abs(heightChange) > 0.3,
    };
  }

  // 检查悬浮状态
  async checkFloating() {
    const state = await this.getState();
    const pos = await this.getPosition();
    return !state?.grounded && state?.velocityY === 0;
  }

  // 主测试流程
  async testMode(mode) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`【${mode.toUpperCase()}】模式探索测试`);
    console.log('='.repeat(70));

    await this.navigateToGame(mode);

    const spawnPos = await this.getPosition();
    console.log(`\n📍 出生点: (${spawnPos.x.toFixed(2)}, ${spawnPos.y.toFixed(2)}, ${spawnPos.z.toFixed(2)})`);

    const modeIssues = [];

    // ========== 测试 1: 基础移动和碰撞 ==========
    console.log(`\n🧪 测试 1: 基础移动与碰撞检测`);

    // 探测四个方向
    const directions = [
      { key: 'KeyW', name: '前 (W)' },
      { key: 'KeyS', name: '后 (S)' },
      { key: 'KeyA', name: '左 (A)' },
      { key: 'KeyD', name: '右 (D)' },
    ];

    for (const dir of directions) {
      // 回到出生点附近
      await this.page.reload({ waitUntil: 'domcontentloaded' });
      await this.navigateToGame(mode);

      const result = await this.probeDirection(dir.key, 3000, 200);
      const dist = Math.sqrt(
        Math.pow(result.end.x - result.start.x, 2) +
        Math.pow(result.end.z - result.start.z, 2)
      );

      console.log(`  ${dir.name}: 移动 ${dist.toFixed(2)} 单位`);
      if (result.hitWall) {
        console.log(`    ✅ 检测到墙壁 (碰撞正常)`);
      } else if (dist > 10) {
        console.log(`    ⚠️  未检测到墙壁，可能是开阔区域`);
      }

      // 检查 Y 坐标是否异常
      if (result.end.y < -2 || result.end.y > 5) {
        const issue = `${dir.name} 移动后 Y 坐标异常: ${result.end.y.toFixed(2)}`;
        console.log(`    ❌ ${issue}`);
        modeIssues.push(`${dir.name}: ${issue}`);
      }

      // 检查悬浮
      const floating = await this.checkFloating();
      if (floating) {
        const issue = `${dir.name} 移动后悬浮`;
        console.log(`    ❌ ${issue}`);
        modeIssues.push(`${dir.name}: ${issue}`);
      }
    }

    // ========== 测试 2: 跳跃 ==========
    console.log(`\n🧪 测试 2: 跳跃测试`);
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await this.navigateToGame(mode);

    const beforeJump = await this.getPosition();
    const beforeState = await this.getState();

    await this.jump();
    await this.page.waitForTimeout(300);
    const jumpPeak = await this.getPosition();
    await this.page.waitForTimeout(500);
    const afterLanding = await this.getPosition();
    const afterState = await this.getState();

    const jumpHeight = jumpPeak.y - beforeJump.y;
    console.log(`  起跳 Y: ${beforeJump.y.toFixed(2)}`);
    console.log(`  峰值 Y: ${jumpPeak.y.toFixed(2)} (高度: ${jumpHeight.toFixed(2)})`);
    console.log(`  落地 Y: ${afterLanding.y.toFixed(2)}`);
    console.log(`  落地后 grounded: ${afterState?.grounded ? '✅ 是' : '❌ 否'}`);

    if (!afterState?.grounded) {
      modeIssues.push('跳跃后悬浮，未落地');
      console.log(`  ❌ 跳跃后悬浮！`);
    } else if (jumpHeight < 0.2) {
      console.log(`  ⚠️  跳跃高度偏低`);
    } else {
      console.log(`  ✅ 跳跃正常`);
    }

    // ========== 测试 3: 向前探索斜坡/地形 ==========
    console.log(`\n🧪 测试 3: 地形高度变化探索`);
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await this.navigateToGame(mode);

    // 持续向前移动，观察 Y 变化
    const stepDuration = 500;
    const steps = 10;
    const heightReadings = [];
    let currentPos = await this.getPosition();

    for (let i = 0; i < steps; i++) {
      await this.move('KeyW', stepDuration);
      const pos = await this.getPosition();
      const state = await this.getState();
      heightReadings.push({
        step: i + 1,
        pos: { ...pos },
        grounded: state?.grounded,
      });

      if (!state?.grounded) {
        console.log(`  步骤 ${i + 1}: Y=${pos.y.toFixed(2)}, ❌ 悬浮！`);
        modeIssues.push(`探索步骤 ${i + 1}: 悬浮 (Y=${pos.y.toFixed(2)})`);
      }
    }

    // 分析高度变化
    const ys = heightReadings.map(r => r.pos.y);
    const yRange = Math.max(...ys) - Math.min(...ys);
    console.log(`  Y 变化范围: ${yRange.toFixed(2)} 单位`);

    if (yRange > 0.5) {
      console.log(`  ✅ 检测到地形高度变化 (斜坡/台阶)`);
    } else {
      console.log(`  ⚠️  地形较平坦，需进一步探索`);
    }

    // ========== 测试 4: 地图边界检查 ==========
    console.log(`\n🧪 测试 4: 地图边界检查`);
    const finalPos = heightReadings[heightReadings.length - 1].pos;
    console.log(`  最终位置: (${finalPos.x.toFixed(2)}, ${finalPos.y.toFixed(2)}, ${finalPos.z.toFixed(2)})`);

    const outOfBounds = Math.abs(finalPos.x) > 50 || Math.abs(finalPos.z) > 50;
    if (outOfBounds) {
      console.log(`  ❌ 移动到了地图外！`);
      modeIssues.push('移动超出地图边界');
    } else {
      console.log(`  ✅ 在地图范围内`);
    }

    // ========== 总结 ==========
    console.log(`\n📊 ${mode} 模式总结:`);
    console.log(`  发现问题: ${modeIssues.length} 个`);
    for (const issue of modeIssues) {
      console.log(`    • ${issue}`);
    }

    return { mode, issues: modeIssues, passed: modeIssues.length === 0 };
  }
}

async function main() {
  const test = new InfernoSmartExplorer();

  try {
    console.log('🚀 启动 INFERNO 智能探索测试...');
    console.log('🎯 测试内容: 移动、碰撞、跳跃、悬浮、地形变化、地图边界');
    await test.setup();
    console.log('✅ 浏览器已启动');

    // 测试三个模式
    const results = [];
    results.push(await test.testMode('solo'));
    results.push(await test.testMode('tdm'));
    results.push(await test.testMode('defusal'));

    // 最终总结
    console.log('\n\n' + '='.repeat(80));
    console.log('📋 INFERNO 探索测试最终报告');
    console.log('='.repeat(80));

    const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
    const allPassed = totalIssues === 0;

    for (const r of results) {
      const status = r.passed ? '✅' : '❌';
      console.log(`\n【${r.mode.toUpperCase()}】 ${status}`);
      console.log(`  问题数: ${r.issues.length}`);
      for (const issue of r.issues) {
        console.log(`    • ${issue}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`总体状态: ${allPassed ? '✅ 全部通过！' : '⚠️  发现问题'}`);
    console.log(`总问题数: ${totalIssues}`);
    console.log('='.repeat(80));

    if (!allPassed) {
      console.error('\n❌ 部分测试发现问题！');
      process.exit(1);
    } else {
      console.log('\n🎉 恭喜！INFERNO 地图三个模式全部通过基础测试！');
      console.log('   ✅ 移动正常');
      console.log('   ✅ 碰撞检测正常');
      console.log('   ✅ 跳跃落地正常');
      console.log('   ✅ 无悬浮问题');
      console.log('   ✅ 在地图范围内');
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
