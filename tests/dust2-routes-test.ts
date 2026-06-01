/**
 * Dust2 route test v15 — NEW browser per route, debug input API.
 */
import { webkit } from 'playwright';

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

const SENSITIVITY = 0.00165;

interface Route {
  name: string;
  spawnX: number;
  spawnZ: number;
  spawnYaw: number;
  walkMs: number;
  strafes?: Array<{ key: string; ms: number }>;
  axis: 'x' | 'z';
  sign: number;
  minMove: number;
}

const ROUTES: Route[] = [
  // X-axis routes need longer walk time to reach minMove
  { name: 'T→A Long',  spawnX: 0, spawnZ: -61.44, spawnYaw: Math.PI/2,  walkMs: 15000, strafes: [{key:'KeyA',ms:2000}], axis:'x', sign:-1, minMove:8 },
  { name: 'T→B',       spawnX: 0, spawnZ: -61.44, spawnYaw: -Math.PI/2, walkMs: 15000, strafes: [{key:'KeyD',ms:2000}], axis:'x', sign: 1, minMove:8 },
  { name: 'T→CT',      spawnX: 0, spawnZ: -61.44, spawnYaw: Math.PI,    walkMs: 15000, axis:'z', sign: 1, minMove:15 },
  { name: 'T→A Short', spawnX: 0, spawnZ: -61.44, spawnYaw: Math.PI,    walkMs: 12000, strafes: [{key:'KeyA',ms:3000}], axis:'z', sign: 1, minMove:12 },
  { name: 'CT→A Long', spawnX: 0, spawnZ: 33.28,  spawnYaw: Math.PI/2,  walkMs: 15000, strafes: [{key:'KeyA',ms:2000}], axis:'x', sign:-1, minMove:8 },
  { name: 'CT→B',      spawnX: 0, spawnZ: 33.28,  spawnYaw: -Math.PI/2, walkMs: 15000, strafes: [{key:'KeyD',ms:3000}], axis:'x', sign: 1, minMove:8 },
  { name: 'CT→T',      spawnX: 0, spawnZ: 33.28,  spawnYaw: 0,          walkMs: 15000, axis:'z', sign:-1, minMove:15 },
  { name: 'CT→A Short',spawnX: 0, spawnZ: 33.28,  spawnYaw: 0,          walkMs: 12000, strafes: [{key:'KeyA',ms:3000}], axis:'z', sign:-1, minMove:10 },
];

async function testRoute(route: Route): Promise<{ passed: boolean; info: string }> {
  const browser = await webkit.launch({ headless: false });
  const page = await browser.newPage();
  try {
    await page.goto('http://localhost:5173');
    await sleep(3000);
    await page.locator('[data-action="solo"]').click();
    await sleep(5000);

    await page.evaluate(() => {
      const b = (window as any).__debugAllowPointerLockBypassForTests;
      if (b) b();
    });
    await sleep(500);

    // Spawn at route start
    await page.evaluate(([x, z, yaw, y]) => {
      const f = (window as any).__debugSetPlayerPosition;
      if (f) f(x, z, yaw, y);
    }, [route.spawnX, route.spawnZ, route.spawnYaw, 0.64]);
    await sleep(500);

    await page.evaluate(() => {
      const b = (window as any).__debugAllowPointerLockBypassForTests;
      if (b) b();
    });
    await sleep(3000);

    // Release keys
    for (const k of ['KeyW','KeyA','KeyS','KeyD','Space','ControlLeft']) {
      await page.evaluate((key) => {
        const f = (window as any).__debugSetKeyPressed;
        if (f) f(key, false);
      }, [k]);
    }
    await sleep(300);

    const start = await page.evaluate(() => (window as any).__debugPlayerPosition?.());
    if (!start) return { passed: false, info: 'no spawn' };

    // Walk forward
    await page.evaluate(() => {
      const f = (window as any).__debugSetKeyPressed;
      if (f) f('KeyW', true);
    });
    await sleep(route.walkMs);
    await page.evaluate(() => {
      const f = (window as any).__debugSetKeyPressed;
      if (f) f('KeyW', false);
    });
    await sleep(300);

    // Strafe
    for (const s of route.strafes || []) {
      await page.evaluate((k) => {
        const f = (window as any).__debugSetKeyPressed;
        if (f) f(k, true);
      }, [s.key]);
      await sleep(s.ms);
      await page.evaluate((k) => {
        const f = (window as any).__debugSetKeyPressed;
        if (f) f(k, false);
      }, [s.key]);
      await sleep(300);
    }
    if (route.strafes?.length) {
      await page.evaluate(() => {
        const f = (window as any).__debugSetKeyPressed;
        if (f) f('KeyW', true);
      });
      await sleep(3000);
      await page.evaluate(() => {
        const f = (window as any).__debugSetKeyPressed;
        if (f) f('KeyW', false);
      });
      await sleep(300);
    }

    const end = await page.evaluate(() => (window as any).__debugPlayerPosition?.());
    if (!end) return { passed: false, info: 'no end' };

    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const primary = route.axis === 'x' ? dx : dz;
    const passed = route.sign > 0 ? primary > route.minMove : primary < -route.minMove;
    const info = `(${start.x.toFixed(1)},${start.z.toFixed(1)})→(${end.x.toFixed(1)},${end.z.toFixed(1)}) Δ${route.axis}=${primary.toFixed(1)}`;
    return { passed, info };
  } finally {
    await browser.close();
    await sleep(1000);
  }
}

async function main() {
  console.log('🚀 Dust2 Route Test v15 (new browser per route)\n');

  const results: Array<{ route: string; passed: boolean; info: string }> = [];

  for (const route of ROUTES) {
    console.log(`\n══ ${route.name} ══`);
    const result = await testRoute(route);
    results.push({ route: route.name, passed: result.passed, info: result.info });
    console.log(`  ${result.passed ? '✅' : '❌'} ${result.info}`);
  }

  console.log('\n\n╔══════════════════════════════════════════════╗');
  console.log('║        DUST2 ROUTE TEST RESULTS             ║');
  console.log('╚══════════════════════════════════════════════╝');
  let allPassed = true;
  for (const r of results) {
    console.log(`${r.passed ? '✅' : '❌'} ${r.route}: ${r.info}`);
    if (!r.passed) allPassed = false;
  }
  console.log(allPassed ? '\n🎉 ALL ROUTES PASSED!' : '\n⚠️  Some routes failed');
  process.exit(allPassed ? 0 : 1);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });