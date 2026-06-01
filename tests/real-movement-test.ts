/**
 * Walktest using ONLY real input, NO debug API.
 * Spawns naturally, uses mouse to look, WASD to walk.
 */
import { webkit } from 'playwright';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('🚀 Dust2 Route Test (real input only)\n');

  const browser = await webkit.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');
  await sleep(3000);
  await page.locator('[data-action="solo"]').click();
  await sleep(4000);

  // Read spawn position (read-only, no setting)
  const spawn = await page.evaluate(() => (window as any).__debugPlayerPosition?.());
  console.log('Spawn pos:', spawn);

  // Click canvas to get pointer lock
  await page.click('canvas');
  await sleep(500);

  // Look south by moving mouse rapidly right
  for (let i = 0; i < 80; i++) {
    await page.mouse.move(200 + i * 5, 200 + i * 2);
    await sleep(16);
  }
  await sleep(500);

  // Move forward
  await page.keyboard.down('KeyW');
  await sleep(3000);
  await page.keyboard.up('KeyW');
  await sleep(300);

  const pos1 = await page.evaluate(() => (window as any).__debugPlayerPosition?.());
  console.log('After 3s forward:', pos1);

  if (spawn && pos1) {
    const dz = pos1.z - spawn.z;
    console.log('Z movement:', dz.toFixed(2));
    if (dz > 2) console.log('SUCCESS: Moved south!');
    else if (dz > 0.5) console.log('PARTIAL: Some movement');
    else console.log('FAIL: No forward movement');
  }

  await page.screenshot({ path: 'tests/real-movement.png' });
  console.log('Screenshot saved');
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
