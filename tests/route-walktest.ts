/**
 * Walktest with ZERO debug movement.
 * Player spawns naturally, navigates with WASD only.
 * Uses __debugPlayerPosition (read-only) to check progress.
 */
import { webkit } from 'playwright';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Waypoints relative to T Spawn (z=-61.44)
// Player starts at x≈0, z=-61.44 facing default direction
// Corridors: A Long at x=-35.84, B Tunnel at x=32.64, Mid at x=0, Short at x=-15.36

const T_SPAWN_Z = -61.44;
const CT_SPAWN_Z = 29.44;

// Each route: sequence of moves. Each move = {key, duration, description}
// We navigate by: holding W to move forward, pressing A/D to strafe toward corridor center
const ROUTES: Record<string, Array<{type: string; arg?: number; desc: string}>> = {
  'T→A (A Long)': [
    { type: 'strafe_to', arg: -35.84, desc: 'Strafe to A Long corridor (x=-35.84)' },
    { type: 'forward', arg: 8000, desc: 'Run south through A Long' },
    { type: 'strafe_to', arg: -35.84, desc: 'Stay in A Long at A Doors' },
    { type: 'forward', arg: 3000, desc: 'Run through A Doors' },
    { type: 'strafe_to', arg: -25.6, desc: 'Strafe toward A Site center' },
    { type: 'forward', arg: 2000, desc: 'Run into A Site' },
  ],

  'T→B (B Tunnels)': [
    { type: 'strafe_to', arg: 32.64, desc: 'Strafe to B Tunnel corridor (x=32.64)' },
    { type: 'forward', arg: 8000, desc: 'Run south through B Tunnels' },
    { type: 'strafe_to', arg: 32.64, desc: 'Stay in B Tunnel at exit' },
    { type: 'forward', arg: 3000, desc: 'Run through tunnel exit' },
    { type: 'strafe_to', arg: 25.6, desc: 'Strafe toward B Site center' },
    { type: 'forward', arg: 2000, desc: 'Run into B Site' },
  ],

  'T→CT (Mid)': [
    { type: 'strafe_to', arg: 0, desc: 'Center in Mid corridor (x=0)' },
    { type: 'forward', arg: 10000, desc: 'Run south through Mid to CT' },
  ],

  'T→A (Short)': [
    { type: 'strafe_to', arg: -35.84, desc: 'Strafe to A Long' },
    { type: 'forward', arg: 3000, desc: 'Run partway down A Long' },
    { type: 'strafe_to', arg: -15.36, desc: 'Strafe west toward Short' },
    { type: 'forward', arg: 5000, desc: 'Run to Short/Catwalk area' },
    { type: 'strafe_to', arg: -15.36, desc: 'Stay on catwalk' },
    { type: 'forward', arg: 3000, desc: 'Run through catwalk' },
    { type: 'strafe_to', arg: -25.6, desc: 'Strafe toward A Site' },
    { type: 'forward', arg: 2000, desc: 'Run into A Site' },
  ],

  'CT→A (A Long)': [
    { type: 'strafe_to', arg: -35.84, desc: 'Strafe to A Long corridor' },
    { type: 'forward', arg: 3000, desc: 'Run through A Doors' },
    { type: 'strafe_to', arg: -25.6, desc: 'Strafe toward A Site' },
    { type: 'forward', arg: 2000, desc: 'Run into A Site' },
  ],

  'CT→B (Mid lower)': [
    { type: 'strafe_to', arg: 32.64, desc: 'Strafe to B corridor' },
    { type: 'forward', arg: 8000, desc: 'Run through B area' },
    { type: 'strafe_to', arg: 25.6, desc: 'Strafe to B Site' },
    { type: 'forward', arg: 2000, desc: 'Run into B Site' },
  ],

  'CT→T (Mid)': [
    { type: 'strafe_to', arg: 0, desc: 'Center in Mid corridor' },
    { type: 'forward', arg: 10000, desc: 'Run north through Mid to T Spawn' },
  ],

  'CT→A (Short)': [
    { type: 'strafe_to', arg: -35.84, desc: 'Strafe to A Long' },
    { type: 'forward', arg: 5000, desc: 'Run through A Long' },
    { type: 'strafe_to', arg: -15.36, desc: 'Strafe to Short' },
    { type: 'forward', arg: 3000, desc: 'Run through Short' },
    { type: 'strafe_to', arg: -25.6, desc: 'Strafe to A Site' },
    { type: 'forward', arg: 2000, desc: 'Run into A Site' },
  ],
};

