import { chromium } from 'playwright';
import { join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';

const URL = 'http://localhost:5173';
const SCREENSHOTS_DIR = join(import.meta.dirname, 'screenshots');
mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// Based on actual Dust2Layout.ts geometry coordinates (game units, Hammer * 0.01)
const LOCATIONS = [
  // --- T Spawn ---
  { name: 't-spawn-back', x: 0, z: 68.0, yaw: 0, eye: 2.5 },
  // --- Mid ---
  { name: 't-mid-entrance', x: 0, z: 30.0, yaw: 0, eye: 2.5 },
  { name: 'xbox', x: 5.0, z: 8.0, yaw: -0.3, eye: 2.5 },
  { name: 'mid-doors-t', x: -2.0, z: 18.0, yaw: 0, eye: 2.5 },
  { name: 'ct-window', x: 0, z: -25.0, yaw: 0, eye: 2.0 },
  // --- A Long ---
  { name: 'a-long-mid', x: -32.0, z: 28.0, yaw: -1.4, eye: 2.0 },
  { name: 'a-long-doors', x: -35.0, z: 10.0, yaw: -1.4, eye: 2.0 },
  // --- A Site (geometry: x=-35..-18, z=-20..-3) ---
  { name: 'a-site-west', x: -40.0, z: -11.0, yaw: -0.5, eye: 2.5 },
  { name: 'a-site-south', x: -28.0, z: 2.0, yaw: 3.14, eye: 2.5 },
  { name: 'goose', x: -22.0, z: -18.0, yaw: 2.8, eye: 2.5 },
  { name: 'a-platform', x: -28.0, z: -14.0, yaw: 0, eye: 2.5 },
  // --- Short ---
  { name: 'short-top', x: -10.0, z: -4.0, yaw: 0, eye: 2.0 },
  { name: 'short-into-a', x: -16.0, z: -8.0, yaw: -0.5, eye: 2.0 },
  // --- Pit ---
  { name: 'pit', x: -32.0, z: 18.0, yaw: -1.4, eye: 2.0 },
  // --- Palace ---
  { name: 'palace', x: -40.0, z: -30.0, yaw: -0.5, eye: 2.5 },
  // --- CT Spawn ---
  { name: 'ct-spawn', x: 0, z: -34.0, yaw: 0, eye: 2.5 },
  // --- B Tunnels (geometry: x=26..35, z=-30..-3) ---
  { name: 'b-tunnels-lower', x: 34.0, z: -20.0, yaw: 3.14, eye: 2.5 },
  { name: 'b-tunnels-stairs', x: 34.0, z: -8.0, yaw: 3.14, eye: 2.5 },
  { name: 'upper-b', x: 34.0, z: 2.0, yaw: 3.14, eye: 2.0 },
  { name: 'upper-dark', x: 34.0, z: -3.0, yaw: 3.14, eye: 2.0 },
  // --- B Site (geometry: x=18..35, z=-20..-3) ---
  { name: 'b-site-entrance', x: 38.0, z: -10.0, yaw: 0.5, eye: 2.5 },
  { name: 'b-site-platform', x: 28.0, z: -12.0, yaw: 3.14, eye: 2.5 },
  { name: 'b-doors', x: 20.0, z: -10.0, yaw: 0.5, eye: 2.5 },
  { name: 'b-window', x: 22.0, z: -16.0, yaw: 0, eye: 2.5 },
];

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const context = await browser.newContext({ viewport: { width: 960, height: 640 } });
  const page = await context.newPage();

  console.log('Navigating...');
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });

  console.log('Starting solo mode...');
  await page.locator('button[data-action="solo"]').click();
  await page.waitForTimeout(5000);

  console.log('Bypassing pointer lock...');
  await page.evaluate(() => {
    if (window.__debugAllowPointerLockBypassForTests) {
      window.__debugAllowPointerLockBypassForTests();
    }
    const lockPanel = document.querySelector('.lock-panel');
    if (lockPanel) lockPanel.remove();
  });
  await page.waitForTimeout(500);

  for (const loc of LOCATIONS) {
    console.log(`${loc.name}: (${loc.x}, ${loc.z})`);
    await page.evaluate(({ x, z, yaw, eye }) => {
      if (window.__debugSetPlayerPosition) {
        window.__debugSetPlayerPosition(x, z, yaw, eye);
      }
    }, loc);

    await page.waitForTimeout(1500);

    const dataUrl = await page.evaluate(() => {
      if (window.__debugTakeScreenshot) {
        return window.__debugTakeScreenshot();
      }
      return null;
    });

    if (dataUrl) {
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
      const path = join(SCREENSHOTS_DIR, `dust2-${loc.name}.png`);
      writeFileSync(path, Buffer.from(base64, 'base64'));
      console.log(`  -> saved ${path}`);
    } else {
      console.log(`  -> FAILED`);
    }
  }

  await browser.close();
  console.log('Done!');
})();
