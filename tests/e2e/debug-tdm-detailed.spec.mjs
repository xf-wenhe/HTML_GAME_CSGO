import { test } from '@playwright/test';

test('debug TDM movement and menu freeze', async ({ page }) => {
  // Collect console logs
  const logs = [];
  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
    console.log(`[Browser Console] ${msg.text()}`);
  });

  await page.goto('http://localhost:5173');
  await page.waitForTimeout(1000);

  console.log('\n=== Step 1: Initial state ===');
  const initialState = await page.evaluate(() => {
    return {
      inputMode: window.__debugInputState ? window.__debugInputState().mode : null,
      pointerLocked: window.__debugInputState ? window.__debugInputState().pointerLocked : null,
      gameRunning: window.__debugInputState ? window.__debugInputState().gameRunning : null
    };
  });
  console.log('Initial state:', JSON.stringify(initialState, null, 2));

  // Take screenshot
  await page.screenshot({ path: 'tests/screenshots/debug-step1-initial.png' });

  console.log('\n=== Step 2: Click TDM button ===');
  const tdmButton = page.getByRole('button', { name: /团队死斗/ }).first();
  await tdmButton.click();
  console.log('Clicked TDM button');
  await page.waitForTimeout(3000);

  const afterTDMClick = await page.evaluate(() => {
    return {
      inputMode: window.__debugInputState ? window.__debugInputState().mode : null,
      pointerLocked: window.__debugInputState ? window.__debugInputState().pointerLocked : null,
      pointerLockElement: document.pointerLockElement ? document.pointerLockElement.tagName : null,
      hasPointerLock: !!document.pointerLockElement
    };
  });
  console.log('After TDM click:', JSON.stringify(afterTDMClick, null, 2));
  await page.screenshot({ path: 'tests/screenshots/debug-step2-after-tdm.png' });

  console.log('\n=== Step 3: Click canvas to lock pointer ===');
  const canvas = page.locator('canvas').first();
  await canvas.click({ position: { x: 400, y: 300 } });
  await page.waitForTimeout(1000);

  const afterCanvasClick = await page.evaluate(() => {
    return {
      inputMode: window.__debugInputState ? window.__debugInputState().mode : null,
      pointerLocked: window.__debugInputState ? window.__debugInputState().pointerLocked : null,
      pointerLockElement: document.pointerLockElement ? document.pointerLockElement.tagName : null,
      hasPointerLock: !!document.pointerLockElement
    };
  });
  console.log('After canvas click:', JSON.stringify(afterCanvasClick, null, 2));
  await page.screenshot({ path: 'tests/screenshots/debug-step3-after-canvas.png' });

  console.log('\n=== Step 4: Try mouse movement ===');
  await page.mouse.move(400, 300);
  await page.mouse.move(500, 300);
  await page.waitForTimeout(100);

  const afterMouseMove = await page.evaluate(() => {
    return {
      inputMode: window.__debugInputState ? window.__debugInputState().mode : null,
      pointerLocked: window.__debugInputState ? window.__debugInputState().pointerLocked : null,
      keys: window.__debugInputState ? window.__debugInputState().keys : []
    };
  });
  console.log('After mouse move:', JSON.stringify(afterMouseMove, null, 2));

  console.log('\n=== Step 5: Press Escape to exit ===');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);

  const afterEscape = await page.evaluate(() => {
    const menu = document.querySelector('.main-menu');
    const hud = document.querySelector('.hud');
    return {
      inputMode: window.__debugInputState ? window.__debugInputState().mode : null,
      pointerLocked: window.__debugInputState ? window.__debugInputState().pointerLocked : null,
      gameRunning: window.__debugInputState ? window.__debugInputState().gameRunning : null,
      menuVisible: menu ? window.getComputedStyle(menu).visibility : null,
      menuPointerEvents: menu ? window.getComputedStyle(menu).pointerEvents : null,
      menuZIndex: menu ? window.getComputedStyle(menu).zIndex : null,
      hudVisible: hud ? window.getComputedStyle(hud).visibility : null,
      hudPointerEvents: hud ? window.getComputedStyle(hud).pointerEvents : null
    };
  });
  console.log('After Escape:', JSON.stringify(afterEscape, null, 2));
  await page.screenshot({ path: 'tests/screenshots/debug-step4-after-escape.png' });

  console.log('\n=== Step 6: Check menu interactivity ===');
  const soloButton = page.getByRole('button', { name: '单人任务' });
  const isVisible = await soloButton.isVisible();
  const isEnabled = await soloButton.isEnabled();
  console.log('Solo button visible:', isVisible, 'enabled:', isEnabled);

  console.log('\n=== Step 7: Try clicking solo button ===');
  try {
    await soloButton.click({ timeout: 5000 });
    console.log('Solo button clicked successfully');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'tests/screenshots/debug-step5-after-solo-click.png' });
  } catch (error) {
    console.error('Failed to click solo button:', error.message);
    await page.screenshot({ path: 'tests/screenshots/debug-step5-failed-click.png' });
  }

  console.log('\n=== All browser console logs ===');
  logs.forEach(log => console.log(log));
});
