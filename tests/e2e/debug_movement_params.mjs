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
  
  // Check movement params
  const params = await page.evaluate(() => {
    // Check input state first
    const state = window.__debugInputState?.();
    console.log('Input state:', JSON.stringify(state, null, 2));
    
    // Try to simulate movement manually  
    if (window.player) {
      console.log('Player exists');
      console.log('Position:', window.player.getPosition());
      console.log('Grounded:', window.player.isGrounded());
    }
    
    return state;
  });
  
  // Now manually press keys and check if input is registered
  console.log('\nTesting input registration...');
  await page.evaluate(() => {
    // Set key state manually
    window.input.setKeyPressed('KeyW', true);
  });
  
  await page.waitForTimeout(100);
  
  const keysPressed = await page.evaluate(() => {
    return window.input.getPressedKeys();
  });
  console.log('Keys pressed:', keysPressed);
  
  await page.waitForTimeout(1000);
  
  const posAfter = await page.evaluate(() => window.__debugPlayerPosition?.());
  console.log('Position after 1s holding W:', posAfter);
  
  await browser.close();
}

main().catch(console.error);
