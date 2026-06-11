import { chromium, firefox, webkit } from 'playwright';
import { join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { readInfernoGeneratedMeshResource, verifyInfernoGeneratedMeshResource } from './lib/inferno-generated-verify.mjs';

const URL = process.env.INFERNO_SCREENSHOT_URL ?? 'http://localhost:5173';
const SCREENSHOTS_DIR = join(import.meta.dirname, 'screenshots');
const GENERATED_RESOURCE_PATH = process.env.INFERNO_GENERATED_MODULE ?? 'client/src/game/generated/inferno-world-mesh.ts';
const BROWSERS = { chromium, firefox, webkit };
const BROWSER_NAME = process.env.INFERNO_SCREENSHOT_BROWSER ?? 'chromium';

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
});

async function main() {
  const resource = readInfernoGeneratedMeshResource(GENERATED_RESOURCE_PATH);
  const verification = verifyInfernoGeneratedMeshResource(resource);
  const locations = createInfernoLocations(resource);
  console.log(JSON.stringify({
    sourcePath: verification.sourcePath,
    vertexCount: verification.vertexCount,
    triangleCount: verification.triangleCount,
    entityCount: verification.entityCount,
    screenshotCount: locations.length,
  }, null, 2));

  mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  const browserType = BROWSERS[BROWSER_NAME] ?? chromium;
  const browser = await browserType.launch({
    headless: process.env.INFERNO_SCREENSHOT_HEADLESS !== '0',
    ...(BROWSER_NAME === 'chromium' ? { args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {}),
  });
  const context = await browser.newContext({ viewport: { width: 960, height: 640 } });
  const page = await context.newPage();

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.locator('button[data-action="solo"]').click();
  await page.waitForTimeout(4000);
  await page.evaluate(() => {
    const panel = document.querySelector('.lock-panel');
    if (panel) panel.remove();
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    if (window.__debugAllowPointerLockBypassForTests) window.__debugAllowPointerLockBypassForTests();
  });
  await page.waitForTimeout(400);
  const routeLocations = expandRouteLocations(locations);

  for (const loc of routeLocations) {
    console.log(`${loc.name}: (${loc.x}, ${loc.z})`);
    await page.evaluate(({ x, z, yaw, eye }) => {
      if (window.__debugSetPlayerPosition) window.__debugSetPlayerPosition(x, z, yaw, eye);
    }, loc);
    await page.waitForTimeout(50);
    await page.waitForTimeout(1400);
    const dataUrl = await page.evaluate(() => {
      return window.__debugTakeScreenshot ? window.__debugTakeScreenshot() : null;
    });
    const target = join(SCREENSHOTS_DIR, `inferno-${loc.name}.png`);
    if (dataUrl) {
      writeFileSync(target, Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
      console.log(`  -> saved ${target}`);
    } else {
      console.log(`  -> screenshot unavailable`);
    }
  }

  await browser.close();
}

function createInfernoLocations(resource) {
  const bounds = resource.source.manifest.geometry.worldModel?.gameBounds;
  if (!bounds) throw new Error('Inferno generated mesh manifest is missing world bounds.');
  const spawns = resource.source.manifest.entities.playerSpawns;
  const t = spawns.find(spawn => spawn.team === 't' && spawn.gamePosition)?.gamePosition;
  const ct = spawns.find(spawn => spawn.team === 'ct' && spawn.gamePosition)?.gamePosition;
  if (!t || !ct) throw new Error('Inferno generated mesh manifest is missing source T/CT spawn positions.');

  const h = (x, z, y = 1.7) => ({ x: x * 0.01, y: y * 0.01, z: -z * 0.01 });
  const p = (x, z, y = 1.7) => ({ x, y, z });
  const lookAt = (name, from, to, eye = 2.2) => ({
    name,
    x: from.x,
    z: from.z,
    yaw: Math.atan2(to.x - from.x, to.z - from.z),
    eye: Math.max(eye, from.y + 1.2),
  });

  const locations = [
    lookAt('source-01-t-spawn', t, h(0, 2048), 2.4),
    lookAt('source-02-banana', h(-28.16, -10.24, 1.4), h(-28.0, -2.0), 2.4),
    lookAt('source-03-a-apartments', h(-12.8, -5.12, 2.0), h(-15.2, -1.6), 2.4),
    lookAt('source-04-a-site', h(-15.36, 20.48, 1.8), h(-15.2, 26.88), 2.6),
    lookAt('source-05-mid', h(0, 0, 1.8), h(-3.2, -11.8), 2.3),
    lookAt('source-06-ct-spawn', ct, h(-3.2, -11.8), 2.4),
    lookAt('source-07-b-site', h(15.36, 20.48, 1.8), h(15.2, 26.88), 2.6),
    lookAt('source-08-b-rooms', h(15.36, 10.24, 1.8), h(18.0, 16.0), 2.4),
    lookAt('source-09-overview', p(0, 0, 6.4), p(0, 0, 0), 3.2),
  ];

  return locations.map(location => {
    const minX = Math.min(bounds.mins.x, bounds.maxs.x);
    const maxX = Math.max(bounds.mins.x, bounds.maxs.x);
    const minZ = Math.min(bounds.mins.z, bounds.maxs.z);
    const maxZ = Math.max(bounds.mins.z, bounds.maxs.z);
    if (location.x < minX || location.x > maxX || location.z < minZ || location.z > maxZ) {
      throw new Error(`Inferno screenshot location ${location.name} is outside world bounds.`);
    }
    return location;
  });
}

function expandRouteLocations(locations) {
  const output = [];
  for (const loc of locations) {
    const key = `${loc.x}-${loc.z}-${loc.yaw}-${loc.eye}`;
    output.push({ ...loc, key, route: 'screenshot' });
  }
  const routeTicks = buildRouteTicks();
  for (const tick of routeTicks) {
    output.push({ ...tick, key: `${tick.route}-${tick.name}`, route: tick.route, isRouteTick: true });
  }
  return output;
}

function buildRouteTicks() {
  const ticks = [];
  const segments = [
    {
      route: 'full-route',
      label: 't-spawn-to-banana',
      start: { x: 0, z: -30.72, yaw: 0, eye: 2.4 },
      end: { x: -28.16, z: -10.24, yaw: 0, eye: 2.4 },
    },
    {
      route: 'full-route',
      label: 'banana-to-a-site',
      start: { x: -28.16, z: -10.24, yaw: 0, eye: 2.4 },
      end: { x: -15.36, z: 20.48, yaw: 0, eye: 2.6 },
    },
    {
      route: 'full-route',
      label: 'a-site-to-apartments',
      start: { x: -15.36, z: 20.48, yaw: 0, eye: 2.6 },
      end: { x: -12.8, z: -5.12, yaw: 0, eye: 2.4 },
    },
    {
      route: 'full-route',
      label: 'apartments-to-mid',
      start: { x: -12.8, z: -5.12, yaw: 0, eye: 2.4 },
      end: { x: 0, z: 0, yaw: 0, eye: 2.3 },
    },
    {
      route: 'full-route',
      label: 'mid-to-ct-spawn',
      start: { x: 0, z: 0, yaw: 0, eye: 2.3 },
      end: { x: 0.24, z: -22.08, yaw: 0, eye: 2.4 },
    },
    {
      route: 'full-route',
      label: 'ct-spawn-to-b-site',
      start: { x: 0.24, z: -22.08, yaw: 0, eye: 2.4 },
      end: { x: 15.36, z: 20.48, yaw: 0, eye: 2.6 },
    },
    {
      route: 'full-route',
      label: 'b-site-to-t-spawn',
      start: { x: 15.36, z: 20.48, yaw: 0, eye: 2.6 },
      end: { x: 0, z: -30.72, yaw: 0, eye: 2.4 },
    },
  ];
  for (const segment of segments) {
    const dx = segment.end.x - segment.start.x;
    const dz = segment.end.z - segment.start.z;
    const dist = Math.hypot(dx, dz);
    const steps = Math.max(12, Math.round(dist / 0.3));
    const duration = 180 * steps;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      ticks.push({
        route: segment.route,
        name: `${segment.label}-${String(i).padStart(3, '0')}`,
        x: segment.start.x + dx * t,
        z: segment.start.z + dz * t,
        yaw: segment.end.yaw,
        eye: segment.end.eye,
        duration,
      });
    }
  }
  return ticks;
}
