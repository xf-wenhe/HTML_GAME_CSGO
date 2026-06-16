import { chromium } from 'playwright';

const TEST_URL = 'http://localhost:5173/';

async function main() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  console.log('Loading game...');
  await page.goto(TEST_URL, { waitUntil: 'domcontentloaded' });
  
  await page.waitForSelector('[data-action="solo"]', { timeout: 15000 });
  await page.click('[data-map="dust2"]');
  await page.waitForTimeout(500);
  await page.click('[data-action="solo"]');
  await page.waitForTimeout(8000);
  
  await page.evaluate(() => {
    window.__debugAllowPointerLockBypassForTests?.();
  });
  
  // Check physics state
  const physicsInfo = await page.evaluate(() => {
    const state = window.__debugInputState?.();
    const pos = window.__debugPlayerPosition?.();
    
    // Check physics body
    const bodies = window.physics?.world?.bodies?.length || 0;
    const groundEnabled = window.physics?.world?.gravity?.y;
    
    // Get player body position
    let bodyY = null;
    let bodyVelocityY = null;
    if (window.player) {
      const controller = window.player;
      if (controller.body) {
        bodyY = controller.body.position.y;
        bodyVelocityY = controller.body.velocity.y;
      }
    }
    
    // Check raycast for ground
    return {
      playerPos: pos,
      playerGrounded: state?.grounded,
      playerAirborne: state?.airborneTime,
      bodies,
      gravityY: groundEnabled,
      bodyY,
      bodyVelocityY
    };
  });
  
  console.log('Physics info:');
  console.log(JSON.stringify(physicsInfo, null, 2));
  
  await browser.close();
}

main().catch(console.error);
