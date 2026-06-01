/**
 * Pure input test: natural spawn, mouse look + WASD only.
 * ZERO debug API calls.
 */
import { webkit } from 'playwright';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('🚀 Dust2 — pure input test\n');

  const browser = await webkit.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');
  await sleep(3000);
  await page.locator('[data-action="solo"]').click();
  await sleep(4000);

  // Read-only position check
  const state = await page.evaluate(() => ({
    pos: (window as any).__debugPlayerPosition?.(),
    input: (window as any).__debugInputState?.(),
  }));
  console.log('Game state:', state.input?.mode, '| Pos:', state.pos);

  // Click canvas to get pointer lock
  await page.click('canvas');
  await sleep(1000);

  // Look south: spin mouse rapidly clockwise (yaw increases)
  // mouse move delta: positive X = look right (yaw increases)
  const centerX = 640, centerY = 360;
  for (let i = 0; i < 120; i++) {
    const angle = (i / 120) * Math.PI;
    await page.mouse.move(centerX + Math.cos(angle) * 200, centerY + Math.sin(angle) * 100);
    await sleep(16);
  }
  await sleep(500);

  // Move forward 3 seconds
  const t0 = Date.now();
  await page.keyboard.down('KeyW');
  while (Date.now() - t0 < 3000) {
    await sleep(100);
  }
  await page.keyboard.up('KeyW');
  await sleep(300);

  const pos = await page.evaluate(() => (window as any).__debugPlayerPosition?.());
  console.log('After 3s forward:', pos);

  if (state.pos && pos) {
    const dz = pos.z - state.pos.z;
    console.log('Z delta:', dz.toFixed(2));
    if (dz > 2) console.log('✅ MOVED SOUTH');
    else if (dz > 0.5) console.log('⚠️ Partial movement');
    else console.log('❌ No movement');
  }

  await page.screenshot({ path: 'tests/pure-input.png' });
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
