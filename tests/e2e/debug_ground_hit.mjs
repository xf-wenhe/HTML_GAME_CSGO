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
  await page.waitForTimeout(8000);
  
  await page.evaluate(() => {
    window.__debugAllowPointerLockBypassForTests?.();
  });
  
  // Test direct raycast
  const result = await page.evaluate(() => {
    const state = window.__debugInputState?.();
    const pos = window.__debugPlayerPosition?.();
    
    // Check if we can access physics and player directly
    // If not, just return the state we have
    return {
      posY: pos?.y,
      grounded: state?.grounded,
      airborneTime: state?.airborneTime
    };
  });
  
  console.log('Initial state:', JSON.stringify(result, null, 2));
  
  // Now wait for player to stabilize
  console.log('\nWaiting for physics to stabilize...');
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(250);
    const state = await page.evaluate(() => {
      const pos = window.__debugPlayerPosition?.();
      const s = window.__debugInputState?.();
      return {
        y: pos?.y,
        grounded: s?.grounded,
        speed: s?.horizontalSpeed
      };
    });
    console.log(`  ${(i+1)*0.25}s: y=${state.y?.toFixed(4)}, grounded=${state.grounded}, speed=${state.speed?.toFixed(3)}`);
  }
  
  await browser.close();
}

main().catch(console.error);
