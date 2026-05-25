import { Weapon } from '../game/Weapon.js';
import { BuyRequest, MatchSnapshot, WeaponId } from '../game/types.js';

export type WeaponSlotId = 'primary' | 'pistol' | 'knife' | 'grenade';

type BuyMenuItem = {
  label: string;
  price: number;
  hint: string;
  weaponId?: WeaponId;
  armor?: boolean;
  unavailable?: boolean;
};

type BuyMenuCategory = {
  title: string;
  items: BuyMenuItem[];
};

const BUY_MENU_CATEGORIES: BuyMenuCategory[] = [
  {
    title: '手枪',
    items: [
      { label: '制式手枪', price: 200, hint: '默认副武器', weaponId: 'sidearm' },
      { label: '重型手枪', price: 700, hint: '高伤害慢射速', weaponId: 'heavy_pistol' }
    ]
  },
  {
    title: '步枪',
    items: [
      { label: '突击步枪', price: 2700, hint: '进攻方可用', weaponId: 'vandal' },
      { label: '防守步枪', price: 2900, hint: '防守方可用', weaponId: 'sentinel' }
    ]
  },
  {
    title: '重型 / 狙击 / 近距',
    items: [
      { label: '狙击枪', price: 4750, hint: '远距离一击威胁', weaponId: 'operator' },
      { label: '冲锋枪', price: 1600, hint: '移动压制', weaponId: 'specter' },
      { label: '散弹枪', price: 1200, hint: '近点爆发', weaponId: 'bulldog' }
    ]
  },
  {
    title: '投掷物 / 护甲',
    items: [
      { label: '防弹衣', price: 650, hint: '补满护甲', armor: true },
      { label: '高爆雷', price: 300, hint: '本地库存，按 4 切换', unavailable: true },
      { label: '闪光弹', price: 200, hint: '本地库存，按 4 切换', unavailable: true },
      { label: '烟雾弹', price: 300, hint: '本地库存，按 4 切换', unavailable: true }
    ]
  }
];

export interface WeaponSlotState {
  activeSlot: WeaponSlotId;
  primary: string;
  pistol: string;
  knife: string;
  grenadeLabel: string;
  grenadeCount: number;
}

export class HUD {
  private element: HTMLElement;
  private healthFill: HTMLElement;
  private healthText: HTMLElement;
  private armorText: HTMLElement;
  private ammoCurrent: HTMLElement;
  private ammoSeparator: HTMLElement;
  private ammoReserve: HTMLElement;
  private weaponName: HTMLElement;
  private waveText: HTMLElement;
  private enemiesText: HTMLElement;
  private roomText: HTMLElement;
  private networkText: HTMLElement;
  private scoreText: HTMLElement;
  private timerText: HTMLElement;
  private damageOverlay: HTMLElement;
  private resultPanel: HTMLElement;
  private pausePanel: HTMLElement;
  private lockPanel: HTMLElement;
  private scoreboard: HTMLElement;
  private buyMenu: HTMLElement;
  private crosshair: HTMLElement;
  private notificationContainer: HTMLElement;
  private weaponSlots: HTMLElement;
  private liveKillFeed: HTMLElement;
  private currentHealth = 100;
  private maxHealth = 100;
  private currentAmmo = 0;
  private maxAmmo = 0;
  private notificationTimeout: number | null = null;
  private buyHandler: ((request: BuyRequest) => void) | null = null;
  private resumeHandler: (() => void) | null = null;

