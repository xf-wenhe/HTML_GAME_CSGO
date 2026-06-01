import { webkit } from 'playwright';

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('🚀 Test Space (jump) + Ctrl (crouch)\n');
  const browser = await webkit.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');
  await sleep(3000);
  await page.locator('[data-action="solo"]').click();
  await sleep(5000);
  await page.evaluate(() => { const b=(window as any).__debugAllowPointerLockBypassForTests; if(b)b(); });
  await sleep(500);

  await page.evaluate(([x,z,yaw,y])=>{const f=(window as any).__debugSetPlayerPosition;if(f)f(x,z,yaw,y);},[0,-57.6,0,0.64]);
  await page.evaluate(() => { const b=(window as any).__debugAllowPointerLockBypassForTests; if(b)b(); });
  await sleep(600);
  for (const k of ['KeyW','KeyA','KeyS','KeyD','Space','ControlLeft']) await page.keyboard.up(k);
  await sleep(200);

  const start = await page.evaluate(() => (window as any).__debugPlayerPosition?.());
  console.log('Start:', start);

  await page.keyboard.press('Space');
  await sleep(200);
  const afterJump = await page.evaluate(() => (window as any).__debugPlayerPosition?.());
  console.log('After Space:', afterJump);
  const jumpH = afterJump && start ? afterJump.y - start.y : 0;
  console.log('Jump height:', jumpH.toFixed(2));

  await sleep(1500);

  await page.keyboard.down('ControlLeft');
  await page.keyboard.down('KeyW');
  await sleep(1000);
  await page.keyboard.up('KeyW');
  await page.keyboard.up('ControlLeft');
  await sleep(500);

  const afterCrouch = await page.evaluate(() => (window as any).__debugPlayerPosition?.());
  console.log('After crouch+move:', afterCrouch);

  const inputState = await page.evaluate(() => (window as any).__debugInputState?.());
  console.log('Input state mode:', inputState?.mode, '| grounded:', inputState?.grounded);

  await page.keyboard.press('Space');
  await sleep(100);
  await page.keyboard.press('Space');
  await sleep(200);
  const afterDoubleJump = await page.evaluate(() => (window as any).__debugPlayerPosition?.());
  console.log('After double Space:', afterDoubleJump);
  const djH = afterDoubleJump && afterCrouch ? afterDoubleJump.y - afterCrouch.y : 0;
  console.log('Double jump height:', djH.toFixed(2));

  await page.screenshot({ path: 'tests/space-ctrl-test.png' });
  await browser.close();

  console.log('\n--- RESULTS ---');
  console.log(`Space jump: ${jumpH > 0.3 ? '✅' : '❌'} (height=${jumpH.toFixed(2)})`);
  console.log(`Ctrl crouch: ${inputState ? '✅ input readable' : '❌'}`);
  console.log(`Double jump: ${djH > jumpH * 1.5 ? '✅ higher' : '⚠️'} (2nd=${djH.toFixed(2)} vs 1st=${jumpH.toFixed(2)})`);
}
main().catch(e => { console.error('Fatal:', e); process.exit(1); });
