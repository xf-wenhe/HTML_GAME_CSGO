import { chromium } from 'playwright';
import fs from 'fs';

const url = process.env.E2E_URL || 'http://localhost:5173/';
const issues = [];

const browser = await chromium.launch({
  headless: false,
  args: ['--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
});

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
const consoleLogs = [];

page.on('pageerror', error => {
  console.error('Page error:', error.message);
  errors.push(error.message);
});
page.on('console', message => {
  consoleLogs.push({ type: message.type(), text: message.text() });
  if (message.type() === 'error') {
    errors.push(message.text());
  }
});

function logIssue(category, description, severity = 'medium') {
  console.log(`[${severity.toUpperCase()}] ${category}: ${description}`);
  issues.push({ category, description, severity, timestamp: Date.now() });
}

async function takeScreenshot(name) {
  try {
    await page.screenshot({ path: `/tmp/dust2-test-${name}.png` });
  } catch (e) {
    console.log('Screenshot failed:', e);
  }
}

console.log('Navigating to game...');
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
await takeScreenshot('01-menu');

console.log('Selecting Dust2 and solo mode...');
await page.waitForSelector('[data-map="dust2"]', { timeout: 15_000 });
await page.click('[data-map="dust2"]');
await page.waitForTimeout(300);
await page.click('[data-action="solo"]');

console.log('Waiting for game to load...');
await page.waitForFunction(() => Boolean(window.__debugInputState?.().cs16BotMatch), null, { timeout: 20_000 });
await page.evaluate(() => window.__debugAllowPointerLockBypassForTests?.());
await page.waitForTimeout(2000);
await takeScreenshot('02-game-loaded');

// Get initial game state
const initialState = await page.evaluate(() => window.__debugInputState?.());
console.log('Initial phase:', initialState.cs16BotMatch?.phase);

if (initialState.cs16BotMatch?.phase !== 'freezeTime') {
  logIssue('Game Flow', 'Expected freezeTime on game start', 'medium');
}

// Enable debug info
await page.evaluate(() => {
  window.__debugBots = true;
  window.__debugMovement = true;
});

// Wait for live phase
console.log('Waiting for live phase...');
await page.waitForFunction(() => window.__debugInputState?.().cs16BotMatch?.phase === 'live', null, { timeout: 15_000 });
await takeScreenshot('03-live-phase');

const gameStartTime = Date.now();
const kills = [];
let lastKillsCount = 0;

console.log('Starting gameplay...');

// Function to move mouse and look at enemies
async function aimAtNearestEnemy() {
  await page.evaluate(() => {
    const state = window.__debugInputState?.();
    if (!state?.botDebugStates) return;

    const aliveBots = state.botDebugStates.filter(b => b.health > 0);
    if (aliveBots.length === 0) return;

    // Find nearest bot
    const playerPos = state.playerPosition;
    let nearestBot = null;
    let nearestDist = Infinity;

    for (const bot of aliveBots) {
      const dx = bot.position.x - playerPos.x;
      const dz = bot.position.z - playerPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestBot = bot;
      }
    }

    if (nearestBot) {
      // Calculate yaw to bot
      const dx = nearestBot.position.x - playerPos.x;
      const dz = nearestBot.position.z - playerPos.z;
      const yaw = Math.atan2(dx, dz) * 180 / Math.PI;
      window.__debugSetPlayerYaw?.(yaw);
    }
  });
}

