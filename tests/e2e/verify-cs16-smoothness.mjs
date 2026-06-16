import { chromium } from 'playwright';

const url = process.env.E2E_URL || 'http://localhost:5173/?debugPointerLock=1';
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

const browser = await chromium.launch({
  headless: process.env.HEADLESS !== 'false',
  executablePath,
  args: ['--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
});

const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error') errors.push(message.text());
});

await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => Boolean(window.__debugInputState), null, { timeout: 15_000 });

await startMode('tdm');
const tdmIdle = summarize(await sampleFrames(90));
const tdmMoveTurn = summarize(await sampleFrames(180, { move: true, turn: true }));
const tdmJumpSamples = await sampleFrames(140, { jump: true });
const tdmJump = summarize(tdmJumpSamples);
tdmJump.groundY = tdmMoveTurn.yEnd;
tdmJump.jumpHeight = Number((Math.max(...tdmJumpSamples.map(sample => sample.y)) - tdmJump.groundY).toFixed(4));

await leaveToMenu();
await startMode('solo');
const soloState = await page.evaluate(() => window.__debugInputState?.());
await leaveToMenu();
await startMode('tdm');
const afterSoloIdle = summarize(await sampleFrames(90));
const afterSoloMoveTurn = summarize(await sampleFrames(150, { move: true, turn: true }));
const finalState = await page.evaluate(() => window.__debugInputState?.());

const report = {
  url,
  tdmIdle,
  tdmMoveTurn,
  tdmJump,
  soloEntered: { mode: soloState?.mode, hasPlayer: Boolean(soloState?.playerPosition) },
  afterSoloIdle,
  afterSoloMoveTurn,
  final: {
    mode: finalState?.mode,
    hasPlayer: Boolean(finalState?.playerPosition),
    speed: finalState?.horizontalSpeed,
    pos: finalState?.playerPosition,
    frameStats: finalState?.frameStats
  },
  errors
};

console.log(JSON.stringify(report, null, 2));

assertNoErrors();
assertIdleStable('direct TDM idle', tdmIdle);
assertMoveTurn('direct TDM move+turn', tdmMoveTurn);
assertJump('direct TDM jump', tdmJump);
if (report.soloEntered.mode !== 'playing' || !report.soloEntered.hasPlayer) {
  throw new Error(`Expected solo mode to enter playing with a player, got ${JSON.stringify(report.soloEntered)}.`);
}
assertIdleStable('TDM idle after leaving solo', afterSoloIdle);
assertMoveTurn('TDM move+turn after leaving solo', afterSoloMoveTurn);
if (report.final.mode !== 'playing' || !report.final.hasPlayer) {
  throw new Error(`Expected final TDM state to be playable, got ${JSON.stringify(report.final)}.`);
}

await browser.close();

async function startMode(action) {
  await page.waitForSelector(`[data-action="${action}"]`, { timeout: 15_000 });
  await page.click(`[data-action="${action}"]`);
  await page.waitForFunction(() => Boolean(window.__debugInputState?.().playerPosition), null, { timeout: 20_000 });
  await page.evaluate(() => window.__debugAllowPointerLockBypassForTests?.());
  await page.waitForTimeout(450);
}

async function leaveToMenu() {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(120);
  await page.evaluate(() => document.querySelector('.leave-button')?.click());
  await page.waitForFunction(() => window.__debugInputState?.().mode === 'menu', null, { timeout: 10_000 });
}

async function sampleFrames(frames, options = {}) {
  return page.evaluate(async ({ frames, move, turn, jump }) => {
    const samples = [];
    if (move) window.__debugSetKeyPressed?.('KeyW', true);
    if (jump) window.__debugSetKeyPressed?.('Space', true);
    let last = performance.now();
    for (let i = 0; i < frames; i += 1) {
      if (turn) window.__debugSetMouseDelta?.(0.018, 0);
      await new Promise(requestAnimationFrame);
      const now = performance.now();
      const state = window.__debugInputState?.();
      samples.push({
        dt: now - last,
        x: state?.playerPosition?.x,
        y: state?.playerPosition?.y,
        z: state?.playerPosition?.z,
        yaw: state?.rotation?.yaw,
        speed: state?.horizontalSpeed,
        grounded: state?.grounded,
        mode: state?.mode,
        frameStats: state?.frameStats
      });
      last = now;
    }
    window.__debugSetKeyPressed?.('KeyW', false);
    window.__debugSetKeyPressed?.('Space', false);
    return samples;
  }, { frames, ...options });
}

