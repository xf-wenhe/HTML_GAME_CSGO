import { test, expect } from '@playwright/test';

test('quick TDM test', async ({ page, context }) => {
  const logs = [];
  page.on('console', msg => {
    if (msg.text().includes('Debug') || msg.text().includes('状态变化') || msg.text().includes('roomJoined')) {
      logs.push(msg.text());
      console.log('[Browser]', msg.text());
    }
  });

  await page.goto('http://localhost:5173');
  await page.waitForTimeout(500);

  // Start monitoring
  await page.evaluate(() => {
    let lastState = {};
    window.__monitor = setInterval(() => {
      const s = window.__debugInputState?.() || {};
      const currentState = { mode: s.mode, locked: s.pointerLocked, running: s.gameRunning };
      if (JSON.stringify(currentState) !== JSON.stringify(lastState)) {
        console.log('[状态变化]', JSON.stringify(currentState));
        lastState = currentState;
      }
    }, 100);
  });

  // Click TDM
  await page.click('button:has-text("团队死斗")');
  console.log('Clicked TDM, waiting...');
  await page.waitForTimeout(3000);

  // Check state
  const state1 = await page.evaluate(() => {
    const s = window.__debugInputState?.() || {};
    return { mode: s.mode, locked: s.pointerLocked, running: s.gameRunning, hasPointerLock: !!document.pointerLockElement };
  });
  console.log('After TDM click:', JSON.stringify(state1));

  // Try to click canvas
  await page.locator('canvas').click();
  await page.waitForTimeout(1000);

  const state2 = await page.evaluate(() => {
    const s = window.__debugInputState?.() || {};
    return { mode: s.mode, locked: s.pointerLocked, running: s.gameRunning, hasPointerLock: !!document.pointerLockElement };
  });
  console.log('After canvas click:', JSON.stringify(state2));

  // Press ESC
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  const state3 = await page.evaluate(() => {
    const s = window.__debugInputState?.() || {};
    return { mode: s.mode, locked: s.pointerLocked, running: s.gameRunning, hasPointerLock: !!document.pointerLockElement };
  });
  console.log('After ESC:', JSON.stringify(state3));

  // Try click menu button
  try {
    await page.click('button:has-text("单人任务")', { timeout: 2000 });
    console.log('Menu button clicked OK');
  } catch (e) {
    console.error('Menu button click FAILED:', e.message);
  }

  console.log('\n=== Logs ===');
  logs.forEach(l => console.log(l));
});