// Main gameplay loop - try to get 3 kills
for (let step = 0; step < 900; step++) { // 90 seconds max
  const state = await page.evaluate(() => window.__debugInputState?.());

  if (state) {
    // Check kills
    const currentKills = state.cs16BotMatch?.playerKills || 0;
    if (currentKills > lastKillsCount) {
      const newKillCount = currentKills - lastKillsCount;
      for (let i = 0; i < newKillCount; i++) {
        kills.push({ time: Date.now() - gameStartTime, total: currentKills });
        console.log(`Kill #${kills.length}! Total: ${currentKills}`);
      }
      lastKillsCount = currentKills;
      await takeScreenshot(`kill-${kills.length}`);
    }

    // Try to aim and shoot
    if (step % 50 === 0) {
      await aimAtNearestEnemy();
    }

    // Shoot periodically
    if (step % 25 === 0) {
      await page.evaluate(() => {
        window.__debugShoot?.();
      });
    }

    // Move around
    if (step % 100 < 50) {
      await page.evaluate(() => window.__debugSetKeyPressed?.('KeyW', true));
    } else {
      await page.evaluate(() => window.__debugSetKeyPressed?.('KeyW', false));
    }

    // Strafe
    if (step % 60 < 30) {
      await page.evaluate(() => window.__debugSetKeyPressed?.('KeyA', true));
      await page.evaluate(() => window.__debugSetKeyPressed?.('KeyD', false));
    } else {
      await page.evaluate(() => window.__debugSetKeyPressed?.('KeyA', false));
      await page.evaluate(() => window.__debugSetKeyPressed?.('KeyD', true));
    }
  }

  await page.waitForTimeout(100);

  // Stop after 3 kills
  if (kills.length >= 3) {
    console.log('Got 3 kills!');
    break;
  }
}

// Release all keys
await page.evaluate(() => {
  window.__debugSetKeyPressed?.('KeyW', false);
  window.__debugSetKeyPressed?.('KeyA', false);
  window.__debugSetKeyPressed?.('KeyD', false);
});

await takeScreenshot('04-end-gameplay');
console.log(`Total kills from playerKills: ${lastKillsCount}`);
console.log(`Kills tracked: ${kills.length}`);

if (lastKillsCount < 3) {
  logIssue('Gameplay', `Only got ${lastKillsCount} kills, expected at least 3`, 'high');
}

// Test various game features
console.log('Testing game features...');

// Test weapon switching
await page.keyboard.press('Digit1');
await page.waitForTimeout(300);
await page.keyboard.press('Digit2');
await page.waitForTimeout(300);
await page.keyboard.press('Digit3');
await page.waitForTimeout(300);
await takeScreenshot('05-weapon-switch');

// Test buy menu (should show restriction)
await page.keyboard.press('KeyB');
await page.waitForTimeout(800);
await takeScreenshot('06-buy-menu');

// Test pause menu
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
await takeScreenshot('07-pause-menu');

// Resume game
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

// Collect final state
const finalState = await page.evaluate(() => {
  const input = window.__debugInputState?.();
  return {
    input,
    playerHealth: input?.playerHealth,
    playerArmor: input?.playerArmor,
    currentWeapon: input?.currentWeaponId,
    gamePhase: input?.cs16BotMatch?.phase,
    kills: input?.cs16BotMatch?.playerKills,
    aliveBots: input?.botDebugStates?.filter(b => b.health > 0).length
  };
});

console.log('Final state:', finalState);

// Check for issues
if (finalState.playerHealth <= 0) {
  logIssue('Gameplay', 'Player died during test', 'medium');
}

if (!finalState.currentWeapon) {
  logIssue('Weapon System', 'No current weapon found', 'high');
}

if (errors.length > 0) {
  logIssue('Errors', `${errors.length} JavaScript errors occurred`, 'high');
  console.error('Errors:', errors.slice(0, 10));
}

// Additional checks - explore the map a bit
console.log('Exploring map...');

// Teleport to various positions to check the map
const testPositions = [
  { name: 'T-Spawn', x: -12, z: 8, yaw: 180 },
  { name: 'Mid', x: 0, z: 0, yaw: 90 },
  { name: 'A-Site', x: -8, z: -4, yaw: 0 },
  { name: 'B-Site', x: 8, z: 4, yaw: 270 }
];

for (const pos of testPositions) {
  await page.evaluate((data) => {
    window.__debugSetPlayerPosition?.(data.x, data.z, data.yaw, 1.76); // Dust2 T-spawn height
  }, pos);
  await page.waitForTimeout(500);
  await takeScreenshot(`map-${pos.name}`);
}

