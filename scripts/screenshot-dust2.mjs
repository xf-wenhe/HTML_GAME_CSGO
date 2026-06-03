import { chromium } from 'playwright';
import { join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import {
  readDust2GeneratedMeshResource,
  verifyDust2GeneratedMeshResource,
} from './lib/dust2-generated-verify.mjs';

const URL = 'http://localhost:5173';
const SCREENSHOTS_DIR = join(import.meta.dirname, 'screenshots');
mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const GENERATED_RESOURCE_PATH = 'client/src/game/generated/dust2-world-mesh.ts';

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
});

async function main() {
  const resource = readDust2GeneratedMeshResource(GENERATED_RESOURCE_PATH);
  const verification = verifyDust2GeneratedMeshResource(resource);
  const locations = createSourceBackedLocations(resource);

  console.log(JSON.stringify({
    sourcePath: verification.sourcePath,
    vertexCount: verification.vertexCount,
    triangleCount: verification.triangleCount,
    entityCount: verification.entityCount,
    screenshotCount: locations.length,
  }, null, 2));

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const context = await browser.newContext({ viewport: { width: 960, height: 640 } });
  const page = await context.newPage();

  console.log('Navigating...');
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });

  console.log('Starting solo mode...');
  await page.locator('button[data-action="solo"]').click();
  await page.waitForTimeout(5000);

  console.log('Bypassing pointer lock...');
  await page.evaluate(() => {
    if (window.__debugAllowPointerLockBypassForTests) {
      window.__debugAllowPointerLockBypassForTests();
    }
    const lockPanel = document.querySelector('.lock-panel');
    if (lockPanel) lockPanel.remove();
  });
  await page.waitForTimeout(500);

  for (const loc of locations) {
    console.log(`${loc.name}: (${loc.x}, ${loc.z})`);
    await page.evaluate(({ x, z, yaw, eye }) => {
      if (window.__debugSetPlayerPosition) {
        window.__debugSetPlayerPosition(x, z, yaw, eye);
      }
    }, loc);

    await page.waitForTimeout(1500);

    const dataUrl = await page.evaluate(() => {
      if (window.__debugTakeScreenshot) {
        return window.__debugTakeScreenshot();
      }
      return null;
    });

    if (dataUrl) {
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
      const path = join(SCREENSHOTS_DIR, `dust2-${loc.name}.png`);
      writeFileSync(path, Buffer.from(base64, 'base64'));
      console.log(`  -> saved ${path}`);
    } else {
      console.log(`  -> FAILED`);
    }
  }

  await browser.close();
  console.log('Done!');
}

function createSourceBackedLocations(resource) {
  const worldBounds = resource.source.manifest.geometry.worldModel?.gameBounds;
  if (!worldBounds) {
    throw new Error('Dust2 generated mesh manifest is missing source world bounds for screenshot placement.');
  }

  const spawns = resource.source.manifest.entities.playerSpawns;
  const tSpawn = spawns.find(spawn => spawn.team === 't' && spawn.gamePosition)?.gamePosition;
  const ctSpawn = spawns.find(spawn => spawn.team === 'ct' && spawn.gamePosition)?.gamePosition;
  if (!tSpawn || !ctSpawn) {
    throw new Error('Dust2 generated mesh manifest is missing source-backed T/CT spawn positions.');
  }

  const minX = Math.min(worldBounds.mins.x, worldBounds.maxs.x);
  const maxX = Math.max(worldBounds.mins.x, worldBounds.maxs.x);
  const minZ = Math.min(worldBounds.mins.z, worldBounds.maxs.z);
  const maxZ = Math.max(worldBounds.mins.z, worldBounds.maxs.z);
  const midX = (minX + maxX) / 2;
  const midZ = (minZ + maxZ) / 2;
  const width = maxX - minX;
  const depth = maxZ - minZ;

  return [
    cameraAt('source-t-spawn', tSpawn, ctSpawn),
    cameraAt('source-ct-spawn', ctSpawn, tSpawn),
    { name: 'source-world-overview-south', x: midX, z: maxZ - depth * 0.12, yaw: Math.PI, eye: 24 },
    { name: 'source-world-overview-north', x: midX, z: minZ + depth * 0.12, yaw: 0, eye: 24 },
    { name: 'source-world-west-lane', x: minX + width * 0.18, z: midZ, yaw: -Math.PI / 2, eye: 8 },
    { name: 'source-world-mid', x: midX, z: midZ, yaw: 0, eye: 8 },
    { name: 'source-world-east-lane', x: maxX - width * 0.18, z: midZ, yaw: Math.PI / 2, eye: 8 },
  ];
}

function cameraAt(name, from, to) {
  return {
    name,
    x: from.x,
    z: from.z,
    yaw: Math.atan2(to.x - from.x, to.z - from.z),
    eye: Math.max(2.5, from.y + 1.8),
  };
}
