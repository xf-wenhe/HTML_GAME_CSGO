import { chromium } from 'playwright';

const url = process.env.E2E_URL || 'http://localhost:5173/';

const browser = await chromium.launch({
  headless: process.env.HEADLESS === 'true',
  args: ['--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
});

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error') errors.push(message.text());
});

console.log('🌐 打开游戏...');
await page.goto(url, { waitUntil: 'domcontentloaded' });

// 等待主菜单
await page.waitForSelector('[data-action="solo"]', { timeout: 10_000 });
console.log('✅ 主菜单已加载');

// 选择 Inferno 地图
await page.click('[data-map="inferno"]');
await page.waitForTimeout(500);
console.log('🗺️ 已选择 Inferno 地图');

// 测试 T 阵营出生点（匪徒 = attackers）
console.log('\n🔴 测试 T 阵营出生点（匪徒）...');
await page.click('[data-team="attackers"]');
await page.waitForTimeout(300);
await page.click('[data-action="solo"]');
await page.waitForFunction(() => Boolean(window.__debugPlayerPosition), null, { timeout: 10_000 });

const tSpawn = await page.evaluate(() => window.__debugPlayerPosition?.());
console.log('📍 T 出生点坐标:', JSON.stringify(tSpawn, null, 2));

// 验证 T 出生点范围（根据 InfernoLayout.ts）
const tSpawnValid = tSpawn &&
  tSpawn.x >= -20 && tSpawn.x <= -10 &&  // T Spawn X 范围
  tSpawn.y >= 0 && tSpawn.y <= 1 &&       // 地面 + 眼高
  tSpawn.z >= -5 && tSpawn.z <= 0;        // T Spawn Z 范围

if (tSpawnValid) {
  console.log('✅ T 出生点在正确范围内');
} else {
  console.log('❌ T 出生点超出预期范围');
  console.log('   预期: x∈[-20,-10], y∈[0,1], z∈[-5,0]');
}

// 测试移动和跳跃
console.log('\n🚶 测试移动和跳跃...');
await page.keyboard.down('KeyW');
await page.waitForTimeout(1000);
await page.keyboard.up('KeyW');

const afterMove = await page.evaluate(() => window.__debugPlayerPosition?.());
console.log('📍 移动后坐标:', JSON.stringify(afterMove, null, 2));

// 测试跳跃
await page.keyboard.press('Space');
await page.waitForTimeout(500);
console.log('✅ 跳跃测试完成');

// 测试穿墙：从 T Spawn 向前移动，应该被 Mid 中墙阻挡
console.log('\n🧱 测试穿墙检测（T Spawn → Mid 中墙）...');
// 先传送到 T Spawn
await page.evaluate(() => {
  if (typeof window.__debugTeleportToTSpawn === 'function') {
    window.__debugTeleportToTSpawn();
  }
});
await page.waitForTimeout(500);

// 向正 Z 方向移动（朝向 T Spawn 后墙），应该被阻挡
const beforeWallTest = await page.evaluate(() => window.__debugPlayerPosition?.());
await page.keyboard.down('KeyS'); // S 键向后移动（正 Z 方向）
await page.waitForTimeout(3000);
await page.keyboard.up('KeyS');
await page.waitForTimeout(500);

const afterWallTest = await page.evaluate(() => window.__debugPlayerPosition?.());
console.log('📍 穿墙测试前:', JSON.stringify(beforeWallTest, null, 2));
console.log('📍 穿墙测试后:', JSON.stringify(afterWallTest, null, 2));

// T Spawn 后墙在 z=38.40，玩家向正 Z 方向移动应该被阻挡
const wallTestPass = afterWallTest &&
  Math.abs(afterWallTest.z - beforeWallTest.z) < 5; // 移动距离应该小于 5 单位

if (wallTestPass) {
  console.log('✅ 穿墙检测正常（玩家被墙壁阻挡）');
} else {
  console.log('❌ 可能存在穿墙问题');
}

// 按 ESC 两次直接退出（根据用户反馈：ESC → 再按 ESC 直接退出）
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
await page.keyboard.press('Escape');
await page.waitForTimeout(2000);

// 测试 CT 阵营出生点（警察 = defenders）
console.log('\n🔵 测试 CT 阵营出生点（警察）...');
await page.waitForSelector('[data-action="solo"]', { timeout: 10_000 });
await page.click('[data-map="inferno"]');
await page.waitForTimeout(500);
await page.click('[data-team="defenders"]');
await page.waitForTimeout(300);
await page.click('[data-action="solo"]');
await page.waitForFunction(() => Boolean(window.__debugPlayerPosition), null, { timeout: 10_000 });

const ctSpawn = await page.evaluate(() => window.__debugPlayerPosition?.());
console.log('📍 CT 出生点坐标:', JSON.stringify(ctSpawn, null, 2));

// 验证 CT 出生点范围（根据 InfernoLayout.ts）
const ctSpawnValid = ctSpawn &&
  ctSpawn.x >= 20 && ctSpawn.x <= 30 &&    // CT Spawn X 范围
  ctSpawn.y >= 1.5 && ctSpawn.y <= 2.5 &&  // 地面 + 眼高
  ctSpawn.z >= -25 && ctSpawn.z <= -20;    // CT Spawn Z 范围

if (ctSpawnValid) {
  console.log('✅ CT 出生点在正确范围内');
} else {
  console.log('❌ CT 出生点超出预期范围');
  console.log('   预期: x∈[20,30], y∈[1.5,2.5], z∈[-25,-20]');
}

// 测试 CT 出生点的移动
await page.keyboard.down('KeyW');
await page.waitForTimeout(1000);
await page.keyboard.up('KeyW');
await page.keyboard.press('Space');
await page.waitForTimeout(500);

console.log('\n📊 验证结果汇总:');
console.log('='.repeat(50));
console.log(`T 出生点: ${tSpawnValid ? '✅ 通过' : '❌ 失败'}`);
console.log(`CT 出生点: ${ctSpawnValid ? '✅ 通过' : '❌ 失败'}`);
console.log(`穿墙检测: ${wallTestPass ? '✅ 通过' : '⚠️ 需检查'}`);
console.log(`控制台错误: ${errors.length === 0 ? '✅ 无错误' : `❌ ${errors.length} 个错误`}`);

if (errors.length > 0) {
  console.log('\n🚨 控制台错误:');
  errors.forEach(err => console.log(`  - ${err}`));
}

await browser.close();

// 返回退出码
const allPass = tSpawnValid && ctSpawnValid && wallTestPass && errors.length === 0;
process.exit(allPass ? 0 : 1);
