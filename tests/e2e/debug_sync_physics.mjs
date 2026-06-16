import { chromium } from 'playwright';

const TEST_URL = 'http://localhost:5173/';

async function main() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  // Capture console logs
  const logs = [];
  page.on('console', msg => {
    logs.push(msg.text());
    if (msg.text().includes('syncArenaPhysics') || msg.text().includes('body')) {
      console.log('LOG:', msg.text());
    }
  });
  
  console.log('Loading game...');
  await page.goto(TEST_URL, { waitUntil: 'domcontentloaded' });
  
  await page.waitForSelector('[data-action="solo"]', { timeout: 15000 });
  await page.click('[data-map="dust2"]');
  await page.waitForTimeout(500);
  
  console.log('Starting solo mode...');
  await page.click('[data-action="solo"]');
  await page.waitForTimeout(3000);
  
  // Check arena state
  const arena = await page.evaluate(() => {
    const scene = window.scene;
    if (!scene) return { error: 'no scene' };
    
    const colliders = scene.getArenaColliders();
    const meshes = scene.getArenaMeshes();
    
    return {
      colliderCount: colliders?.length || 0,
      meshCount: meshes?.length || 0,
      firstCollider: colliders?.[0],
      worldBodies: window.physics?.world?.bodies?.length || 0
    };
  });
  
  console.log('Arena state:', JSON.stringify(arena, null, 2));
  
  // Call syncArenaPhysics manually and check
  await page.evaluate(() => {
    console.log('Calling syncArenaPhysics manually...');
    window.syncArenaPhysics();
    console.log('After sync, bodies:', window.physics?.world?.bodies?.length);
  });
  
  await page.waitForTimeout(1000);
  
  const afterSync = await page.evaluate(() => ({
    worldBodies: window.physics?.world?.bodies?.length || 0,
    firstBody: window.physics?.world?.bodies?.[0]?.position
  }));
  console.log('After manual sync:', JSON.stringify(afterSync, null, 2));
  
  await browser.close();
}

main().catch(console.error);
