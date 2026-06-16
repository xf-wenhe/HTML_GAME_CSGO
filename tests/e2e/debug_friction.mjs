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
  await page.click('[data-action="solo"]');
  await page.waitForTimeout(8000); // Wait for freeze time to end
  
  // Unlock mouse
  await page.evaluate(() => {
    window.__debugAllowPointerLockBypassForTests?.();
  });
  
  console.log('Testing movement speed...');
  
  // Move continuously for a few seconds
  await page.keyboard.down('KeyW');
  
  let lastPos = null;
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(200);
    const pos = await page.evaluate(() => window.__debugPlayerPosition?.());
    const state = await page.evaluate(() => window.__debugInputState?.());
    
    if (lastPos) {
      const dist = Math.sqrt(Math.pow(pos.x - lastPos.x, 2) + Math.pow(pos.z - lastPos.z, 2));
      const speed = dist / 0.2; // per second
      console.log(`  ${(i+1)*0.2}s: speed=${speed.toFixed(2)}, grounded=${state?.grounded}, pos.y=${pos.y.toFixed(2)}`);
    }
    lastPos = pos;
  }
  
  await page.keyboard.up('KeyW');
  
  await browser.close();
}

main().catch(console.error);
