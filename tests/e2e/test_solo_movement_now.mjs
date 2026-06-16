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
  
  console.log('Starting solo mode...');
  await page.click('[data-action="solo"]');
  
  // Wait for game to load and freeze time
  await page.waitForTimeout(3000);
  
  await page.evaluate(() => {
    window.__debugAllowPointerLockBypassForTests?.();
  });
  
  // Wait for live phase
  console.log('Waiting for live phase...');
  for (let i = 0; i < 20; i++) {
    const state = await page.evaluate(() => window.__debugInputState?.());
    if (state?.cs16BotMatch?.phase === 'live') {
      console.log(`  Live phase reached after ${i * 0.5}s`);
      break;
    }
    await page.waitForTimeout(500);
  }
  
  // Now test movement
  console.log('Testing movement...');
  const startPos = await page.evaluate(() => window.__debugPlayerPosition?.());
  console.log(`Start position: (${startPos.x.toFixed(2)}, ${startPos.y.toFixed(2)}, ${startPos.z.toFixed(2)})`);
  
  await page.keyboard.down('KeyW');
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(200);
    const pos = await page.evaluate(() => window.__debugPlayerPosition?.());
    const state = await page.evaluate(() => window.__debugInputState?.());
    console.log(`  ${(i+1)*0.2}s: pos.z=${pos.z.toFixed(2)}, grounded=${state?.grounded}, speed=${state?.horizontalSpeed?.toFixed(2)}`);
  }
  await page.keyboard.up('KeyW');
  
  const endPos = await page.evaluate(() => window.__debugPlayerPosition?.());
  const dist = Math.abs(endPos.z - startPos.z);
  console.log(`\nTotal distance moved: ${dist.toFixed(2)} units`);
  console.log(`Movement working: ${dist > 2 ? 'YES' : 'NO'}`);
  
  await browser.close();
}

main().catch(console.error);
