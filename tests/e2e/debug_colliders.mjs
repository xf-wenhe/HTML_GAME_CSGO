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
  await page.waitForTimeout(5000);
  
  // Check colliders
  const result = await page.evaluate(() => {
    const colliders = window.scene?.getArenaColliders();
    const meshes = window.scene?.getArenaMeshes();
    
    console.log('Colliders:', colliders?.length);
    console.log('Meshes:', meshes?.length);
    
    if (colliders?.length) {
      console.log('First collider:', colliders[0]);
    }
    
    // Check if we're in a module scope issue
    console.log('physics exists:', !!window.physics);
    console.log('physics.addStaticBox:', typeof window.physics?.addStaticBox);
    
    // Try adding a simple box
    if (window.physics) {
      const testBody = window.physics.addStaticBox(
        new (window.CANNON || window.physics.CANNON).Vec3(0, 0, 0),
        new (window.CANNON || window.physics.CANNON).Vec3(10, 0.5, 10),
        0,
        'test-ground'
      );
      console.log('Test body added:', testBody?.id);
      console.log('Bodies after test:', window.physics.world?.bodies?.length);
    }
    
    return {
      colliderCount: colliders?.length,
      meshCount: meshes?.length,
      physicsExists: !!window.physics,
      bodiesBefore: window.physics?.world?.bodies?.length || 0
    };
  });
  
  console.log('Result:', JSON.stringify(result, null, 2));
  
  await browser.close();
}

main().catch(console.error);