  constructor() {
    this.element = this.createElement();
    this.healthFill = this.element.querySelector('.health-fill') as HTMLElement;
    this.healthText = this.element.querySelector('.health-text') as HTMLElement;
    this.armorText = this.element.querySelector('.armor-text') as HTMLElement;
    this.ammoCurrent = this.element.querySelector('.ammo-current') as HTMLElement;
    this.ammoSeparator = this.element.querySelector('.ammo-separator') as HTMLElement;
    this.ammoReserve = this.element.querySelector('.ammo-reserve') as HTMLElement;
    this.weaponName = this.element.querySelector('.weapon-name') as HTMLElement;
    this.waveText = this.element.querySelector('.wave-text') as HTMLElement;
    this.enemiesText = this.element.querySelector('.enemies-text') as HTMLElement;
    this.roomText = this.element.querySelector('.room-text') as HTMLElement;
    this.networkText = this.element.querySelector('.network-text') as HTMLElement;
    this.scoreText = this.element.querySelector('.score-text') as HTMLElement;
    this.timerText = this.element.querySelector('.timer-text') as HTMLElement;
    this.damageOverlay = this.element.querySelector('.damage-overlay') as HTMLElement;
    this.resultPanel = this.element.querySelector('.result-panel') as HTMLElement;
    this.pausePanel = this.element.querySelector('.pause-panel') as HTMLElement;
    this.lockPanel = this.element.querySelector('.lock-panel') as HTMLElement;
    this.scoreboard = this.element.querySelector('.scoreboard') as HTMLElement;
    this.buyMenu = this.element.querySelector('.buy-menu') as HTMLElement;
    this.crosshair = this.element.querySelector('.crosshair') as HTMLElement;
    this.notificationContainer = this.element.querySelector('.notifications') as HTMLElement;
    this.weaponSlots = this.element.querySelector('.weapon-slots') as HTMLElement;
    this.liveKillFeed = this.element.querySelector('.kill-feed-live') as HTMLElement;
  }

  private createElement(): HTMLElement {
    const hud = document.createElement('div');
    hud.className = 'hud';
    hud.setAttribute('role', 'status');
    hud.setAttribute('aria-live', 'polite');
    hud.innerHTML = `
      <div class="hud-top-left">
        <div class="health-container">
          <div class="health-bar" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" aria-label="Health">
            <div class="health-fill" style="width: 100%"></div>
          </div>
          <div class="vitals-line"><span class="health-text" aria-label="生命值">100 生命</span><span class="armor-text" aria-label="护甲">100 护甲</span></div>
        </div>
      </div>
      <div class="hud-top-center">
        <div class="round-strip">
          <span class="wave-text">任务待命</span>
          <span class="enemies-text">0 名敌人</span>
          <span class="room-text">房间 --/--</span>
          <span class="network-text">离线</span>
          <span class="timer-text">00:00</span>
        </div>
      </div>
      <div class="hud-top-right">
        <div class="ammo-container">
          <span class="score-text">0</span>
          <span class="weapon-name" aria-label="当前武器">制式手枪</span>
          <div class="ammo-display" aria-label="弹药">
            <span class="ammo-current">12</span>
            <span class="ammo-separator" aria-hidden="true">/</span>
            <span class="ammo-reserve" aria-hidden="true">∞</span>
          </div>
          <div class="weapon-slots" aria-label="武器槽位">
            <div class="weapon-slot active" data-slot="primary"><span class="slot-key">1</span><span class="slot-icon">步</span><span class="slot-name">突击步枪</span></div>
            <div class="weapon-slot" data-slot="pistol"><span class="slot-key">2</span><span class="slot-icon">手</span><span class="slot-name">制式手枪</span></div>
            <div class="weapon-slot" data-slot="knife"><span class="slot-key">3</span><span class="slot-icon">刀</span><span class="slot-name">战术刀</span></div>
            <div class="weapon-slot" data-slot="grenade"><span class="slot-key">4</span><span class="slot-icon">雷</span><span class="slot-name">高爆雷 x1</span></div>
          </div>
          <div class="kill-feed-live" aria-label="击杀提示"></div>
        </div>
      </div>
      <div class="hud-center">
        <div class="crosshair" aria-hidden="true"></div>
      </div>
      <div class="damage-overlay" aria-hidden="true"></div>
      <div class="result-panel hidden" role="dialog" aria-label="任务结果"></div>
      <div class="pause-panel hidden" role="dialog" aria-label="已暂停">
        <h2>已暂停</h2>
        <p>点击继续后重新进入游戏焦点。</p>
        <button class="resume-button" type="button">继续游戏</button>
        <p class="result-hint">再次按 ESC 返回主菜单</p>
      </div>
      <div class="lock-panel hidden" role="dialog" aria-label="鼠标锁定提示">
        <h2>需要锁定鼠标</h2>
        <p>为了避免 Windows 上鼠标移出浏览器，进入战斗前必须锁定鼠标。</p>
        <button class="lock-retry-button" type="button">点击锁定鼠标</button>
        <p class="result-hint">如果浏览器拦截，请在 Chrome / Edge 独立窗口允许 Pointer Lock。</p>
      </div>
      <div class="scoreboard hidden" aria-label="战绩面板"></div>
      <div class="buy-menu hidden" aria-label="购买菜单">
        ${this.renderBuyMenu()}
      </div>
      <div class="hud-bottom">
        <div class="notifications" aria-live="polite" aria-atomic="true"></div>
      </div>
    `;
    hud.querySelectorAll<HTMLButtonElement>('.buy-menu button').forEach(button => {
      button.addEventListener('click', () => {
        if (button.disabled) return;
        const weaponId = button.dataset.weapon as WeaponId | undefined;
        if (weaponId) this.buyHandler?.({ weaponId });
        if (button.dataset.armor) this.buyHandler?.({ armor: true });
      });
    });
    hud.querySelector<HTMLButtonElement>('.resume-button')?.addEventListener('click', () => this.resumeHandler?.());
    hud.querySelector<HTMLButtonElement>('.lock-retry-button')?.addEventListener('click', () => this.resumeHandler?.());
    return hud;
  }

  private renderBuyMenu(): string {
    return BUY_MENU_CATEGORIES.map(category => `
      <section class="buy-category" aria-label="${this.escapeHtml(category.title)}">
        <h3>${this.escapeHtml(category.title)}</h3>
        <div class="buy-grid">
          ${category.items.map(item => this.renderBuyItem(item)).join('')}
        </div>
      </section>
    `).join('');
  }

  private renderBuyItem(item: BuyMenuItem): string {
    const dataAttributes = [
      item.weaponId ? `data-weapon="${item.weaponId}"` : '',
      item.armor ? 'data-armor="kevlar"' : '',
      item.unavailable ? 'data-unavailable="true"' : ''
    ].filter(Boolean).join(' ');
    const disabled = item.unavailable ? ' disabled' : '';
    return `
      <button class="buy-item" type="button" ${dataAttributes}${disabled} title="${this.escapeHtml(item.hint)}">
        <span class="buy-item-name">${this.escapeHtml(item.label)}</span>
        <span class="buy-item-price">$${item.price}</span>
        <span class="buy-item-status">${this.escapeHtml(item.hint)}</span>
      </button>
    `;
  }

  getElement(): HTMLElement {
    return this.element;
  }

  updateHealth(health: number, maxHealth: number = 100, armor?: number): void {
    this.currentHealth = Math.max(0, Math.min(maxHealth, health));
    this.maxHealth = maxHealth;
    const percentage = (this.currentHealth / this.maxHealth) * 100;

    this.healthFill.style.width = `${percentage}%`;
    this.healthText.textContent = `${this.currentHealth} 生命`;
    if (armor !== undefined) {
      this.armorText.textContent = `${Math.max(0, Math.round(armor))} 护甲`;
    }

    // Update aria for screen readers
    const healthBar = this.element.querySelector('.health-bar') as HTMLElement;
    if (healthBar) {
      healthBar.setAttribute('aria-valuenow', this.currentHealth.toString());
      healthBar.setAttribute('aria-valuemax', maxHealth.toString());
    }

    // Update color based on health level
    if (this.currentHealth <= this.maxHealth * 0.25) {
      this.healthFill.style.background = 'var(--health-low)';
      this.healthFill.setAttribute('aria-label', `生命危急：${this.currentHealth}`);
    } else if (this.currentHealth <= this.maxHealth * 0.5) {
      this.healthFill.style.background = 'var(--health-medium)';
      this.healthFill.setAttribute('aria-label', `生命偏低：${this.currentHealth}`);
    } else {
      this.healthFill.style.background = 'var(--health-full)';
      this.healthFill.removeAttribute('aria-label');
    }
  }

