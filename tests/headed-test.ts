import { webkit } from 'playwright';

async function main() {
  const browser = await webkit.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');
  console.log('Page loaded:', await page.title());
  await page.waitForTimeout(3000);

  const solo = page.locator('[data-action="solo"]');
  if (await solo.count() > 0) {
    await solo.click();
    console.log('Clicked solo');
  }
  await page.waitForTimeout(4000);

  await page.evaluate(() => {
    const bypass = (window as any).__debugAllowPointerLockBypassForTests;
    if (bypass) bypass();
  });

  // Start at T Spawn exit, face A Long
  await page.evaluate(([x, z, yaw]) => {
    const f = (window as any).__debugSetPlayerPosition;
    if (f) f(x, z, yaw, 0.64);
  }, [-2.56, -57.60, Math.PI / 2]);
  await page.waitForTimeout(500);

  const pos1 = await page.evaluate(() => (window as any).__debugPlayerPosition?.());
  console.log('Start pos:', pos1);

  // Press W for 2 seconds
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(2000);
  await page.keyboard.up('KeyW');
  await page.waitForTimeout(300);

  const pos2 = await page.evaluate(() => (window as any).__debugPlayerPosition?.());
  console.log('After W:', pos2);

  if (pos1 && pos2) {
    const dz = pos2.z - pos1.z;
    console.log('Z delta:', dz);
    if (dz > 1) console.log('SUCCESS: Moved forward!');
    else console.log('FAIL: Did not move');
  }

  await page.screenshot({ path: 'tests/headed-test.png' });
  console.log('Screenshot saved');
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
