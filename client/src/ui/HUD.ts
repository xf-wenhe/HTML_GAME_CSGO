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

export interface NetworkHudState {
  latencyMs?: number | null;
  inputStatus?: string;
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
  private flashOverlay: HTMLElement;
  private resultPanel: HTMLElement;
  private pausePanel: HTMLElement;
  private lockPanel: HTMLElement;
  private scoreboard: HTMLElement;
  private buyMenu: HTMLElement;
  private crosshair: HTMLElement;
  private scopeOverlay: HTMLElement;
  private touchControls: HTMLElement;
  private notificationContainer: HTMLElement;
  private weaponSlots: HTMLElement;
  private liveKillFeed: HTMLElement;
  private radarCanvas: HTMLCanvasElement;
  private radarCtx: CanvasRenderingContext2D | null = null;
  private mapLoadingOverlay: HTMLElement;
  private mapLoadingName: HTMLElement;
  private confirmDialog: HTMLElement;
  private confirmLeaveHandler: (() => void) | null = null;
  private leaveRequestHandler: (() => void) | null = null;
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
    this.flashOverlay = document.createElement('div');
    this.flashOverlay.className = 'flash-overlay';
    this.flashOverlay.style.cssText = 'position:fixed;inset:0;background:white;opacity:0;pointer-events:none;z-index:100;transition:opacity 0.1s;';
    this.element.appendChild(this.flashOverlay);
    this.resultPanel = this.element.querySelector('.result-panel') as HTMLElement;
    this.pausePanel = this.element.querySelector('.pause-panel') as HTMLElement;
    this.lockPanel = this.element.querySelector('.lock-panel') as HTMLElement;
    this.scoreboard = this.element.querySelector('.scoreboard') as HTMLElement;
    this.buyMenu = this.element.querySelector('.buy-menu') as HTMLElement;
    this.crosshair = this.element.querySelector('.crosshair') as HTMLElement;
    this.scopeOverlay = this.element.querySelector('.scope-overlay') as HTMLElement;
    this.touchControls = this.element.querySelector('.touch-controls') as HTMLElement;
    this.notificationContainer = this.element.querySelector('.notifications') as HTMLElement;
    this.weaponSlots = this.element.querySelector('.weapon-slots') as HTMLElement;
    this.liveKillFeed = this.element.querySelector('.kill-feed-live') as HTMLElement;
    this.radarCanvas = this.element.querySelector('.radar-canvas') as HTMLCanvasElement;
    this.radarCtx = this.radarCanvas?.getContext('2d') ?? null;
    this.mapLoadingOverlay = this.element.querySelector('.map-loading-overlay') as HTMLElement;
    this.mapLoadingName = this.element.querySelector('.map-loading-name') as HTMLElement;
    this.confirmDialog = this.element.querySelector('.confirm-dialog') as HTMLElement;
    this.confirmLeaveHandler = null;

    this.element.querySelector('.confirm-dialog-yes')?.addEventListener('click', () => {
      const handler = this.confirmLeaveHandler;
      this.hideLeaveConfirm();
      handler?.();
    });
    this.element.querySelector('.confirm-dialog-no')?.addEventListener('click', () => this.hideLeaveConfirm());
  }

  private weaponIconSVG(category: WeaponSlotId): string {
    const icons: Record<WeaponSlotId, string> = {
      // AK-47 style: barrel + body + magazine + stock + grip
      primary: `<svg viewBox="0 0 28 14" class="slot-svg" aria-hidden="true">
        <rect x="0" y="5" width="18" height="3" rx="0.5"/>
        <rect x="18" y="4" width="7" height="5" rx="0.5"/>
        <rect x="5" y="8" width="5" height="4" rx="0.5" opacity="0.85"/>
        <rect x="25" y="3" width="3" height="7" rx="0.5" opacity="0.75"/>
        <rect x="1" y="4" width="2" height="2" rx="0.3" opacity="0.6"/>
      </svg>`,
      // Pistol: horizontal barrel + body + vertical grip
      pistol: `<svg viewBox="0 0 22 14" class="slot-svg" aria-hidden="true">
        <rect x="0" y="4" width="14" height="4" rx="0.5"/>
        <rect x="14" y="3" width="6" height="6" rx="0.5"/>
        <rect x="4" y="8" width="4" height="6" rx="0.5" opacity="0.85"/>
        <rect x="0" y="5" width="3" height="2" rx="0.3" opacity="0.5"/>
      </svg>`,
      // Knife: blade + guard + handle
      knife: `<svg viewBox="0 0 22 10" class="slot-svg" aria-hidden="true">
        <polygon points="0,3 15,1 16,5 15,9 0,7"/>
        <rect x="14" y="2" width="2" height="6" rx="0.3"/>
        <rect x="16" y="3" width="6" height="4" rx="0.5" opacity="0.8"/>
      </svg>`,
      // Grenade: round body + safety lever + pin ring
      grenade: `<svg viewBox="0 0 12 18" class="slot-svg" aria-hidden="true">
        <ellipse cx="6" cy="12" rx="5" ry="5"/>
        <rect x="4" y="2" width="4" height="6" rx="0.5"/>
        <rect x="2" y="1" width="8" height="2" rx="1" opacity="0.7"/>
        <rect x="5" y="0" width="2" height="3" rx="0.5" opacity="0.85"/>
      </svg>`,
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
        <div class="ammo-container" style="align-items:flex-end;">
          <div class="kill-feed-live" aria-label="击杀提示"></div>
          <div class="weapon-slots" aria-label="武器槽位">
            <div class="weapon-slot active" data-slot="primary">
              <span class="slot-key">1</span>
              ${this.weaponIconSVG('primary')}
              <span class="slot-name">步枪</span>
            </div>
            <div class="weapon-slot" data-slot="pistol">
              <span class="slot-key">2</span>
              ${this.weaponIconSVG('pistol')}
              <span class="slot-name">手枪</span>
            </div>
            <div class="weapon-slot" data-slot="knife">
              <span class="slot-key">3</span>
              ${this.weaponIconSVG('knife')}
              <span class="slot-name">刀</span>
            </div>
            <div class="weapon-slot" data-slot="grenade">
              <span class="slot-key">4</span>
              ${this.weaponIconSVG('grenade')}
              <span class="slot-name">手雷 x1</span>
            </div>
          </div>
        </div>
      </div>

      <div class="hud-bottom-left">
        <div class="vitals-display" aria-label="生命值与护甲">
          <div class="vitals-block">
            <span class="health-value" aria-label="生命值">100</span>
            <span class="vitals-icon" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></span>
          </div>
          <div class="vitals-sep" aria-hidden="true"></div>
          <div class="vitals-block">
            <span class="armor-value" aria-label="护甲">100</span>
            <span class="vitals-icon armor-icon" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span>
          </div>
        </div>
      </div>

      <div class="hud-bottom-right">
        <div class="ammo-container" aria-label="弹药与武器">
          <span class="score-text" aria-label="分数或金钱">$800</span>
          <span class="weapon-name" aria-label="当前武器">制式手枪</span>
          <div class="ammo-display" aria-label="弹药">
            <span class="ammo-current" aria-label="当前弹匣">12</span>
            <span class="ammo-separator" aria-hidden="true">|</span>
            <span class="ammo-reserve" aria-hidden="true">36</span>
          </div>
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

      <div class="scope-overlay hidden" aria-hidden="true"></div>

      <div class="damage-overlay" aria-hidden="true"></div>

      <div class="touch-controls hidden" aria-hidden="true">
        <div class="touch-look-zone"></div>
        <div class="touch-stick-base" aria-label="移动摇杆">
          <div class="touch-stick-knob"></div>
        </div>
        <div class="touch-action-cluster">
          <button class="touch-btn touch-btn-small" type="button" data-touch-key="Digit1" data-touch-mode="tap" aria-label="主武器">1</button>
          <button class="touch-btn touch-btn-small" type="button" data-touch-key="Digit2" data-touch-mode="tap" aria-label="手枪">2</button>
          <button class="touch-btn touch-btn-small" type="button" data-touch-key="Digit3" data-touch-mode="tap" aria-label="刀">3</button>
          <button class="touch-btn touch-btn-small" type="button" data-touch-key="Digit4" data-touch-mode="tap" aria-label="投掷物">4</button>
          <button class="touch-btn touch-btn-fire" type="button" data-touch-key="MouseLeft" aria-label="开火">FIRE</button>
          <button class="touch-btn" type="button" data-touch-key="MouseRight" aria-label="副攻击">ALT</button>
          <button class="touch-btn" type="button" data-touch-key="Space" data-touch-mode="tap" aria-label="跳跃">JUMP</button>
          <button class="touch-btn" type="button" data-touch-key="KeyR" data-touch-mode="tap" aria-label="换弹">R</button>
          <button class="touch-btn" type="button" data-touch-key="KeyE" data-touch-mode="tap" aria-label="互动">E</button>
          <button class="touch-btn" type="button" data-touch-key="KeyB" data-touch-mode="tap" aria-label="购买">B</button>
          <button class="touch-btn" type="button" data-touch-key="ControlLeft" aria-label="蹲下">C</button>
        </div>
      </div>

      <div class="result-panel hidden" role="dialog" aria-label="任务结果"></div>
      <div class="pause-panel hidden" role="dialog" aria-label="已暂停">
        <h2>已暂停</h2>
        <p>点击继续后重新进入游戏焦点。</p>
        <button class="resume-button" type="button">继续游戏</button>
        <button class="leave-button" type="button">退出游戏</button>
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

      <div class="map-loading-overlay hidden" aria-label="地图加载中">
        <div class="map-loading-content">
          <div class="map-loading-spinner"></div>
          <div class="map-loading-name"></div>
        </div>
      </div>

      <div class="confirm-dialog hidden" aria-label="确认对话框" role="dialog">
        <div class="confirm-dialog-box">
          <div class="confirm-dialog-msg">确定要退出当前对局吗？</div>
          <div class="confirm-dialog-buttons">
            <button class="confirm-dialog-no">继续游戏</button>
            <button class="confirm-dialog-yes">确定退出</button>
          </div>
        </div>
      </div>`;

    hud.querySelectorAll<HTMLButtonElement>('.buy-menu button').forEach(button => {
      button.addEventListener('click', () => {
        if (button.disabled) return;
        const weaponId = button.dataset.weapon as WeaponId | undefined;
        if (weaponId) this.buyHandler?.({ weaponId });
        if (button.dataset.armor) this.buyHandler?.({ armor: true });
      });
    });
    hud.querySelector<HTMLButtonElement>('.resume-button')?.addEventListener('click', () => this.resumeHandler?.());
    hud.querySelector<HTMLButtonElement>('.leave-button')?.addEventListener('click', () => this.leaveRequestHandler?.());
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

  getTouchControlsElement(): HTMLElement {
    return this.touchControls;
  }

  setTouchControlsVisible(visible: boolean): void {
    this.touchControls.classList.toggle('hidden', !visible);
  }

  updateHealth(health: number, maxHealth: number = 100, armor?: number): void {
    this.currentHealth = Math.max(0, Math.min(maxHealth, health));
    this.maxHealth = maxHealth;
    const percentage = this.currentHealth / this.maxHealth;

    this.healthValue.textContent = this.currentHealth.toString();
    this.healthValue.classList.toggle('low', percentage <= 0.25);
    this.healthValue.classList.toggle('medium', percentage > 0.25 && percentage <= 0.5);
    // CS:GO blood-edge vignette when below 30 HP
    this.element.classList.toggle('low-health', percentage <= 0.3);

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

  updateMatch(snapshot: MatchSnapshot, localPlayerId?: string, networkState: NetworkHudState = {}): void {
    const localPlayer = snapshot.players.find(player => player.id === localPlayerId);
    const localPing = networkState.latencyMs ?? localPlayer?.ping;
    const localPingLabel = this.formatLatency(localPing);
    const inputLabel = networkState.inputStatus ? ` ${networkState.inputStatus}` : '';

    this.timerText.textContent = this.formatClock(snapshot.roundTimeRemaining);
    this.roundInfo.textContent = `${snapshot.config.mode === 'tdm' ? 'TDM' : '爆破'} R${snapshot.round}`;
    this.scoreCt.textContent = snapshot.score.defenders.toString();
    this.scoreT.textContent = snapshot.score.attackers.toString();

    this.waveText.textContent = this.phaseLabel(snapshot.phase);
    this.roomText.textContent = `${snapshot.players.length}/${snapshot.config.maxPlayers}`;
    this.networkText.textContent = localPlayer ? `${localPingLabel}${inputLabel}` : `--ms${inputLabel}`;
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
          <td>${player.id === localPlayerId ? this.formatLatencyValue(localPing) : this.formatLatencyValue(player.ping)}</td>
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
    row.className = 'kill-feed-row kill-feed-entry';
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

    // Auto-fade after 4s
    setTimeout(() => row.classList.add('kill-feed-fading'), 4000);

    return row;
  }

  private parseKillFeedMessage(message: string, snapshot?: MatchSnapshot): { attacker: string; weapon: string; victim: string; headshot: boolean; attackerTeam?: string } {
    const headshot = message.includes('HEADSHOT') || message.includes('爆头');
    // Server format: "AttackerName [WeaponName] HEADSHOT VictimName"
    // or: "AttackerName [WeaponName] VictimName"
    const bracketOpen = message.indexOf('[');
    const bracketClose = message.indexOf(']');
    let attacker = '';
    let weapon = '';
    let victim = '';

    if (bracketOpen > 0 && bracketClose > bracketOpen) {
      attacker = message.slice(0, bracketOpen).trim();
      weapon = message.slice(bracketOpen + 1, bracketClose).trim();
      const afterBracket = message.slice(bracketClose + 1).trim();
      victim = afterBracket.replace(/HEADSHOT|爆头/gi, '').trim();
    } else {
      // Fallback: space-delimited format "Attacker Weapon Victim" or "Attacker Weapon HEADSHOT Victim"
      const clean = message.replace(/HEADSHOT|爆头/gi, '').trim();
      const parts = clean.split(/\s+/);
      if (parts.length >= 3) {
        // Last word is victim, before that find weapon by checking known weapons
        const knownWeapons = ['Vandal AR', 'Sentinel M4', 'Longbow AWP', 'Specter SMG', 'Bulldog Shotgun', 'S-9 Sidearm', 'Rook Heavy', 'Tactical Knife', 'Glock-18', 'AK-47', 'M4A1-S', 'M4A4', 'AWP', 'MP9', 'MP7', 'Nova', 'Desert Eagle', 'FAMAS', 'Galil AR'];
        const weaponMatch = knownWeapons.find(w => clean.includes(w));
        if (weaponMatch) {
          const wIdx = clean.indexOf(weaponMatch);
          attacker = clean.slice(0, wIdx).trim();
          weapon = weaponMatch;
          victim = clean.slice(wIdx + weaponMatch.length).trim();
        } else {
          attacker = parts[0];
          weapon = parts.slice(1, -1).join(' ');
          victim = parts[parts.length - 1];
        }
      }
    }

    const players = snapshot?.players ?? [];
    const attackerPlayer = players.find(p => p.name === attacker);

    return {
      attacker: attacker || message,
      weapon: weapon || '击杀',
      victim: victim || '',
      headshot,
      attackerTeam: attackerPlayer?.team
    };
  }

  onResume(handler: () => void): void {
    this.resumeHandler = handler;
  }

  onLeaveRequest(handler: () => void): void {
    this.leaveRequestHandler = handler;
  }

  setCrosshairStyle(style: string, color: string): void {
    const colorMap: Record<string, string> = {
      green: 'rgba(0, 230, 0, 0.92)',
      cyan: 'rgba(0, 200, 220, 0.92)',
      white: 'rgba(220, 220, 220, 0.92)',
      yellow: 'rgba(220, 200, 0, 0.92)',
    };
    const c = colorMap[color] ?? colorMap.green;
    this.crosshair.querySelectorAll('.ch-top, .ch-bottom, .ch-left, .ch-right').forEach(el => {
      (el as HTMLElement).style.backgroundColor = c;
    });
    // Toggle dot style
    this.crosshair.classList.toggle('crosshair-dot', style === 'dot');
    this.crosshair.classList.toggle('crosshair-t', style === 't-cross');
    this.crosshair.classList.toggle('crosshair-static', style === 'static');
  }

  showDamage(): void {
    this.damageOverlay.classList.remove('damage-flash');
    void this.damageOverlay.offsetWidth;
    this.damageOverlay.classList.add('damage-flash');
  }

  showDirectionalDamage(angleRad: number): void {
    const indicator = document.createElement('div');
    indicator.className = 'damage-indicator';
    const size = 120;
    indicator.style.cssText = `
      position:fixed; pointer-events:none; z-index:80;
      width:${size}px; height:${size}px;
      top:50%; left:50%;
      transform: translate(-50%, -50%) rotate(${angleRad}rad);
    `;
    const arc = document.createElement('div');
    arc.className = 'damage-arc';
    arc.style.cssText = `
      position:absolute; inset:0;
      border:3px solid transparent;
      border-top-color: var(--danger);
      border-radius:50%;
    `;
    indicator.appendChild(arc);
    this.element.appendChild(indicator);
    setTimeout(() => indicator.remove(), 650);
  }

  setFlashOverlay(intensity: number): void {
    this.flashOverlay.style.opacity = String(Math.min(1, intensity));
    if (intensity < 0.01) this.flashOverlay.style.opacity = '0';
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

  showMatchSummary(snapshot: MatchSnapshot, localPlayerId?: string): void {
    const summary = snapshot.summary;
    if (!summary) return;
    const localPlayer = snapshot.players.find(player => player.id === localPlayerId);
    const winner = summary.winner === 'defenders' ? 'CT 胜利' : summary.winner === 'attackers' ? 'T 胜利' : '平局';
    this.resultPanel.classList.remove('hidden');
    this.resultPanel.innerHTML = `
      <h2>${winner}</h2>
      <p>${summary.topPlayer ? `MVP ${this.escapeHtml(summary.topPlayer.name)} · ${summary.topPlayer.kills} 击杀` : '对局结束'}</p>
      <dl>
        <div><dt>比分</dt><dd>${summary.finalScore.defenders}:${summary.finalScore.attackers}</dd></div>
        <div><dt>你的击杀</dt><dd>${localPlayer?.kills ?? 0}</dd></div>
        <div><dt>时长</dt><dd>${summary.durationSeconds}s</dd></div>
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

  private formatLatency(latencyMs?: number | null): string {
    const value = this.formatLatencyValue(latencyMs);
    return value === '--' ? '--ms' : `${value}ms`;
  }

  private formatLatencyValue(latencyMs?: number | null): string {
    if (latencyMs === undefined || latencyMs === null || !Number.isFinite(latencyMs)) return '--';
    return Math.min(999, Math.max(1, Math.round(latencyMs))).toString();
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
      sidearm: 'Glock-18',
      pistol: 'Glock-18',
      heavy_pistol: 'Desert Eagle',
      deagle: 'Desert Eagle',
      vandal: 'AK-47',
      rifle: 'AK-47',
      ak47: 'AK-47',
      sentinel: 'M4A1-S',
      m4a1s: 'M4A1-S',
      defender_rifle: 'M4A4',
      m4a4: 'M4A4',
      operator: 'AWP',
      sniper: 'AWP',
      awp: 'AWP',
      specter: 'MP9',
      smg: 'MP7',
      mp7: 'MP7',
      bulldog: 'Nova',
      shotgun: 'Nova',
      nova: 'Nova',
      knife: '战术刀',
      famas: 'FAMAS',
      galil: 'Galil AR',
      sg553: 'SG 553',
      aug: 'AUG',
      ssg08: 'SSG 08',
      scar20: 'SCAR-20',
      g3sg1: 'G3SG1',
      mag7: 'MAG-7',
      xm1014: 'XM1014',
      m249: 'M249',
      negev: 'Negev',
      p250: 'P250',
      five_seven: 'Five-SeveN',
      dual_berettas: 'Dual Berettas',
      tec9: 'Tec-9',
      cz75: 'CZ75-Auto',
      mac10: 'MAC-10',
      mp9: 'MP9',
      pp_bizon: 'PP-Bizon',
      ump45: 'UMP-45',
      p90: 'P90',
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
    // Create a new notification item each time (stacking behavior)
    const item = document.createElement('div');
    item.className = 'notification notification-item';
    item.setAttribute('role', 'alert');
    item.textContent = message;
    this.notificationContainer.appendChild(item);

    // Clean up old notifications (keep max 3)
    const items = this.notificationContainer.querySelectorAll('.notification-item');
    if (items.length > 3) items[0].remove();

    // Auto-dismiss
    setTimeout(() => {
      item.classList.add('notify-out');
      setTimeout(() => item.remove(), 250);
    }, duration);
  }

  updateRadar(
    localPos: { x: number; z: number; rotY: number },
    players: Array<{ x: number; z: number; team: string; isAlive: boolean; isLocal?: boolean }>,
    mapBounds: { minX: number; maxX: number; minZ: number; maxZ: number },
    bomb?: { x: number; z: number },
    callouts?: Array<{ name: string; position: { x: number; z: number }; radius: number }>
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

    // Callouts
    if (callouts) {
      ctx.font = '7px Rajdhani, sans-serif';
      ctx.textAlign = 'center';
      for (const co of callouts) {
        const [cx, cz] = toRadar(co.position.x, co.position.z);
        const cr = Math.max(2, (co.radius / (mapBounds.maxX - mapBounds.minX)) * (size - pad * 2));
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.arc(cx, cz, cr, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(200,200,210,0.55)';
        const label = co.name.length > 7 ? co.name.slice(0, 6) + '.' : co.name;
        ctx.fillText(label, cx, cz + 2.5);
      }
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
    ctx.rotate(-localPos.rotY);
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

  setScoped(scoped: boolean): void {
    this.scopeOverlay.classList.toggle('hidden', !scoped);
    this.crosshair.classList.toggle('hidden', scoped);
  }

  showHitMarker(): void {
    this.crosshair.classList.add('hit');
    this.announceForScreenReader('命中确认');
    setTimeout(() => {
      this.crosshair.classList.remove('hit');
    }, 100);
  }

  showMapLoading(mapName: string): void {
    this.mapLoadingName.textContent = mapName;
    this.mapLoadingOverlay.classList.remove('hidden');
  }

  hideMapLoading(): void {
    this.mapLoadingOverlay.classList.add('hidden');
  }

  showLeaveConfirm(handler: () => void): void {
    this.confirmLeaveHandler = handler;
    this.confirmDialog.classList.remove('hidden');
  }

  hideLeaveConfirm(): void {
    this.confirmDialog.classList.add('hidden');
    this.confirmLeaveHandler = null;
  }

  hide(): void {
    this.element.classList.add('hidden');
    this.setScoped(false);
    this.toggleBuyMenu(false);
    this.toggleScoreboard(false);
    this.hidePause();
    this.hidePointerLockGuide();
  }

  show(): void {
    this.element.classList.remove('hidden');
    this.setScoped(false);
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
