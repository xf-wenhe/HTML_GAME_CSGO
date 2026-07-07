import { chromium } from 'playwright';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const TEST_URL = process.env.E2E_URL || 'http://localhost:5173/';
const CS16_RULES = {
  FREEZE_TIME: 6000,
  ROUND_TIME: 300000,
  PLAYER_SPEED: 250,
  CROUCH_SPEED: 125,
  JUMP_HEIGHT: 45,
  GRAVITY: 800,
  MAX_HEALTH: 100,
  MAX_ARMOR: 100,
  BUY_ZONE_RADIUS: 128,
};

class Dust2TestSuite {
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
    const path = `tests/screenshots/dust2-${this.currentMode}-${name}.png`;
    await this.page.screenshot({ path, fullPage: false });
    if (this.currentResult) {
      this.currentResult.screenshots.push(path);
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

  async waitForState(predicate, timeout = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await predicate()) return true;
      await this.page.waitForTimeout(100);
    }
    return false;
  }

  async getDebugState() {
    if (!this.page) throw new Error('Page not initialized');
    return this.page.evaluate(() => (window).__debugInputState?.());
  }

  async navigateToGame() {
    if (!this.page) throw new Error('Page not initialized');
    await this.page.goto(TEST_URL, { waitUntil: 'domcontentloaded' });
    await this.page.waitForSelector('[data-action="solo"]', { timeout: 15000 });
    await this.takeScreenshot('menu-loaded');
  }

  async selectDust2Map() {
    if (!this.page) throw new Error('Page not initialized');
    await this.page.click('[data-map="dust2"]');
    await this.takeScreenshot('dust2-selected');
  }

  async testSoloMode() {
    this.currentMode = 'solo';
    this.currentResult = { mode: '单人任务闯关', passed: true, checks: [], errors: [], screenshots: [] };

    if (!this.page) throw new Error('Page not initialized');

    await this.page.click('[data-action="solo"]');
    await this.page.waitForTimeout(5000);
    await this.takeScreenshot('game-started');

    await this.testBasicMechanics();
    await this.testCs16BotMatch();
    await this.waitForSoloBotLivePhase();
    await this.testMovement();
    await this.testCombat();
    await this.testUiElements();

    await this.exitGame();
    this.results.push(this.currentResult);
  }

  async testTdmMode() {
    this.currentMode = 'tdm';
    this.currentResult = { mode: '团队死斗', passed: true, checks: [], errors: [], screenshots: [] };

    if (!this.page) throw new Error('Page not initialized');

    await this.page.click('[data-action="tdm"]');
    await this.page.waitForTimeout(5000);
    await this.takeScreenshot('tdm-started');

    await this.testBasicMechanics();
    await this.testTdmBuyPolicy();
    await this.testMovement();
    await this.testUiElements();

    await this.exitGame();
    this.results.push(this.currentResult);
  }

  async testDefusalMode() {
    this.currentMode = 'defusal';
    this.currentResult = { mode: '5v5爆破', passed: true, checks: [], errors: [], screenshots: [] };

    if (!this.page) throw new Error('Page not initialized');

    await this.page.click('[data-action="defusal"]');
    await this.page.waitForTimeout(5000);
    await this.takeScreenshot('defusal-started');

    await this.testBasicMechanics();
    await this.testBombMechanics();
    await this.testMovement();
    await this.testUiElements();

    await this.exitGame();
    this.results.push(this.currentResult);
  }

  async testBasicMechanics() {
    const state = await this.getDebugState();
    this.check(!!state, '游戏状态可访问');
    this.check(typeof state?.grounded === 'boolean', '地面状态可用');
    this.check(typeof state?.armor === 'number', '护甲状态可用');
    this.check(state?.weaponId, '有默认武器');
    this.check(Array.isArray(state?.keys), '按键状态可用');
    if (state?.cs16BotMatch) {
      this.check(state.cs16BotMatch.playerTeam === 'attackers', 'CS1.6 单人自动阵营默认 T 方');
      this.check(state.activeSlot === 'pistol' && state.weaponId === 'glock', 'CS1.6 T 方手枪局默认 Glock');
      this.check(state.armor === 0, 'CS1.6 单人手枪局默认不带护甲');
    } else if (state?.matchMode && state?.localTeam) {
      const expectedPistol = state.localTeam === 'defenders' ? 'usp' : 'glock';
      this.check(state.weaponId === expectedPistol, `多人 ${state.localTeam} 默认手枪为 ${expectedPistol}`);
    }
    await this.takeScreenshot('basic-mechanics');
  }

  async testCs16BotMatch() {
    const state = await this.getDebugState();
    this.check(!!state?.cs16BotMatch, 'CS1.6 Bot 匹配系统存在');

    if (state?.cs16BotMatch) {
      this.check(state.cs16BotMatch.phase === 'freezeTime' || state.cs16BotMatch.phase === 'live',
        `游戏阶段正确: ${state.cs16BotMatch.phase}`);
      this.check(
        state.cs16BotMatch.roundTimeRemaining > 295
          && state.cs16BotMatch.roundTimeRemaining <= CS16_RULES.ROUND_TIME / 1000,
        'CS1.6 单人回合使用五分钟计时'
      );
      this.check(Array.isArray(state.botDebugStates) && state.botDebugStates.length > 0,
        `Bot 已生成: ${state.botDebugStates.length} 个`);

      const hasWeapons = state.botDebugStates.every((bot) => bot.weaponId);
      this.check(hasWeapons, '所有 Bot 都携带武器');

      if (state.cs16BotMatch.phase === 'freezeTime') {
        this.check(state.cs16BotMatch.freezeRemaining <= CS16_RULES.FREEZE_TIME / 1000, 'CS1.6 单人冻结时间不超过 6 秒');
        this.check(state.canShoot === false, '冻结时间内不能射击');
      }
    }
    await this.takeScreenshot('bot-match');
  }

  async waitForSoloBotLivePhase() {
    if (this.currentMode !== 'solo') return;
    const live = await this.waitForState(async () => {
      const state = await this.getDebugState();
      return state?.cs16BotMatch?.phase === 'live';
    }, CS16_RULES.FREEZE_TIME + 3000);
    this.check(live, 'CS1.6 单人冻结时间结束后进入 LIVE');
  }

  async testMovement() {
    if (!this.page) throw new Error('Page not initialized');

    await this.page.evaluate(() => {
      (window).__debugAllowPointerLockBypassForTests?.();
    });

    const initialPos = await this.page.evaluate(() => (window).__debugPlayerPosition?.());
    this.check(!!initialPos, '可以获取玩家位置');
    const initialState = await this.getDebugState();
    const expectFrozen = this.currentMode === 'defusal' && initialState?.matchMode === 'defusal' && initialState?.matchPhase === 'buy';

    await this.page.keyboard.down('KeyW');
    if (initialPos && !expectFrozen) {
      await this.page.waitForFunction(
        start => {
          const current = (window).__debugPlayerPosition?.();
          return current && (Math.abs(current.z - start.z) > 0.1 || Math.abs(current.x - start.x) > 0.1);
        },
        initialPos,
        { timeout: 1500 }
      ).catch(() => undefined);
    } else {
      await this.page.waitForTimeout(500);
    }
    await this.page.keyboard.up('KeyW');

    const afterMove = await this.page.evaluate(() => (window).__debugPlayerPosition?.());
    if (initialPos && afterMove) {
      const moved = Math.abs(afterMove.z - initialPos.z) > 0.1 || Math.abs(afterMove.x - initialPos.x) > 0.1;
      if (expectFrozen) {
        this.check(!moved && initialState?.canMove === false, '爆破购买阶段冻结移动');
        await this.takeScreenshot('movement-test');
        return;
      }
      this.check(moved, 'W 键可以移动');
    }

    const settledBeforeJump = await this.page.waitForFunction(
      () => (window).__debugInputState?.().grounded === true,
      { timeout: 2000 }
    ).then(() => true).catch(() => false);
    this.check(settledBeforeJump, '跳跃前玩家已稳定站在地面');

    await this.page.keyboard.down('Space');
    await this.page.waitForTimeout(100);
    const jumpState = await this.getDebugState();
    await this.page.keyboard.up('Space');
    console.log(`跳跃状态: grounded=${jumpState?.grounded}, airborneTime=${jumpState?.airborneTime}`);
    this.check(
      jumpState?.grounded === false && (jumpState?.airborneTime ?? 0) > 0.05,
      '跳跃后确实离地并进入滞空状态'
    );

    await this.page.waitForFunction(
      () => {
        const state = (window).__debugInputState?.();
        return state?.grounded === true && state?.airborneTime === 0;
      },
      { timeout: 1600 }
    ).catch(() => undefined);
    const landState = await this.getDebugState();
    this.check(landState?.grounded === true && landState?.airborneTime === 0, '跳跃后落地且滞空状态清零');

    await this.page.keyboard.down('ControlLeft');
    await this.page.waitForFunction(
      () => (window).__debugInputState?.().crouched === true,
      { timeout: 1200 }
    ).catch(() => undefined);
    const crouchState = await this.getDebugState();
    this.check(crouchState?.crouched === true, 'Ctrl 键可以蹲下');
    this.check(Math.abs((crouchState?.collisionHeight ?? 0) - 0.5) < 0.01, '蹲伏使用 CS1.6 的 50HU 碰撞高度');
    this.check(
      typeof landState?.playerPosition?.y === 'number'
        && typeof crouchState?.playerPosition?.y === 'number'
        && crouchState.playerPosition.y < landState.playerPosition.y - 0.2,
      '蹲伏视点降至 CS1.6 高度'
    );
    await this.page.keyboard.up('ControlLeft');
    await this.page.waitForTimeout(200);

    await this.takeScreenshot('movement-test');
  }

  async testCombat() {
    if (!this.page) throw new Error('Page not initialized');

    const state = await this.getDebugState();
    this.check(state?.canShoot !== undefined, '射击状态可用');

    const ammoBeforeShoot = state?.ammo;
    await this.page.mouse.click(640, 360);
    await this.page.waitForTimeout(100);

    const afterShoot = await this.getDebugState();
    this.check(afterShoot?.ammo !== undefined, '弹药计数可用');
    if (state?.canShoot && typeof ammoBeforeShoot === 'number') {
      this.check(afterShoot?.ammo === ammoBeforeShoot - 1, '左键点击会开火并消耗 1 发弹药');
    }

    await this.page.keyboard.press('KeyB');
    await this.page.waitForTimeout(300);
    const buyState = await this.getDebugState();
    if (buyState?.cs16BotMatch?.phase === 'live') {
      this.check(buyState?.isBuyMenuOpen === false, 'LIVE 阶段 B 键只提示，不遮挡战斗视野');
    } else {
      this.check(buyState?.isBuyMenuOpen === true, 'B 键打开购买菜单');
    }

    if (buyState?.isBuyMenuOpen) {
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(200);
    }

    await this.page.keyboard.press('KeyR');
    await this.page.waitForTimeout(500);

    if (state?.cs16BotMatch) {
      await this.page.keyboard.press('Digit3');
      await this.page.waitForTimeout(120);
      const knifeState = await this.getDebugState();
      this.check(knifeState?.activeSlot === 'knife' && knifeState?.weaponId === 'knife', '3 键切到战术刀且 HUD 状态一致');

      await this.page.keyboard.press('Digit4');
      await this.page.waitForTimeout(120);
      const grenadeState = await this.getDebugState();
      const grenadeHud = await this.page.evaluate(() => ({
        weaponName: document.querySelector('.weapon-name')?.textContent?.trim() ?? '',
        ammoReserve: document.querySelector('.ammo-reserve')?.textContent?.trim() ?? ''
      }));
      this.check(
        grenadeState?.activeSlot === 'knife'
          && grenadeState?.weaponId === 'knife'
          && grenadeHud.weaponName === '战术刀',
        '没有投掷物时 4 键不会切到空雷槽'
      );
      this.check(
        grenadeState?.grenadeInventory?.he === 0
          && grenadeState?.grenadeInventory?.flash === 0
          && grenadeState?.grenadeInventory?.smoke === 0
          && grenadeState?.grenadeInventory?.incendiary === 0
          && grenadeState?.grenadeInventory?.decoy === 0,
        'CS1.6 单人开局不免费携带全套投掷物'
      );
    }

    await this.takeScreenshot('combat-test');
  }

  async testTdmBuyPolicy() {
    const state = await this.getDebugState();
    if (this.currentMode !== 'tdm' || state?.matchMode !== 'tdm') return;

    await this.page.keyboard.press('KeyB');
    await this.page.waitForTimeout(200);
    const buyPolicy = await this.page.evaluate(() => ({
      isBuyMenuOpen: window.__debugInputState?.().isBuyMenuOpen,
      localTeam: window.__debugInputState?.().localTeam,
      p228Disabled: document.querySelector('[data-weapon="p228"]')?.disabled ?? null,
      glockDisabled: document.querySelector('[data-weapon="glock"]')?.disabled ?? null,
      glockTitle: document.querySelector('[data-weapon="glock"]')?.getAttribute('title') ?? '',
      akDisabled: document.querySelector('[data-weapon="ak47"]')?.disabled ?? null,
      akTitle: document.querySelector('[data-weapon="ak47"]')?.getAttribute('title') ?? '',
      awpDisabled: document.querySelector('[data-weapon="awp"]')?.disabled ?? null,
      awpTitle: document.querySelector('[data-weapon="awp"]')?.getAttribute('title') ?? '',
      m4Disabled: document.querySelector('[data-weapon="m4a1"]')?.disabled ?? null,
      m4Title: document.querySelector('[data-weapon="m4a1"]')?.getAttribute('title') ?? '',
      uspDisabled: document.querySelector('[data-weapon="usp"]')?.disabled ?? null,
      uspTitle: document.querySelector('[data-weapon="usp"]')?.getAttribute('title') ?? '',
      kitDisabled: document.querySelector('[data-defuse-kit="true"]')?.disabled ?? null,
      kitTitle: document.querySelector('[data-defuse-kit="true"]')?.getAttribute('title') ?? '',
      heDisabled: document.querySelector('[data-grenade="he"]')?.disabled ?? null,
    }));
    this.check(buyPolicy.isBuyMenuOpen === true, 'TDM B 键打开 CS1.6 买菜单');
    this.check(buyPolicy.localTeam === 'attackers' || buyPolicy.localTeam === 'defenders', `TDM 本地阵营可识别: ${buyPolicy.localTeam}`);
    this.check(buyPolicy.p228Disabled === false, 'TDM 手枪局可以买 P228');
    this.check(buyPolicy.awpDisabled === true && buyPolicy.awpTitle === '金钱不足', 'TDM AWP 因金钱不足禁用');
    if (buyPolicy.localTeam === 'attackers') {
      this.check(buyPolicy.akDisabled === true && buyPolicy.akTitle === '金钱不足', 'TDM T 方 AK 因金钱不足禁用');
      this.check(buyPolicy.m4Disabled === true && buyPolicy.m4Title === '当前阵营不能购买', 'TDM T 方不能购买 M4A1');
      this.check(buyPolicy.uspDisabled === true && buyPolicy.uspTitle === '当前阵营不能购买', 'TDM T 方不能购买 USP');
    } else if (buyPolicy.localTeam === 'defenders') {
      this.check(buyPolicy.m4Disabled === true && buyPolicy.m4Title === '金钱不足', 'TDM CT 方 M4A1 因金钱不足禁用');
      this.check(buyPolicy.akDisabled === true && buyPolicy.akTitle === '当前阵营不能购买', 'TDM CT 方不能购买 AK-47');
      this.check(buyPolicy.glockDisabled === true && buyPolicy.glockTitle === '当前阵营不能购买', 'TDM CT 方不能购买 Glock');
    }
    this.check(buyPolicy.kitDisabled === true && buyPolicy.kitTitle === '当前模式不能购买', 'TDM 不能购买拆弹钳');
    this.check(buyPolicy.heDisabled === false, 'TDM 手枪局可以买 HE');
    if (buyPolicy.isBuyMenuOpen) {
      await this.page.click('[data-grenade="he"]');
      await this.waitForState(async () => {
        const state = await this.getDebugState();
        return state?.isBuyMenuOpen === false && state?.grenadeInventory?.he === 1;
      }, 3000);
    }

    await this.page.keyboard.press('Digit4');
    await this.page.waitForTimeout(500);
    const grenadeState = await this.getDebugState();
    const grenadeHud = await this.page.evaluate(() => ({
      weaponName: document.querySelector('.weapon-name')?.textContent?.trim(),
    }));
    this.check(
      grenadeState?.activeSlot === 'grenade'
        && grenadeState?.weaponId === 'grenade'
        && grenadeState?.grenadeInventory?.he === 1
        && grenadeHud.weaponName?.includes('高爆'),
      'TDM 多人快照不会打断已切出的 HE'
    );

    await this.page.evaluate(() => window.__debugAllowPointerLockBypassForTests?.());
    await this.page.mouse.click(640, 360);
    await this.waitForState(async () => {
      const state = await this.getDebugState();
      return state?.grenadeInventory?.he === 0;
    }, 3000);
    const afterGrenadeThrow = await this.getDebugState();
    const afterGrenadeThrowHud = await this.page.evaluate(() => ({
      weaponName: document.querySelector('.weapon-name')?.textContent?.trim(),
    }));
    const expectedPistol = afterGrenadeThrow?.localTeam === 'defenders' ? 'usp' : 'glock';
    this.check(
      afterGrenadeThrow?.activeSlot === 'pistol'
        && afterGrenadeThrow?.weaponId === expectedPistol
        && afterGrenadeThrow?.grenadeInventory?.he === 0
        && !afterGrenadeThrowHud.weaponName?.includes('高爆'),
      'CS1.6 投出手雷后自动切回先前手枪'
    );

    const originalPosition = state.playerPosition;
    await this.page.evaluate(() => window.__debugSetPlayerPosition?.(0, -30));
    await this.page.waitForTimeout(100);
    await this.page.keyboard.press('KeyB');
    await this.page.waitForTimeout(200);
    const awayBuyState = await this.getDebugState();
    this.check(awayBuyState?.isBuyMenuOpen === false, 'TDM 离开出生买区不能打开购买菜单');
    if (originalPosition) {
      await this.page.evaluate((position) => window.__debugSetPlayerPosition?.(position.x, position.z, 0, position.y), originalPosition);
      await this.page.waitForTimeout(100);
    }

    await this.takeScreenshot('tdm-buy-policy');
  }

  async testBombMechanics() {
    const state = await this.getDebugState();
    this.check(state?.cs16BotMatch !== null || state?.activePanel !== undefined, '游戏状态系统可用');
    if (this.currentMode === 'defusal' && state?.matchMode === 'defusal' && state?.matchPhase === 'buy') {
      await this.page.keyboard.press('KeyB');
      await this.page.waitForTimeout(200);
      const buyPolicy = await this.page.evaluate(() => ({
        isBuyMenuOpen: window.__debugInputState?.().isBuyMenuOpen,
        localTeam: window.__debugInputState?.().localTeam,
        hasAwp: Boolean(document.querySelector('[data-weapon="awp"]')),
        akDisabled: document.querySelector('[data-weapon="ak47"]')?.disabled ?? null,
        akTitle: document.querySelector('[data-weapon="ak47"]')?.getAttribute('title') ?? '',
        m4Disabled: document.querySelector('[data-weapon="m4a1"]')?.disabled ?? null,
        m4Title: document.querySelector('[data-weapon="m4a1"]')?.getAttribute('title') ?? '',
        uspDisabled: document.querySelector('[data-weapon="usp"]')?.disabled ?? null,
        uspTitle: document.querySelector('[data-weapon="usp"]')?.getAttribute('title') ?? '',
      }));
      this.check(buyPolicy.isBuyMenuOpen === true, '爆破购买阶段 B 键打开 CS1.6 买菜单');
      this.check(buyPolicy.localTeam === 'attackers', '爆破首个本地玩家默认 T 方');
      this.check(buyPolicy.hasAwp === true, '爆破买菜单包含 CS1.6 AWP');
      this.check(buyPolicy.akDisabled === true && buyPolicy.akTitle === '金钱不足', '爆破 T 方 AK 可见但手枪局金钱不足');
      this.check(buyPolicy.m4Disabled === true && buyPolicy.m4Title === '当前阵营不能购买', '爆破 T 方不能购买 M4A1');
      this.check(buyPolicy.uspDisabled === true && buyPolicy.uspTitle === '当前阵营不能购买', '爆破 T 方不能购买 USP');
      await this.page.keyboard.press('KeyB');
      await this.page.waitForTimeout(100);
    }
    const liveStateSeen = await this.waitForState(async () => {
      const liveState = await this.getDebugState();
      return liveState?.matchMode === 'defusal' && liveState.matchPhase === 'live';
    }, CS16_RULES.FREEZE_TIME + 2000);
    const liveState = await this.getDebugState();
    this.check(liveStateSeen, '爆破冻结时间结束后进入 LIVE');
    this.check(
      typeof liveState?.roundTimeRemaining === 'number'
        && liveState.roundTimeRemaining > 295
        && liveState.roundTimeRemaining <= CS16_RULES.ROUND_TIME / 1000,
      '爆破 LIVE 回合使用 CS1.6 五分钟计时'
    );
    this.check(liveState?.buyTimeActive === true, '爆破 LIVE 开局仍处于 CS1.6 90 秒购买窗口');
    await this.takeScreenshot('bomb-mechanics');
  }

  async testUiElements() {
    if (!this.page) throw new Error('Page not initialized');

    const hasCrosshair = await this.page.$('.crosshair') !== null;
    this.check(hasCrosshair, '准星显示正常');

    await this.page.keyboard.down('Tab');
    await this.page.waitForTimeout(300);
    const scoreboardState = await this.getDebugState();
    console.log(`Tab状态: isScoreboardOpen=${scoreboardState?.isScoreboardOpen}, activePanel=${scoreboardState?.activePanel}`);
    this.check(scoreboardState?.isScoreboardOpen === true && scoreboardState?.activePanel === 'scoreboard', '按住 Tab 显示计分板');

    await this.page.keyboard.up('Tab');
    await this.page.waitForTimeout(150);
    const scoreboardClosedState = await this.getDebugState();
    this.check(scoreboardClosedState?.isScoreboardOpen === false && scoreboardClosedState?.activePanel !== 'scoreboard', '松开 Tab 隐藏计分板');

    await this.takeScreenshot('ui-test');
  }

  async exitGame() {
    if (!this.page) throw new Error('Page not initialized');

    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await this.page.waitForSelector('[data-action="solo"]', { timeout: 10000, state: 'visible' });
  }

  printReport() {
    console.log('\n' + '='.repeat(80));
    console.log('DUST2 地图三模式全面测试报告');
    console.log('='.repeat(80));

    for (const result of this.results) {
      console.log(`\n【${result.mode}】`);
      console.log('-'.repeat(40));
      console.log(`状态: ${result.passed ? '✓ 通过' : '✗ 失败'}`);
      console.log(`\n通过检查 (${result.checks.length} 项):`);
      for (const check of result.checks) {
        console.log(`  ${check}`);
      }
      if (result.errors.length > 0) {
        console.log(`\n问题 (${result.errors.length} 项):`);
        for (const error of result.errors) {
          console.log(`  ${error}`);
        }
      }
      if (result.screenshots.length > 0) {
        console.log(`\n截图 (${result.screenshots.length} 张):`);
        for (const shot of result.screenshots) {
          console.log(`  - ${shot}`);
        }
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
  const suite = new Dust2TestSuite();

  try {
    console.log('启动 DUST2 全面测试...');
    await suite.setup();
    console.log('浏览器已启动');

    await suite.navigateToGame();
    console.log('游戏页面已加载');

    await suite.selectDust2Map();
    console.log('已选择 DUST2 地图');

    console.log('\n测试 1/3: 单人任务闯关模式...');
    await suite.testSoloMode();

    console.log('\n测试 2/3: 团队死斗模式...');
    await suite.testTdmMode();

    console.log('\n测试 3/3: 5v5爆破模式...');
    await suite.testDefusalMode();

    const allPassed = suite.printReport();

    if (!allPassed) {
      console.error('\n❌ 部分测试未通过，请检查上述问题');
      process.exit(1);
    } else {
      console.log('\n✅ 所有测试通过！游戏运行正常。');
    }

  } catch (error) {
    console.error('测试失败:', error);
    process.exit(1);
  } finally {
    await suite.teardown();
  }
}

main();
