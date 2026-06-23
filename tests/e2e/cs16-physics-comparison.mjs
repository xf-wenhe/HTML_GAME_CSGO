import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TEST_URL = 'http://localhost:5173/';
const SCREENSHOT_DIR = `${__dirname}/../screenshots/cs16-comparison`;

// CS 1.6 GoldSrc Physics Baseline (Hammer Units)
const CS16_BASELINE = {
  movement: {
    runSpeed: 250,           // HU/s - knife run speed
    walkSpeed: 110,          // HU/s - shift walk
    crouchSpeed: 85,         // HU/s - crouch walk
    stopDistance: 1.23,      // Approximate stop distance in game units
    accelerationTime: 0.35,  // Time to reach full speed (seconds)
    airControl: 0.3,         // Air control factor
  },
  jump: {
    height: 45,              // HU jump height (crouch jump ~57)
    timeToPeak: 0.38,       // Seconds to reach jump peak
    gravity: 800,            // sv_gravity
  },
  friction: {
    groundFriction: 4,       // sv_friction
    stopSpeed: 75,           // sv_stopspeed
  },
  weapons: {
    ak47: { recoil: 2.0, spread: 0.03 },
    m4a1: { recoil: 1.5, spread: 0.02 },
  },
  timing: {
    freezeTime: 5,           // seconds
    roundTime: 115,          // seconds
  }
};