  updateAmmo(current: number, max: number, reserve: number = max): void {
    this.currentAmmo = current;
    this.maxAmmo = max;
    if (max <= 1 && reserve === 0) {
      this.ammoCurrent.textContent = '--';
      this.ammoSeparator.textContent = '';
      this.ammoReserve.textContent = '';
      this.ammoCurrent.classList.remove('ammo-low');
      return;
    }
    this.ammoSeparator.textContent = '/';
    this.ammoCurrent.textContent = current.toString();
    this.ammoReserve.textContent = reserve.toString();

    // Low ammo warning
    if (current <= max * 0.2) {
      this.ammoCurrent.classList.add('ammo-low');
      // Announce only once when low ammo starts
      if (!this.ammoCurrent.dataset.lowAnnounced) {
        this.announceForScreenReader('弹药不足');
        this.ammoCurrent.dataset.lowAnnounced = 'true';
      }
    } else {
      this.ammoCurrent.classList.remove('ammo-low');
      delete this.ammoCurrent.dataset.lowAnnounced;
    }
  }

  updateWeapon(weapon: Weapon): void {
    this.weaponName.textContent = weapon.displayName;
    this.updateAmmo(weapon.currentAmmo, weapon.magazineSize, weapon.currentReserveAmmo);
  }

  updateReloadProgress(progress: number): void {
    if (progress < 1) {
      this.ammoCurrent.textContent = `换弹 ${Math.round(progress * 100)}%`;
      this.ammoCurrent.classList.remove('ammo-low');
    }
  }

  updateSurvival(stats: { wave: number; enemiesRemaining: number; score: number; timeSurvived: number; prepRemaining: number; phase: string; kills?: number; objective?: string }): void {
    this.waveText.textContent = stats.prepRemaining > 0
      ? `准备 ${Math.ceil(stats.prepRemaining)} 秒`
      : (stats.objective ?? `第 ${stats.wave} 阶段`);
    this.enemiesText.textContent = `${stats.enemiesRemaining} 名敌人`;
    this.scoreText.textContent = stats.score.toString().padStart(5, '0');
    this.roomText.textContent = '房间 1/1';
    this.networkText.textContent = '单机';
    const minutes = Math.floor(stats.timeSurvived / 60).toString().padStart(2, '0');
    const seconds = Math.floor(stats.timeSurvived % 60).toString().padStart(2, '0');
    this.timerText.textContent = `${minutes}:${seconds}`;
  }

  updateSurvivalScoreboard(stats: { wave: number; kills: number; score: number; enemiesRemaining: number; timeSurvived: number }): void {
    this.scoreboard.innerHTML = `
      <table>
        <thead><tr><th>模式</th><th>阶段</th><th>击杀</th><th>分数</th><th>剩余</th><th>时间</th></tr></thead>
        <tbody>
          <tr class="local">
            <td>单人任务</td>
            <td>${stats.wave}</td>
            <td>${stats.kills}</td>
            <td>${stats.score}</td>
            <td>${stats.enemiesRemaining}</td>
            <td>${Math.floor(stats.timeSurvived)} 秒</td>
          </tr>
        </tbody>
      </table>
    `;
  }

