import type { MapId, RoomListItem } from '../game/types.js';

const MAP_OPTIONS: Array<{ id: MapId; label: string; desc: string; accent: string; sites: string }> = [
  { id: 'dust2',     label: 'Dust2',    desc: '中东沙漠 · 经典三路',       accent: '#d4a45a', sites: 'A·B' },
  { id: 'mirage',    label: 'Mirage',   desc: '中东市集 · 中路对决',       accent: '#c4a96b', sites: 'A·B' },
  { id: 'inferno',   label: 'Inferno',  desc: '欧洲小镇 · 香蕉走廊',       accent: '#b08c58', sites: 'A·B' },
  { id: 'nuke',      label: 'Nuke',     desc: '核电设施 · 双层结构',       accent: '#5c8aa8', sites: 'A·B' },
  { id: 'train',     label: 'Train',    desc: '铁路货场 · 火车掩体',       accent: '#6a6872', sites: 'A·B' },
  { id: 'overpass',  label: 'Overpass', desc: '公园隧道 · 立交桥',         accent: '#6d8060', sites: 'A·B' },
  { id: 'warehouse', label: 'Warehouse',desc: '工业仓库 · 近身混战',       accent: '#8a7a60', sites: 'A·B' },
  { id: 'italy',     label: 'Italy',    desc: '意大利小镇 · 多层建筑',     accent: '#c8926a', sites: 'A·B' },
];

export class MainMenu {
  private element: HTMLElement;
  private eventHandlers: Map<string, Array<(payload?: unknown) => void>> = new Map();
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
    menu.setAttribute('aria-label', '锻点行动 - 主菜单');
    menu.setAttribute('aria-modal', 'true');
    const mapButtons = MAP_OPTIONS.map(m =>
      `<button class="map-option${m.id === 'dust2' ? ' active' : ''}" data-map="${m.id}" type="button" title="${m.desc}">
        <span class="map-accent-bar" style="background:${m.accent}"></span>
        <span class="map-card-body">
          <span class="map-card-name">${m.label}</span>
          <span class="map-card-desc">${m.desc}</span>
          <span class="map-card-sites">炸点 ${m.sites}</span>
        </span>
      </button>`
    ).join('');
    menu.innerHTML = `
      ${this.createBackgroundSVG()}
      <button class="menu-settings-btn" data-action="settings" type="button">设置</button>
      <div class="menu-content">
        <h1 class="menu-logo">锻点行动</h1>
        <div class="profile-panel" role="group" aria-label="玩家身份">
          <label for="profile-name">玩家名</label>
          <input id="profile-name" class="profile-name-input" type="text" maxlength="18" value="${this.escapeHtml(this.loadProfileName())}" autocomplete="nickname">
        </div>
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
        <div class="room-browser" role="group" aria-label="线上房间">
          <div class="room-browser-header">
            <span>线上房间</span>
            <button class="room-refresh" data-action="refreshRooms" type="button">刷新</button>
          </div>
          <div class="room-list empty">暂无房间，点击团队死斗或爆破创建。</div>
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
    this.element.querySelector<HTMLButtonElement>('.menu-settings-btn')?.addEventListener('click', () => this.emit('settings'));
    this.element.querySelector<HTMLButtonElement>('.room-refresh')?.addEventListener('click', () => this.emit('refreshRooms'));
    this.element.querySelector<HTMLInputElement>('.profile-name-input')?.addEventListener('input', () => this.saveProfileName());
  }

  on(event: string, handler: (payload?: unknown) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  private emit(event: string): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => handler());
  }

  private emitWithPayload(event: string, payload: unknown): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => handler(payload));
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

  getPlayerName(): string {
    const input = this.element.querySelector<HTMLInputElement>('.profile-name-input');
    const name = input?.value.trim() || this.loadProfileName();
    return name || `Player-${Math.floor(Math.random() * 1000)}`;
  }

  updateRooms(rooms: RoomListItem[]): void {
    const list = this.element.querySelector('.room-list');
    if (!list) return;
    if (rooms.length === 0) {
      list.className = 'room-list empty';
      list.textContent = '暂无房间，点击团队死斗或爆破创建。';
      return;
    }
    list.className = 'room-list';
    list.innerHTML = rooms.map(room => `
      <div class="room-row" data-room="${room.id}">
        <div>
          <strong>${this.roomModeLabel(room.mode)} · ${this.escapeHtml(room.mapId)}</strong>
          <span>${this.escapeHtml(room.phase)} · ${room.playerCount}/${room.maxPlayers} · 观战 ${room.spectatorCount ?? 0}</span>
        </div>
        <button class="room-join" type="button" data-room="${room.id}">加入</button>
        <button class="room-spectate" type="button" data-room="${room.id}">观战</button>
      </div>
    `).join('');
    list.querySelectorAll<HTMLButtonElement>('.room-join').forEach(button => {
      button.addEventListener('click', () => this.emitWithPayload('joinRoom', button.dataset.room));
    });
    list.querySelectorAll<HTMLButtonElement>('.room-spectate').forEach(button => {
      button.addEventListener('click', () => this.emitWithPayload('spectateRoom', button.dataset.room));
    });
  }

  show(): void {
    this.element.classList.remove('hidden');
    const firstButton = this.buttons.values().next().value;
    firstButton?.focus();
  }

  hide(): void {
    this.element.classList.add('hidden');
  }

  dispose(): void {
    this.element.remove();
    this.eventHandlers.clear();
    this.buttons.clear();
  }

  getButton(action: string): HTMLButtonElement | undefined {
    return this.buttons.get(action);
  }

  private loadProfileName(): string {
    try {
      return localStorage.getItem('fps-game-profile-name') || `Player-${Math.floor(Math.random() * 1000)}`;
    } catch {
      return `Player-${Math.floor(Math.random() * 1000)}`;
    }
  }

  private saveProfileName(): void {
    try {
      localStorage.setItem('fps-game-profile-name', this.getPlayerName());
    } catch {
      /* ignore */
    }
  }

  private roomModeLabel(mode: string): string {
    return mode === 'defusal' ? '爆破' : '团队死斗';
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char));
  }
}
