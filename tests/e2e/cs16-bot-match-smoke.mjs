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
await page.waitForSelector('[data-action="solo"]', { timeout: 10_000 });
await page.click('[data-map="dust2"]');
await page.click('[data-action="solo"]');
await page.waitForFunction(() => Boolean(window.__debugInputState?.().cs16BotMatch), null, { timeout: 10_000 });
await page.evaluate(() => window.__debugAllowPointerLockBypassForTests?.());

const freeze = await page.evaluate(() => window.__debugInputState?.());
if (freeze.cs16BotMatch.phase !== 'freezeTime') throw new Error(`Expected freezeTime, got ${freeze.cs16BotMatch.phase}`);
if (freeze.canShoot) throw new Error('Expected canShoot=false during freezeTime.');
if (freeze.botDebugStates.length < 5) throw new Error(`Expected Dust2 bot squad, got ${freeze.botDebugStates.length}.`);
if (!freeze.botDebugStates.every(bot => bot.weaponId)) throw new Error('Expected every bot to carry a weapon.');

await waitForState(state => state.cs16BotMatch?.phase === 'live', 'live phase', 6000);
const live = await page.evaluate(() => window.__debugInputState?.());
if (!live.canShoot) throw new Error('Expected canShoot=true during live phase.');

const firstBotStart = live.botDebugStates[0]?.position;
await page.waitForTimeout(1200);
const moved = await page.evaluate(() => window.__debugInputState?.());
const firstBotAfter = moved.botDebugStates[0]?.position;
const botDistance = firstBotStart && firstBotAfter
  ? Math.hypot(firstBotAfter.x - firstBotStart.x, firstBotAfter.z - firstBotStart.z)
  : 0;
if (botDistance < 0.15 && !moved.botDebugStates.some(bot => bot.state === 'attack')) {
  throw new Error(`Expected a bot to move on a Dust2 route or attack, moved ${botDistance.toFixed(2)}.`);
}

await page.keyboard.press('KeyB');
await page.waitForTimeout(120);
const buyOpen = await page.evaluate(() => window.__debugInputState?.());
if (!buyOpen.isBuyMenuOpen) throw new Error('Expected B to open the CS1.6 buy menu surface.');
if (!/只能在冻结购买时间购买|必须站在出生买区内购买/.test(await page.locator('.buy-hint').textContent())) {
  throw new Error('Expected CS1.6 buy menu restriction hint outside freeze/buy zone.');
}

await browser.close();

if (errors.some(error => /WebGLRenderer: Error creating WebGL context|Error creating WebGL context/.test(error))) {
  throw new Error('WebGL failed in this browser runtime; run in a hardware-accelerated browser.');
}

async function waitForState(predicate, label, timeout = 10_000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const state = await page.evaluate(() => window.__debugInputState?.());
    if (predicate(state)) return state;
    await page.waitForTimeout(100);
  }
  const last = await page.evaluate(() => window.__debugInputState?.());
  throw new Error(`Timed out waiting for ${label}: ${JSON.stringify(last?.cs16BotMatch)}`);
}
