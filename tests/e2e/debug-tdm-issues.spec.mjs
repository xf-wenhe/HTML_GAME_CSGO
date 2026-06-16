import { test } from '@playwright/test';

test('debug deathmatch mode issues', async ({ page }) => {
  await page.goto('http://localhost:5176');

  // Wait for page load
  await page.waitForTimeout(1000);

  // Take screenshot of initial menu
  await page.screenshot({ path: 'tests/screenshots/debug-1-initial-menu.png' });

  // Click multiplayer (TDM) button
  const tdmButton = page.locator('button:has-text("团队死斗")');
  if (await tdmButton.isVisible()) {
    await tdmButton.click();
    console.log('Clicked TDM button');
  } else {
    // Try clicking the multiplayer button first
    await page.click('button:has-text("多人联机")');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/screenshots/debug-2-multiplayer-menu.png' });

    // Then select TDM mode
    const tdmModeBtn = page.locator('button:has-text("团队死斗")');
    if (await tdmModeBtn.isVisible()) {
      await tdmModeBtn.click();
      console.log('Clicked TDM mode button');
    }
  }

  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/screenshots/debug-3-after-tdm-click.png' });

  // Try to click canvas to request pointer lock
  const canvas = page.locator('canvas').first();
  await canvas.click({ position: { x: 400, y: 300 } });
  console.log('Clicked canvas');
  await page.waitForTimeout(1000);

  // Check if pointer lock was acquired
  const pointerLockState = await page.evaluate(() => {
    return {
      pointerLockElement: document.pointerLockElement ? document.pointerLockElement.tagName : null,
      inputMode: window.__debugInputState ? window.__debugInputState().mode : null,
      pointerLocked: window.__debugInputState ? window.__debugInputState().pointerLocked : null,
    };
  });
  console.log('Pointer lock state:', JSON.stringify(pointerLockState, null, 2));

  await page.screenshot({ path: 'tests/screenshots/debug-4-game-start.png' });

  // Try pressing Escape to exit
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tests/screenshots/debug-5-after-escape.png' });

  // Check if menu is visible and clickable
  const menuVisible = await page.locator('.main-menu').isVisible();
  console.log('Main menu visible:', menuVisible);

  // Try clicking buttons in menu
  if (menuVisible) {
    const buttons = await page.locator('.main-menu button').all();
    console.log('Found buttons:', buttons.length);

    // Try clicking solo button
    const soloBtn = page.locator('button:has-text("单人任务")');
    if (await soloBtn.isVisible()) {
      const canClick = await soloBtn.isEnabled();
      console.log('Solo button enabled:', canClick);

      await soloBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'tests/screenshots/debug-6-after-solo-click.png' });
      console.log('Clicked solo button successfully');
    }
  }
});
