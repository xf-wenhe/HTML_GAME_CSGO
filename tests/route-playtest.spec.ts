/**
 * Automated playtest: drives Dust2 routes using DOM keyboard events
 * (bypasses pointer lock requirement by dispatching KeyboardEvent directly).
 */
import { test, expect } from '@playwright/test';

const TOLERANCE = 1.0;

type WP = { x: number; z: number; desc: string };

const ROUTES: Record<string, WP[]> = {
  'T→A (A Long)': [
    { x: 0, z: 61, desc: 'T Spawn' },
    { x: -3.5, z: 50, desc: 'A Long upper' },
    { x: -3.5, z: 35, desc: 'A Long mid' },
    { x: -3.5, z: 22, desc: 'A Doors area' },
    { x: -3.5, z: 15, desc: 'A Site approach' },
    { x: -2.6, z: 12.8, desc: 'A Site' },
  ],
  'T→B (B Tunnels)': [
    { x: 0, z: 61, desc: 'T Spawn' },
    { x: 3.5, z: 55, desc: 'T→B approach' },
    { x: 3.5, z: 40, desc: 'B Tunnel upper' },
    { x: 3.5, z: 25, desc: 'B Tunnel mid' },
    { x: 3.5, z: 15, desc: 'B Tunnel exit' },
    { x: 2.6, z: 12.8, desc: 'B Site' },
  ],
  'T→CT (Mid)': [
    { x: 0, z: 61, desc: 'T Spawn' },
    { x: 0, z: 50, desc: 'Mid upper' },
    { x: 0, z: 30, desc: 'Mid' },
    { x: 0, z: 15, desc: 'Mid→CT transition' },
    { x: 0, z: -10, desc: 'CT Mid' },
    { x: 0, z: -33, desc: 'CT Spawn' },
  ],
  'T→A (Short)': [
    { x: 0, z: 61, desc: 'T Spawn' },
    { x: -3.5, z: 45, desc: 'A Long (turn Short)' },
    { x: -8, z: 20, desc: 'Short approach' },
    { x: -12, z: 5, desc: 'Catwalk lower' },
    { x: -15, z: -8, desc: 'Catwalk' },
    { x: -15, z: -13, desc: 'Short exit' },
    { x: -2.6, z: 12.8, desc: 'A Site' },
  ],
  'CT→A (A Long)': [
    { x: 0, z: -33, desc: 'CT Spawn' },
    { x: -3.5, z: -25, desc: 'CT Mid' },
    { x: 0, z: 0, desc: 'Mid center' },
    { x: -3.5, z: 19, desc: 'A Doors' },
    { x: -2.6, z: 12.8, desc: 'A Site' },
  ],
  'CT→B (Mid lower)': [
    { x: 0, z: -33, desc: 'CT Spawn' },
    { x: 3.5, z: -20, desc: 'CT Mid' },
    { x: 5, z: -5, desc: 'B approach' },
    { x: 2.6, z: 12.8, desc: 'B Site' },
  ],
  'CT→T (Mid)': [
    { x: 0, z: -33, desc: 'CT Spawn' },
    { x: 0, z: -20, desc: 'CT Mid' },
    { x: 0, z: 0, desc: 'Mid' },
    { x: 0, z: 35, desc: 'Mid upper' },
    { x: 0, z: 61, desc: 'T Spawn' },
  ],
  'CT→A (Short)': [
    { x: 0, z: -33, desc: 'CT Spawn' },
    { x: -3.5, z: -15, desc: 'CT Mid→A Long' },
    { x: -3.5, z: 19, desc: 'A Doors' },
    { x: -8, z: 15, desc: 'Short' },
    { x: -15, z: -5, desc: 'Catwalk' },
    { x: -2.6, z: 12.8, desc: 'A Site' },
  ],
};

function dispatchKey(page: any, code: string, type: 'keydown' | 'keyup' = 'keydown') {
  return page.evaluate(({ code, type }) => {
    const ev = new KeyboardEvent(type, { code, bubbles: true, cancelable: true });
    document.dispatchEvent(ev);
  }, { code, type });
}

async function getPos(page: any) {
  return page.evaluate(() => (window as any).__debugPlayerPosition?.());
}

async function setPos(page: any, x: number, z: number, yaw = 0) {
  await page.evaluate(
    ([x, z, yaw]) => {
      const f = (window as any).__debugSetPlayerPosition;
      if (f) f(x, z, yaw, 0.64);
    },
    [x, z, yaw]
  );
}

async function setYaw(page: any, yaw: number) {
  const pos = await getPos(page);
  if (!pos) return;
  await page.evaluate(
    ([x, y, z, yaw]) => {
      const f = (window as any).__debugSetPlayerPosition;
      if (f) f(x, z, yaw, y);
    },
    [pos.x, pos.y, pos.z, yaw]
  );
}

