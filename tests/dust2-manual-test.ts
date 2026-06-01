/**
 * Dust2 route test — uses debug input API (setKeyPressed + setMouseDelta).
 * No pointer lock needed. No teleportation.
 */
import { webkit } from 'playwright';

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('🚀 Dust2 Route Test (debug input API)\n');

  const browser = await webkit.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');
  await sleep(3000);
  await page.locator('[data-action="solo"]').click();
  await sleep(5000);

  await page.evaluate(() => {
    const b = (window as any).__debugAllowPointerLockBypassForTests;
    if (b) b();
  });
  await sleep(500);

  // Spawn at natural T Spawn position (not teleporting to a destination)
  await page.evaluate(() => {
    const f = (window as any).__debugSetPlayerPosition;
    if (f) f(0, -61.44, 0, 0.64);
  });
  await sleep(500);
  await page.evaluate(() => {
    const b = (window as any).__debugAllowPointerLockBypassForTests;
    if (b) b();
  });
  await sleep(2000);

  // Release stuck keys
  for (const k of ['KeyW','KeyA','KeyS','KeyD','Space','ControlLeft']) await page.keyboard.up(k);
  await sleep(300);

  const start = await page.evaluate(() => (window as any).__debugPlayerPosition?.());
  console.log('Start:', JSON.stringify(start));

  // Walk forward using debug input API
  await page.evaluate(() => {
    const im = (window as any).input;
    if (im?.setKeyPressed) im.setKeyPressed('KeyW', true);
  });
  await sleep(3000);
  await page.evaluate(() => {
    const im = (window as any).input;
    if (im?.setKeyPressed) im.setKeyPressed('KeyW', false);
  });
  await sleep(500);

  const afterW = await page.evaluate(() => (window as any).__debugPlayerPosition?.());
  console.log('After 3s W:', JSON.stringify(afterW));
  console.log('Δz:', (afterW.z - start.z).toFixed(2));

  // Rotate 90° left using mouse delta
  const sensitivity = 0.00165;
  const pixels90 = Math.round((Math.PI / 2) / sensitivity); // ~955 px
  await page.evaluate((px) => {
    const im = (window as any).input;
    if (im?.setMouseDelta) im.setMouseDelta(-px, 0);
    console.log('setMouseDelta', -px, 0);
  }, [pixels90]);
  await sleep(1000);

  // Walk west (now facing left)
  await page.evaluate(() => {
    const im = (window as any).input;
    if (im?.setKeyPressed) im.setKeyPressed('KeyW', true);
  });
  await sleep(5000);
  await page.evaluate(() => {
    const im = (window as any).input;
    if (im?.setKeyPressed) im.setKeyPressed('KeyW', false);
  });
  await sleep(500);

  const afterWest = await page.evaluate(() => (window as any).__debugPlayerPosition?.());
  console.log('After 5s west:', JSON.stringify(afterWest));
  console.log('Δx:', (afterWest.x - afterW.x).toFixed(2));

  await page.screenshot({ path: 'tests/manual-test-1.png' });
  console.log('Screenshot: tests/manual-test-1.png');
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
