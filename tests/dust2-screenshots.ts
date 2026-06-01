/**
 * Generate screenshots for visual comparison with CS:GO.
 */
import { webkit } from 'playwright';

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('📸 Generating Dust2 screenshots for visual comparison\n');

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

  // Spawn at T Spawn, face south (default)
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

  // Screenshot 1: T Spawn view
  await page.screenshot({ path: 'tests/view-t-spawn.png' });
  console.log('✅ tests/view-t-spawn.png — T Spawn 默认视角');

  // Rotate to face A Long (west)
  await page.evaluate(() => {
    const f = (window as any).__debugSetPlayerYaw;
    if (f) f(Math.PI / 2);
  });
  await sleep(1000);
  await page.screenshot({ path: 'tests/view-a-long.png' });
  console.log('✅ tests/view-a-long.png — 朝向 A Long');

  // Rotate to face B Tunnels (east)
  await page.evaluate(() => {
    const f = (window as any).__debugSetPlayerYaw;
    if (f) f(-Math.PI / 2);
  });
  await sleep(1000);
  await page.screenshot({ path: 'tests/view-b-tunnels.png' });
  console.log('✅ tests/view-b-tunnels.png — 朝向 B Tunnels');

  // Rotate to face Mid (north)
  await page.evaluate(() => {
    const f = (window as any).__debugSetPlayerYaw;
    if (f) f(Math.PI);
  });
  await sleep(1000);
  await page.screenshot({ path: 'tests/view-mid.png' });
  console.log('✅ tests/view-mid.png — 朝向中路');

  // Move to A Site and screenshot
  await page.evaluate(() => {
    const f = (window as any).__debugSetPlayerPosition;
    if (f) f(-25, -20, 0, 0.64);
  });
  await sleep(500);
  await page.evaluate(() => {
    const b = (window as any).__debugAllowPointerLockBypassForTests;
    if (b) b();
  });
  await sleep(2000);
  await page.screenshot({ path: 'tests/view-a-site.png' });
  console.log('✅ tests/view-a-site.png — A 包点视角');

  // Move to B Site
  await page.evaluate(() => {
    const f = (window as any).__debugSetPlayerPosition;
    if (f) f(25, -20, 0, 0.64);
  });
  await sleep(2000);
  await page.screenshot({ path: 'tests/view-b-site.png' });
  console.log('✅ tests/view-b-site.png — B 包点视角');

  // Move to Mid entrance
  await page.evaluate(() => {
    const f = (window as any).__debugSetPlayerPosition;
    if (f) f(0, -15, Math.PI, 0.64);
  });
  await sleep(2000);
  await page.screenshot({ path: 'tests/view-mid-entrance.png' });
  console.log('✅ tests/view-mid-entrance.png — 中路入口视角');

  console.log('\n📸 截图生成完毕！');
  console.log('请对比以下截图与 CS:GO 视角：');
  console.log('  tests/view-t-spawn.png');
  console.log('  tests/view-a-long.png');
  console.log('  tests/view-b-tunnels.png');
  console.log('  tests/view-mid.png');
  console.log('  tests/view-a-site.png');
  console.log('  tests/view-b-site.png');
  console.log('  tests/view-mid-entrance.png');

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });