import { Weapon } from '../game/Weapon.js';
import { BuyRequest, MatchSnapshot, WeaponId } from '../game/types.js';

export type WeaponSlotId = 'primary' | 'pistol' | 'knife' | 'grenade';

type WeaponSvgType = 'pistol' | 'pistol-heavy' | 'smg' | 'rifle' | 'sniper' | 'shotgun' | 'lmg' | 'knife';

type BuyMenuItem = {
  label: string;
  price: number;
  hint: string;
  damage?: number;
  svgType?: WeaponSvgType;
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
      { label: 'Glock-18',      price: 200,  hint: '默认T方手枪',    damage: 28,  svgType: 'pistol',       weaponId: 'pistol' },
      { label: 'USP-S',         price: 200,  hint: '默认CT方手枪',   damage: 35,  svgType: 'pistol',       weaponId: 'usp_s' },
      { label: 'P2000',         price: 200,  hint: '精准备用',        damage: 32,  svgType: 'pistol',       weaponId: 'p2000' },
      { label: 'P250',          price: 300,  hint: '经济换代',        damage: 38,  svgType: 'pistol',       weaponId: 'p250' },
      { label: 'Dual Berettas', price: 400,  hint: '双枪火力',        damage: 26,  svgType: 'pistol',       weaponId: 'dual_berettas' },
      { label: 'CZ75-Auto',     price: 500,  hint: '全自动手枪',      damage: 31,  svgType: 'pistol',       weaponId: 'cz75' },
      { label: 'Tec-9',         price: 500,  hint: 'T方进攻手枪',    damage: 33,  svgType: 'pistol',       weaponId: 'tec9' },
      { label: 'Five-SeveN',    price: 500,  hint: '穿甲利器',        damage: 32,  svgType: 'pistol',       weaponId: 'five_seven' },
      { label: 'R8 Revolver',   price: 600,  hint: '高伤转轮',        damage: 86,  svgType: 'pistol-heavy', weaponId: 'r8' },
      { label: 'Desert Eagle',  price: 700,  hint: '强力单发',        damage: 55,  svgType: 'pistol-heavy', weaponId: 'deagle' },
    ]
  },
  {
    title: '微型冲锋枪',
    items: [
      { label: 'MAC-10',   price: 1050, hint: 'T方近距离',   damage: 29, svgType: 'smg', weaponId: 'mac10' },
      { label: 'MP9',      price: 1250, hint: 'CT方SMG',     damage: 26, svgType: 'smg', weaponId: 'mp9' },
      { label: 'UMP-45',   price: 1200, hint: '高穿甲伤害',  damage: 35, svgType: 'smg', weaponId: 'ump45' },
      { label: 'PP-野牛',  price: 1400, hint: '超大弹匣',    damage: 27, svgType: 'smg', weaponId: 'pp_bizon' },
      { label: 'MP7',      price: 1500, hint: '精准全能',    damage: 29, svgType: 'smg', weaponId: 'mp7' },
      { label: 'P90',      price: 2350, hint: '50发弹匣',    damage: 26, svgType: 'smg', weaponId: 'p90' },
    ]
  },
  {
    title: '步枪',
    items: [
      { label: 'Galil AR', price: 1800, hint: 'T方经济步枪',  damage: 30, svgType: 'rifle', weaponId: 'galil' },
      { label: 'FAMAS',    price: 2050, hint: 'CT方经济步枪', damage: 30, svgType: 'rifle', weaponId: 'famas' },
      { label: 'AK-47',    price: 2700, hint: 'T方主步枪',    damage: 36, svgType: 'rifle', weaponId: 'ak47' },
      { label: 'M4A1-S',   price: 2900, hint: 'CT方消音步枪', damage: 38, svgType: 'rifle', weaponId: 'm4a1s' },
      { label: 'M4A4',     price: 3100, hint: 'CT方主步枪',   damage: 33, svgType: 'rifle', weaponId: 'm4a4' },
      { label: 'SG 553',   price: 3000, hint: 'T方精准步枪',  damage: 34, svgType: 'rifle', weaponId: 'sg553' },
      { label: 'AUG',      price: 3300, hint: 'CT方精准步枪', damage: 32, svgType: 'rifle', weaponId: 'aug' },
    ]
  },
  {
    title: '狙击枪',
    items: [
      { label: 'SSG 08',  price: 1700, hint: '经济狙击',     damage: 88,  svgType: 'sniper', weaponId: 'ssg08' },
      { label: 'AWP',     price: 4750, hint: '一击致命',     damage: 115, svgType: 'sniper', weaponId: 'awp' },
      { label: 'SCAR-20', price: 5000, hint: 'CT自动狙',     damage: 80,  svgType: 'sniper', weaponId: 'scar20' },
      { label: 'G3SG1',   price: 5000, hint: 'T方自动狙',    damage: 80,  svgType: 'sniper', weaponId: 'g3sg1' },
    ]
  },
  {
    title: '重型 / 霰弹枪 / 机枪',
    items: [
      { label: 'Nova',    price: 1050, hint: '近距爆发',  damage: 20,  svgType: 'shotgun', weaponId: 'nova' },
      { label: 'MAG-7',   price: 1300, hint: 'CT方霰弹',  damage: 30,  svgType: 'shotgun', weaponId: 'mag7' },
      { label: 'XM1014',  price: 2000, hint: '半自动霰弹',damage: 19,  svgType: 'shotgun', weaponId: 'xm1014' },
      { label: 'Negev',   price: 1700, hint: '压制机枪',  damage: 35,  svgType: 'lmg',     weaponId: 'negev' },
      { label: 'M249',    price: 5200, hint: '100发弹链', damage: 32,  svgType: 'lmg',     weaponId: 'm249' },
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
  private healthValue: HTMLElement;
  private armorValue: HTMLElement;
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
  private roundInfo: HTMLElement;
  private scoreCt: HTMLElement;
  private scoreT: HTMLElement;
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
  private radarCanvas: HTMLCanvasElement;
  private radarCtx: CanvasRenderingContext2D | null = null;
  private currentHealth = 100;
  private maxHealth = 100;
  private currentAmmo = 0;
  private maxAmmo = 0;
  private notificationTimeout: number | null = null;
  private buyHandler: ((request: BuyRequest) => void) | null = null;
  private resumeHandler: (() => void) | null = null;

  constructor() {
    this.element = this.createElement();
    this.healthValue = this.element.querySelector('.health-value') as HTMLElement;
    this.armorValue = this.element.querySelector('.armor-value') as HTMLElement;
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
    this.roundInfo = this.element.querySelector('.round-info') as HTMLElement;
    this.scoreCt = this.element.querySelector('.score-ct') as HTMLElement;
    this.scoreT = this.element.querySelector('.score-t') as HTMLElement;
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
    this.radarCanvas = this.element.querySelector('.radar-canvas') as HTMLCanvasElement;
    this.radarCtx = this.radarCanvas?.getContext('2d') ?? null;
  }

  private weaponIconSVG(category: WeaponSlotId): string {
    const icons: Record<WeaponSlotId, string> = {
      primary: `<svg viewBox="0 0 24 12" class="slot-svg" aria-hidden="true"><rect x="0" y="4" width="17" height="4" rx="1"/><rect x="17" y="3" width="5" height="5" rx="1"/><rect x="5" y="8" width="4" height="4" rx="1"/></svg>`,
      pistol:  `<svg viewBox="0 0 18 12" class="slot-svg" aria-hidden="true"><rect x="0" y="3" width="11" height="4" rx="1"/><rect x="11" y="2" width="5" height="5" rx="1"/><rect x="2" y="7" width="3" height="5" rx="1"/></svg>`,
      knife:   `<svg viewBox="0 0 20 8" class="slot-svg" aria-hidden="true"><polygon points="0,2 13,0 15,4 13,8 0,6"/><rect x="13" y="2" width="7" height="4" rx="1"/></svg>`,
      grenade: `<svg viewBox="0 0 10 16" class="slot-svg" aria-hidden="true"><ellipse cx="5" cy="11" rx="4" ry="4"/><rect x="3" y="0" width="4" height="7" rx="1"/></svg>`
    };
    return icons[category];
  }

  private createElement(): HTMLElement {
    const hud = document.createElement('div');
    hud.className = 'hud';
    hud.setAttribute('role', 'status');
    hud.setAttribute('aria-live', 'polite');
    hud.innerHTML = `
      <div class="hud-top-left">
        <div class="radar-container" aria-label="雷达小地图" aria-hidden="true">
          <canvas class="radar-canvas" width="150" height="150"></canvas>
        </div>
      </div>

      <div class="hud-top-center">
        <div class="round-strip">
          <div class="team-score ct" aria-label="CT 队分数">
            <span class="ct-label">CT</span>
            <span class="score-ct">0</span>
          </div>
          <div class="round-center">
            <span class="timer-text" aria-label="剩余时间">00:00</span>
            <span class="round-info">准备中</span>
          </div>
          <div class="team-score t" aria-label="T 队分数">
            <span class="score-t">0</span>
            <span class="t-label">T</span>
          </div>
        </div>
        <div style="font-size:11px;color:var(--text-tertiary);text-align:center;margin-top:3px;display:flex;gap:10px;justify-content:center">
          <span class="wave-text"></span>
          <span class="enemies-text"></span>
          <span class="room-text">房间 --/--</span>
          <span class="network-text">离线</span>
        </div>
      </div>

      <div class="hud-top-right">
        <div class="ammo-container">
          <span class="score-text" aria-label="分数或金钱">0</span>
          <span class="weapon-name" aria-label="当前武器">制式手枪</span>
          <div class="ammo-display" aria-label="弹药">
            <span class="ammo-current" aria-label="当前弹匣">12</span>
            <span class="ammo-separator" aria-hidden="true">|</span>
            <span class="ammo-reserve" aria-hidden="true">∞</span>
          </div>
          <div class="weapon-slots" aria-label="武器槽位">
            <div class="weapon-slot active" data-slot="primary">
              <span class="slot-key">1</span>
              ${this.weaponIconSVG('primary')}
              <span class="slot-name">突击步枪</span>
            </div>
            <div class="weapon-slot" data-slot="pistol">
              <span class="slot-key">2</span>
              ${this.weaponIconSVG('pistol')}
              <span class="slot-name">制式手枪</span>
            </div>
            <div class="weapon-slot" data-slot="knife">
              <span class="slot-key">3</span>
              ${this.weaponIconSVG('knife')}
              <span class="slot-name">战术刀</span>
            </div>
            <div class="weapon-slot" data-slot="grenade">
              <span class="slot-key">4</span>
              ${this.weaponIconSVG('grenade')}
              <span class="slot-name">高爆雷 x1</span>
            </div>
          </div>
          <div class="kill-feed-live" aria-label="击杀提示"></div>
        </div>
      </div>

      <div class="hud-bottom-left">
        <div class="vitals-display" aria-label="生命值与护甲">
          <span class="health-value" aria-label="生命值">100</span>
          <span class="vitals-icon" aria-hidden="true">♥</span>
          <span class="armor-value" aria-label="护甲">100</span>
          <span class="vitals-icon armor-icon" aria-hidden="true">⬡</span>
        </div>
      </div>

      <div class="hud-center">
        <div class="crosshair" aria-hidden="true">
          <div class="ch-top"></div>
          <div class="ch-bottom"></div>
          <div class="ch-left"></div>
          <div class="ch-right"></div>
        </div>
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

  private weaponSvg(type: WeaponSvgType): string {
    const svgs: Record<WeaponSvgType, string> = {
      'pistol': `<svg viewBox="0 0 48 24" class="weapon-preview-svg" aria-hidden="true"><rect x="2" y="8" width="28" height="7" rx="2" fill="currentColor"/><rect x="30" y="6" width="14" height="9" rx="2" fill="currentColor"/><rect x="8" y="15" width="7" height="8" rx="1" fill="currentColor" opacity="0.8"/><rect x="2" y="10" width="4" height="2" rx="1" fill="currentColor" opacity="0.5"/></svg>`,
      'pistol-heavy': `<svg viewBox="0 0 48 24" class="weapon-preview-svg" aria-hidden="true"><rect x="2" y="7" width="24" height="9" rx="2" fill="currentColor"/><rect x="26" y="5" width="16" height="11" rx="2" fill="currentColor"/><rect x="7" y="16" width="9" height="7" rx="1" fill="currentColor" opacity="0.8"/><rect x="2" y="8" width="6" height="3" rx="1" fill="currentColor" opacity="0.4"/></svg>`,
      'smg': `<svg viewBox="0 0 56 22" class="weapon-preview-svg" aria-hidden="true"><rect x="2" y="7" width="36" height="7" rx="2" fill="currentColor"/><rect x="38" y="5" width="14" height="9" rx="2" fill="currentColor"/><rect x="14" y="14" width="6" height="7" rx="1" fill="currentColor" opacity="0.8"/><rect x="22" y="14" width="4" height="4" rx="1" fill="currentColor" opacity="0.6"/></svg>`,
      'rifle': `<svg viewBox="0 0 64 20" class="weapon-preview-svg" aria-hidden="true"><rect x="2" y="7" width="46" height="6" rx="2" fill="currentColor"/><rect x="48" y="5" width="13" height="8" rx="2" fill="currentColor"/><rect x="18" y="13" width="7" height="6" rx="1" fill="currentColor" opacity="0.8"/><rect x="30" y="13" width="5" height="4" rx="1" fill="currentColor" opacity="0.6"/><rect x="2" y="8" width="3" height="2" rx="1" fill="currentColor" opacity="0.4"/></svg>`,
      'sniper': `<svg viewBox="0 0 72 18" class="weapon-preview-svg" aria-hidden="true"><rect x="2" y="7" width="56" height="5" rx="1.5" fill="currentColor"/><rect x="58" y="5" width="12" height="8" rx="2" fill="currentColor"/><rect x="20" y="12" width="8" height="5" rx="1" fill="currentColor" opacity="0.8"/><circle cx="44" cy="7" r="3" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.9"/></svg>`,
      'shotgun': `<svg viewBox="0 0 56 20" class="weapon-preview-svg" aria-hidden="true"><rect x="2" y="8" width="38" height="7" rx="2" fill="currentColor"/><rect x="40" y="6" width="12" height="8" rx="2" fill="currentColor"/><rect x="14" y="15" width="8" height="5" rx="1" fill="currentColor" opacity="0.8"/><rect x="2" y="8" width="10" height="4" rx="1" fill="currentColor" opacity="0.5"/></svg>`,
      'lmg': `<svg viewBox="0 0 68 22" class="weapon-preview-svg" aria-hidden="true"><rect x="2" y="7" width="50" height="8" rx="2" fill="currentColor"/><rect x="52" y="5" width="14" height="9" rx="2" fill="currentColor"/><rect x="16" y="15" width="9" height="6" rx="1" fill="currentColor" opacity="0.8"/><rect x="30" y="15" width="12" height="5" rx="1" fill="currentColor" opacity="0.6"/><rect x="2" y="8" width="4" height="4" rx="1" fill="currentColor" opacity="0.4"/></svg>`,
      'knife': `<svg viewBox="0 0 48 18" class="weapon-preview-svg" aria-hidden="true"><polygon points="2,8 36,4 38,9 36,14 2,10" fill="currentColor"/><rect x="36" y="5" width="10" height="8" rx="1" fill="currentColor" opacity="0.7"/></svg>`,
    };
    return svgs[type] ?? '';
  }

  private renderBuyMenu(): string {
    return BUY_MENU_CATEGORIES.map(category => `
      <section class="buy-category" aria-label="${this.escapeHtml(category.title)}">
        <h3 class="buy-category-title">${this.escapeHtml(category.title)}</h3>
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
    const svg = item.svgType ? this.weaponSvg(item.svgType) : '';
    const damageBar = item.damage
      ? `<div class="buy-item-damage-bar" aria-label="伤害 ${item.damage}"><div class="buy-item-damage-fill" style="width:${Math.min(100, Math.round(item.damage / 1.2))}%"></div></div>`
      : '';
    const damageLabel = item.damage ? `<span class="buy-item-damage">${item.damage}</span>` : '';
    return `
      <button class="buy-item" type="button" ${dataAttributes}${disabled} title="${this.escapeHtml(item.hint)}">
        <div class="buy-item-preview">${svg}</div>
        <div class="buy-item-info">
          <span class="buy-item-name">${this.escapeHtml(item.label)}</span>
          <span class="buy-item-price">$${item.price}</span>
          ${damageBar}${damageLabel}
        </div>
      </button>
    `;
  }

  getElement(): HTMLElement {
    return this.element;
  }

  updateHealth(health: number, maxHealth: number = 100, armor?: number): void {
    this.currentHealth = Math.max(0, Math.min(maxHealth, health));
    this.maxHealth = maxHealth;
    const percentage = this.currentHealth / this.maxHealth;

    this.healthValue.textContent = this.currentHealth.toString();
    this.healthValue.classList.toggle('low', percentage <= 0.25);
    this.healthValue.classList.toggle('medium', percentage > 0.25 && percentage <= 0.5);

    if (armor !== undefined) {
      this.armorValue.textContent = Math.max(0, Math.round(armor)).toString();
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
    this.ammoSeparator.textContent = '|';
    this.ammoCurrent.textContent = current.toString();
    this.ammoReserve.textContent = reserve.toString();

    if (current <= max * 0.2) {
      this.ammoCurrent.classList.add('ammo-low');
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
    const phaseLabel = stats.prepRemaining > 0
      ? `准备 ${Math.ceil(stats.prepRemaining)} 秒`
      : (stats.objective ?? `第 ${stats.wave} 阶段`);

    this.waveText.textContent = phaseLabel;
    this.enemiesText.textContent = `${stats.enemiesRemaining} 敌`;
    this.roomText.textContent = '单机';
    this.networkText.textContent = '';
    this.scoreText.textContent = stats.score.toString().padStart(5, '0');

    const minutes = Math.floor(stats.timeSurvived / 60).toString().padStart(2, '0');
    const seconds = Math.floor(stats.timeSurvived % 60).toString().padStart(2, '0');
    this.timerText.textContent = `${minutes}:${seconds}`;
    this.roundInfo.textContent = `R${stats.wave}`;
    this.scoreCt.textContent = stats.score > 0 ? stats.score.toString() : '—';
    this.scoreT.textContent = (stats.kills ?? 0).toString();
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

    this.timerText.textContent = this.formatClock(snapshot.roundTimeRemaining);
    this.roundInfo.textContent = `${snapshot.config.mode === 'tdm' ? 'TDM' : '爆破'} R${snapshot.round}`;
    this.scoreCt.textContent = snapshot.score.defenders.toString();
    this.scoreT.textContent = snapshot.score.attackers.toString();

    this.waveText.textContent = this.phaseLabel(snapshot.phase);
    this.roomText.textContent = `${snapshot.players.length}/${snapshot.config.maxPlayers}`;
    this.networkText.textContent = localPlayer ? `${localPlayer.ping}ms` : '';
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
    this.roomText.textContent = `${current}/${max}`;
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

  updateRadar(
    localPos: { x: number; z: number; rotY: number },
    players: Array<{ x: number; z: number; team: string; isAlive: boolean; isLocal?: boolean }>,
    mapBounds: { minX: number; maxX: number; minZ: number; maxZ: number },
    bomb?: { x: number; z: number }
  ): void {
    const ctx = this.radarCtx;
    if (!ctx) return;
    const size = 150;
    const pad = 8;
    const r = size / 2;
    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.beginPath();
    ctx.arc(r, r, r - 1, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10,14,20,0.82)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(100,140,200,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.clip();

    const toRadar = (wx: number, wz: number): [number, number] => {
      const nx = (wx - mapBounds.minX) / (mapBounds.maxX - mapBounds.minX);
      const nz = (wz - mapBounds.minZ) / (mapBounds.maxZ - mapBounds.minZ);
      return [pad + nx * (size - pad * 2), pad + nz * (size - pad * 2)];
    };

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 0.5;
    for (let i = 1; i < 4; i++) {
      const g = pad + (i / 4) * (size - pad * 2);
      ctx.beginPath(); ctx.moveTo(g, pad); ctx.lineTo(g, size - pad); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pad, g); ctx.lineTo(size - pad, g); ctx.stroke();
    }

    // Bomb
    if (bomb) {
      const [bx, bz] = toRadar(bomb.x, bomb.z);
      const t = Date.now() / 400;
      ctx.fillStyle = `rgba(255,${160 + Math.round(Math.sin(t) * 60)},0,0.95)`;
      ctx.beginPath(); ctx.arc(bx, bz, 5, 0, Math.PI * 2); ctx.fill();
    }

    // Other players
    for (const p of players) {
      if (!p.isAlive || p.isLocal) continue;
      const [px, pz] = toRadar(p.x, p.z);
      ctx.fillStyle = p.team === 'attackers' ? '#f59e0b' : '#3b82f6';
      ctx.beginPath(); ctx.arc(px, pz, 4, 0, Math.PI * 2); ctx.fill();
    }

    // Local player arrow
    const [lx, lz] = toRadar(localPos.x, localPos.z);
    ctx.save();
    ctx.translate(lx, lz);
    ctx.rotate(localPos.rotY);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -7); ctx.lineTo(4, 5); ctx.lineTo(0, 2); ctx.lineTo(-4, 5);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  updateCrosshair(spread: number): void {    const gap = Math.min(5 + spread * 22, 20);
    const chTop = this.crosshair.querySelector('.ch-top') as HTMLElement;
    const chBottom = this.crosshair.querySelector('.ch-bottom') as HTMLElement;
    const chLeft = this.crosshair.querySelector('.ch-left') as HTMLElement;
    const chRight = this.crosshair.querySelector('.ch-right') as HTMLElement;
    if (chTop) chTop.style.bottom = `${gap}px`;
    if (chBottom) chBottom.style.top = `${gap}px`;
    if (chLeft) chLeft.style.right = `${gap}px`;
    if (chRight) chRight.style.left = `${gap}px`;
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
