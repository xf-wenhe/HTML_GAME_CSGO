import { chromium } from 'playwright';

async function testInferno() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);
  
  // 等待主菜单加载
  await page.waitForSelector('#main-menu', { timeout: 10000 });
  console.log('主菜单已加载');
  
  // 截图保存
  await page.screenshot({ path: 'scripts/screenshots/inferno-main-menu.png' });
  console.log('已保存主菜单截图');
  
  // 查找 Inferno 地图卡片
  const infernoCard = await page.locator('.map-card:has-text("Inferno")').first();
  await infernoCard.click();
  console.log('已选择 Inferno 地图');
  
  await page.waitForTimeout(1000);
  
  // 点击开始游戏按钮
  const startButton = await page.locator('button:has-text("开始游戏")').first();
  await startButton.click();
  console.log('已点击开始游戏');
  
  // 等待游戏加载
  await page.waitForTimeout(5000);
  
  // 截图游戏画面
  await page.screenshot({ path: 'scripts/screenshots/inferno-game-start.png' });
  console.log('已保存游戏开始截图');
  
  // 保持浏览器打开30秒用于手动测试
  console.log('浏览器将保持打开30秒，可以手动测试...');
  await page.waitForTimeout(30000);
  
  await browser.close();
}

testInferno().catch(console.error);