  updateMatch(snapshot: MatchSnapshot, localPlayerId?: string): void {
    const localPlayer = snapshot.players.find(player => player.id === localPlayerId);
    this.waveText.textContent = `${snapshot.config.mode === 'tdm' ? '团队死斗' : '爆破'} · ${this.phaseLabel(snapshot.phase)} · R${snapshot.round}`;
    this.enemiesText.textContent = `${snapshot.score.attackers} - ${snapshot.score.defenders}`;
    this.roomText.textContent = `房间 ${snapshot.players.length}/${snapshot.config.maxPlayers}`;
    this.networkText.textContent = localPlayer ? `${localPlayer.ping} ms` : '联机';
    this.timerText.textContent = this.formatClock(snapshot.roundTimeRemaining);
    this.scoreText.textContent = localPlayer ? `$${localPlayer.money}` : '就绪';
    if (localPlayer) {
      this.updateHealth(localPlayer.health, 100, localPlayer.armor);
      this.updateAmmo(localPlayer.ammo, Math.max(localPlayer.ammo, 1), localPlayer.reserveAmmo);
      this.weaponName.textContent = this.weaponLabel(localPlayer.weaponId);
    }
    this.updateLiveKillFeed(snapshot.killFeed, snapshot);

    const rows = snapshot.players
      .slice()
      .sort((a, b) => b.kills - a.kills)
      .map(player => `
        <tr class="${player.id === localPlayerId ? 'local' : ''} team-${player.team}">
          <td>${player.team === 'attackers' ? '进攻' : '防守'}</td>
          <td>${this.escapeHtml(player.name)}</td>
          <td>${player.kills}</td>
          <td>${player.deaths}</td>
          <td>$${player.money}</td>
          <td>${player.ping}</td>
        </tr>
      `)
      .join('');
    this.scoreboard.innerHTML = `
      <table>
        <thead><tr><th>队伍</th><th>名称</th><th>击杀</th><th>死亡</th><th>经济</th><th>Ping</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="kill-feed">${snapshot.killFeed.map(item => `<p>${this.escapeHtml(item)}</p>`).join('')}</div>
    `;
  }

  toggleScoreboard(show?: boolean): void {
    this.scoreboard.classList.toggle('hidden', show === undefined ? !this.scoreboard.classList.contains('hidden') : !show);
  }

  toggleBuyMenu(show?: boolean, options?: { solo?: boolean; disabledReason?: string }): void {
    this.buyMenu.classList.toggle('hidden', show === undefined ? !this.buyMenu.classList.contains('hidden') : !show);
    this.buyMenu.querySelectorAll<HTMLButtonElement>('button').forEach(button => {
      const unavailable = button.dataset.unavailable === 'true';
      button.disabled = Boolean(options?.disabledReason) || unavailable;
      const itemHint = button.querySelector('.buy-item-status')?.textContent ?? '';
      button.title = options?.disabledReason ?? itemHint ?? (options?.solo ? '选择武器' : '购买武器');
    });
    let hint = this.buyMenu.querySelector('.buy-hint') as HTMLElement | null;
    if (!hint) {
      hint = document.createElement('div');
      hint.className = 'buy-hint';
      this.buyMenu.prepend(hint);
    }
    hint.textContent = options?.disabledReason ?? (options?.solo ? '单人武器配置：选择武器 / 投掷物按 4 切换' : '购买菜单');
  }

  isBuyMenuOpen(): boolean {
    return !this.buyMenu.classList.contains('hidden');
  }

  isScoreboardOpen(): boolean {
    return !this.scoreboard.classList.contains('hidden');
  }

  showPause(): void {
    this.pausePanel.classList.remove('hidden');
  }

  hidePause(): void {
    this.pausePanel.classList.add('hidden');
  }

  showPointerLockGuide(): void {
    this.lockPanel.classList.remove('hidden');
  }

  hidePointerLockGuide(): void {
    this.lockPanel.classList.add('hidden');
  }

  onBuy(handler: (request: BuyRequest) => void): void {
    this.buyHandler = handler;
  }

