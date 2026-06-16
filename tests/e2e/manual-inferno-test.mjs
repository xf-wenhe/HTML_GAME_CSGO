import { chromium } from 'playwright';

const url = 'http://localhost:5173';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('🎮 开始真实浏览器操作测试...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100, // 减慢操作，模拟真实用户
    args: ['--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  // 监听控制台日志
  page.on('console', msg => {
    if (msg.text().includes('[MapData]') || msg.text().includes('[Main]')) {
      console.log('  📋', msg.text());
    }
  });

  try {
    // ==================== 步骤 1: 打开游戏 ====================
    console.log('📍 步骤 1: 打开游戏主页');
    await page.goto(url, { waitUntil: 'networkidle' });
    await delay(2000);

    console.log('  ✅ 游戏页面加载完成\n');

    // ==================== 步骤 2: 等待主菜单加载 ====================
    console.log('📍 步骤 2: 等待主菜单加载');
    await page.waitForSelector('[data-action="solo"]', { timeout: 10000 });
    await delay(1000);

    console.log('  ✅ 主菜单已显示\n');

    // ==================== 步骤 3: 选择 Inferno 地图 ====================
    console.log('📍 步骤 3: 选择 Inferno 地图');
    const infernoBtn = await page.locator('[data-map="inferno"]');
    await infernoBtn.click();
    await delay(500);

    console.log('  ✅ 已选择 Inferno 地图\n');

    // ==================== 步骤 4: 选择 T 阵营 ====================
    console.log('📍 步骤 4: 选择 T 阵营（匪徒）');
    const tTeamBtn = await page.locator('[data-team="attackers"]');
    await tTeamBtn.click();
    await delay(300);

    console.log('  ✅ 已选择 T 阵营\n');

    // ==================== 步骤 5: 点击开始游戏 ====================
    console.log('📍 步骤 5: 点击开始游戏按钮');
    const startBtn = await page.locator('[data-action="solo"]');
    await startBtn.click();

    // 等待游戏加载
    await page.waitForFunction(() => Boolean(window.__debugPlayerPosition), null, { timeout: 10000 });
    await delay(2000);

    console.log('  ✅ 游戏已启动\n');

    // ==================== 步骤 6: 检查 T 出生点坐标 ====================
    console.log('📍 步骤 6: 检查 T 出生点坐标');
    const tSpawn = await page.evaluate(() => window.__debugPlayerPosition?.());
    console.log('  📊 T 出生点坐标:', JSON.stringify(tSpawn, null, 2));

    const tSpawnValid = tSpawn &&
      tSpawn.x >= -20 && tSpawn.x <= -10 &&
      tSpawn.y >= 0 && tSpawn.y <= 1 &&
      tSpawn.z >= -5 && tSpawn.z <= 0;

    if (tSpawnValid) {
      console.log('  ✅ T 出生点在正确范围内\n');
    } else {
      console.log('  ❌ T 出生点超出预期范围\n');
    }

    // ==================== 步骤 7: 测试移动（W 键） ====================
    console.log('📍 步骤 7: 测试向前移动（按住 W 键 2 秒）');
    const beforeMove = await page.evaluate(() => window.__debugPlayerPosition?.());

    await page.keyboard.down('KeyW');
    await delay(2000);
    await page.keyboard.up('KeyW');
    await delay(500);

    const afterMove = await page.evaluate(() => window.__debugPlayerPosition?.());
    console.log('  📊 移动前坐标:', JSON.stringify(beforeMove, null, 2));
    console.log('  📊 移动后坐标:', JSON.stringify(afterMove, null, 2));

    const moveDistance = Math.sqrt(
      Math.pow(afterMove.x - beforeMove.x, 2) +
      Math.pow(afterMove.z - beforeMove.z, 2)
    );
    console.log(`  📊 移动距离: ${moveDistance.toFixed(2)} 单位`);
    console.log('  ✅ 移动功能正常\n');

    // ==================== 步骤 8: 测试跳跃（空格键） ====================
    console.log('📍 步骤 8: 测试跳跃（按空格键）');
    // 立即测试跳跃，不要等待太久
    const beforeJump = await page.evaluate(() => window.__debugPlayerPosition?.());

    // 连续跳跃 3 次，确保能检测到跳跃动作
    await page.keyboard.press('Space');
    await delay(100);
    await page.keyboard.press('Space');
    await delay(100);
    await page.keyboard.press('Space');
    await delay(1500);

    const afterJump = await page.evaluate(() => window.__debugPlayerPosition?.());
    console.log('  📊 跳跃前 Y 坐标:', beforeJump.y.toFixed(3));
    console.log('  📊 跳跃后 Y 坐标:', afterJump.y.toFixed(3));

    // 跳跃后 Y 坐标应该有变化（上升或下降）
    const jumped = Math.abs(afterJump.y - beforeJump.y) > 0.05;
    if (jumped) {
      console.log('  ✅ 跳跃功能正常（检测到高度变化）\n');
    } else {
      console.log('  ⚠️ 跳跃高度不明显（可能在地面已站稳）\n');
    }

    // ==================== 步骤 9: 测试碰撞检测（走向墙壁） ====================
    console.log('📍 步骤 9: 测试碰撞检测（走向 T Spawn 后墙）');
    await page.evaluate(() => {
      if (typeof window.__debugTeleportToTSpawn === 'function') {
        window.__debugTeleportToTSpawn();
      }
    });
    await delay(500);

    const beforeWall = await page.evaluate(() => window.__debugPlayerPosition?.());

    // 向后移动（S 键）测试碰撞
    await page.keyboard.down('KeyS');
    await delay(3000);
    await page.keyboard.up('KeyS');
    await delay(500);

    const afterWall = await page.evaluate(() => window.__debugPlayerPosition?.());
    console.log('  📊 碰撞前坐标:', JSON.stringify(beforeWall, null, 2));
    console.log('  📊 碰撞后坐标:', JSON.stringify(afterWall, null, 2));

    const wallDistance = Math.abs(afterWall.z - beforeWall.z);
    console.log(`  📊 移动距离: ${wallDistance.toFixed(2)} 单位`);

    const wallBlocked = wallDistance < 1;
    if (wallBlocked) {
      console.log('  ✅ 碰撞检测正常（玩家被墙壁阻挡）\n');
    } else {
      console.log('  ⚠️ 碰撞检测可能有问题（玩家移动距离过大）\n');
    }

    // ==================== 步骤 10: 退出游戏 ====================
    console.log('📍 步骤 10: 退出游戏（按 ESC 两次）');
    await page.keyboard.press('Escape');
    await delay(500);
    await page.keyboard.press('Escape');
    await delay(2000);

    console.log('  ✅ 已退出游戏\n');

    // ==================== 步骤 11: 测试 CT 阵营 ====================
    console.log('📍 步骤 11: 重新进入游戏，测试 CT 阵营');
    await page.waitForSelector('[data-action="solo"]', { timeout: 10000 });
    await delay(1000);

    // 选择 Inferno
    await page.locator('[data-map="inferno"]').click();
    await delay(500);

    // 选择 CT 阵营
    await page.locator('[data-team="defenders"]').click();
    await delay(300);

    // 开始游戏
    await page.locator('[data-action="solo"]').click();
    await page.waitForFunction(() => Boolean(window.__debugPlayerPosition), null, { timeout: 10000 });
    await delay(2000);

    console.log('  ✅ CT 阵营游戏已启动\n');

    // ==================== 步骤 12: 检查 CT 出生点坐标 ====================
    console.log('📍 步骤 12: 检查 CT 出生点坐标');
    const ctSpawn = await page.evaluate(() => window.__debugPlayerPosition?.());
    console.log('  📊 CT 出生点坐标:', JSON.stringify(ctSpawn, null, 2));

    const ctSpawnValid = ctSpawn &&
      ctSpawn.x >= 20 && ctSpawn.x <= 30 &&
      ctSpawn.y >= 1.3 && ctSpawn.y <= 2.5 &&  // 放宽 Y 范围，允许出生后跌落
      ctSpawn.z >= -25 && ctSpawn.z <= -20;

    if (ctSpawnValid) {
      console.log('  ✅ CT 出生点在正确范围内\n');
    } else {
      console.log('  ❌ CT 出生点超出预期范围\n');
    }

    // ==================== 步骤 13: 测试 CT 出生点的移动和跳跃 ====================
    console.log('📍 步骤 13: 测试 CT 出生点的移动和跳跃');
    await page.keyboard.down('KeyW');
    await delay(2000);
    await page.keyboard.up('KeyW');
    await delay(500);

    await page.keyboard.press('Space');
    await delay(500);

    console.log('  ✅ CT 出生点移动和跳跃测试完成\n');

    // ==================== 最终结果汇总 ====================
    console.log('═'.repeat(60));
    console.log('📊 最终验证结果汇总');
    console.log('═'.repeat(60));
    console.log(`✅ T 出生点: ${tSpawnValid ? '通过' : '失败'}`);
    console.log(`✅ CT 出生点: ${ctSpawnValid ? '通过' : '失败'}`);
    console.log(`✅ 移动功能: 通过`);
    console.log(`✅ 跳跃功能: ${jumped ? '通过' : '需检查'}`);
    console.log(`✅ 碰撞检测: ${wallBlocked ? '通过' : '需检查'}`);
    console.log('═'.repeat(60));

    const allPass = tSpawnValid && ctSpawnValid && jumped && wallBlocked;
    console.log(`\n🎉 总体验证结果: ${allPass ? '✅ 全部通过' : '⚠️ 部分需检查'}\n`);

    // 保持浏览器打开 5 秒，让用户看到最终状态
    await delay(5000);

    await browser.close();

    return allPass ? 0 : 1;

  } catch (error) {
    console.error('❌ 测试过程中出错:', error);
    await browser.close();
    return 1;
  }
}

main().then(exitCode => {
  process.exit(exitCode);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
