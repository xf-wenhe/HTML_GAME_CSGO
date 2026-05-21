import { chromium } from 'playwright';

const url = process.env.E2E_URL || 'http://localhost:5173/';

const browser = await chromium.launch({
  headless: process.env.HEADLESS !== 'false',
  args: ['--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
});

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error') errors.push(message.text());
});

await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#game-title', { timeout: 10_000 });
await page.click('[data-action="solo"]');
await page.waitForFunction(() => Boolean(window.__debugInputState), null, { timeout: 10_000 });

const initial = await page.evaluate(() => window.__debugPlayerPosition?.());
await page.keyboard.down('KeyW');
await page.waitForTimeout(1000);
await page.keyboard.up('KeyW');
const moved = await page.evaluate(() => window.__debugPlayerPosition?.());
const stateAfterMove = await page.evaluate(() => window.__debugInputState?.());

await page.mouse.down();
await page.waitForTimeout(250);
await page.mouse.up();
const stateAfterShoot = await page.evaluate(() => window.__debugInputState?.());

await page.keyboard.press('Escape');
await page.waitForTimeout(150);
const paused = await page.evaluate(() => window.__debugInputState?.());

await page.click('.resume-button');
await page.waitForTimeout(250);
const resumed = await page.evaluate(() => window.__debugInputState?.());

const distance = initial && moved
  ? Math.hypot(moved.x - initial.x, moved.y - initial.y, moved.z - initial.z)
  : 0;

const report = {
  url,
  initial,
  moved,
  distance,
  stateAfterMove,
  stateAfterShoot,
  paused,
  resumed,
  errors
};

console.log(JSON.stringify(report, null, 2));

if (errors.some(error => /WebGLRenderer: Error creating WebGL context|Error creating WebGL context/.test(error))) {
  throw new Error('WebGL failed in this browser runtime; run the same script in a hardware-accelerated browser.');
}
if (distance < 10 || distance > 12.2) throw new Error(`Expected tuned FPS movement around 10-12 units, got ${distance.toFixed(2)} units in 1s.`);
const pointerLockUnavailable = errors.some(error => /not valid for pointer lock|pointer lock/i.test(error)) && !stateAfterShoot?.pointerLocked;
if (!pointerLockUnavailable && stateAfterShoot && stateAfterMove && stateAfterShoot.ammo >= stateAfterMove.ammo) {
  throw new Error('Expected left click to consume ammo while focused.');
}
if (paused?.mode !== 'paused') throw new Error('Expected Escape to enter paused mode.');
if (resumed?.mode !== 'playing') throw new Error('Expected Resume to return to playing mode.');

await page.keyboard.press('Digit2');
await page.waitForTimeout(120);
const pistolSlot = await page.evaluate(() => window.__debugInputState?.());
if (pistolSlot?.activeSlot !== 'pistol') throw new Error('Expected 2 to activate pistol slot.');

await page.keyboard.press('Digit3');
await page.waitForTimeout(120);
const knifeSlot = await page.evaluate(() => window.__debugInputState?.());
if (knifeSlot?.activeSlot !== 'knife') throw new Error('Expected 3 to activate knife slot.');

await page.keyboard.press('Digit4');
await page.keyboard.press('Digit4');
await page.keyboard.press('Digit4');
await page.waitForTimeout(150);
const grenadeSlot = await page.evaluate(() => window.__debugInputState?.());
const notificationCount = await page.locator('.notification').count();
const activeSlotText = await page.locator('.weapon-slot.active').textContent();
if (grenadeSlot?.activeSlot !== 'grenade') throw new Error('Expected 4 to activate grenade slot.');
if (notificationCount !== 1) throw new Error(`Expected one replacing notification, got ${notificationCount}.`);
if (!activeSlotText?.includes('雷')) throw new Error('Expected active slot UI to show grenade slot.');

const selectedGrenade = grenadeSlot.grenadeId;
const beforeGrenadeCount = grenadeSlot.grenadeInventory[selectedGrenade];
await page.mouse.down();
await page.waitForTimeout(80);
await page.mouse.up();
await page.waitForTimeout(150);
const afterThrow = await page.evaluate(() => window.__debugInputState?.());
if (beforeGrenadeCount > 0 && afterThrow?.grenadeInventory?.[selectedGrenade] >= beforeGrenadeCount) {
  throw new Error('Expected left click to consume selected grenade while grenade slot is active.');
}

await page.keyboard.press('KeyB');
await page.waitForTimeout(150);
const buyOpen = await page.evaluate(() => window.__debugInputState?.());
if (!buyOpen?.isBuyMenuOpen) throw new Error('Expected B to open buy/loadout menu.');

await page.keyboard.press('KeyB');
await page.waitForTimeout(150);
await page.keyboard.down('Tab');
await page.waitForTimeout(150);
const tabOpen = await page.evaluate(() => window.__debugInputState?.());
await page.keyboard.up('Tab');
if (!tabOpen?.isScoreboardOpen) throw new Error('Expected Tab to open scoreboard.');

await browser.close();