  showKillFeedEntry(message: string): void {
    const current = Array.from(this.liveKillFeed.querySelectorAll('.kill-feed-row')).map(item => item.textContent ?? '');
    this.updateLiveKillFeed([message, ...current].slice(0, 5));
  }

  private updateLiveKillFeed(items: string[], snapshot?: MatchSnapshot): void {
    this.liveKillFeed.replaceChildren(...items.slice(0, 5).map(item => this.createKillFeedRow(item, snapshot)));
  }

  private createKillFeedRow(message: string, snapshot?: MatchSnapshot): HTMLElement {
    const row = document.createElement('p');
    row.className = 'kill-feed-row';
    const parsed = this.parseKillFeedMessage(message, snapshot);
    row.classList.add(`team-${parsed.attackerTeam ?? 'neutral'}`);

    const attacker = document.createElement('span');
    attacker.className = 'kill-feed-player kill-feed-attacker';
    attacker.textContent = parsed.attacker;
    row.append(attacker);

    const weapon = document.createElement('span');
    weapon.className = 'kill-feed-weapon';
    weapon.textContent = parsed.weapon;
    row.append(weapon);

    if (parsed.headshot) {
      const headshot = document.createElement('span');
      headshot.className = 'kill-feed-headshot';
      headshot.textContent = '爆头';
      row.append(headshot);
    }

    const victim = document.createElement('span');
    victim.className = 'kill-feed-player kill-feed-victim';
    victim.textContent = parsed.victim;
    row.append(victim);

    return row;
  }

  private parseKillFeedMessage(message: string, snapshot?: MatchSnapshot): { attacker: string; weapon: string; victim: string; headshot: boolean; attackerTeam?: string } {
    const headshot = message.includes('爆头');
    const players = snapshot?.players ?? [];
    const attacker = players
      .slice()
      .sort((a, b) => b.name.length - a.name.length)
      .find(player => message.startsWith(player.name));
    const attackerName = attacker?.name ?? message;
    const afterAttacker = attacker ? message.slice(attacker.name.length).trim() : '';
    const victim = players
      .slice()
      .sort((a, b) => b.name.length - a.name.length)
      .find(player => player.id !== attacker?.id && afterAttacker.endsWith(player.name));
    const victimName = victim?.name ?? (attacker ? afterAttacker.replace('爆头', '').trim() : '');
    const weapon = attacker && victim
      ? afterAttacker.slice(0, Math.max(0, afterAttacker.length - victim.name.length)).replace('爆头', '').trim()
      : this.inferWeaponLabel(message);

    return {
      attacker: attackerName,
      weapon: weapon || '击杀',
      victim: victimName || '',
      headshot,
      attackerTeam: attacker?.team
    };
  }

  onResume(handler: () => void): void {
    this.resumeHandler = handler;
  }

  showDamage(): void {
    this.damageOverlay.classList.remove('damage-flash');
    void this.damageOverlay.offsetWidth;
    this.damageOverlay.classList.add('damage-flash');
  }

  showResults(stats: { wave: number; kills: number; score: number; timeSurvived: number }): void {
    this.resultPanel.classList.remove('hidden');
    this.resultPanel.innerHTML = `
      <h2>任务失败</h2>
      <p>推进到第 ${stats.wave} 阶段</p>
      <dl>
        <div><dt>击杀</dt><dd>${stats.kills}</dd></div>
        <div><dt>分数</dt><dd>${stats.score}</dd></div>
        <div><dt>时间</dt><dd>${Math.floor(stats.timeSurvived)} 秒</dd></div>
      </dl>
      <p class="result-hint">按 ESC 返回主菜单</p>
    `;
  }

  updateObjective(text: string): void {
    this.waveText.textContent = text;
  }

  updateRoomPlayers(current: number, max: number): void {
    this.roomText.textContent = `房间 ${current}/${max}`;
  }

  updateNetworkStatus(text: string): void {
    this.networkText.textContent = text;
  }