function summarize(samples) {
  const values = name => samples.map(sample => sample[name]).filter(Number.isFinite);
  const avg = list => list.length ? list.reduce((sum, value) => sum + value, 0) / list.length : 0;
  const min = list => list.length ? Math.min(...list) : 0;
  const max = list => list.length ? Math.max(...list) : 0;
  const dt = values('dt').sort((a, b) => a - b);
  const quantile = p => dt[Math.min(dt.length - 1, Math.max(0, Math.floor(dt.length * p)))] || 0;
  const y = values('y');
  const speed = values('speed');
  const yawSteps = samples.slice(1).map((sample, index) => sample.yaw - samples[index].yaw).filter(Number.isFinite);
  return {
    frames: samples.length,
    dtMean: Number(avg(dt).toFixed(3)),
    dtP95: Number(quantile(0.95).toFixed(3)),
    dtMax: Number(max(dt).toFixed(3)),
    dtOver25: dt.filter(value => value > 25).length,
    yRange: Number((max(y) - min(y)).toFixed(6)),
    yStart: Number((y[0] ?? 0).toFixed(4)),
    yEnd: Number((y.at(-1) ?? 0).toFixed(4)),
    speedMax: Number(max(speed).toFixed(4)),
    speedEnd: Number((speed.at(-1) ?? 0).toFixed(4)),
    yawStepMin: Number(min(yawSteps).toFixed(6)),
    yawStepMax: Number(max(yawSteps).toFixed(6)),
    yawDelta: Number(((samples.at(-1)?.yaw ?? 0) - (samples[0]?.yaw ?? 0)).toFixed(4)),
    lastMode: samples.at(-1)?.mode,
    lastGrounded: samples.at(-1)?.grounded,
    frameStats: samples.at(-1)?.frameStats
  };
}

function assertNoErrors() {
  const fatal = errors.filter(error => !/favicon|404/.test(error));
  if (fatal.length > 0) throw new Error(`Browser console errors: ${fatal.join(' | ')}`);
}

function assertIdleStable(label, summary) {
  if (summary.lastMode !== 'playing') throw new Error(`${label}: expected playing, got ${summary.lastMode}`);
  if (summary.yRange > 0.015) throw new Error(`${label}: y bob too high (${summary.yRange})`);
  if (summary.speedMax > 0.05) throw new Error(`${label}: should stay still, speed ${summary.speedMax}`);
  assertFrameSmooth(label, summary);
}

function assertMoveTurn(label, summary) {
  if (summary.lastMode !== 'playing') throw new Error(`${label}: expected playing, got ${summary.lastMode}`);
  if (summary.yRange > 0.02) throw new Error(`${label}: y bob too high (${summary.yRange})`);
  if (summary.speedMax < 2.0) throw new Error(`${label}: did not reach run speed (${summary.speedMax})`);
  if (Math.abs(summary.yawDelta) < 1.0) throw new Error(`${label}: yaw did not change enough (${summary.yawDelta})`);
  if (summary.yawStepMax - summary.yawStepMin > 0.001) throw new Error(`${label}: yaw step jitter too high (${summary.yawStepMin}..${summary.yawStepMax})`);
  assertFrameSmooth(label, summary);
}

function assertJump(label, summary) {
  if (summary.jumpHeight < 0.40 || summary.jumpHeight > 0.50) {
    throw new Error(`${label}: jump height should be ~45HU, got ${summary.jumpHeight}`);
  }
  const groundY = summary.groundY ?? summary.yStart;
  if (!summary.lastGrounded || Math.abs(summary.yEnd - groundY) > 0.03) {
    throw new Error(`${label}: should land cleanly, ground=${groundY} end=${summary.yEnd} grounded=${summary.lastGrounded}`);
  }
  assertFrameSmooth(label, summary);
}

function assertFrameSmooth(label, summary) {
  if (summary.dtP95 > 30) throw new Error(`${label}: frame p95 too high (${summary.dtP95}ms)`);
  if ((summary.frameStats?.totalMs ?? 0) > 8) {
    throw new Error(`${label}: game frame work too high (${summary.frameStats.totalMs}ms)`);
  }
}
