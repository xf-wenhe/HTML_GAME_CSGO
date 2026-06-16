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
  await page.waitForTimeout(10000);
  
  await page.evaluate(() => {
    window.__debugAllowPointerLockBypassForTests?.();
  });
  
  // Check initial state
  const state = await page.evaluate(() => window.__debugInputState?.());
  const pos = await page.evaluate(() => window.__debugPlayerPosition?.());
  console.log(`Start: pos=(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}), grounded=${state.grounded}`);
  
  // Move LEFT first to get away from spawn wall
  console.log('\nMoving LEFT...');
  await page.keyboard.down('KeyA');
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(200);
    const p = await page.evaluate(() => window.__debugPlayerPosition?.());
    const s = await page.evaluate(() => window.__debugInputState?.());
    console.log(`  ${(i+1)*0.2}s: x=${p.x.toFixed(2)}, z=${p.z.toFixed(2)}, grounded=${s.grounded}`);
  }
  await page.keyboard.up('KeyA');
  
  // Now move FORWARD
  console.log('\nMoving FORWARD...');
  await page.keyboard.down('KeyW');
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(200);
    const p = await page.evaluate(() => window.__debugPlayerPosition?.());
    const s = await page.evaluate(() => window.__debugInputState?.());
    console.log(`  ${(i+1)*0.2}s: x=${p.x.toFixed(2)}, z=${p.z.toFixed(2)}, grounded=${s.grounded}, speed=${s.horizontalSpeed.toFixed(2)}`);
  }
  await page.keyboard.up('KeyW');
  
  const finalPos = await page.evaluate(() => window.__debugPlayerPosition?.());
  const dist = Math.sqrt(Math.pow(finalPos.x - pos.x, 2) + Math.pow(finalPos.z - pos.z, 2));
  console.log(`\nTotal distance moved: ${dist.toFixed(2)} units`);
  
  await browser.close();
}

main().catch(console.error);
