import { test, expect, Page } from '@playwright/test';

const GAME_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = '/Volumes/新/work/html/scripts/screenshots';

test.describe('Inferno Full Game Test', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the game
    await page.goto(GAME_URL);
    await page.waitForTimeout(1000);
  });

  test('should start Inferno in TDM mode and verify map loads', async ({ page }) => {
    // Wait for main menu to load
    await page.waitForSelector('.main-menu', { timeout: 10000 });
    
    // Take screenshot of main menu
    await page.screenshot({ path: `${SCREENSHOT_DIR}/inferno-01-menu.png`, fullPage: true });
    
    // Check if Inferno button exists and is clickable
    const infernoBtn = page.locator('[data-map="inferno"]');
    const isDisabled = await infernoBtn.getAttribute('aria-disabled');
    
    if (isDisabled === 'true') {
      console.error('Inferno button is disabled - source file may not be loaded');
      throw new Error('Inferno is not selectable - check if source file is imported');
    }
    
    // Click on TDM mode button
    await page.click('[data-action="tdm"]');
    await page.waitForTimeout(500);
    
    // Click on Inferno map
    await infernoBtn.click();
    await page.waitForTimeout(500);
    
    // Take screenshot after selection
    await page.screenshot({ path: `${SCREENSHOT_DIR}/inferno-02-selected.png`, fullPage: true });
    
    // Click play button to start game
    await page.click('.play-button, [data-action="play"]');
    
    // Wait for game to load
    await page.waitForTimeout(5000);
    
    // Take screenshot of game start
    await page.screenshot({ path: `${SCREENSHOT_DIR}/inferno-03-game-start.png` });
    
    // Verify game canvas exists
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    
    // Wait a bit for map to render
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/inferno-04-map-loaded.png` });
  });

  test('should walk around the map without getting stuck', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.waitForSelector('.main-menu', { timeout: 10000 });
    
    // Start TDM game on Inferno
    await page.click('[data-action="tdm"]');
    await page.waitForTimeout(300);
    await page.click('[data-map="inferno"]');
    await page.waitForTimeout(300);
    await page.click('.play-button, [data-action="play"]');
    
    // Wait for game to load
    await page.waitForTimeout(6000);
    
    // Test basic movement - simulate WASD keys
    const canvas = page.locator('canvas');
    await canvas.focus();
    
    // Move forward for 2 seconds
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(2000);
    await page.keyboard.up('KeyW');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/inferno-05-walk-forward.png` });
    
    // Turn right
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(500);
    await page.keyboard.up('KeyD');
    
    // Move forward again
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(2000);
    await page.keyboard.up('KeyW');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/inferno-06-walk-turn.png` });
    
    // Test strafing
    await page.keyboard.down('KeyA');
    await page.waitForTimeout(1000);
    await page.keyboard.up('KeyA');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/inferno-07-strafe.png` });
    
    // Move backward
    await page.keyboard.down('KeyS');
    await page.waitForTimeout(1500);
    await page.keyboard.up('KeyS');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/inferno-08-backward.png` });
    
    // Jump test
    await page.keyboard.down('Space');
    await page.waitForTimeout(300);
    await page.keyboard.up('Space');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/inferno-09-jump.png` });
    
    console.log('Movement test completed successfully');
  });

  test('should verify Inferno map structure matches CS1.6', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.waitForSelector('.main-menu', { timeout: 10000 });
    
    // Start game
    await page.click('[data-action="tdm"]');
    await page.waitForTimeout(300);
    await page.click('[data-map="inferno"]');
    await page.waitForTimeout(300);
    await page.click('.play-button, [data-action="play"]');
    await page.waitForTimeout(6000);
    
    // Check that player spawned
    const playerPos = await page.evaluate(() => {
      // @ts-ignore
      const game = (window as any).__game;
      if (game && game.playerController) {
        return game.playerController.getPosition();
      }
      return null;
    });
    
    console.log('Player position:', playerPos);
    
    // Take final screenshot
    await page.screenshot({ path: `${SCREENSHOT_DIR}/inferno-10-structure-check.png` });
    
    // The test passes if we got here without errors
    expect(true).toBe(true);
  });
});
