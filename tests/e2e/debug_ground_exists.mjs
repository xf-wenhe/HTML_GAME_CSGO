import { chromium } from 'playwright';

const TEST_URL = 'http://localhost:5173/';

async function main() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  console.log('Loading game...');
  await page.goto(TEST_URL, { waitUntil: 'domcontentloaded' });
  
  await page.waitForSelector('[data-action="solo"]', { timeout: 15000 });
  await page.click('[data-map="dust2"]');
  await page.waitForTimeout(500);
  await page.click('[data-action="solo"]');
  await page.waitForTimeout(5000);
  
  // Check if syncArenaPhysics was called and ground exists
  await page.evaluate(() => {
    window.__debugAllowPointerLockBypassForTests?.();
  });
  
  await page.waitForTimeout(3000);
  
  // Wait longer to see if player falls to y=0
  console.log('Waiting for player to fall...');
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(500);
    const pos = await page.evaluate(() => window.__debugPlayerPosition?.());
    const state = await page.evaluate(() => window.__debugInputState?.());
    console.log(`  ${(i+1)*0.5}s: y=${pos?.y?.toFixed(4)}, grounded=${state?.grounded}`);
    if (pos?.y < 0.5) break;
  }
  
  await browser.close();
}

main().catch(console.error);
