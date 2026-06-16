import { chromium } from 'playwright';

const url = process.env.E2E_URL || 'http://localhost:5173/';

const browser = await chromium.launch({
  headless: false,
  args: ['--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
});

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
const warnings = [];

page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error') errors.push(message.text());
  if (message.type() === 'warning') warnings.push(message.text());
});

console.log('🌐 打开游戏...');
await page.goto(url, { waitUntil: 'domcontentloaded' });

await page.waitForSelector('[data-action="solo"]', { timeout: 10_000 });
console.log('✅ 主菜单已加载');

await page.click('[data-map="inferno"]');
await page.waitForTimeout(500);
console.log('🗺️ 已选择 Inferno 地图');

console.log('\n🔴 测试 T 阵营出生点...');
await page.click('[data-team="attackers"]');
await page.waitForTimeout(300);
await page.click('[data-action="solo"]');
await page.waitForFunction(() => Boolean(window.__debugPlayerPosition), null, { timeout: 10_000 });

const tSpawn = await page.evaluate(() => window.__debugPlayerPosition?.());
console.log('📍 T 出生点坐标:', JSON.stringify(tSpawn, null, 2));

// 测试地面碰撞
console.log('\n🧱 测试地面碰撞...');
const groundTest = await page.evaluate(() => {
  if (typeof window.__debugTestColliders === 'function') {
    return window.__debugTestColliders();
  }
  return null;
});
console.log('碰撞体测试结果:', groundTest);

// 测试跌落：原地站立 2 秒
console.log('\n⏱️ 测试原地站立（检测跌落）...');
await page.waitForTimeout(2000);

const afterStand = await page.evaluate(() => window.__debugPlayerPosition?.());
console.log('📍 站立 2 秒后坐标:', JSON.stringify(afterStand, null, 2));

if (afterStand && afterStand.y < 0) {
  console.log('❌ 玩家跌落！Y 坐标为负值:', afterStand.y);
} else if (afterStand && afterStand.y >= 0.4 && afterStand.y <= 0.5) {
  console.log('✅ 地面碰撞正常，玩家高度正常');
} else {
  console.log('⚠️ 玩家高度异常:', afterStand?.y);
}

// 测试向前移动
console.log('\n🚶 测试向前移动...');
await page.keyboard.down('KeyW');
await page.waitForTimeout(2000);
await page.keyboard.up('KeyW');
await page.waitForTimeout(500);

const afterMove = await page.evaluate(() => window.__debugPlayerPosition?.());
console.log('📍 移动后坐标:', JSON.stringify(afterMove, null, 2));

// 测试跳跃
console.log('\n🦘 测试跳跃...');
await page.keyboard.press('Space');
await page.waitForTimeout(1000);

const afterJump = await page.evaluate(() => window.__debugPlayerPosition?.());
console.log('📍 跳跃后坐标:', JSON.stringify(afterJump, null, 2));

console.log('\n📊 测试结果:');
console.log('='.repeat(50));
console.log(`T 出生点: ${tSpawn && tSpawn.x >= -20 && tSpawn.x <= -10 ? '✅' : '❌'}`);
console.log(`地面碰撞: ${afterStand && afterStand.y >= 0.4 ? '✅' : '❌'}`);
console.log(`跳跃功能: ${afterJump && afterJump.y > (afterStand?.y || 0) ? '✅' : '⚠️'}`);
console.log(`控制台错误: ${errors.length === 0 ? '✅ 无错误' : `❌ ${errors.length} 个错误`}`);
console.log(`控制台警告: ${warnings.length === 0 ? '✅ 无警告' : `⚠️ ${warnings.length} 个警告`}`);

if (errors.length > 0) {
  console.log('\n🚨 错误汇总（前 5 个）:');
  errors.slice(0, 5).forEach(err => console.log(`  - ${err}`));
}

if (warnings.length > 0) {
  console.log('\n⚠️ 警告汇总（前 5 个）:');
  warnings.slice(0, 5).forEach(warn => console.log(`  - ${warn}`));
}

await browser.close();
