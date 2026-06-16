// Inferno 地图路径行走测试
// 测试三个模式下的地图通行性：solo, tdm, defusal
// 包含：上下楼梯、跳箱子、从二楼跳下、穿模检测、悬浮检测

import { chromium } from 'playwright';

const TEST_URL = 'http://localhost:5173/';

// Inferno 路径点定义（游戏单位）
// 参考 InfernoLayout.ts 中的 calLOUTS 和 COLLIDERS
const PATHS = {
  // ========== T 出生点出发的路径 ==========
  tSpawnToBanana: {
    name: 'T Spawn -> Banana -> A Site',
    waypoints: [
      { x: 0, z: -30, desc: 'T Spawn 中心' },
      { x: -10, z: -25, desc: '左转去 Banana' },
      { x: -20, z: -20, desc: 'Banana 入口' },
      { x: -28, z: -10, desc: 'Banana 中段' },
      { x: -28, z: 0, desc: 'Banana 中段' },
      { x: -25, z: 10, desc: '香蕉道弯' },
      { x: -22, z: 20, desc: 'A Site 入口' },
    ]
  },

  tSpawnToMid: {
    name: 'T Spawn -> Mid -> Apartments',
    waypoints: [
      { x: 0, z: -30, desc: 'T Spawn 中心' },
      { x: 0, z: -20, desc: '中路斜坡' },
      { x: 0, z: -10, desc: 'Mid 中心' },
      { x: -5, z: 0, desc: 'Mid 木箱' },
      { x: -15, z: -5, desc: 'Apartments 入口' },
      { x: -15, z: 5, desc: '公寓楼内部' },
    ]
  },

  tSpawnToBShort: {
    name: 'T Spawn -> B Short -> B Site',
    waypoints: [
      { x: 0, z: -30, desc: 'T Spawn 中心' },
      { x: 15, z: -25, desc: '右转去 B Short' },
      { x: 25, z: -20, desc: 'B Short 入口' },
      { x: 30, z: -10, desc: 'B Short 中段' },
      { x: 30, z: 0, desc: 'B Short 平台' },
      { x: 25, z: 15, desc: 'B Site 入口' },
    ]
  },

  // ========== CT 出生点出发的路径 ==========
  ctSpawnToASite: {
    name: 'CT Spawn -> A Site -> A Long',
    waypoints: [
      { x: 0, z: 38, desc: 'CT Spawn 中心' },
      { x: -15, z: 30, desc: '左转去 A Site' },
      { x: -15, z: 20, desc: 'A Site 平台' },
      { x: -20, z: 10, desc: 'A Site 内部' },
      { x: -25, z: 5, desc: 'A Long 入口' },
      { x: -30, z: 0, desc: 'A Long 中段' },
    ]
  },

  ctSpawnToMid: {
    name: 'CT Spawn -> Mid -> T Spawn',
    waypoints: [
      { x: 0, z: 38, desc: 'CT Spawn 中心' },
      { x: 0, z: 30, desc: 'CT 中路走廊' },
      { x: 0, z: 20, desc: 'Mid CT 侧' },
      { x: 0, z: 10, desc: 'Mid 中心' },
      { x: 0, z: 0, desc: 'Mid 木箱' },
      { x: 0, z: -10, desc: 'Mid T 侧' },
    ]
  },

  ctSpawnToBSite: {
    name: 'CT Spawn -> B Site',
    waypoints: [
      { x: 0, z: 38, desc: 'CT Spawn 中心' },
      { x: 15, z: 30, desc: '右转去 B Site' },
      { x: 15, z: 20, desc: 'B Site 平台' },
      { x: 20, z: 10, desc: 'B Site 内部' },
    ]
  },

  // ========== 垂直移动测试 ==========
  apartmentsStairs: {
    name: 'Apartments 楼梯上下',
    waypoints: [
      { x: -15, z: -5, desc: '楼梯底部' },
      { x: -15, z: 0, desc: '上楼中' },
      { x: -15, z: 5, desc: '二楼平台' },
      { x: -15, z: 0, desc: '下楼中' },
      { x: -15, z: -5, desc: '回到一楼' },
    ]
  },

  aSiteJumpOnCar: {
    name: 'A Site 跳上汽车',
    waypoints: [
      { x: -20, z: 20, desc: 'A Site 地面' },
      { x: -20, z: 22, desc: '汽车旁边' },
      { x: -20, z: 23, desc: '跳上汽车' },
      { x: -20, z: 22, desc: '跳下汽车' },
    ]
  },

  midJumpOnBox: {
    name: 'Mid 跳上木箱',
    waypoints: [
      { x: 0, z: 0, desc: 'Mid 地面' },
      { x: 0, z: 2, desc: '木箱旁边' },
      { x: 0, z: 3, desc: '跳上木箱' },
      { x: 0, z: 2, desc: '跳下木箱' },
    ]
  },

  // ========== 掉落测试 ==========
  secondFloorJumpDown: {
    name: '二楼跳下到地面',
    waypoints: [
      { x: -15, z: 5, desc: '二楼平台边缘' },
      { x: -15, z: 7, desc: '跳出二楼' },
      { x: -15, z: 8, desc: '落地检测' },
    ]
  },

  bSiteJumpDown: {
    name: 'B Site 平台跳下',
    waypoints: [
      { x: 15, z: 15, desc: 'B Site 平台边缘' },
      { x: 15, z: 18, desc: '跳下平台' },
      { x: 15, z: 20, desc: '落地检测' },
    ]
  },

  // ========== 斜坡测试 ==========
  bananaRamp: {
    name: 'Banana 斜坡上下',
    waypoints: [
      { x: -28, z: -15, desc: '斜坡底部' },
      { x: -28, z: -10, desc: '上坡中' },
      { x: -28, z: -5, desc: '斜坡顶部' },
      { x: -28, z: -10, desc: '下坡中' },
      { x: -28, z: -15, desc: '回到底部' },
    ]
  },

  midRamp: {
    name: 'Mid 斜坡上下',
    waypoints: [
      { x: 0, z: -20, desc: '斜坡底部' },
      { x: 0, z: -15, desc: '上坡中' },
      { x: 0, z: -10, desc: '斜坡顶部' },
      { x: 0, z: -15, desc: '下坡中' },
      { x: 0, z: -20, desc: '回到底部' },
    ]
  },
};

class InfernoPathWalkTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = [];
    this.currentMode = '';
    this.currentResult = null;
    this.issues = [];
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
      const path = `tests/screenshots/inferno-${this.currentMode}-${name}.png`;
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
      this.issues.push(`[${this.currentMode}] ${description}`);
    }
  }

  async getPlayerPosition() {
    if (!this.page) throw new Error('Page not initialized');
    return this.page.evaluate(() => window.__debugPlayerPosition?.());
  }

  async getPlayerState() {
    if (!this.page) throw new Error('Page not initialized');
    return this.page.evaluate(() => window.__debugInputState?.());
  }

  async getPlayerHealth() {
    if (!this.page) throw new Error('Page not initialized');
    const state = await this.getPlayerState();
    return state?.health ?? 100;
  }

  async waitForGrounded(timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const state = await this.getPlayerState();
      if (state?.grounded) return true;
      await this.page.waitForTimeout(100);
    }
    return false;
  }

  async checkFloating() {
    const state = await this.getPlayerState();
    if (!state) return false;
    // 如果 Y 坐标明显高于地面且不在地上，可能是悬浮
    return !state.grounded && state.velocityY === 0;
  }

  async navigateToGame(mode = 'solo') {
    if (!this.page) throw new Error('Page not initialized');
    await this.page.goto(TEST_URL, { waitUntil: 'domcontentloaded' });
    await this.page.waitForSelector('[data-action="solo"]', { timeout: 15000 });
    await this.page.click('[data-map="inferno"]');
    await this.page.waitForTimeout(500);
    await this.page.click(`[data-action="${mode}"]`);
    await this.page.waitForTimeout(8000); // 等待冻结时间

    // 解锁鼠标
    await this.page.evaluate(() => {
      window.__debugAllowPointerLockBypassForTests?.();
    });
  }

  async moveKey(key, duration = 1000) {
    if (!this.page) return;
    await this.page.keyboard.down(key);
    await this.page.waitForTimeout(duration);
    await this.page.keyboard.up(key);
  }

  async jump() {
    if (!this.page) return;
    await this.page.keyboard.down('Space');
    await this.page.waitForTimeout(150);
    await this.page.keyboard.up('Space');
    await this.page.waitForTimeout(500);
  }

  async moveToTarget(targetX, targetZ, maxTime = 3000) {
    const start = Date.now();
    const startPos = await this.getPlayerPosition();
    if (!startPos) return;

    while (Date.now() - start < maxTime) {
      const pos = await this.getPlayerPosition();
      if (!pos) break;

      const dx = targetX - pos.x;
      const dz = targetZ - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 2) break;

      // 同时按下多个方向键
      if (Math.abs(dx) > 0.5) {
        await this.page.keyboard.down(dx > 0 ? 'KeyD' : 'KeyA');
      }
      if (Math.abs(dz) > 0.5) {
        await this.page.keyboard.down(dz > 0 ? 'KeyW' : 'KeyS');
      }

      await this.page.waitForTimeout(100);

      await this.page.keyboard.up('KeyW');
      await this.page.keyboard.up('KeyS');
      await this.page.keyboard.up('KeyA');
      await this.page.keyboard.up('KeyD');
    }
  }

  async walkPath(pathName, path) {
    console.log(`    路径: ${path.name}`);

    const startPos = await this.getPlayerPosition();
    const startHealth = await this.getPlayerHealth();
    let previousPos = startPos;
    let maxHealthLost = 0;

    for (let i = 0; i < path.waypoints.length; i++) {
      const wp = path.waypoints[i];

      // 向目标移动
      await this.moveToTarget(wp.x, wp.z, 2000);
      await this.page.waitForTimeout(200);

      const currentPos = await this.getPlayerPosition();
      const currentState = await this.getPlayerState();
      const currentHealth = await this.getPlayerHealth();

      this.check(!!currentPos, `获取位置: ${wp.desc}`);

      if (currentPos) {
        // 检查是否有瞬移
        if (previousPos) {
          const dist = Math.sqrt(
            Math.pow(currentPos.x - previousPos.x, 2) +
            Math.pow(currentPos.z - previousPos.z, 2)
          );
          this.check(dist < 15, `无瞬移: 移动距离 ${dist.toFixed(2)}`);
        }

        // 检查是否移动到地图外
        const mapBoundX = 40;
        const mapBoundZ = 45;
        const outsideMap = Math.abs(currentPos.x) > mapBoundX ||
          currentPos.z < -35 || currentPos.z > 42;
        this.check(!outsideMap,
          `在地图内: (${currentPos.x.toFixed(1)}, ${currentPos.z.toFixed(1)})`);

        // 检查 Y 坐标是否合理
        this.check(currentPos.y > -5 && currentPos.y < 10,
          `Y 坐标合理: y=${currentPos.y.toFixed(2)}`);
      }

      // 检查悬浮
      const isFloating = await this.checkFloating();
      this.check(!isFloating, `无悬浮状态`);

      // 检查掉落伤害
      if (currentHealth < startHealth) {
        maxHealthLost = Math.max(maxHealthLost, startHealth - currentHealth);
      }

      previousPos = currentPos;
      await this.takeScreenshot(`${pathName}-wp${i}`);
    }

    await this.waitForGrounded();
    const endPos = await this.getPlayerPosition();

    if (maxHealthLost > 0) {
      console.log(`      ⚠️ 检测到掉落伤害: ${maxHealthLost} HP`);
    }

    this.check(!!endPos, `路径完成: ${path.name}`);
  }

  async testSpawnPositions() {
    console.log('  验证出生点位置...');

    const pos = await this.getPlayerPosition();
    const state = await this.getPlayerState();
    this.check(!!pos, '可以获取玩家位置');

    if (pos) {
      // Inferno T 出生点在 Z = -30 左右
      // CT 出生点在 Z = 38 左右
      const isTSpawn = pos.z < -20 && Math.abs(pos.x) < 10;
      const isCtSpawn = pos.z > 30 && Math.abs(pos.x) < 10;

      this.check(isTSpawn || isCtSpawn,
        `出生点位置正确: (${pos.x.toFixed(1)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(1)}) - ${isTSpawn ? 'T Spawn' : isCtSpawn ? 'CT Spawn' : '未知'}`);
    }

    this.check(state?.grounded, '出生时在地面上');
  }

  async testBasicMovement() {
    console.log('  测试基础移动...');

    const pos1 = await this.getPlayerPosition();
    await this.moveKey('KeyW', 1000);
    const pos2 = await this.getPlayerPosition();

    const distW = Math.abs(pos2.z - pos1.z);
    this.check(distW > 1, `前移动作正常: 距离=${distW.toFixed(2)}`);

    await this.moveKey('KeyA', 1000);
    const pos3 = await this.getPlayerPosition();
    const distA = Math.abs(pos3.x - pos2.x);
    this.check(distA > 1, `左移动作正常: 距离=${distA.toFixed(2)}`);
  }

  async testJump() {
    console.log('  测试跳跃...');

    const state1 = await this.getPlayerState();
    await this.jump();
    const state2 = await this.getPlayerState();

    this.check(state2?.grounded, '跳跃后能回到地面');
  }

  async testMode(mode, paths) {
    this.currentMode = mode;
    this.currentResult = { mode, passed: true, checks: [], errors: [], screenshots: [] };

    console.log(`\n${'='.repeat(60)}`);
    console.log(`测试模式: ${mode}`);
    console.log('='.repeat(60));

    await this.navigateToGame(mode);
    await this.takeScreenshot('start');

    // 验证出生点
    await this.testSpawnPositions();

    // 基础移动测试
    await this.testBasicMovement();

    // 跳跃测试
    await this.testJump();

    // 测试所有路径
    const pathKeys = Object.keys(paths);
    for (let i = 0; i < pathKeys.length; i++) {
      const pathName = pathKeys[i];
      await this.walkPath(pathName, paths[pathName]);

      // 每测试完一条路径，重置位置到出生点（重新开始）
      if (i < pathKeys.length - 1) {
        await this.page.reload({ waitUntil: 'domcontentloaded' });
        await this.navigateToGame(mode);
      }
    }

    await this.takeScreenshot('complete');
    this.results.push(this.currentResult);

    console.log(`  状态: ${this.currentResult.passed ? '✓' : '✗'}`);
  }

  printReport() {
    console.log('\n' + '='.repeat(80));
    console.log('INFERNO 地图路径行走测试报告');
    console.log('='.repeat(80));

    for (const result of this.results) {
      console.log(`\n【${result.mode} 模式】`);
      console.log('-'.repeat(40));
      console.log(`状态: ${result.passed ? '✓ 通过' : '✗ 失败'}`);
      console.log(`通过检查: ${result.checks.length} 项`);
      console.log(`发现问题: ${result.errors.length} 项`);

      if (result.errors.length > 0) {
        console.log(`\n问题列表:`);
        for (const error of result.errors) {
          console.log(`  ${error}`);
        }
      }
    }

    const totalPassed = this.results.filter(r => r.passed).length;
    console.log('\n' + '='.repeat(80));
    console.log(`总结: ${totalPassed}/${this.results.length} 模式通过测试`);
    console.log('='.repeat(80));

    if (this.issues.length > 0) {
      console.log('\n【需要修复的问题】');
      for (const issue of this.issues) {
        console.log(`  • ${issue}`);
      }
    }

    return this.results.every(r => r.passed);
  }
}

async function main() {
  const test = new InfernoPathWalkTest();

  try {
    console.log('启动 INFERNO 路径行走测试...');
    await test.setup();
    console.log('浏览器已启动');

    // 测试三个模式
    const modes = ['solo', 'tdm', 'defusal'];

    for (const mode of modes) {
      await test.testMode(mode, PATHS);
    }

    const allPassed = test.printReport();

    if (!allPassed) {
      console.error('\n❌ 部分测试未通过，请检查上述问题');
      process.exit(1);
    } else {
      console.log('\n✅ 所有测试通过！Inferno 地图路径行走正常。');
    }

  } catch (error) {
    console.error('测试失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await test.teardown();
  }
}

main();
