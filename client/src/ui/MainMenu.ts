import type { MapId, RoomListItem } from '../game/types.js';

const MAP_OPTIONS: Array<{ id: MapId; label: string; desc: string; accent: string; sites: string; tdmOnly?: boolean }> = [
  { id: 'dust2',       label: 'Dust2',        desc: '中东沙漠 · 经典三路',       accent: '#d4a45a', sites: 'A·B' },
  { id: 'mirage',      label: 'Mirage',       desc: '中东市集 · 中路对决',       accent: '#c4a96b', sites: 'A·B' },
  { id: 'inferno',     label: 'Inferno',      desc: '欧洲小镇 · 香蕉走廊',       accent: '#b08c58', sites: 'A·B' },
  { id: 'nuke',        label: 'Nuke',         desc: '核电设施 · 双层结构',       accent: '#5c8aa8', sites: 'A·B' },
  { id: 'train',       label: 'Train',        desc: '铁路货场 · 火车掩体',       accent: '#6a6872', sites: 'A·B' },
  { id: 'overpass',    label: 'Overpass',     desc: '公园隧道 · 立交桥',         accent: '#6d8060', sites: 'A·B' },
  { id: 'warehouse',   label: 'Warehouse',    desc: '工业仓库 · 近身混战',       accent: '#8a7a60', sites: 'A·B' },
  { id: 'italy',       label: 'Italy',        desc: '意大利小镇 · 多层建筑',     accent: '#c8926a', sites: 'A·B' },
  { id: 'bloodstrike', label: 'Blood Strike', desc: '经典死斗 · 十字走廊混战',   accent: '#c0282a', sites: '死斗', tdmOnly: true },
];

export class MainMenu {
  private element: HTMLElement;
  private eventHandlers: Map<string, Array<(payload?: unknown) => void>> = new Map();
  private buttons: Map<string, HTMLButtonElement> = new Map();
  private difficulty: 'easy' | 'normal' | 'hard' | 'expert' = 'normal';
  private mapId: MapId = 'dust2';
  private selectedMode: 'solo' | 'tdm' | 'defusal' = 'tdm';

  constructor() {
    this.element = this.createElement();
    this.setupEventListeners();
  }

