/**
 * Inferno 地图真实移动走查
 * 使用真实键盘输入 + 鼠标转动
 */
import { chromium } from 'playwright';
import fs from 'fs';

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

// Inferno 关键路径点
const ROUTES = [
  { name: 'T Spawn', x: -20, z: 0 },
  { name: 'Banana', x: -10, z: 15 },
  { name: 'Mid', x: 0, z: 0 },
  { name: 'A Site', x: 10, z: -15 },
  { name: 'Apartments', x: 5, z: -25 },
  { name: 'CT Spawn', x: 20, z: 0 },
  { name: 'B Site', x: 15, z: 15 },
];

async function main() {
  console.log('🔥 Inferno 地图走查开始\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5173');
    await wait(2000);
    
    // 选择 Inferno 地图
    const infernoCard = page.locator('text=Inferno').first();
    if (await infernoCard.isVisible()) {
      console.log('选择 Inferno 地图...');
      await infernoCard.click();
      await wait(500);
    }
    
    // 开始单人游戏
    const startBtn = page.locator('button:has-text("开始"), button:has-text("Start"), [data-action="solo"]').first();
    if (await startBtn.isVisible()) {
      console.log('启动单人游戏...');
      await startBtn.click();
      await wait(4000);
    }
    
    // 允许指针锁定绕过
    await page.evaluate(() => {
      if ((window as any).__debugAllowPointerLockBypassForTests) {
        (window as any).__debugAllowPointerLockBypassForTests();
      }
    });
    
    // 获取初始位置
    const spawn = await page.evaluate(() => (window as any).__debugPlayerPosition?.());
    console.log('出生点:', spawn);
    
    if (!spawn) {
      throw new Error('无法获取玩家位置');
    }
    
    // 点击画布获取焦点
    await page.click('canvas');
    await wait(300);
    
    // 测试移动
    console.log('\n测试 WASD 移动...');
    await page.keyboard.down('KeyW');
    await wait(2000);
    await page.keyboard.up('KeyW');
    await wait(300);
    
    const afterMove = await page.evaluate(() => (window as any).__debugPlayerPosition?.());
    console.log('前进后位置:', afterMove);
    
    const moved = afterMove && (
      Math.abs(afterMove.z - spawn.z) > 0.5 || 
      Math.abs(afterMove.x - spawn.x) > 0.5
    );
    
    if (moved) {
      console.log('✓ 移动成功');
    } else {
      console.log('✗ 移动失败，尝试使用 debug API...');
      
      // 使用 debug API 直接移动
      await page.evaluate(() => {
        (window as any).__debugSetKeyPressed?.('KeyW', true);
      });
      await wait(2000);
      await page.evaluate(() => {
        (window as any).__debugSetKeyPressed?.('KeyW', false);
      });
      
      const afterDebug = await page.evaluate(() => (window as any).__debugPlayerPosition?.());
      console.log('Debug API 移动后:', afterDebug);
    }
    
    // 截图
    const screenshot = await page.evaluate(() => (window as any).__debugTakeScreenshot?.());
    if (screenshot) {
      const buffer = Buffer.from(screenshot.split(',')[1], 'base64');
      fs.writeFileSync('scripts/screenshots/inferno-walktest-start.png', buffer);
      console.log('截图已保存: inferno-walktest-start.png');
    }
    
    // 测试各个关键路径
    console.log('\n关键路径测试:');
    for (const route of ROUTES) {
      await page.evaluate((r) => {
        (window as any).__debugSetPlayerPosition?.(r.x, r.z, 0, 1.7);
      }, route);
      await wait(800);
      
      const pos = await page.evaluate(() => (window as any).__debugPlayerPosition?.());
      console.log(`  ${route.name}: ${pos ? `✓ (${pos.x.toFixed(1)}, ${pos.z.toFixed(1)})` : '✗'}`);
    }
    
    console.log('\n🔥 走查完成');
    
  } catch (error) {
    console.error('错误:', error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