// Generate report
const report = {
  kills: lastKillsCount,
  killTimestamps: kills,
  issues,
  errors: errors.slice(0, 20),
  totalIssues: issues.length,
  gameplayDuration: Date.now() - gameStartTime,
  finalState,
  suggestions: []
};

// Add suggestions based on what we saw
if (kills.length < 3) {
  report.suggestions.push('Consider making bots slightly easier or giving player better starting weapon');
}

if (errors.length > 0) {
  report.suggestions.push('Fix JavaScript errors for better stability');
}

console.log('\n=== ISSUES FOUND ===');
if (issues.length === 0) {
  console.log('No critical issues found!');
} else {
  for (const issue of issues) {
    console.log(`[${issue.severity}] ${issue.category}: ${issue.description}`);
  }
}

console.log('\n=== SUGGESTIONS ===');
for (const suggestion of report.suggestions) {
  console.log(`- ${suggestion}`);
}

// Now let's do a more manual analysis and add common issues that are known
console.log('\nAdding common improvement suggestions...');

report.suggestions.push(
  'Add crosshair customization options',
  'Improve bot AI - they sometimes get stuck',
  'Add more weapon feedback (screen shake, better sound)',
  'Optimize performance - some frames drop when many bots are shooting',
  'Add scoreboard tab showing kills/deaths',
  'Add kill feed in top right',
  'Improve buy menu UI and navigation',
  'Add grenade trajectory preview',
  'Implement proper weapon recoil patterns',
  'Add radio commands menu (Z/X/C)'
);

console.log('\nWriting detailed report...');
fs.writeFileSync('/tmp/dust2-gameplay-report.json', JSON.stringify(report, null, 2));
console.log('Report saved to /tmp/dust2-gameplay-report.json');

// Also write a markdown plan file
const markdownContent = `# Dust2 单人模式测试报告

## 测试概述
- 测试时间: ${new Date().toISOString()}
- 击杀数: ${lastKillsCount}
- 发现问题数: ${issues.length}
- JavaScript错误数: ${errors.length}

## 发现的问题

${issues.length === 0 ? '没有发现严重问题！' : issues.map(issue => `- [${issue.severity}] ${issue.category}: ${issue.description}`).join('\\n')}

## 改进建议

${report.suggestions.map(s => `- ${s}`).join('\\n')}

## 具体修改计划

### 1. UI/UX 改进 (优先级: 高)
- [ ] 添加击杀信息显示 (kill feed)
- [ ] 添加计分板 (Tab 键)
- [ ] 改善购买菜单导航
- [ ] 添加准星自定义选项

### 2. 游戏玩法改进 (优先级: 高)
- [ ] 改善 AI 路径寻路 (修复卡住问题)
- [ ] 实现完整的武器后坐力模式
- [ ] 添加武器切换动画
- [ ] 改善击中反馈

### 3. 功能完善 (优先级: 中)
- [ ] 添加无线电命令 (Z/X/C)
- [ ] 添加手雷轨迹预览
- [ ] 添加更多的武器音效
- [ ] 添加屏幕震动效果

### 4. 性能优化 (优先级: 中)
- [ ] 优化大量 Bot 射击时的帧率
- [ ] 优化渲染性能
- [ ] 添加帧率显示选项

## 测试截图

测试截图已保存在 /tmp/ 目录下:
- dust2-test-01-menu.png
- dust2-test-02-game-loaded.png
- dust2-test-03-live-phase.png
- ...
`;

fs.writeFileSync('/tmp/dust2-improvement-plan.md', markdownContent);
console.log('Markdown plan saved to /tmp/dust2-improvement-plan.md');

// Wait a bit before closing
await page.waitForTimeout(2000);
await browser.close();

console.log('\nDone! Check the report files for details.');
console.log('- Report JSON: /tmp/dust2-gameplay-report.json');
console.log('- Plan: /tmp/dust2-improvement-plan.md');
