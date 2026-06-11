import { chromium } from 'playwright';

async function test() {
  console.log('启动浏览器...');
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('访问页面...');
  await page.goto('http://localhost:5173', { timeout: 30000 });
  await page.waitForTimeout(3000);
  
  // 截图
  await page.screenshot({ path: 'scripts/screenshots/inferno-menu-test.png' });
  console.log('截图完成');
  
  // 检查菜单
  const menu = await page.$('.main-menu');
  console.log('菜单存在:', !!menu);
  
  // 检查 Inferno 按钮
  const infernoBtn = await page.$('.map-option[data-map="inferno"]');
  if (infernoBtn) {
    const isDisabled = await infernoBtn.getAttribute('aria-disabled');
    console.log('Inferno 按钮 disabled:', isDisabled);
  } else {
    console.log('未找到 Inferno 按钮');
  }
  
  // 保持打开
  console.log('浏览器保持打开20秒...');
  await page.waitForTimeout(20000);
  
  await browser.close();
  console.log('完成');
}

test().catch(console.error);
