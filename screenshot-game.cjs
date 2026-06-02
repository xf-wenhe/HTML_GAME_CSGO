const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // 尝试选择 dust2 地图
  try {
    const dust2Option = await page.locator('text=Dust2').first();
    if (await dust2Option.isVisible()) {
      await dust2Option.click();
      await page.waitForTimeout(2000);
    }
  } catch (e) {}

  // 点击开始/播放按钮
  try {
    const playBtn = await page.locator('button:has-text("开始"), button:has-text("Play"), button:has-text("单人")').first();
    if (await playBtn.isVisible()) {
      await playBtn.click();
      await page.waitForTimeout(3000);
    }
  } catch (e) {}

  // 等待游戏加载
  await page.waitForTimeout(5000);

  // 截图
  await page.screenshot({ path: '/tmp/ct-spawn-view.png' });

  await browser.close();
  console.log('Screenshot saved to /tmp/ct-spawn-view.png');
});