import { chromium } from 'playwright';

const url = 'http://localhost:5173';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('🦘 CS1.6 标准跳跃高度验证测试\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
    args: ['--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  try {
    // 进入游戏
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-action="solo"]', { timeout: 10000 });

    // 选择 Inferno 地图和 T 阵营
    await page.locator('[data-map="inferno"]').click();
    await delay(300);
    await page.locator('[data-team="attackers"]').click();
    await delay(300);
    await page.locator('[data-action="solo"]').click();

    await page.waitForFunction(() => Boolean(window.__debugPlayerPosition), null, { timeout: 10000 });
    await delay(2000);

    // 等待玩家站稳
    console.log('📍 等待玩家站稳...');
    await delay(3000);

    const beforeJump = await page.evaluate(() => window.__debugPlayerPosition?.());
    console.log('📊 跳跃前 Y 坐标:', beforeJump.y.toFixed(4));

    // 按 Space 跳跃
    console.log('\n🦘 按空格键跳跃...');
    const jumpStartTime = Date.now();

    await page.keyboard.down('Space');
    await delay(50);
    await page.keyboard.up('Space');

    // 每 50ms 采样一次 Y 坐标，持续 1 秒
    const samples = [];
    for (let i = 0; i < 20; i++) {
      await delay(50);
      const pos = await page.evaluate(() => window.__debugPlayerPosition?.());
      samples.push({
        time: Date.now() - jumpStartTime,
        y: pos.y
      });
    }

    // 找到最高点
    const peak = samples.reduce((max, sample) => sample.y > max.y ? sample : max, samples[0]);
    const peakTime = peak.time;
    const peakHeight = peak.y;

    console.log(`\n📊 跳跃峰值数据:`);
    console.log(`  最高 Y 坐标: ${peakHeight.toFixed(4)}`);
    console.log(`  跳跃高度: ${(peakHeight - beforeJump.y).toFixed(4)} 游戏单位`);
    console.log(`  达到峰值时间: ${peakTime} ms`);
    console.log(`  峰值样本:`, samples.map(s => `${s.time}ms:${s.y.toFixed(3)}`).join(' → '));

    // CS1.6 标准
    const CS16_JUMP_HEIGHT = 45 * 0.01; // 45 HU = 0.45 游戏单位
    const CS16_PEAK_TIME = 380; // 0.38 秒

    console.log(`\n📏 CS1.6 标准对比:`);
    console.log(`  预期跳跃高度: ${CS16_JUMP_HEIGHT.toFixed(2)} 游戏单位`);
    console.log(`  预期达到峰值时间: ${CS16_PEAK_TIME} ms`);

    const actualJumpHeight = peakHeight - beforeJump.y;
    const heightMatch = Math.abs(actualJumpHeight - CS16_JUMP_HEIGHT) < 0.05;
    const timeMatch = Math.abs(peakTime - CS16_PEAK_TIME) < 100;

    console.log(`\n✅ 验证结果:`);
    console.log(`  跳跃高度: ${heightMatch ? '✅ 符合' : '❌ 不符合'} CS1.6 标准`);
    console.log(`  峰值时间: ${timeMatch ? '✅ 符合' : '❌ 不符合'} CS1.6 标准`);

    if (!heightMatch || !timeMatch) {
      console.log(`\n⚠️ 问题诊断:`);
      if (!heightMatch) {
        console.log(`  跳跃高度偏差: ${((actualJumpHeight - CS16_JUMP_HEIGHT) / CS16_JUMP_HEIGHT * 100).toFixed(1)}%`);
      }
      if (!timeMatch) {
        console.log(`  峰值时间偏差: ${peakTime - CS16_PEAK_TIME} ms`);
      }
    }

    // 检查 Movement.ts 和 Physics.ts 的配置
    console.log(`\n🔧 物理参数检查:`);
    const physics = await page.evaluate(() => {
      // 尝试从 window 获取物理参数
      if (typeof window.__debugMovement === 'function') {
        return window.__debugMovement();
      }
      return null;
    });

    if (physics) {
      console.log('  物理参数:', JSON.stringify(physics, null, 2));
    } else {
      console.log('  无法获取物理参数（调试函数未启用）');
    }

    await delay(3000);
    await browser.close();

    const passed = heightMatch && timeMatch;
    console.log(`\n🎉 总体结果: ${passed ? '✅ 通过' : '❌ 失败'}\n`);
    return passed ? 0 : 1;

  } catch (error) {
    console.error('❌ 测试出错:', error);
    await browser.close();
    return 1;
  }
}

main().then(exitCode => process.exit(exitCode)).catch(console.error);