  private createBackgroundSVG(): string {
    return `
      <svg class="menu-bg-svg" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Fine hex grid pattern -->
          <pattern id="hex-grid" x="0" y="0" width="80" height="69" patternUnits="userSpaceOnUse">
            <polygon points="40,3 77,21 77,49 40,67 3,49 3,21"
                     fill="none" stroke="rgba(75,105,255,0.04)" stroke-width="1"/>
          </pattern>
          <pattern id="hex-grid-small" x="0" y="0" width="40" height="34" patternUnits="userSpaceOnUse">
            <polygon points="20,2 38,11 38,24 20,33 2,24 2,11"
                     fill="none" stroke="rgba(255,255,255,0.02)" stroke-width="0.5"/>
          </pattern>
          <!-- Vertical scanlines -->
          <pattern id="scanlines" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="2" fill="rgba(0,0,0,0.06)"/>
          </pattern>
          <radialGradient id="menu-vignette" cx="50%" cy="50%" r="75%">
            <stop offset="0%"  stop-color="#141c24" stop-opacity="0.6"/>
            <stop offset="60%" stop-color="#0a0e14" stop-opacity="0.85"/>
            <stop offset="100%" stop-color="#040608" stop-opacity="1"/>
          </radialGradient>
          <!-- Left glow (CT blue) -->
          <radialGradient id="ct-glow" cx="15%" cy="50%" r="40%">
            <stop offset="0%" stop-color="#4B69FF" stop-opacity="0.06"/>
            <stop offset="100%" stop-color="#4B69FF" stop-opacity="0"/>
          </radialGradient>
          <!-- Right glow (T gold) -->
          <radialGradient id="t-glow" cx="85%" cy="50%" r="40%">
            <stop offset="0%" stop-color="#E8C96A" stop-opacity="0.05"/>
            <stop offset="100%" stop-color="#E8C96A" stop-opacity="0"/>
          </radialGradient>
          <!-- Bottom accent line gradient -->
          <linearGradient id="bottom-line" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#4B69FF" stop-opacity="0"/>
            <stop offset="20%" stop-color="#4B69FF" stop-opacity="0.3"/>
            <stop offset="50%" stop-color="#E8C96A" stop-opacity="0.5"/>
            <stop offset="80%" stop-color="#E8C96A" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="#E8C96A" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#menu-vignette)"/>
        <rect width="100%" height="100%" fill="url(#hex-grid)"/>
        <rect width="100%" height="100%" fill="url(#hex-grid-small)"/>
        <rect width="100%" height="100%" fill="url(#scanlines)"/>
        <rect width="100%" height="100%" fill="url(#ct-glow)"/>
        <rect width="100%" height="100%" fill="url(#t-glow)"/>
        <!-- Center dividing line -->
        <line x1="0" y1="58%" x2="100%" y2="58%" stroke="url(#bottom-line)" stroke-width="1"/>
        <!-- Side CT agent silhouette -->
        <g transform="translate(5%, 35%) scale(1.8)" opacity="0.04">
          <ellipse cx="60" cy="32" rx="18" ry="16" fill="#4B69FF"/>
          <rect x="38" y="50" width="44" height="56" rx="6" fill="#4B69FF"/>
          <rect x="28" y="52" width="16" height="28" rx="5" fill="#4B69FF"/>
          <rect x="76" y="52" width="16" height="28" rx="5" fill="#4B69FF"/>
          <rect x="42" y="106" width="16" height="48" rx="5" fill="#4B69FF"/>
          <rect x="62" y="106" width="16" height="48" rx="5" fill="#4B69FF"/>
        </g>
        <!-- Side T agent silhouette -->
        <g transform="translate(88%, 35%) scale(1.8)" opacity="0.04">
          <ellipse cx="60" cy="30" rx="16" ry="15" fill="#E8C96A"/>
          <rect x="40" y="46" width="40" height="52" rx="5" fill="#E8C96A"/>
          <rect x="28" y="50" width="14" height="42" rx="5" fill="#E8C96A"/>
          <rect x="78" y="50" width="14" height="42" rx="5" fill="#E8C96A"/>
          <rect x="44" y="98" width="15" height="50" rx="4" fill="#E8C96A"/>
          <rect x="61" y="98" width="15" height="50" rx="4" fill="#E8C96A"/>
        </g>
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
      `<button class="map-option${m.id === 'dust2' ? ' active' : ''}${m.tdmOnly ? ' tdm-only-map' : ''}" data-map="${m.id}" data-tdm-only="${m.tdmOnly ? '1' : '0'}" type="button" title="${m.desc}">
        <span class="map-accent-bar" style="background:${m.accent}"></span>
        <span class="map-card-body">
          <span class="map-card-name">${m.label}${m.tdmOnly ? ' <span class="map-tdm-badge">死斗专属</span>' : ''}</span>
          <span class="map-card-desc">${m.desc}</span>
          <span class="map-card-sites">${m.tdmOnly ? '团队死斗' : '炸点 ' + m.sites + ' · 5v5'}</span>
        </span>
      </button>`
    ).join('');
    menu.innerHTML = `
      ${this.createBackgroundSVG()}
      <button class="menu-settings-btn" data-action="settings" type="button">设置</button>
      <!-- CS:GO-style faction agents -->
      <div class="menu-agents" aria-hidden="true">
        <div class="menu-agent menu-agent-ct">
          <img src="/assets/icons/teams/ct-agent.svg" alt="" class="agent-silhouette" onerror="this.style.display='none'">
          <span class="agent-label">反恐精英</span>
        </div>
        <div class="menu-agent menu-agent-t">
          <img src="/assets/icons/teams/t-agent.svg" alt="" class="agent-silhouette" onerror="this.style.display='none'">
          <span class="agent-label">恐怖分子</span>
        </div>
      </div>
      <div class="menu-content">
        <!-- CS:GO-style logo -->
        <div class="menu-logo-wrap">
          <h1 class="menu-logo">锻点行动</h1>
          <div class="menu-logo-divider">
            <span class="logo-line"></span>
            <span class="logo-diamond">◆</span>
            <span class="logo-line"></span>
          </div>
          <p class="menu-subtitle">TACTICAL OPERATIONS</p>
        </div>
        <div class="profile-panel" role="group" aria-label="玩家身份">
          <label for="profile-name">ID</label>
          <input id="profile-name" class="profile-name-input" type="text" maxlength="18" value="${this.escapeHtml(this.loadProfileName())}" autocomplete="nickname">
        </div>
        <nav class="menu-buttons" role="navigation" aria-label="游戏模式">
          <button class="menu-button menu-button-solo" data-action="solo" type="button">
            <span class="menu-btn-icon">⚔</span>
            <span>单人任务闯关</span>
            <span class="menu-btn-hint">PVE · 生存模式</span>
          </button>
          <button class="menu-button menu-button-tdm" data-action="tdm" type="button">
            <span class="menu-btn-icon">☠</span>
            <span>团队死斗</span>
            <span class="menu-btn-hint">PVP · 即刻复活</span>
          </button>
          <button class="menu-button menu-button-defusal" data-action="defusal" type="button">
            <span class="menu-btn-icon">💣</span>
            <span>5v5 爆破</span>
            <span class="menu-btn-hint">PVP · 经典模式</span>
          </button>
        </nav>
        <div class="difficulty-panel" role="group" aria-label="NPC 难度">
          <span class="diff-label">难度</span>
          <button class="difficulty-option diff-easy" data-difficulty="easy" type="button">简单</button>
          <button class="difficulty-option diff-normal active" data-difficulty="normal" type="button">普通</button>
          <button class="difficulty-option diff-hard" data-difficulty="hard" type="button">困难</button>
          <button class="difficulty-option diff-expert" data-difficulty="expert" type="button">专家</button>
        </div>
        <div class="map-panel" role="group" aria-label="地图选择">
          <div class="map-panel-header">
            <span>地图选择</span>
            <span class="map-count">${MAP_OPTIONS.length} 张地图</span>
          </div>
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
          if (action === 'solo' || action === 'tdm' || action === 'defusal') {
            this.selectedMode = action as 'solo' | 'tdm' | 'defusal';
            this.updateMapVisibility();
          }
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
        const isTdmOnly = button.dataset.tdmOnly === '1';
        if (isTdmOnly && this.selectedMode !== 'tdm') return;
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

  private updateMapVisibility(): void {
    const isTdm = this.selectedMode === 'tdm';
    this.element.querySelectorAll<HTMLButtonElement>('.map-option').forEach(button => {
      const tdmOnly = button.dataset.tdmOnly === '1';
      if (tdmOnly) {
        button.style.display = isTdm ? '' : 'none';
        if (!isTdm && this.mapId === (button.dataset.map as MapId)) {
          this.mapId = 'dust2';
          this.element.querySelectorAll<HTMLButtonElement>('.map-option').forEach(b => {
            b.classList.toggle('active', b.dataset.map === 'dust2');
          });
        }
      }
    });
    const countEl = this.element.querySelector('.map-count');
    if (countEl) {
      const visible = MAP_OPTIONS.filter(m => !m.tdmOnly || isTdm).length;
      countEl.textContent = `${visible} 张地图`;
    }
  }

  private roomModeLabel(mode: string): string {
    return mode === 'defusal' ? '爆破' : '团队死斗';
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char));
  }
}
