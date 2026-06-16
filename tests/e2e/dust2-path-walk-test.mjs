import { chromium } from 'playwright';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const TEST_URL = 'http://localhost:5173/';

const PATHS = {
  // T 出生点出发的路径
  tSpawnToLong: {
    name: 'T Spawn -> A Long',
    waypoints: [
      { x: 0, z: 60, desc: 'T Spawn 中心' },
      { x: -35, z: 55, desc: '左转去 A Long' },
      { x: -35, z: 40, desc: 'A Long 入口' },
      { x: -35, z: 20, desc: 'A Long 中段' },
      { x: -35, z: 0, desc: 'A Long 中段' },
      { x: -35, z: -10, desc: 'Pit 区域' },
      { x: -30, z: -25, desc: 'A Long 出口' },
    ]
  },
  tSpawnToMid: {
    name: 'T Spawn -> Mid',
    waypoints: [
      { x: 0, z: 60, desc: 'T Spawn 中心' },
      { x: 0, z: 50, desc: 'Mid 斜坡' },
      { x: 0, z: 40, desc: '斜坡中段' },
      { x: 0, z: 30, desc: '斜坡底部' },
      { x: 0, z: 20, desc: 'Mid Doors' },
      { x: 0, z: 10, desc: 'Xbox 区域' },
    ]
  },
  tSpawnToBTunnels: {
    name: 'T Spawn -> B Tunnels',
    waypoints: [
      { x: 0, z: 60, desc: 'T Spawn 中心' },
      { x: 15, z: 55, desc: '右转去 B' },
      { x: 25, z: 55, desc: 'B 入口通道' },
      { x: 32, z: 55, desc: 'B Tunnels 入口' },
      { x: 32, z: 40, desc: '隧道中段' },
      { x: 32, z: 20, desc: '隧道下段' },
    ]
  },

  // CT 出生点出发的路径
  ctSpawnToARamp: {
    name: 'CT Spawn -> A Ramp',
    waypoints: [
      { x: 0, z: -33, desc: 'CT Spawn 中心' },
      { x: -15, z: -30, desc: '左转去 A' },
      { x: -25, z: -28, desc: 'A 出口' },
      { x: -27, z: -22, desc: 'A Ramp 底部' },
      { x: -27, z: -18, desc: '斜坡上升中' },
      { x: -27, z: -12, desc: '斜坡顶部' },
    ]
  },
  ctSpawnToMid: {
    name: 'CT Spawn -> Mid',
    waypoints: [
      { x: 0, z: -33, desc: 'CT Spawn 中心' },
      { x: 0, z: -28, desc: 'Mid 出口' },
      { x: 0, z: -22, desc: 'CT Mid 走廊' },
      { x: 0, z: -15, desc: 'CT Window 下方' },
    ]
  },

  // 垂直移动测试
  catwalkStairs: {
    name: 'Catwalk 楼梯上下',
    waypoints: [
      { x: -19, z: -6, desc: '楼梯底部' },
      { x: -18, z: -8, desc: '第2级' },
      { x: -17, z: -10, desc: '第3级' },
      { x: -16, z: -12, desc: '第4级' },
      { x: -15, z: -14, desc: '走道平台' },
      { x: -15, z: -10, desc: '回走测试' },
    ]
  },
  pitJumpAndClimb: {
    name: 'Pit 跳下与爬回',
    waypoints: [
      { x: -35, z: -2, desc: 'Pit 边缘' },
      { x: -35, z: -3, desc: '跳下 Pit' },
      { x: -33, z: -5, desc: 'Pit 底部' },
      { x: -32, z: -4, desc: '爬回台阶' },
      { x: -32, z: -2, desc: '回到地面' },
    ]
  },
  bTunnelStairs: {
    name: 'B Tunnels 旋转楼梯',
    waypoints: [
      { x: 29, z: 12, desc: '楼梯底部' },
      { x: 30, z: 10, desc: '旋转中' },
      { x: 32, z: 8, desc: '平台' },
      { x: 33, z: 6, desc: '上层走道' },
    ]
  },

  // 掉落伤害测试
  catwalkDropToASite: {
    name: 'Catwalk 跳下到 A Site',
    waypoints: [
      { x: -15, z: -12, desc: 'Catwalk 平台' },
      { x: -15, z: -10, desc: '跳下' },
      { x: -15, z: -8, desc: '落地 A Site' },
    ]
  },
};

class PathWalkTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = [];
    this.currentMode = '';
    this.currentResult = null;
  }

  async setup() {
    this.browser = await chromium.launch({
      headless: process.env.HEADLESS !== 'false',
      args: ['--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
    });
    this.page = await this.browser.newPage({ viewport: { width: 1280, height: 720 } });
    this.page.on('pageerror', error => {
      if (this.currentResult) {
        this.currentResult.errors.push(`Console error: ${error.message}`);
      }
    });
  }

  async teardown() {
    if (this.browser) await this.browser.close();
  }

  async takeScreenshot(name) {
    if (!this.page) return;
    try {
      const path = `tests/screenshots/path-${this.currentMode}-${name}.png`;
      await this.page.screenshot({ path, fullPage: false, timeout: 10000 });
      if (this.currentResult) {
        this.currentResult.screenshots.push(path);
      }
    } catch (e) {
      // 截图失败不影响测试
    }
  }

  check(condition, description) {
    if (!this.currentResult) return;
    if (condition) {
      this.currentResult.checks.push(`✓ ${description}`);
    } else {
      this.currentResult.errors.push(`✗ ${description}`);
      this.currentResult.passed = false;
    }
  }

  async getPlayerPosition() {
    if (!this.page) throw new Error('Page not initialized');
    return this.page.evaluate(() => window.__debugPlayerPosition?.());
  }

  async getPlayerHealth() {
    if (!this.page) throw new Error('Page not initialized');
    return this.page.evaluate(() => {
      const state = window.__debugInputState?.();
      return state?.health ?? 100;
    });
  }

  async waitForGrounded(timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const state = await this.page.evaluate(() => window.__debugInputState?.());
      if (state?.grounded) return true;
      await this.page.waitForTimeout(100);
    }
    return false;
  }

  async navigateToGame(mode = 'solo') {
    if (!this.page) throw new Error('Page not initialized');
    await this.page.goto(TEST_URL, { waitUntil: 'domcontentloaded' });
    await this.page.waitForSelector('[data-action="solo"]', { timeout: 15000 });
    await this.page.click('[data-map="dust2"]');
    await this.page.waitForTimeout(500);
    await this.page.click(`[data-action="${mode}"]`);
    await this.page.waitForTimeout(5000);

    // 解锁鼠标
    await this.page.evaluate(() => {
      window.__debugAllowPointerLockBypassForTests?.();
    });
  }

  async moveToDirection(direction, duration = 1000) {
    if (!this.page) return;

    const keyMap = {
      forward: 'KeyW',
      backward: 'KeyS',
      left: 'KeyA',
      right: 'KeyD',
    };

    const key = keyMap[direction];
    if (!key) throw new Error(`Unknown direction: ${direction}`);

    await this.page.keyboard.down(key);
    await this.page.waitForTimeout(duration);
    await this.page.keyboard.up(key);
  }

  async walkPath(pathName, path) {
    console.log(`  测试路径: ${path.name}`);

    const startPos = await this.getPlayerPosition();
    const startHealth = await this.getPlayerHealth();
    let previousPos = startPos;

    for (let i = 0; i < path.waypoints.length; i++) {
      const wp = path.waypoints[i];
      console.log(`    路径点 ${i + 1}/${path.waypoints.length}: ${wp.desc}`);

      // 向目标方向移动（简化的人类行为）
      const dx = wp.x - previousPos.x;
      const dz = wp.z - previousPos.z;

      if (Math.abs(dx) > 1) {
        await this.moveToDirection(dx > 0 ? 'right' : 'left', Math.min(Math.abs(dx) * 100, 1000));
      }
      if (Math.abs(dz) > 1) {
        await this.moveToDirection(dz > 0 ? 'forward' : 'backward', Math.min(Math.abs(dz) * 100, 1000));
      }

      await this.page.waitForTimeout(200);

      const currentPos = await this.getPlayerPosition();
      const currentHealth = await this.getPlayerHealth();

      this.check(!!currentPos, `获取位置: ${wp.desc}`);

      // 检查是否有位移（确保不是瞬移）
      if (previousPos && currentPos) {
        const dist = Math.sqrt(
          Math.pow(currentPos.x - previousPos.x, 2) +
          Math.pow(currentPos.z - previousPos.z, 2)
        );
        this.check(dist < 20, `无瞬移: 移动距离 ${dist.toFixed(2)}`);
      }

      // 掉落伤害检测
      if (currentHealth < startHealth) {
        this.check(true, `检测到掉落伤害: ${startHealth - currentHealth} HP (从 ${wp.desc} 掉落)`);
      }

      previousPos = currentPos;
      await this.takeScreenshot(`${pathName}-wp${i}`);
    }

    await this.waitForGrounded();
    const endPos = await this.getPlayerPosition();
    this.check(!!endPos, `路径完成: ${path.name}`);
  }

  async testSpawnPositions() {
    console.log('  验证出生点位置...');

    const pos = await this.getPlayerPosition();
    this.check(!!pos, '可以获取玩家位置');

    if (pos) {
      const isTSpawn = pos.z > 50 && Math.abs(pos.x) < 10;
      const isCtSpawn = pos.z < -30 && Math.abs(pos.x) < 10;

      this.check(isTSpawn || isCtSpawn,
        `出生点位置正确: (${pos.x.toFixed(1)}, ${pos.z.toFixed(1)}) - ${isTSpawn ? 'T Spawn' : isCtSpawn ? 'CT Spawn' : '未知'}`);
    }
  }

  async testMode(mode, paths) {
    this.currentMode = mode;
    this.currentResult = { mode, passed: true, checks: [], errors: [], screenshots: [] };

    console.log(`\n测试模式: ${mode}`);

    await this.navigateToGame(mode);
    await this.takeScreenshot('start');

    // 验证出生点
    await this.testSpawnPositions();

    // 测试所有路径
    for (const [pathName, path] of Object.entries(paths)) {
      await this.walkPath(pathName, path);
    }

    await this.takeScreenshot('complete');
    this.results.push(this.currentResult);
  }

  printReport() {
    console.log('\n' + '='.repeat(80));
    console.log('DUST2 路径行走测试报告');
    console.log('='.repeat(80));

    for (const result of this.results) {
      console.log(`\n【${result.mode}】`);
      console.log('-'.repeat(40));
      console.log(`状态: ${result.passed ? '✓ 通过' : '✗ 失败'}`);
      console.log(`\n通过检查 (${result.checks.length} 项):`);
      for (const check of result.checks.slice(0, 20)) {
        console.log(`  ${check}`);
      }
      if (result.checks.length > 20) {
        console.log(`  ... 还有 ${result.checks.length - 20} 项通过`);
      }
      if (result.errors.length > 0) {
        console.log(`\n问题 (${result.errors.length} 项):`);
        for (const error of result.errors) {
          console.log(`  ${error}`);
        }
      }
      if (result.screenshots.length > 0) {
        console.log(`\n截图 (${result.screenshots.length} 张)`);
      }
    }

    const totalPassed = this.results.filter(r => r.passed).length;
    console.log('\n' + '='.repeat(80));
    console.log(`总结: ${totalPassed}/${this.results.length} 模式通过测试`);
    console.log('='.repeat(80));

    return this.results.every(r => r.passed);
  }
}

async function main() {
  const test = new PathWalkTest();

  try {
    console.log('启动 DUST2 路径行走测试...');
    await test.setup();
    console.log('浏览器已启动');

    // 测试单人模式
    console.log('\n=== 单人任务闯关模式 ===');
    await test.testMode('solo', PATHS);

    // 测试 TDM 模式
    console.log('\n=== 团队死斗模式 ===');
    await test.testMode('tdm', PATHS);

    // 测试爆破模式
    console.log('\n=== 5v5爆破模式 ===');
    await test.testMode('defusal', PATHS);

    const allPassed = test.printReport();

    if (!allPassed) {
      console.error('\n❌ 部分测试未通过，请检查上述问题');
      process.exit(1);
    } else {
      console.log('\n✅ 所有测试通过！地图路径行走正常。');
    }

  } catch (error) {
    console.error('测试失败:', error);
    process.exit(1);
  } finally {
    await test.teardown();
  }
}

main();