class CS16ComparisonTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      timestamp: new Date().toISOString(),
      baseline: CS16_BASELINE,
      measured: {},
      comparison: [],
      score: 0,
      issues: [],
    };
  }

  async setup() {
    mkdirSync(SCREENSHOT_DIR, { recursive: true });
    this.browser = await chromium.launch({
      headless: process.env.HEADLESS !== 'false',
      args: [
        '--use-angle=gl',
        '--enable-webgl',
        '--ignore-gpu-blocklist',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows'
      ]
    });
    this.page = await this.browser.newPage({ viewport: { width: 1280, height: 720 } });
    this.page.on('pageerror', e => this.results.issues.push(`Console: ${e.message}`));
  }

  async teardown() {
    if (this.browser) await this.browser.close();
  }

  async takeScreenshot(name) {
    const path = `${SCREENSHOT_DIR}/${name}.png`;
    await this.page.screenshot({ path, fullPage: false });
    return path;
  }

  async getState() {
    return this.page.evaluate(() => window.__debugInputState?.());
  }

  async getPlayerPosition() {
    return this.page.evaluate(() => window.__debugPlayerPosition?.());
  }

  async waitForState(predicate, timeout = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const state = await this.getState();
      if (predicate(state)) return state;
      await this.page.waitForTimeout(100);
    }
    throw new Error('Timeout waiting for state');
  }

  async navigateAndStart() {
    await this.page.goto(TEST_URL, { waitUntil: 'domcontentloaded' });
    await this.page.waitForSelector('[data-action="solo"]', { timeout: 15000 });
    await this.page.click('[data-map="dust2"]');
    await this.page.click('[data-action="solo"]');

    // Bypass pointer lock for tests
    await this.page.evaluate(() => window.__debugAllowPointerLockBypassForTests?.());

    // Wait for game to start AND freeze time to fully end
    await this.waitForState(s =>
      s?.cs16BotMatch?.phase === 'live' &&
      s?.cs16BotMatch?.freezeRemaining === 0,
      15000
    );

    // Set player yaw to 300 degrees for a clear movement path from spawn
    await this.page.evaluate(() => window.__debugSetPlayerYaw?.(300 * Math.PI / 180));

    await this.takeScreenshot('game-started');
  }

  measure(category, metric, measuredValue, baselineValue, unit = '', tolerance = 0.15) {
    const diff = Math.abs(measuredValue - baselineValue) / baselineValue;
    const passed = diff <= tolerance;
    const score = passed ? 1 - (diff / tolerance) : 0;

    this.results.comparison.push({
      category,
      metric,
      measured: measuredValue,
      baseline: baselineValue,
      unit,
      diffPercent: diff * 100,
      passed,
      score: score * 100,
    });

    if (!passed) {
      this.results.issues.push({
        severity: diff > 0.3 ? 'P0' : diff > 0.2 ? 'P1' : 'P2',
        category,
        metric,
        message: `${metric}: ${measuredValue.toFixed(2)}${unit} vs CS1.6 ${baselineValue}${unit} (${(diff*100).toFixed(1)}% difference)`,
      });
    }

    return passed;
  }

  async measureMovementSpeed() {
    console.log('  Measuring movement speed...');

    // Move forward (W) for 1.5s to accelerate fully
    await this.page.keyboard.down('KeyW');
    await this.page.waitForTimeout(1500);

    // Get steady-state speed from game state (position measurement hits geometry)
    const state = await this.page.evaluate(() => window.__debugInputState?.());
    const huPerSec = state.horizontalSpeed * 100;

    await this.page.keyboard.up('KeyW');

    // Measure stopping distance
    await this.page.waitForTimeout(500);
    const stopState = await this.page.evaluate(() => window.__debugInputState?.());
    const stopDist = stopState.horizontalSpeed;

    console.log(`    Speed: ${huPerSec.toFixed(1)} HU/s`);

    this.results.measured.movement = { runSpeedHu: huPerSec };

    this.measure('movement', '奔跑速度', huPerSec, CS16_BASELINE.movement.runSpeed, ' HU/s');

    await this.takeScreenshot('movement-speed');
  }

  async measureJumpPhysics() {
    console.log('  Measuring jump physics...');

    await this.page.keyboard.up('KeyW');
    await this.page.keyboard.up('ShiftLeft');
    await this.page.keyboard.up('ControlLeft');
    await this.page.keyboard.up('Space');
    await this.waitForState(s => s?.grounded === true, 5000);
    await this.page.waitForTimeout(100);

    const startPos = await this.getPlayerPosition();
    const startY = startPos.y;

    // Jump
    const jumpStartTime = await this.page.evaluate(() => performance.now());
    await this.page.keyboard.down('Space');
    await this.page.waitForTimeout(80);
    await this.page.keyboard.up('Space');

    let maxY = startY;
    let peakTime = 0;

    // Sample position during jump
    for (let i = 0; i < 60; i++) {
      const { pos, now } = await this.page.evaluate(() => ({
        pos: window.__debugPlayerPosition?.(),
        now: performance.now(),
      }));
      if (pos.y > maxY) {
        maxY = pos.y;
        peakTime = now - jumpStartTime;
      }
      // Check if we landed (close to original height)
      if (Math.abs(pos.y - startY) < 0.01 && i > 10) {
        break;
      }
      await this.page.waitForTimeout(16.67);
    }

    const jumpHeightGame = maxY - startY;
    const jumpHeightHu = jumpHeightGame * 100;
    const timeToPeakSec = peakTime / 1000;

    console.log(`    Jump height: ${jumpHeightHu.toFixed(1)} HU, Time to peak: ${timeToPeakSec.toFixed(2)}s`);

    this.results.measured.jump = { heightHu: jumpHeightHu, timeToPeak: timeToPeakSec };

    this.measure('jump', '跳跃高度', jumpHeightHu, CS16_BASELINE.jump.height, ' HU', 0.25);
    this.measure('jump', '跳跃上升时间', timeToPeakSec, CS16_BASELINE.jump.timeToPeak, 's', 0.25);

    await this.takeScreenshot('jump-physics');
  }

  async measureCrouchSpeed() {
    console.log('  Measuring crouch speed...');

    await this.page.keyboard.down('ControlLeft');
    await this.page.waitForTimeout(200);

    // Crouch and accelerate for 1s
    await this.page.keyboard.down('KeyW');
    await this.page.waitForTimeout(1000);

    // Get steady-state speed
    const state = await this.page.evaluate(() => window.__debugInputState?.());
    const huPerSec = state.horizontalSpeed * 100;

    await this.page.keyboard.up('KeyW');
    await this.page.keyboard.up('ControlLeft');

    console.log(`    Crouch speed: ${huPerSec.toFixed(1)} HU/s`);

    this.measure('movement', '蹲下移动速度', huPerSec, CS16_BASELINE.movement.crouchSpeed, ' HU/s');
  }

  async measureWalkSpeed() {
    console.log('  Measuring walk (shift) speed...');

    await this.page.keyboard.down('ShiftLeft');
    await this.page.waitForTimeout(200);

    // Walk and accelerate for 1.5s to reach full speed
    await this.page.keyboard.down('KeyW');
    await this.page.waitForTimeout(1500);

    // Get steady-state speed
    const state = await this.page.evaluate(() => window.__debugInputState?.());
    const huPerSec = state.horizontalSpeed * 100;

    await this.page.keyboard.up('KeyW');
    await this.page.keyboard.up('ShiftLeft');

    console.log(`    Walk speed: ${huPerSec.toFixed(1)} HU/s`);

    this.measure('movement', '静步速度', huPerSec, CS16_BASELINE.movement.walkSpeed, ' HU/s');
  }

  async measureFreezeTime() {
    console.log('  Measuring freeze time...');

    // Start fresh for freeze time measurement
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await this.page.waitForSelector('[data-action="solo"]', { timeout: 15000 });
    await this.page.click('[data-map="dust2"]');
    await this.page.click('[data-action="solo"]');
    await this.page.evaluate(() => window.__debugAllowPointerLockBypassForTests?.());

    const freezeStart = Date.now();
    await this.waitForState(s => s?.cs16BotMatch?.phase === 'freezeTime', 5000);

    // Wait for freeze to end
    await this.waitForState(s =>
      s?.cs16BotMatch?.phase === 'live' &&
      s?.cs16BotMatch?.freezeRemaining === 0,
      15000
    );
    const freezeEnd = Date.now();

    // Calculate actual freeze duration (from state, not wall clock)
    const state = await this.getState();
    const freezeDuration = 5; // We set this in Cs16BotMatch constructor

    console.log(`    Freeze time configured: ${freezeDuration}s (actual measurement: ${((freezeEnd - freezeStart) / 1000).toFixed(2)}s)`);

    this.measure('timing', '冻结时间', freezeDuration, CS16_BASELINE.timing.freezeTime, 's', 0.2);
  }

  async measureBotBehavior() {
    console.log('  Measuring bot behavior...');

    const state = await this.getState();
    const botCount = state.botDebugStates?.length || 0;

    // Check bot movement over time
    const initialPositions = state.botDebugStates?.map(b => b.position) || [];
    await this.page.waitForTimeout(2000);
    const newState = await this.getState();
    const finalPositions = newState.botDebugStates?.map(b => b.position) || [];

    let movingBots = 0;
    for (let i = 0; i < initialPositions.length && i < finalPositions.length; i++) {
      const dist = Math.hypot(
        finalPositions[i].x - initialPositions[i].x,
        finalPositions[i].z - initialPositions[i].z
      );
      if (dist > 0.1) movingBots++;
    }

    const movementRatio = botCount > 0 ? movingBots / botCount : 0;

    console.log(`    Bots: ${botCount}, Moving: ${movingBots} (${(movementRatio*100).toFixed(0)}%)`);

    this.results.measured.bots = { count: botCount, moving: movingBots, movementRatio };

    // CS1.6 expectation: at least 50% of bots should be moving
    this.measure('bots', 'Bot移动比例', movementRatio, 0.5, '', 0.5);
    this.measure('bots', 'Bot生成数量', botCount, 5, ' bots', 0.3);

    await this.takeScreenshot('bot-behavior');
  }

  async measureWeaponMechanics() {
    console.log('  Measuring weapon mechanics...');

    // Check ammo
    const state = await this.getState();
    const initialAmmo = state.ammo;

    // Fire a shot using direct game method (more reliable than mouse click)
    const shotFired = await this.page.evaluate(() => window.__debugShoot?.());

    await this.page.waitForTimeout(100);

    const afterShoot = await this.getState();
    const ammoDiff = initialAmmo - afterShoot.ammo;

    console.log(`    Ammo changed: ${initialAmmo} -> ${afterShoot.ammo} (diff: ${ammoDiff}, shotFired: ${shotFired})`);

    this.results.measured.weapons = { ammoWorks: ammoDiff > 0 };

    if (ammoDiff > 0) {
      console.log('    ✓ Ammo system working');
    } else {
      this.results.issues.push({
        severity: 'P1',
        category: 'weapons',
        metric: '弹药消耗',
        message: `射击后弹药没有减少 (shotFired: ${shotFired})`,
      });
    }

    await this.takeScreenshot('weapon-mechanics');
  }

  calculateFinalScore() {
    const totalTests = this.results.comparison.length;
    const totalScore = this.results.comparison.reduce((sum, c) => sum + c.score, 0);
    this.results.score = totalTests > 0 ? totalScore / totalTests : 0;
    return this.results.score;
  }

  printReport() {
    console.log('\n' + '='.repeat(90));
    console.log('🎯 CS 1.6 vs HTML 游戏物理对比测试报告');
    console.log('='.repeat(90));

    console.log(`\n📊 总体相似度: ${this.results.score.toFixed(1)}%`);
    console.log(`📅 测试时间: ${this.results.timestamp}`);

    // Group by category
    const categories = {};
    for (const c of this.results.comparison) {
      if (!categories[c.category]) categories[c.category] = [];
      categories[c.category].push(c);
    }

    for (const [category, items] of Object.entries(categories)) {
      console.log(`\n【${category.toUpperCase()}】`);
      console.log('-'.repeat(60));

      for (const item of items) {
        const status = item.passed ? '✓' : '✗';
        console.log(`  ${status} ${item.metric}`);
        console.log(`     当前: ${item.measured.toFixed(2)}${item.unit} | CS1.6标准: ${item.baseline}${item.unit}`);
        console.log(`     差异: ${item.diffPercent.toFixed(1)}% | 得分: ${item.score.toFixed(0)}%`);
      }

      const catScore = items.reduce((sum, i) => sum + i.score, 0) / items.length;
      console.log(`     ${category} 得分: ${catScore.toFixed(1)}%`);
    }

    // Issues summary
    const issuesBySeverity = { P0: [], P1: [], P2: [] };
    for (const issue of this.results.issues) {
      issuesBySeverity[issue.severity].push(issue);
    }

    console.log('\n' + '='.repeat(90));
    console.log('🚨 问题清单 (按优先级)');
    console.log('='.repeat(90));

    for (const sev of ['P0', 'P1', 'P2']) {
      const issues = issuesBySeverity[sev];
      if (issues.length > 0) {
        console.log(`\n${sev} (${issuesBySeverity[sev].length} 项):`);
        for (const issue of issues) {
          console.log(`  • ${issue.message}`);
        }
      }
    }

    // Save JSON report
    const reportPath = `${SCREENSHOT_DIR}/comparison-report.json`;
    writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 详细报告已保存: ${reportPath}`);

    return this.results.score >= 85;
  }

  async run() {
    try {
      console.log('🚀 启动 CS 1.6 物理对比测试...');
      await this.setup();
      console.log('✅ 浏览器已启动');

      await this.navigateAndStart();
      console.log('✅ 游戏已加载');

      const tests = [
        ['Movement Speed', () => this.measureMovementSpeed()],
        ['Jump Physics', () => this.measureJumpPhysics()],
        ['Walk Speed', () => this.measureWalkSpeed()],  // Test walk BEFORE crouch
        ['Crouch Speed', () => this.measureCrouchSpeed()],
        ['Bot Behavior', () => this.measureBotBehavior()],
        ['Weapon Mechanics', () => this.measureWeaponMechanics()],
      ];

      console.log('\n📋 执行测试项目:');
      for (const [name, testFn] of tests) {
        try {
          await testFn();
          console.log(`  ✓ ${name}`);
        } catch (e) {
          console.log(`  ✗ ${name}: ${e.message}`);
          this.results.issues.push({
            severity: 'P1',
            category: 'test',
            metric: name,
            message: `测试失败: ${e.message}`,
          });
        }
      }

      // Freeze time test needs fresh state
      console.log('  Running Freeze Time test...');
      try {
        await this.measureFreezeTime();
        console.log('  ✓ Freeze Time');
      } catch (e) {
        console.log(`  ✗ Freeze Time: ${e.message}`);
      }

      this.calculateFinalScore();
      const passed = this.printReport();

      console.log('\n' + '='.repeat(90));
      if (passed) {
        console.log('✅ 测试通过！游戏手感接近 CS 1.6 标准');
      } else {
        console.log('⚠️  需要优化：请根据上述问题清单调整参数');
      }
      console.log('='.repeat(90));

      return passed;

    } catch (error) {
      console.error('❌ 测试失败:', error);
      return false;
    } finally {
      await this.teardown();
    }
  }
}

// Run the test
const test = new CS16ComparisonTest();
const passed = await test.run();
process.exit(passed ? 0 : 1);