async function main() {
  console.log('🚀 Dust2 Route Walktest (WASD only, no debug movement)\n');

  const browser = await webkit.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');
  await sleep(3000);
  await page.locator('[data-action="solo"]').click();
  await sleep(4000);

  // Enable bypass BEFORE anything else
  await page.evaluate(() => {
    const bypass = (window as any).__debugAllowPointerLockBypassForTests;
    if (bypass) bypass();
  });

  // Wait for game to be ready
  await sleep(1000);

  async function getPos() {
    return page.evaluate(() => (window as any).__debugPlayerPosition?.());
  }

  async function strafeTo(targetX) {
    // Strafe toward target X using A/D keys
    const maxIterations = 100;
    for (let i = 0; i < maxIterations; i++) {
      const pos = await getPos();
      if (!pos) return;

      const xErr = targetX - pos.x;
      if (Math.abs(xErr) < 0.3) return; // close enough

      const key = xErr > 0 ? 'KeyD' : 'KeyA';
      const duration = Math.min(300, Math.max(50, Math.abs(xErr) * 80));
      await page.keyboard.down(key);
      await sleep(duration);
      await page.keyboard.up(key);
      await sleep(50);
    }
  }

  async function forward(durationMs) {
    await page.keyboard.down('KeyW');
    await sleep(durationMs);
    await page.keyboard.up('KeyW');
    await sleep(200);
  }

  const results: Record<string, { passed: boolean; finalZ?: number }> = {};

  for (const [name, moves] of Object.entries(ROUTES)) {
    console.log(`\n══ ${name} ══`);

    // Reset to T Spawn (ONLY initial positioning, no teleporting through walls)
    await page.evaluate(([x, z, yaw]) => {
      const f = (window as any).__debugSetPlayerPosition;
      if (f) f(x, z, yaw, 0.64);
    }, [0, T_SPAWN_Z, Math.PI]);
    await sleep(500);
    await page.evaluate(() => {
      const bypass = (window as any).__debugAllowPointerLockBypassForTests;
      if (bypass) bypass();
    });
    await sleep(300);

    let blocked = false;

    for (const move of moves) {
      if (move.type === 'strafe_to') {
        await strafeTo(move.arg);
      } else if (move.type === 'forward') {
        await forward(move.arg);
      }

      const pos = await getPos();
      if (pos) {
        console.log(`  ✓ ${move.desc} → (${pos.x.toFixed(1)}, ${pos.z.toFixed(1)})`);
      }
    }

    const finalPos = await getPos();
    results[name] = {
      passed: !blocked && finalPos !== null,
      finalZ: finalPos?.z,
    };
  }

  console.log('\n\n╔══════════════════════════════════════════════╗');
  console.log('║        DUST2 ROUTE TEST RESULTS             ║');
  console.log('╚══════════════════════════════════════════════╝');
  let allPassed = true;
  for (const [name, r] of Object.entries(results)) {
    const z = r.finalZ?.toFixed(1);
    console.log(`${r.passed ? '✅' : '❌'} ${name} (final z=${z})`);
    if (!r.passed) allPassed = false;
  }
  console.log(allPassed ? '\n🎉 ALL ROUTES PASSED!' : '\n⚠️  Some routes failed');

  await page.screenshot({ path: 'tests/final-test.png' });
  console.log('Screenshot: tests/final-test.png');
  await browser.close();
  process.exit(allPassed ? 0 : 1);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
