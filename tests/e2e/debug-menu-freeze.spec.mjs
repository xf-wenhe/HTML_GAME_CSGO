import { test } from '@playwright/test';

test('debug menu freeze issue', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(500);

  // Start solo game first
  await page.click('button:has-text("单人任务")');
  await page.waitForTimeout(2000);

  console.log('Game started, pressing ESC...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // Check UI state
  const uiState = await page.evaluate(() => {
    const menu = document.querySelector('.main-menu');
    const hud = document.querySelector('.hud');
    const pauseOverlay = document.querySelector('.pause-overlay');
    const pointerLockGuide = document.querySelector('.pointer-lock-guide');
    const buyMenu = document.querySelector('.buy-menu');
    const scoreboard = document.querySelector('.scoreboard');
    
    return {
      menuVisibility: menu ? window.getComputedStyle(menu).visibility : null,
      menuPointerEvents: menu ? window.getComputedStyle(menu).pointerEvents : null,
      menuZIndex: menu ? window.getComputedStyle(menu).zIndex : null,
      menuClassList: menu ? menu.className : null,
      hudVisibility: hud ? window.getComputedStyle(hud).visibility : null,
      hudPointerEvents: hud ? window.getComputedStyle(hud).pointerEvents : null,
      pauseOverlayExists: !!pauseOverlay,
      pauseOverlayVisibility: pauseOverlay ? window.getComputedStyle(pauseOverlay).visibility : null,
      pointerLockGuideExists: !!pointerLockGuide,
      buyMenuExists: !!buyMenu,
      scoreboardExists: !!scoreboard
    };
  });
  
  console.log('UI State after ESC:', JSON.stringify(uiState, null, 2));

  // Check what element is on top at button position
  const buttonInfo = await page.evaluate(() => {
    const btn = document.querySelector('button:has-text("单人任务")') || 
                Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('单人'));
    if (!btn) return { found: false };
    
    const rect = btn.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const topElement = document.elementFromPoint(centerX, centerY);
    
    return {
      found: true,
      buttonText: btn.textContent,
      btnVisibility: window.getComputedStyle(btn).visibility,
      btnPointerEvents: window.getComputedStyle(btn).pointerEvents,
      btnRect: { x: rect.left, y: rect.top, w: rect.width, h: rect.height },
      topElement: topElement ? {
        tag: topElement.tagName,
        className: topElement.className,
        zIndex: window.getComputedStyle(topElement).zIndex,
        pointerEvents: window.getComputedStyle(topElement).pointerEvents
      } : null
    };
  });
  
  console.log('Button info:', JSON.stringify(buttonInfo, null, 2));

  // Try to click
  console.log('\nTrying to click solo button...');
  try {
    await page.click('button:has-text("单人任务")', { timeout: 3000 });
    console.log('Click succeeded');
  } catch (e) {
    console.error('Click failed:', e.message);
  }
});
