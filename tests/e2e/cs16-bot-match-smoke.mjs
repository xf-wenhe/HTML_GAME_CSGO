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
if (freeze.cs16BotMatch.playerTeam !== 'attackers') throw new Error(`Expected auto Dust2 solo to default to T/attackers, got ${freeze.cs16BotMatch.playerTeam}.`);
if (freeze.activeSlot !== 'pistol' || freeze.weaponId !== 'glock') throw new Error(`Expected T pistol round to start on Glock, got slot=${freeze.activeSlot} weapon=${freeze.weaponId}.`);
if (freeze.canShoot) throw new Error('Expected canShoot=false during freezeTime.');
if (freeze.armor !== 0) throw new Error(`Expected CS1.6 pistol round to start without armor, got ${freeze.armor}.`);
if (freeze.botDebugStates.length < 5) throw new Error(`Expected Dust2 bot squad, got ${freeze.botDebugStates.length}.`);
if (!freeze.botDebugStates.every(bot => bot.weaponId)) throw new Error('Expected every bot to carry a weapon.');
const defaultEnemyWeapons = new Set(freeze.botDebugStates.map(bot => bot.weaponId));
if (!defaultEnemyWeapons.has('m4a1') || !defaultEnemyWeapons.has('usp') || defaultEnemyWeapons.has('ak47') || defaultEnemyWeapons.has('glock')) {
  throw new Error(`Expected T player to face CT bot loadout, got ${JSON.stringify([...defaultEnemyWeapons])}.`);
}
if (Object.values(freeze.grenadeInventory).some(count => count !== 0)) throw new Error('Expected no free grenades at CS1.6 round start.');

await openBuyMenuWithDocumentKey();
const menuPolicy = await page.evaluate(() => ({
  hasGlock: Boolean(document.querySelector('[data-weapon="glock"]')),
  hasMp5: Boolean(document.querySelector('[data-weapon="mp5"]')),
  hasM4: Boolean(document.querySelector('[data-weapon="m4a1"]')),
  hasAwp: Boolean(document.querySelector('[data-weapon="awp"]')),
  akDisabled: document.querySelector('[data-weapon="ak47"]')?.disabled ?? null,
  akTitle: document.querySelector('[data-weapon="ak47"]')?.getAttribute('title') ?? '',
  m4Disabled: document.querySelector('[data-weapon="m4a1"]')?.disabled ?? null,
  m4Title: document.querySelector('[data-weapon="m4a1"]')?.getAttribute('title') ?? '',
  uspDisabled: document.querySelector('[data-weapon="usp"]')?.disabled ?? null,
  uspTitle: document.querySelector('[data-weapon="usp"]')?.getAttribute('title') ?? '',
  kitDisabled: document.querySelector('[data-defuse-kit="true"]')?.disabled ?? null,
  kitTitle: document.querySelector('[data-defuse-kit="true"]')?.getAttribute('title') ?? '',
}));
if (!menuPolicy.hasGlock || !menuPolicy.hasMp5 || !menuPolicy.hasM4 || !menuPolicy.hasAwp) {
  throw new Error(`Expected expanded CS1.6 buy menu, got ${JSON.stringify(menuPolicy)}.`);
}
if (menuPolicy.akDisabled !== true || menuPolicy.akTitle !== '金钱不足') {
  throw new Error(`Expected AK to be visible but money-blocked at $800, got ${JSON.stringify(menuPolicy)}.`);
}
if (menuPolicy.m4Disabled !== true || menuPolicy.m4Title !== '当前阵营不能购买') {
  throw new Error(`Expected T player M4 buy to be team-blocked, got ${JSON.stringify(menuPolicy)}.`);
}
if (menuPolicy.uspDisabled !== true || menuPolicy.uspTitle !== '当前阵营不能购买') {
  throw new Error(`Expected T player USP buy to be team-blocked, got ${JSON.stringify(menuPolicy)}.`);
}
if (menuPolicy.kitDisabled !== true || menuPolicy.kitTitle !== '当前模式不能购买') {
  throw new Error(`Expected solo bot match to disable defuse kit buys, got ${JSON.stringify(menuPolicy)}.`);
}
await page.click('[data-grenade="he"]');
await page.waitForTimeout(120);
const boughtHe = await page.evaluate(() => window.__debugInputState?.());
if (boughtHe.grenadeInventory.he !== 1) throw new Error(`Expected HE buy to add one grenade, got ${boughtHe.grenadeInventory.he}.`);
if (boughtHe.cs16BotMatch.money !== 500) throw new Error(`Expected HE buy to cost $300, money=${boughtHe.cs16BotMatch.money}.`);
if (boughtHe.isBuyMenuOpen) await page.keyboard.press('KeyB');

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
if (buyOpen.isBuyMenuOpen) throw new Error('Expected B during live play to show a toast without opening the obstructive buy menu.');
if (buyOpen.activePanel === 'buyMenu') throw new Error('Expected live play to remain unobstructed by the buy menu.');

await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-action="solo"]', { timeout: 10_000 });
await page.click('[data-team="defenders"]');
await page.click('[data-map="dust2"]');
await page.click('[data-action="solo"]');
await page.waitForFunction(() => Boolean(window.__debugInputState?.().cs16BotMatch), null, { timeout: 10_000 });
const ctFreeze = await page.evaluate(() => window.__debugInputState?.());
if (ctFreeze.cs16BotMatch.playerTeam !== 'defenders') throw new Error(`Expected CT selection to set defenders, got ${ctFreeze.cs16BotMatch.playerTeam}.`);
if (ctFreeze.activeSlot !== 'pistol' || ctFreeze.weaponId !== 'usp') throw new Error(`Expected CT pistol round to start on USP, got slot=${ctFreeze.activeSlot} weapon=${ctFreeze.weaponId}.`);
const ctEnemyWeapons = new Set(ctFreeze.botDebugStates.map(bot => bot.weaponId));
if (!ctEnemyWeapons.has('ak47') || !ctEnemyWeapons.has('glock') || ctEnemyWeapons.has('m4a1') || ctEnemyWeapons.has('usp')) {
  throw new Error(`Expected CT player to face T bot loadout, got ${JSON.stringify([...ctEnemyWeapons])}.`);
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

async function openBuyMenuWithDocumentKey() {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', code: 'KeyB', bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(200);
    const state = await page.evaluate(() => window.__debugInputState?.());
    if (state?.isBuyMenuOpen) return;
  }
  const last = await page.evaluate(() => window.__debugInputState?.());
  throw new Error(`Expected buy menu to open during freeze: ${JSON.stringify(last?.cs16BotMatch)}`);
}
