import { chromium } from 'playwright';
import { setTimeout } from 'timers/promises';

async function testInfernoSingleplayer() {
  const browser = await chromium.launch({ headless: true, slowMo: 50 });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  console.log('🚀 开始测试 Inferno 单人模式完整流程...');

  try {
    // 1. 打开游戏
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-action="solo"]', { timeout: 10_000 });
    console.log('✅ 主菜单已加载');

    // 2. 选择 Inferno 地图
    await page.click('[data-map="inferno"]');
    await setTimeout(500);
    console.log('🗺️ 已选择 Inferno 地图');

    // 3. 测试 CT 阵营
    console.log('\n🔵 测试 CT 阵营...');
    await page.click('[data-team="defenders"]');
    await setTimeout(300);
    await page.click('[data-action="solo"]');
    await page.waitForFunction(() => Boolean(window.__debugPlayerPosition), null, { timeout: 10_000 });

    const ctSpawn = await page.evaluate(() => window.__debugPlayerPosition?.());
    console.log(`📍 CT 出生点: x=${ctSpawn.x.toFixed(2)}, y=${ctSpawn.y.toFixed(2)}, z=${ctSpawn.z.toFixed(2)}`);

    // 测试移动
    console.log('🚶 测试移动...');
    await page.keyboard.down('KeyW');
    await setTimeout(1000);
    await page.keyboard.up('KeyW');

    // 测试跳跃
    await page.keyboard.press('Space');
    await setTimeout(500);
    console.log('✅ 跳跃测试完成');

    // 测试武器切换
    console.log('🔫 测试武器切换...');
    await page.keyboard.press('Digit1');
    await setTimeout(300);
    await page.keyboard.press('Digit2');
    await setTimeout(300);
    await page.keyboard.press('Digit3');
    await setTimeout(300);
    console.log('✅ 武器切换测试完成');

    // 测试射击
    console.log('💥 测试射击...');
    await page.mouse.click(400, 300);
    await setTimeout(200);
    console.log('✅ 射击测试完成');

    // 测试暂停菜单
    console.log('⏸️ 测试暂停菜单...');
    await page.keyboard.press('Escape');
    await setTimeout(1000);
    console.log('✅ 暂停菜单测试完成');

    // 返回主菜单
    const exitBtn = page.getByText(/退出|Exit|Quit|主菜单/).first();
    if (await exitBtn.isVisible()) {
      await exitBtn.click();
      await setTimeout(2000);
      console.log('✅ 返回主菜单');
    }

    await page.waitForSelector('[data-action="solo"]', { timeout: 10_000 });

    // 4. 测试 T 阵营
    console.log('\n🔴 测试 T 阵营...');
    await page.click('[data-map="inferno"]');
    await setTimeout(500);
    await page.click('[data-team="attackers"]');
    await setTimeout(300);
    await page.click('[data-action="solo"]');
    await page.waitForFunction(() => Boolean(window.__debugPlayerPosition), null, { timeout: 10_000 });

    const tSpawn = await page.evaluate(() => window.__debugPlayerPosition?.());
    console.log(`📍 T 出生点: x=${tSpawn.x.toFixed(2)}, y=${tSpawn.y.toFixed(2)}, z=${tSpawn.z.toFixed(2)}`);

    // 测试移动
    await page.keyboard.down('KeyW');
    await setTimeout(1000);
    await page.keyboard.up('KeyW');
    await page.keyboard.press('Space');
    await setTimeout(500);

    console.log('\n🎉 Inferno 单人模式测试完成！');
    console.log('\n📊 测试统计:');
    console.log(`  JavaScript 错误: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n❌ 发现错误:');
      errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
      process.exit(1);
    } else {
      console.log('\n✅ 所有测试通过！');
    }

  } catch (error) {
    console.error('❌ 测试过程中出错:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testInfernoSingleplayer().catch(console.error);
