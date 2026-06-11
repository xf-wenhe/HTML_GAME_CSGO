import { chromium, firefox, webkit } from 'playwright';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { loadDust2SourceResource } from './lib/dust2-source-resource.mjs';

const URL = process.env.DUST2_SCREENSHOT_URL ?? 'http://localhost:5173';
const SCREENSHOTS_DIR = join(import.meta.dirname, 'screenshots');
mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const SOURCE_INDEX = process.argv.indexOf('--source');
const SOURCE_PATH = SOURCE_INDEX >= 0 ? process.argv[SOURCE_INDEX + 1] : undefined;
const BROWSERS = { chromium, firefox, webkit };
const SCREENSHOT_MODE = process.env.DUST2_SCREENSHOT_MODE ?? 'auto';
const SCREENSHOT_EXECUTABLE = process.env.DUST2_SCREENSHOT_EXECUTABLE;

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
});

async function main() {
  if (SOURCE_INDEX >= 0 && !SOURCE_PATH) {
    throw new Error('Missing value for --source.');
  }

  const { resource, summary: verification } = loadDust2SourceResource({ sourcePath: SOURCE_PATH });
  const locations = createSourceBackedLocations(resource);

  console.log(JSON.stringify({
    sourcePath: verification.sourcePath,
    vertexCount: verification.vertexCount,
    triangleCount: verification.triangleCount,
    entityCount: verification.entityCount,
    screenshotCount: locations.length,
  }, null, 2));

  if (SCREENSHOT_MODE === 'software') {
    runSoftwareRenderer();
    return;
  }

  let browser;
  try {
    const browserName = process.env.DUST2_SCREENSHOT_BROWSER ?? 'chromium';
    const browserType = BROWSERS[browserName] ?? chromium;
    browser = await browserType.launch({
      headless: process.env.DUST2_SCREENSHOT_HEADLESS !== '0',
      ...(SCREENSHOT_EXECUTABLE ? { executablePath: SCREENSHOT_EXECUTABLE } : {}),
      ...(browserName === 'chromium'
        ? { args: ['--no-sandbox', '--disable-dev-shm-usage'] }
        : {}),
    });
  } catch (error) {
    if (SCREENSHOT_MODE === 'browser') {
      throw error;
    }
    console.error(`Browser screenshot failed; falling back to source-backed software renderer: ${error instanceof Error ? error.message : String(error)}`);
    runSoftwareRenderer();
    return;
  }
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
    await page.evaluate(({ x, z, yaw, pitch, eye }) => {
      if (window.__debugSetPlayerPosition) {
        window.__debugSetPlayerPosition(x, z, yaw, eye);
      }
      if (window.__debugSetCameraPoseForScreenshot) {
        window.__debugSetCameraPoseForScreenshot(x, eye, z, yaw, pitch);
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

function runSoftwareRenderer() {
  const args = ['scripts/render-dust2-source.mjs'];
  if (SOURCE_PATH) {
    args.push('--source', SOURCE_PATH);
  }
  const result = spawnSync('node', args, {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.status !== 0) {
    throw new Error(`Dust2 software renderer failed with exit code ${result.status}.`);
  }
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

  const classicLocations = [
    lookAt('source-01-t-spawn', tSpawn, h(0, 2048)),
    lookAt('source-02-outside-long-long-doors', p(-12.5, 2.6, 2.8), p(-17.18, -9.39, 1.7)),
    lookAt('source-03-long-doors', p(-17.18, -9.39, 2.6), p(-19.4, -18.5, 1.0)),
    lookAt('source-04-a-long-pit-long-corner', p(-19.4, -18.5, 2.6), p(-16.4, -23.8, 1.0)),
    lookAt('source-05-a-cross-a-ramp', p(-16.4, -23.8, 2.8), p(-13.8, -25.2, 1.0)),
    lookAt('source-06-a-site-goose-short-exit', p(-15.36, -26.88, 2.8), p(-9.6, -15.1, 1.0)),
    lookAt('source-07-short-catwalk-to-a', p(-9.493, -14.613, 2.5), p(-15.36, -26.88, 1.0)),
    lookAt('source-08-top-mid-suicide-mid-doors', p(-5.8, 3.8, 2.8), p(-3.2, -11.8, 1.2)),
    lookAt('source-09-mid-doors-ct-mid', p(-3.2, -11.8, 2.6), p(2.56, -22.4, 1.4)),
    lookAt('source-10-xbox-catwalk-short', p(-7.5, -8.8, 2.8), p(-9.493, -14.613, 1.0)),
    lookAt('source-11-lower-tunnels', p(5.867, -4.587, 3.0), p(13.013, -1.707, -1.0)),
    lookAt('source-12-upper-tunnels-b-exit', p(13.013, -1.707, 2.5), p(11.2, -23.68, 1.6)),
    lookAt('source-13-b-site-default-back-plat', p(11.52, -24.64, 2.8), p(12.4, -25.4, 1.6)),
    lookAt('source-14-b-doors-b-window', p(7.467, -21.547, 2.7), p(11.84, -24.427, 1.8)),
    lookAt('source-15-ct-spawn-ct-mid', p(2.56, -22.4, 1.9), p(-3.2, -11.8, 1.7)),
  ];

  return classicLocations.map(location => assertWithinWorldBounds(location, worldBounds));
}

function cameraAt(name, from, to) {
  return {
    name,
    x: from.x,
    z: from.z,
    yaw: yawToward(from, to),
    pitch: pitchToward(from, to),
    eye: Math.max(2.5, from.y + 1.8),
  };
}

function h(x, z, y = 64) {
  return { x: x * 0.01, y: y * 0.01, z: -z * 0.01 };
}

function p(x, z, y = 1.7) {
  return { x, y, z };
}

function lookAt(name, from, to) {
  return {
    name,
    x: from.x,
    z: from.z,
    yaw: yawToward(from, to),
    pitch: pitchToward(from, to),
    eye: from.y,
  };
}

function yawToward(from, to) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  return Math.atan2(-dx, -dz);
}

function pitchToward(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const horizontalDistance = Math.hypot(dx, dz);
  return Math.atan2(-dy, horizontalDistance);
}

function assertWithinWorldBounds(location, worldBounds) {
  const minX = Math.min(worldBounds.mins.x, worldBounds.maxs.x);
  const maxX = Math.max(worldBounds.mins.x, worldBounds.maxs.x);
  const minZ = Math.min(worldBounds.mins.z, worldBounds.maxs.z);
  const maxZ = Math.max(worldBounds.mins.z, worldBounds.maxs.z);
  if (location.x < minX || location.x > maxX || location.z < minZ || location.z > maxZ) {
    throw new Error(`Dust2 screenshot location ${location.name} is outside imported world bounds.`);
  }
  return location;
}
