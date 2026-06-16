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
  
  const start = await page.evaluate(() => window.__debugPlayerPosition?.());
  console.log(`Spawn: (${start.x.toFixed(2)}, ${start.y.toFixed(2)}, ${start.z.toFixed(2)})`);
  
  // Test all directions
  const directions = [
    { key: 'KeyW', name: 'FORWARD (z-)' },
    { key: 'KeyS', name: 'BACKWARD (z+)' },
    { key: 'KeyA', name: 'LEFT (x-)' },
    { key: 'KeyD', name: 'RIGHT (x+)' },
  ];
  
  for (const dir of directions) {
    console.log(`\nTesting ${dir.name}...`);
    const before = await page.evaluate(() => window.__debugPlayerPosition?.());
    await page.keyboard.down(dir.key);
    await page.waitForTimeout(1000);
    await page.keyboard.up(dir.key);
    const after = await page.evaluate(() => window.__debugPlayerPosition?.());
    const dx = after.x - before.x;
    const dz = after.z - before.z;
    const dist = Math.sqrt(dx*dx + dz*dz);
    console.log(`  dx=${dx.toFixed(2)}, dz=${dz.toFixed(2)}, dist=${dist.toFixed(2)}`);
    console.log(`  ${dist > 1.0 ? '✓ 移动正常' : '⚠ 移动缓慢 (可能有碰撞阻挡)'}`);
  }
  
  await browser.close();
}

main().catch(console.error);
