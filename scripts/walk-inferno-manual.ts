/**
 * Inferno 手动走查脚本
 * 使用 __debugSetKeyPressed 模拟键盘输入
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const TIMEOUT = 120000; // 2分钟

// 等待函数
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

// Inferno 关键点坐标
const WAYPOINTS = {
  tSpawn: { x: -20, z: 0, yaw: 0, name: 'T Spawn' },
  banana: { x: -15, z: 10, yaw: 45, name: 'Banana入口' },
  mid: { x: 0, z: 0, yaw: 90, name: 'Mid' },
  aSite: { x: 10, z: -15, yaw: 180, name: 'A Site' },
  bSite: { x: 15, z: 15, yaw: 270, name: 'B Site' },
  ctSpawn: { x: 20, z: 0, yaw: 180, name: 'CT Spawn' },
  apartments: { x: 5, z: -20, yaw: 0, name: 'Apartments' },
};

test.describe('Inferno 地图走查', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await wait(2000);
    
    // 选择 Inferno 地图
    const infernoCard = page.locator('text=Inferno').first();
    if (await infernoCard.isVisible()) {
      await infernoCard.click();
      await wait(500);
    }
    
    // 开始单人游戏
    const startBtn = page.locator('button:has-text("开始"), button:has-text("Start")').first();
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await wait(3000);
    }
    
    // 确保指针锁定绕过
    await page.evaluate(() => {
      if ((window as any).__debugAllowPointerLockBypassForTests) {
        (window as any).__debugAllowPointerLockBypassForTests();
      }
    });
  });

  test('测试移动输入链路', async ({ page }) => {
    // 获取初始位置
    const startPos = await page.evaluate(() => {
      return (window as any).__debugPlayerPosition?.() || null;
    });
    console.log('起始位置:', startPos);
    expect(startPos).not.toBeNull();
    
    // 传送到一个安全位置
    await page.evaluate(() => {
      (window as any).__debugSetPlayerPosition?.(0, 0, 0, 10);
    });
    await wait(500);
    
    // 模拟按住 W 键 2 秒
    await page.evaluate(() => {
      (window as any).__debugSetKeyPressed?.('KeyW', true);
    });
    await wait(2000);
    
    // 获取移动后位置
    const afterPos = await page.evaluate(() => {
      return (window as any).__debugPlayerPosition?.() || null;
    });
    
    // 松开 W 键
    await page.evaluate(() => {
      (window as any).__debugSetKeyPressed?.('KeyW', false);
    });
    
    console.log('移动后位置:', afterPos);
    expect(afterPos).not.toBeNull();
    
    // 检查位置是否发生了变化（Z轴应该增加）
    if (startPos && afterPos) {
      const moved = Math.abs(afterPos.z - startPos.z) > 0.5 || Math.abs(afterPos.x - startPos.x) > 0.5;
      console.log(`移动检测: ${moved ? '成功' : '失败'}`);
      expect(moved).toBe(true);
    }
  });

  test('T Spawn -> Banana 路径', async ({ page }) => {
    // 传送到 T Spawn
    await page.evaluate(() => {
      (window as any).__debugSetPlayerPosition?.(-20, 0, 45, 1.7);
    });
    await wait(1000);
    
    // 向前走（朝向 Banana）
    await page.evaluate(() => (window as any).__debugSetKeyPressed?.('KeyW', true));
    await wait(3000);
    await page.evaluate(() => (window as any).__debugSetKeyPressed?.('KeyW', false));
    
    // 截图
    const screenshot = await page.evaluate(() => (window as any).__debugTakeScreenshot?.());
    if (screenshot) {
      const buffer = Buffer.from(screenshot.split(',')[1], 'base64');
      require('fs').writeFileSync('scripts/screenshots/inferno-walk-t-spawn-banana.png', buffer);
    }
    
    const pos = await page.evaluate(() => (window as any).__debugPlayerPosition?.());
    console.log('T Spawn -> Banana 后位置:', pos);
  });

  test('全图主路径连通性', async ({ page }) => {
    const waypoints = Object.values(WAYPOINTS);
    const results: { name: string; success: boolean; pos: any; }[] = [];
    
    for (const wp of waypoints) {
      // 传送到该点
      await page.evaluate((coords) => {
        (window as any).__debugSetPlayerPosition?.(coords.x, coords.z, coords.yaw, 1.7);
      }, { x: wp.x, z: wp.z, yaw: wp.yaw });
      
      await wait(800);
      
      // 测试是否能移动
      const beforePos = await page.evaluate(() => (window as any).__debugPlayerPosition?.());
      
      await page.evaluate(() => (window as any).__debugSetKeyPressed?.('KeyW', true));
      await wait(1000);
      await page.evaluate(() => (window as any).__debugSetKeyPressed?.('KeyW', false));
      
      const afterPos = await page.evaluate(() => (window as any).__debugPlayerPosition?.());
      
      const success = beforePos && afterPos && 
        (Math.abs(afterPos.z - beforePos.z) > 0.3 || Math.abs(afterPos.x - beforePos.x) > 0.3);
      
      results.push({
        name: wp.name,
        success: success || false,
        pos: afterPos
      });
      
      console.log(`${wp.name}: ${success ? '✓' : '✗'} 位置:`, afterPos);
    }
    
    // 所有关键点都应该可以移动
    const allSuccess = results.every(r => r.success);
    console.log('\n走查结果:');
    results.forEach(r => console.log(`  ${r.success ? '✓' : '✗'} ${r.name}`));
    
    expect(allSuccess).toBe(true);
  });
});
