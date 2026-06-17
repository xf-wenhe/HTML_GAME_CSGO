import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testDust2() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  try {
    console.log('Navigating to game...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });

    // 等待主菜单
    await page.waitForSelector('button:has-text("⚔")', { timeout: 10000 });
    console.log('Main menu loaded');

    // 截图主菜单
    await page.screenshot({ path: join(__dirname, 'screenshots', 'dust2-main-menu.png') });
    console.log('Screenshot saved: dust2-main-menu.png');

    // 等待几秒让资源加载
    await page.waitForTimeout(2000);

    // 点击单人游戏
    await page.click('button:has-text("⚔")');
    console.log('Clicked single player');

    // 等待游戏加载
    await page.waitForTimeout(5000);

    // 截图游戏画面
    await page.screenshot({ path: join(__dirname, 'screenshots', 'dust2-gameplay.png') });
    console.log('Screenshot saved: dust2-gameplay.png');

    // 检查控制台是否有碰撞警告
    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(msg));

    // 再等待一下
    await page.waitForTimeout(3000);

    // 检查是否有 "No collision data" 警告
    const collisionWarnings = consoleMessages.filter(msg =>
      msg.text().includes('No collision data')
    );

    console.log(`Found ${collisionWarnings.length} collision warnings`);
    if (collisionWarnings.length > 0) {
      console.error('Collision warnings still present:', collisionWarnings.map(m => m.text()));
    } else {
      console.log('✅ No collision warnings - fix worked!');
    }

    console.log('Test complete!');
    console.log('Press Ctrl+C to close browser');

    // 保持浏览器打开一段时间以便观察
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: join(__dirname, 'screenshots', 'dust2-error.png') });
  } finally {
    await browser.close();
  }
}

// 创建截图目录
import { mkdirSync, existsSync } from 'fs';
const screenshotsDir = join(__dirname, 'screenshots');
if (!existsSync(screenshotsDir)) {
  mkdirSync(screenshotsDir);
}

testDust2();