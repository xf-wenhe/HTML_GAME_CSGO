import { chromium } from 'playwright';

const url = process.env.E2E_URL || 'http://localhost:5173/';

const browser = await chromium.launch({
  headless: false,
  args: ['--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
});

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

// 监听控制台日志
page.on('console', message => {
  const text = message.text();
  if (text.includes('[MapData]') || text.includes('[Main]') || text.includes('[Scene]')) {
    console.log('🖥️', text);
  }
});

console.log('🌐 打开游戏（强制刷新）...');
await page.goto(url, { waitUntil: 'networkidle' });

await page.waitForSelector('[data-action="solo"]', { timeout: 10_000 });
console.log('✅ 主菜单已加载');

await page.click('[data-map="inferno"]');
await page.waitForTimeout(500);
console.log('🗺️ 已选择 Inferno 地图');

console.log('\n🔴 测试 T 阵营（attackers）...');
await page.click('[data-team="attackers"]');
await page.waitForTimeout(300);
await page.click('[data-action="solo"]');
await page.waitForFunction(() => Boolean(window.__debugPlayerPosition), null, { timeout: 10_000 });

const tSpawn = await page.evaluate(() => window.__debugPlayerPosition?.());
console.log('📍 T 出生点:', JSON.stringify(tSpawn, null, 2));

// 测试调试工具
console.log('\n🔧 测试调试工具...');
const debugTeleportT = await page.evaluate(() => {
  if (typeof window.__debugTeleportToTSpawn === 'function') {
    window.__debugTeleportToTSpawn();
    return window.__debugPlayerPosition?.();
  }
  return null;
});
console.log('📍 __debugTeleportToTSpawn():', JSON.stringify(debugTeleportT, null, 2));

const debugTeleportCT = await page.evaluate(() => {
  if (typeof window.__debugTeleportToCTSpawn === 'function') {
    window.__debugTeleportToCTSpawn();
    return window.__debugPlayerPosition?.();
  }
  return null;
});
console.log('📍 __debugTeleportToCTSpawn():', JSON.stringify(debugTeleportCT, null, 2));

const debugTestSpawns = await page.evaluate(() => {
  if (typeof window.__debugTestSpawns === 'function') {
    return window.__debugTestSpawns();
  }
  return null;
});
console.log('🔧 __debugTestSpawns():', debugTestSpawns);

// 按 ESC 退出
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
await page.keyboard.press('Escape');
await page.waitForTimeout(2000);

console.log('\n🔵 测试 CT 阵营（defenders）...');
await page.waitForSelector('[data-action="solo"]', { timeout: 10_000 });
await page.click('[data-map="inferno"]');
await page.waitForTimeout(500);
await page.click('[data-team="defenders"]');
await page.waitForTimeout(300);
await page.click('[data-action="solo"]');
await page.waitForFunction(() => Boolean(window.__debugPlayerPosition), null, { timeout: 10_000 });

const ctSpawn = await page.evaluate(() => window.__debugPlayerPosition?.());
console.log('📍 CT 出生点:', JSON.stringify(ctSpawn, null, 2));

console.log('\n📊 最终验证结果:');
console.log('='.repeat(50));
const tValid = tSpawn && tSpawn.x >= -20 && tSpawn.x <= -10 && tSpawn.y >= 0.4 && tSpawn.y <= 0.5;
const ctValid = ctSpawn && ctSpawn.x >= 20 && ctSpawn.x <= 30 && ctSpawn.y >= 1.8 && ctSpawn.y <= 2.0;
console.log(`T 出生点: ${tValid ? '✅ 通过' : '❌ 失败'}`);
console.log(`CT 出生点: ${ctValid ? '✅ 通过' : '❌ 失败'}`);
console.log(`调试工具 T Spawn: ${debugTeleportT && debugTeleportT.x >= -20 && debugTeleportT.x <= -10 ? '✅' : '❌'}`);
console.log(`调试工具 CT Spawn: ${debugTeleportCT && debugTeleportCT.x >= 20 && debugTeleportCT.x <= 30 ? '✅' : '❌'}`);

await browser.close();