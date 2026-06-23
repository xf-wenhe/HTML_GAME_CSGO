import { chromium } from 'playwright';

const TEST_URL = 'http://localhost:5173';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('🎮 CS1.6 移动手感综合验证测试\n');

  const browser = await chromium.launch({
    headless: process.env.HEADLESS !== 'false',
    slowMo: process.env.HEADLESS === 'false' ? 50 : 0,
    args: ['--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const results = [];

  try {
    // 进入游戏
    console.log('📥 加载游戏...');
    await page.goto(TEST_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-action="solo"]', { timeout: 15000 });

    // 选择 Dust2 地图和 T 阵营
    await page.click('[data-map="dust2"]');
    await delay(300);
    await page.click('[data-team="attackers"]');
    await delay(300);
    await page.click('[data-action="solo"]');

    await page.waitForFunction(() => Boolean(window.__debugPlayerPosition), null, { timeout: 15000 });
    await delay(2000);

    // 启用调试绕过
    await page.evaluate(() => window.__debugAllowPointerLockBypassForTests?.());
    await delay(500);

    // 等待冻结时间结束
    console.log('⏳ 等待冻结时间结束...');
    for (let i = 0; i < 20; i++) {
      const state = await page.evaluate(() => window.__debugInputState?.());
      if (state?.cs16BotMatch?.phase === 'live') {
        console.log(`✅ 进入游戏阶段`);
        break;
      }
      await delay(500);
    }

    // 传送到 T 出生点
    await page.evaluate(() => window.__debugTeleportToTSpawn?.());
    await delay(1000);

    // === 测试1: 转向 ===
    console.log('\n🧭 测试1: 转向...');
    {
      const startState = await page.evaluate(() => window.__debugInputState?.());
      const startYaw = startState?.rotation?.yaw ?? 0;

      // 向右转动鼠标
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => window.__debugSetMouseDelta?.(0.5, 0));
        await delay(16);
      }

      const endState = await page.evaluate(() => window.__debugInputState?.());
      const endYaw = endState?.rotation?.yaw ?? 0;

      const yawChange = Math.abs(endYaw - startYaw);
      const passed = yawChange > 0.5 && yawChange <= 5.0;
      results.push({
        name: '转向',
        passed,
        current: yawChange,
        expected: '合理范围',
        details: `转向变化: ${yawChange.toFixed(2)} rad`
      });
      console.log(`   ${passed ? '✅' : '❌'} 转向测试`);
    }

    // 重置朝向
    await page.evaluate(() => window.__debugSetPlayerYaw?.(300 * Math.PI / 180));
    await delay(500);

    // === 测试2: 奔跑速度 ===
    console.log('\n🏃 测试2: 奔跑速度...');
    {
      await page.keyboard.down('KeyW');

      await delay(1500);
      const state = await page.evaluate(() => window.__debugInputState?.());
      await page.keyboard.up('KeyW');
      if (state) {
        const speedHU = state.horizontalSpeed * 100; // 转换为 HU/s

        const expectedHU = 250;
        const tolerance = 0.15; // 15% 容差
        const passed = Math.abs(speedHU - expectedHU) / expectedHU < tolerance;

        results.push({
          name: '奔跑速度',
          passed,
          current: Math.round(speedHU),
          expected: expectedHU,
          details: `实测: ${speedHU.toFixed(1)} HU/s, 目标: ${expectedHU} HU/s`
        });
        console.log(`   ${passed ? '✅' : '❌'} ${results[results.length - 1].details}`);
      }
    }

    // 重置位置
    await page.evaluate(() => window.__debugTeleportToTSpawn?.());
    await delay(500);

    // === 测试3: 静步速度 ===
    console.log('\n🚶 测试3: 静步速度...');
    {
      await page.evaluate(() => window.__debugTeleportToTSpawn?.());
      await page.evaluate(() => window.__debugSetPlayerYaw?.(300 * Math.PI / 180));
      await delay(500);

      await page.keyboard.down('ShiftLeft');
      await page.keyboard.down('KeyW');

      await delay(1500);
      const state = await page.evaluate(() => window.__debugInputState?.());
      await page.keyboard.up('KeyW');
      await page.keyboard.up('ShiftLeft');
      if (state) {
        const speedHU = state.horizontalSpeed * 100;

        const expectedHU = 110;
        const tolerance = 0.15;
        const passed = Math.abs(speedHU - expectedHU) / expectedHU < tolerance;

        results.push({
          name: '静步速度',
          passed,
          current: Math.round(speedHU),
          expected: expectedHU,
          details: `实测: ${speedHU.toFixed(1)} HU/s, 目标: ${expectedHU} HU/s`
        });
        console.log(`   ${passed ? '✅' : '❌'} ${results[results.length - 1].details}`);
      }
    }

    // 重置位置
    await page.evaluate(() => window.__debugTeleportToTSpawn?.());
    await page.evaluate(() => window.__debugSetPlayerYaw?.(300 * Math.PI / 180));
    await delay(500);

    // === 测试4: 蹲下速度 ===
    console.log('\n🧎 测试4: 蹲下速度...');
    {
      await page.keyboard.down('ControlLeft');
      await page.keyboard.down('KeyW');

      await delay(1500);
      const state = await page.evaluate(() => window.__debugInputState?.());
      await page.keyboard.up('KeyW');
      await page.keyboard.up('ControlLeft');
      if (state) {
        const speedHU = state.horizontalSpeed * 100;

        const expectedHU = 85;
        const tolerance = 0.15;
        const passed = Math.abs(speedHU - expectedHU) / expectedHU < tolerance;

        results.push({
          name: '蹲下速度',
          passed,
          current: Math.round(speedHU),
          expected: expectedHU,
          details: `实测: ${speedHU.toFixed(1)} HU/s, 目标: ${expectedHU} HU/s`
        });
        console.log(`   ${passed ? '✅' : '❌'} ${results[results.length - 1].details}`);
      }
    }

    // 重置位置
    await page.evaluate(() => window.__debugTeleportToTSpawn?.());
    await page.evaluate(() => window.__debugSetPlayerYaw?.(300 * Math.PI / 180));
    await delay(500);

    // === 测试5: 跳跃 ===
    console.log('\n🦘 测试5: 跳跃...');
    {
      const startPos = await page.evaluate(() => window.__debugPlayerPosition?.());
      await delay(100);

      const jumpStartTime = Date.now();
      await page.keyboard.down('Space');
      await delay(50);
      await page.keyboard.up('Space');

      const ySamples = [];
      for (let i = 0; i < 40; i++) {
        const pos = await page.evaluate(() => window.__debugPlayerPosition?.());
        if (pos) {
          ySamples.push({
            time: Date.now() - jumpStartTime,
            y: pos.y
          });
        }
        await delay(25);
      }

      if (startPos && ySamples.length > 0) {
        const peakY = Math.max(...ySamples.map(s => s.y));
        const jumpHeight = peakY - startPos.y;
        const jumpHeightHU = jumpHeight * 100;

        // 找到峰值时间
        const peakSample = ySamples.reduce((peak, s) => s.y > peak.y ? s : peak, ySamples[0]);
        const peakTimeMs = peakSample.time;

        const expectedHeightHU = 45;
        const expectedPeakTimeMs = 380;
        const heightTolerance = 0.25;
        const timeTolerance = 0.3;

        const heightOk = Math.abs(jumpHeightHU - expectedHeightHU) / expectedHeightHU < heightTolerance;
        const timeOk = Math.abs(peakTimeMs - expectedPeakTimeMs) / expectedPeakTimeMs < timeTolerance;
        const passed = heightOk && timeOk;

        results.push({
          name: '跳跃高度',
          passed: heightOk,
          current: Math.round(jumpHeightHU),
          expected: expectedHeightHU,
          details: `高度: ${jumpHeightHU.toFixed(1)} HU (目标: ${expectedHeightHU} HU)`
        });
        results.push({
          name: '跳跃上升时间',
          passed: timeOk,
          current: peakTimeMs,
          expected: expectedPeakTimeMs,
          details: `峰值时间: ${peakTimeMs}ms (目标: ${expectedPeakTimeMs}ms)`
        });

        console.log(`   ${heightOk ? '✅' : '❌'} 跳跃高度: ${jumpHeightHU.toFixed(1)} HU (目标: ${expectedHeightHU} HU)`);
        console.log(`   ${timeOk ? '✅' : '❌'} 上升时间: ${peakTimeMs}ms (目标: ${expectedPeakTimeMs}ms)`);
      }
    }

    // === 输出总结 ===
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试结果总结\n');

    const passedCount = results.filter(r => r.passed).length;
    console.log(`✅ 通过: ${passedCount}/${results.length}`);
    console.log(`❌ 失败: ${results.length - passedCount}/${results.length}\n`);

    for (const r of results) {
      const status = r.passed ? '✅' : '❌';
      const value = r.current !== undefined && r.expected !== undefined
        ? `${r.current} / ${r.expected}`
        : '';
      console.log(`${status} ${r.name}: ${r.details || value}`);
    }

    console.log('\n' + '='.repeat(60));

    if (passedCount === results.length) {
      console.log('\n🎉 所有测试通过！');
    } else {
      console.log('\n⚠️  部分测试失败，需要修复...');
    }

    await delay(3000);
    await browser.close();

    return passedCount === results.length ? 0 : 1;

  } catch (error) {
    console.error('❌ 测试出错:', error);
    await browser.close();
    return 1;
  }
}

main().then(exitCode => process.exit(exitCode)).catch(console.error);
