import { chromium } from 'playwright';

const TEST_URL = 'http://localhost:5173/';

async function main() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  // Capture console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log('Console error:', msg.text());
    }
  });
  
  console.log('Loading game...');
  await page.goto(TEST_URL, { waitUntil: 'domcontentloaded' });
  
  // Wait for menu
  await page.waitForSelector('[data-action="solo"]', { timeout: 15000 });
  
  // Select dust2
  await page.click('[data-map="dust2"]');
  await page.waitForTimeout(500);
  
  // Start solo mode
  console.log('Starting solo mode...');
  await page.click('[data-action="solo"]');
  
  // Wait for game to load
  await page.waitForTimeout(3000);
  
  // Unlock mouse
  await page.evaluate(() => {
    window.__debugAllowPointerLockBypassForTests?.();
  });
  
  // Check dt and update calls
  await page.evaluate(() => {
    window.__debugDt = [];
    const originalUpdate = window.updateSoloBotMatch;
    window.updateSoloBotMatch = function(dt) {
      window.__debugDt.push(dt);
      if (window.__debugDt.length > 10) window.__debugDt.shift();
      return originalUpdate.apply(this, arguments);
    };
  });
  
  console.log('Waiting and checking...');
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(1000);
    const state = await page.evaluate(() => ({
      phase: window.__debugInputState?.().cs16BotMatch?.phase,
      freeze: window.__debugInputState?.().cs16BotMatch?.freezeRemaining,
      dtValues: window.__debugDt,
      gameRunning: window.gameRunning
    }));
    console.log(`${i+1}s: phase=${state.phase}, freeze=${state.freeze}, gameRunning=${state.gameRunning}, dtSamples=${state.dtValues?.length}`);
  }
  
  console.log('\nErrors:', errors);
  await browser.close();
}

main().catch(console.error);