function yawToFace(dx: number, dz: number): number {
  return Math.atan2(-dx, -dz);
}

async function stepForward(page: any, ms: number) {
  await dispatchKey(page, 'KeyW', 'keydown');
  await page.waitForTimeout(ms);
  await dispatchKey(page, 'KeyW', 'keyup');
}

async function jump(page: any) {
  await dispatchKey(page, 'Space', 'keydown');
  await page.waitForTimeout(50);
  await dispatchKey(page, 'Space', 'keyup');
}

async function strafe(page: any, key: 'KeyA' | 'KeyD', ms: number) {
  await dispatchKey(page, key, 'keydown');
  await page.waitForTimeout(ms);
  await dispatchKey(page, key, 'keyup');
}

async function navigateTo(page: any, target: WP, maxMs = 20000): Promise<boolean> {
  const startTime = Date.now();
  let stuckFrames = 0;
  let lastPos: any = null;

  while (Date.now() - startTime < maxMs) {
    const pos = await getPos(page);
    if (!pos) return false;

    const dx = target.x - pos.x;
    const dz = target.z - pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < TOLERANCE) return true;

    // Face target
    const yaw = yawToFace(dx, dz);
    await setYaw(page, yaw);
    await page.waitForTimeout(30);

    // Move forward
    const moveMs = Math.min(500, Math.max(100, (dist / 2.5) * 1000));
    await stepForward(page, moveMs);
    await page.waitForTimeout(30);

    // Check stuck
    if (lastPos) {
      const moved = Math.sqrt((pos.x - lastPos.x) ** 2 + (pos.z - lastPos.z) ** 2);
      if (moved < 0.03) stuckFrames++;
      else stuckFrames = 0;
    }
    lastPos = pos;

    if (stuckFrames > 12) {
      await jump(page);
      await page.waitForTimeout(200);
      stuckFrames = 0;
    }
    if (stuckFrames > 6) {
      await strafe(page, 'KeyA', 200);
    }
  }
  return false;
}

test('Dust2 route walkthrough - 8 classic routes', async ({ page }) => {
  test.setTimeout(600_000);

  // Load
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Start solo game
  await page.click('[data-action="solo"]');
  await page.waitForTimeout(3000);

  // Enable bypass
  await page.evaluate(() => {
    const bypass = (window as any).__debugAllowPointerLockBypassForTests;
    if (bypass) bypass();
  });
  await page.waitForTimeout(300);

  // Set initial position
  await setPos(page, 0, 61.44, 0);
  await page.waitForTimeout(300);

  // Re-enable bypass (game start may reset it)
  await page.evaluate(() => {
    const bypass = (window as any).__debugAllowPointerLockBypassForTests;
    if (bypass) bypass();
  });

  const results: Record<string, { passed: boolean; blockedAt?: string; finalPos?: any }> = {};

  for (const [name, waypoints] of Object.entries(ROUTES)) {
    console.log(`\n══ ${name} ══`);

    // Reset position and bypass at start of each route
    const start = waypoints[0];
    await setPos(page, start.x, start.z, 0);
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      const bypass = (window as any).__debugAllowPointerLockBypassForTests;
      if (bypass) bypass();
    });
    await page.waitForTimeout(200);

    let failed = false;
    let failWp = '';

    for (let i = 1; i < waypoints.length; i++) {
      const wp = waypoints[i];
      const ok = await navigateTo(page, wp);
      const pos = await getPos(page);

      if (!ok) {
        failed = true;
        failWp = wp.desc;
        console.log(`  ✗ BLOCKED at "${wp.desc}" — stuck at (${pos?.x?.toFixed(2)}, ${pos?.z?.toFixed(2)})`);
        break;
      }
      console.log(`  ✓ ${wp.desc} → (${pos?.x?.toFixed(2)}, ${pos?.z?.toFixed(2)})`);
    }

    const finalPos = await getPos(page);
    results[name] = { passed: !failed, blockedAt: failWp, finalPos };
  }

  // Summary
  console.log('\n\n╔══════════════════════════════════════════════╗');
  console.log('║        DUST2 ROUTE TEST RESULTS             ║');
  console.log('╚══════════════════════════════════════════════╝');
  let allPassed = true;
  for (const [name, r] of Object.entries(results)) {
    const tag = r.passed ? '✅' : '❌';
    console.log(`${tag} ${name}${r.blockedAt ? ` [BLOCKED: ${r.blockedAt}]` : ''}`);
    if (!r.passed) allPassed = false;
  }
  console.log(allPassed ? '\n🎉 ALL ROUTES PASSED!' : '\n⚠️  Some routes blocked');

  await page.screenshot({ path: 'tests/route-test-result.png' });
  expect(allPassed).toBe(true);
});
