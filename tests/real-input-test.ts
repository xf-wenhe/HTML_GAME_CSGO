/**
 * Walktest using ONLY real input (mouse look + WASD).
 * No __debugSetPlayerPosition - player spawns naturally and we drive with input.
 */
import { webkit } from 'playwright';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('🚀 Dust2 Route Walktest (real input only)\n');

  const browser = await webkit.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');
  await sleep(3000);
  await page.locator('[data-action="solo"]').click();
  await sleep(4000);

  // Enable pointer lock bypass
  await page.evaluate(() => {
    const bypass = (window as any).__debugAllowPointerLockBypassForTests;
    if (bypass) bypass();
  });

  // Read initial spawn position
  const spawn = await page.evaluate(() => (window as any).__debugPlayerPosition?.());
  console.log('Natural spawn:', spawn);

  // Use mouse to look around + WASD to move
  // We simulate looking by moving mouse rapidly in a direction
  async function lookRight(degrees) {
    const pixels = degrees * 5; // approximate
    for (let i = 0; i < Math.abs(degrees); i += 5) {
      await page.mouse.move(100, 100, { steps: 1 });
      await sleep(10);
    }
  }

  async function lookLeft(degrees) {
    const pixels = degrees * 5;
    for (let i = 0; i < Math.abs(degrees); i += 5) {
      await page.mouse.move(100, 100, { steps: 1 });
      await sleep(10);
    }
  }

  async function moveForward(ms) {
    await page.keyboard.down('KeyW');
    await sleep(ms);
    await page.keyboard.up('KeyW');
  }

  async function strafe(key, ms) {
    await page.keyboard.down(key);
    await sleep(ms);
    await page.keyboard.up(key);
  }

  async function getPos() {
    return page.evaluate(() => (window as any).__debugPlayerPosition?.());
  }

  // Test: can we move at all from spawn?
  console.log('Testing basic movement...');
  const posBefore = await getPos();
  console.log('Before move:', posBefore);

  // Look south (toward bomb sites) - rapid mouse movement
  for (let i = 0; i < 60; i++) {
    await page.mouse.move(200, 300, { steps: 2 });
    await sleep(16);
  }
  await sleep(500);

  // Move forward
  await moveForward(2000);
  await sleep(300);

  const posAfter = await getPos();
  console.log('After move:', posAfter);

  if (posBefore && posAfter) {
    const dz = Math.abs(posAfter.z - posBefore.z);
    const dx = Math.abs(posAfter.x - posBefore.x);
    console.log(`Movement: dx=${dx.toFixed(2)}, dz=${dz.toFixed(2)}`);
    if (dz > 1 || dx > 1) {
      console.log('SUCCESS: Player moved with input!');
    } else {
      console.log('FAIL: Player did not move meaningfully');
    }
  }

  await page.screenshot({ path: 'tests/real-input-test.png' });
  console.log('Screenshot saved');
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
