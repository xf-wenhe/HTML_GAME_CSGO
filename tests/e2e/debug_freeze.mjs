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
  
  // Wait for menu
  await page.waitForSelector('[data-action="solo"]', { timeout: 15000 });
  
  // Select dust2
  await page.click('[data-map="dust2"]');
  await page.waitForTimeout(500);
  
  // Start solo mode
  console.log('Starting solo mode...');
  await page.click('[data-action="solo"]');
  
  // Wait for game to load
  await page.waitForTimeout(2000);
  
  // Unlock mouse
  await page.evaluate(() => {
    window.__debugAllowPointerLockBypassForTests?.();
  });
  
  // Check freeze time state every second
  for (let i = 0; i < 10; i++) {
    const state = await page.evaluate(() => window.__debugInputState?.());
    const pos = await page.evaluate(() => window.__debugPlayerPosition?.());
    console.log(`Time ${i}s:`, {
      phase: state?.cs16BotMatch?.phase,
      freezeRemaining: state?.cs16BotMatch?.freezeRemaining,
      grounded: state?.grounded,
      pos: pos ? `(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})` : null
    });
    await page.waitForTimeout(1000);
  }
  
  // Now try moving
  console.log('\nTrying to move...');
  await page.keyboard.down('KeyW');
  for (let i = 0; i < 5; i++) {
    const pos = await page.evaluate(() => window.__debugPlayerPosition?.());
    const state = await page.evaluate(() => window.__debugInputState?.());
    console.log(`Moving ${i}s: pos=${pos ? `(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})` : null}, phase=${state?.cs16BotMatch?.phase}`);
    await page.waitForTimeout(1000);
  }
  await page.keyboard.up('KeyW');
  
  await browser.close();
}

main().catch(console.error);