  updateGrenade(label: string, count: number): void {
    this.ammoReserve.textContent = `${label} x${count}`;
  }

  updateWeaponSlots(state: WeaponSlotState): void {
    const names: Record<WeaponSlotId, string> = {
      primary: state.primary,
      pistol: state.pistol,
      knife: state.knife,
      grenade: `${state.grenadeLabel} x${state.grenadeCount}`
    };
    this.weaponSlots.querySelectorAll<HTMLElement>('.weapon-slot').forEach(slot => {
      const slotId = slot.dataset.slot as WeaponSlotId | undefined;
      if (!slotId) return;
      slot.classList.toggle('active', slotId === state.activeSlot);
      const name = slot.querySelector('.slot-name');
      if (name) name.textContent = names[slotId];
    });
  }

  private weaponLabel(weaponId: string): string {
    const labels: Record<string, string> = {
      sidearm: '制式手枪',
      heavy_pistol: '重型手枪',
      vandal: '突击步枪',
      sentinel: '防守步枪',
      operator: '狙击枪',
      specter: '冲锋枪',
      bulldog: '散弹枪',
      knife: '战术刀'
    };
    return labels[weaponId] ?? weaponId;
  }

  private inferWeaponLabel(message: string): string {
    const knownWeapons = ['Vandal AR', 'Sentinel M4', 'Longbow AWP', 'Specter SMG', 'Bulldog Shotgun', 'S-9 Sidearm', 'Rook Heavy', 'Tactical Knife'];
    return knownWeapons.find(weapon => message.includes(weapon)) ?? '击杀';
  }

  private phaseLabel(phase: string): string {
    const labels: Record<string, string> = {
      warmup: '热身',
      buy: '购买',
      live: '交战',
      roundEnd: '结算',
      matchEnd: '结束'
    };
    return labels[phase] ?? phase;
  }

  private formatClock(secondsRemaining: number): string {
    const clamped = Math.max(0, Math.ceil(secondsRemaining));
    const minutes = Math.floor(clamped / 60).toString().padStart(2, '0');
    const seconds = Math.floor(clamped % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  hideResults(): void {
    this.resultPanel.classList.add('hidden');
    this.resultPanel.innerHTML = '';
  }

  showNotification(message: string, duration: number = 1000): void {
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
      this.notificationTimeout = null;
    }

    let notification = this.notificationContainer.querySelector('.notification') as HTMLElement | null;
    if (!notification) {
      notification = document.createElement('div');
      notification.className = 'notification';
      notification.setAttribute('role', 'alert');
      this.notificationContainer.appendChild(notification);
    }
    notification.textContent = message;
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';

    this.notificationTimeout = window.setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(6px)';
      setTimeout(() => notification.remove(), 250);
    }, duration);
  }

  updateCrosshair(spread: number): void {
    const baseSize = 24;
    const maxSize = 48;
    const size = Math.min(baseSize + spread * 30, maxSize);
    this.crosshair.style.width = `${size}px`;
    this.crosshair.style.height = `${size}px`;
  }

  showHitMarker(): void {
    this.crosshair.classList.add('hit');
    this.announceForScreenReader('命中确认');
    setTimeout(() => {
      this.crosshair.classList.remove('hit');
    }, 100);
  }

  hide(): void {
    this.element.classList.add('hidden');
    this.toggleBuyMenu(false);
    this.toggleScoreboard(false);
    this.hidePause();
    this.hidePointerLockGuide();
  }

  show(): void {
    this.element.classList.remove('hidden');
    this.hideResults();
    this.hidePause();
    this.hidePointerLockGuide();
  }

  private announceForScreenReader(message: string): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.style.cssText = 'position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;';
    announcement.textContent = message;
    this.element.appendChild(announcement);
    setTimeout(() => announcement.remove(), 1000);
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  dispose(): void {
    this.element.remove();
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
  }
}
