import type { MapId } from '../game/types.js';

const MAP_OPTIONS: Array<{ id: MapId; label: string; desc: string }> = [
  { id: 'dust2',     label: 'Dust2',    desc: '中东沙漠 · 经典三路' },
  { id: 'mirage',    label: 'Mirage',   desc: '中东市集 · 中路对决' },
  { id: 'inferno',   label: 'Inferno',  desc: '欧洲小镇 · 香蕉走廊' },
  { id: 'nuke',      label: 'Nuke',     desc: '核电设施 · 双层结构' },
  { id: 'train',     label: 'Train',    desc: '铁路货场 · 火车掩体' },
  { id: 'overpass',  label: 'Overpass', desc: '公园隧道 · 立交桥' },
  { id: 'warehouse', label: 'Warehouse',desc: '工业仓库 · 近身混战' },
  { id: 'italy',     label: 'Italy',    desc: '意大利小镇 · 多层建筑' },
];

export class MainMenu {
  private element: HTMLElement;
  private eventHandlers: Map<string, (() => void)[]> = new Map();
  private buttons: Map<string, HTMLButtonElement> = new Map();
  private difficulty: 'easy' | 'normal' | 'hard' | 'expert' = 'normal';
  private mapId: MapId = 'dust2';

  constructor() {
    this.element = this.createElement();
    this.setupEventListeners();
  }

  private createBackgroundSVG(): string {
    return `
      <svg class="menu-bg-svg" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hex-grid" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
            <polygon points="30,2 58,17 58,35 30,50 2,35 2,17"
                     fill="none" stroke="rgba(75,105,255,0.07)" stroke-width="1"/>
          </pattern>
          <radialGradient id="menu-vignette" cx="50%" cy="55%" r="75%">
            <stop offset="0%"  stop-color="#1b2838" stop-opacity="0.7"/>
            <stop offset="100%" stop-color="#060c10" stop-opacity="1"/>
          </radialGradient>
          <linearGradient id="menu-accent" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#4b69ff" stop-opacity="0.08"/>
            <stop offset="100%" stop-color="#ff9a00" stop-opacity="0.04"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#menu-vignette)"/>
        <rect width="100%" height="100%" fill="url(#hex-grid)"/>
        <rect width="100%" height="100%" fill="url(#menu-accent)"/>
        <line x1="0" y1="60%" x2="100%" y2="60%" stroke="rgba(75,105,255,0.06)" stroke-width="1"/>
      </svg>
    `;
  }

  private createLogoSVG(): string {
    return `
      <svg class="game-logo-svg" viewBox="0 0 500 90" aria-label="锻点行动" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stop-color="#8fa3b3"/>
            <stop offset="40%"  stop-color="#c6d4df"/>
            <stop offset="100%" stop-color="#8fa3b3"/>
          </linearGradient>
        </defs>
        <text x="250" y="62"
              text-anchor="middle"
              font-family="Rajdhani, 'Arial Narrow', Arial, sans-serif"
              font-weight="700"
              font-size="66"
              letter-spacing="10"
              fill="url(#logo-grad)">锻点行动</text>
        <rect x="60" y="72" width="380" height="2" fill="#ff9a00" opacity="0.85"/>
        <rect x="100" y="76" width="300" height="1" fill="#4b69ff" opacity="0.5"/>
      </svg>
    `;
  }

  private createElement(): HTMLElement {
    const menu = document.createElement('main');
    menu.className = 'main-menu';
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-labelledby', 'game-title');
    menu.setAttribute('aria-modal', 'true');
    const mapButtons = MAP_OPTIONS.map(m =>
      `<button class="map-option${m.id === 'dust2' ? ' active' : ''}" data-map="${m.id}" type="button" title="${m.desc}">${m.label}<span class="map-desc">${m.desc}</span></button>`
    ).join('');
    menu.innerHTML = `
      ${this.createBackgroundSVG()}
      <div class="menu-content">
        ${this.createLogoSVG()}
        <nav class="menu-buttons" role="navigation" aria-label="游戏模式">
          <button class="menu-button" data-action="solo" type="button">
            单人任务闯关
          </button>
          <button class="menu-button" data-action="tdm" type="button">
            团队死斗
          </button>
          <button class="menu-button" data-action="defusal" type="button">
            5v5 爆破
          </button>
        </nav>
        <div class="difficulty-panel" role="group" aria-label="NPC 难度">
          <span>难度</span>
          <button class="difficulty-option" data-difficulty="easy" type="button">简单</button>
          <button class="difficulty-option active" data-difficulty="normal" type="button">普通</button>
          <button class="difficulty-option" data-difficulty="hard" type="button">困难</button>
          <button class="difficulty-option" data-difficulty="expert" type="button">专家</button>
        </div>
        <div class="map-panel" role="group" aria-label="地图选择">
          <span>地图</span>
          <div class="map-grid">${mapButtons}</div>
        </div>
        <div class="game-info" role="note" aria-label="操作说明">
          <p><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 移动 &nbsp; <kbd>Shift</kbd> 静步 &nbsp; <kbd>Ctrl</kbd> 蹲下</p>
          <p><kbd>左键</kbd> 射击 / 投掷 &nbsp; <kbd>R</kbd> 换弹 &nbsp; <kbd>B</kbd> 购买 &nbsp; <kbd>E</kbd> 互动</p>
          <p><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><kbd>4</kbd> 武器切换 &nbsp; <kbd>Tab</kbd> 战绩面板 &nbsp; <kbd>ESC</kbd> 暂停</p>
        </div>
      </div>
    `;
    return menu;
  }

  private setupEventListeners(): void {
    const buttons = this.element.querySelectorAll('.menu-button');
    buttons.forEach(button => {
      const htmlButton = button as HTMLButtonElement;
      this.buttons.set(htmlButton.getAttribute('data-action')!, htmlButton);

      htmlButton.addEventListener('click', (e) => {
        const action = (e.currentTarget as HTMLElement).getAttribute('data-action');
        if (action) {
          this.emit(action);
        }
      });

      htmlButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          htmlButton.click();
        }
      });
    });
    this.element.querySelectorAll<HTMLButtonElement>('.difficulty-option').forEach(button => {
      button.addEventListener('click', () => {
        const selected = button.dataset.difficulty as 'easy' | 'normal' | 'hard' | 'expert' | undefined;
        if (!selected) return;
        this.difficulty = selected;
        this.element.querySelectorAll('.difficulty-option').forEach(item => item.classList.toggle('active', item === button));
      });
    });
    this.element.querySelectorAll<HTMLButtonElement>('.map-option').forEach(button => {
      button.addEventListener('click', () => {
        const selected = button.dataset.map as MapId | undefined;
        if (!selected) return;
        this.mapId = selected;
        this.element.querySelectorAll('.map-option').forEach(item => item.classList.toggle('active', item === button));
      });
    });
  }

  on(event: string, handler: () => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  private emit(event: string): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => handler());
  }

  getElement(): HTMLElement {
    return this.element;
  }

  getDifficulty(): 'easy' | 'normal' | 'hard' | 'expert' {
    return this.difficulty;
  }

  getMapId(): MapId {
    return this.mapId;
  }

  show(): void {
    this.element.style.display = 'flex';
    const firstButton = this.buttons.values().next().value;
    firstButton?.focus();
  }

  hide(): void {
    this.element.style.display = 'none';
  }

  dispose(): void {
    this.element.remove();
    this.eventHandlers.clear();
    this.buttons.clear();
  }

  getButton(action: string): HTMLButtonElement | undefined {
    return this.buttons.get(action);
  }
}
