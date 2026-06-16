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
  await page.waitForTimeout(3000);
  
  // Unlock mouse
  await page.evaluate(() => {
    window.__debugAllowPointerLockBypassForTests?.();
  });
  
  // Wait for freeze time to end
  console.log('Waiting for live phase...');
  let live = false;
  for (let i = 0; i < 10 && !live; i++) {
    const state = await page.evaluate(() => window.__debugInputState?.());
    live = state?.cs16BotMatch?.phase === 'live';
    console.log(`  ${i}s: phase=${state?.cs16BotMatch?.phase}, grounded=${state?.grounded}`);
    await page.waitForTimeout(500);
  }
  
  // Now test movement properly
  console.log('\nTesting movement in live phase...');
  await page.keyboard.down('KeyW');
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(500);
    const pos = await page.evaluate(() => window.__debugPlayerPosition?.());
    const state = await page.evaluate(() => window.__debugInputState?.());
    console.log(`  Move ${i*0.5}s: pos=(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}), grounded=${state?.grounded}, speed=${state?.horizontalSpeed?.toFixed(2)}`);
  }
  await page.keyboard.up('KeyW');
  
  // Check physics state - raycast for ground
  console.log('\nChecking physics...');
  const physicsInfo = await page.evaluate(() => {
    const state = window.__debugInputState?.();
    const pos = window.__debugPlayerPosition?.();
    return {
      pos,
      grounded: state?.grounded,
      airborneTime: state?.airborneTime
    };
  });
  console.log('Physics:', physicsInfo);
  
  await browser.close();
}

main().catch(console.error);
