import { test } from '@playwright/test';

test('real user scenario test', async ({ page }) => {
  page.on('console', msg => {
    if (msg.text().includes('Debug') || msg.text().includes('状态变化') || msg.text().includes('roomJoined') || msg.text().includes('Global Click')) {
      console.log('[Browser Console]', msg.text());
    }
  });

  await page.goto('http://localhost:5173?test=true');
  await page.waitForTimeout(1000);

  console.log('\n===== TEST 1: TDM Mode Movement =====');
  // Click TDM
  const tdmBtn = page.locator('button').filter({ hasText: '团队死斗' }).first();
  await tdmBtn.click();
  console.log('[Test] Clicked TDM button');
  await page.waitForTimeout(3000);

  // Check if game started
  const stateAfterTDM = await page.evaluate(() => {
    return {
      inputMode: window.__debugInputState?.()?.mode,
      pointerLocked: window.__debugInputState?.()?.pointerLocked,
      hasPointerLock: !!document.pointerLockElement,
      debugPointerLockBypass: (window as any).debugPointerLockBypass
    };
  });
  console.log('[Test] State after TDM:', JSON.stringify(stateAfterTDM, null, 2));

  // Try WASD movement
  await page.keyboard.press('w');
  await page.waitForTimeout(100);
  await page.keyboard.press('a');
  await page.waitForTimeout(100);

  const afterMovement = await page.evaluate(() => {
    const pos = window.__debugPlayerPosition?.();
    return {
      playerPos: pos ? { x: pos.x.toFixed(2), z: pos.z.toFixed(2) } : null,
      horizontalSpeed: window.__debugInputState?.()?.horizontalSpeed?.toFixed(2)
    };
  });
  console.log('[Test] After WASD:', JSON.stringify(afterMovement, null, 2));

  console.log('\n===== TEST 2: ESC Exit and Menu Freeze =====');
  // Press ESC
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);

  const afterESC = await page.evaluate(() => {
    const menu = document.querySelector('.main-menu');
    const pausePanel = document.querySelector('.pause-panel');
    const confirmDialog = document.querySelector('.confirm-dialog');
    return {
      inputMode: window.__debugInputState?.()?.mode,
      menuClass: menu?.className,
      menuVisible: menu ? !menu.classList.contains('hidden') : false,
      pausePanelVisible: pausePanel ? !pausePanel.classList.contains('hidden') : false,
      confirmDialogVisible: confirmDialog ? !confirmDialog.classList.contains('hidden') : false
    };
  });
  console.log('[Test] After ESC:', JSON.stringify(afterESC, null, 2));

  // If pause panel is visible, click leave button
  if (afterESC.pausePanelVisible) {
    console.log('[Test] Pause panel visible, clicking leave button...');
    await page.click('.leave-button');
    await page.waitForTimeout(500);
    
    const afterLeaveClick = await page.evaluate(() => {
      const confirmDialog = document.querySelector('.confirm-dialog');
      return {
        confirmDialogVisible: confirmDialog ? !confirmDialog.classList.contains('hidden') : false
      };
    });
    console.log('[Test] After leave button click:', JSON.stringify(afterLeaveClick, null, 2));

    if (afterLeaveClick.confirmDialogVisible) {
      console.log('[Test] PROBLEM: Confirm dialog still showing!');
      // Click confirm to exit
      await page.click('.confirm-dialog-yes');
      await page.waitForTimeout(500);
    }
  }

  // Final check - can we click menu buttons?
  const finalState = await page.evaluate(() => {
    const menu = document.querySelector('.main-menu');
    return {
      menuVisible: menu ? !menu.classList.contains('hidden') : false,
      inputMode: window.__debugInputState?.()?.mode
    };
  });
  console.log('[Test] Final state:', JSON.stringify(finalState, null, 2));

  if (finalState.menuVisible) {
    console.log('[Test] Trying to click solo button...');
    try {
      await page.click('button').filter({ hasText: '单人任务' }).first();
      console.log('[Test] Menu button clicked OK!');
    } catch (e) {
      console.error('[Test] Menu button click FAILED:', e.message);
    }
  }
});
