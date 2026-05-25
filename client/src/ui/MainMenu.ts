export class MainMenu {
  private element: HTMLElement;
  private eventHandlers: Map<string, (() => void)[]> = new Map();
  private buttons: Map<string, HTMLButtonElement> = new Map();
  private difficulty: 'easy' | 'normal' | 'hard' | 'expert' = 'normal';
  private mapId: 'dust2' | 'warehouse' | 'italy' = 'dust2';

  constructor() {
    this.element = this.createElement();
    this.setupEventListeners();
  }

  private createElement(): HTMLElement {
    const menu = document.createElement('main');
    menu.className = 'main-menu';
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-labelledby', 'game-title');
    menu.setAttribute('aria-modal', 'true');
    menu.innerHTML = `
      <div class="menu-content">
        <p class="menu-kicker">工业战术训练场</p>
        <h1 id="game-title" class="game-title">锻点行动</h1>
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
          <span>NPC 难度</span>
          <button class="difficulty-option" data-difficulty="easy" type="button">简单</button>
          <button class="difficulty-option active" data-difficulty="normal" type="button">普通</button>
          <button class="difficulty-option" data-difficulty="hard" type="button">困难</button>
          <button class="difficulty-option" data-difficulty="expert" type="button">专家</button>
        </div>
        <div class="map-panel" role="group" aria-label="地图选择">
          <span>地图</span>
          <button class="map-option active" data-map="dust2" type="button">Dust2</button>
          <button class="map-option" data-map="warehouse" type="button">仓库</button>
          <button class="map-option" data-map="italy" type="button">意大利</button>
        </div>
        <div class="game-info" role="note" aria-label="操作说明">
          <p><kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> — 移动</p>
          <p><kbd>Shift</kbd> — 静步</p>
          <p><kbd>Ctrl</kbd> — 蹲下</p>
          <p><kbd>Ctrl</kbd> + <kbd>Space</kbd> — 大跳上箱</p>
          <p><kbd>Mouse</kbd> — 视角</p>
          <p><kbd>左键</kbd> — 射击 / 投掷</p>
          <p><kbd>R</kbd> — 换弹</p>
          <p><kbd>B</kbd> — 购买 / 武器选择</p>
          <p><kbd>E</kbd> — 开门 / 互动 / 拆包</p>
          <p><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><kbd>4</kbd> — 武器 / 投掷物</p>
          <p><kbd>Tab</kbd> — 战绩面板</p>
          <p><kbd>ESC</kbd> — 暂停菜单</p>
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

      // Keyboard support for better accessibility
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
        const selected = button.dataset.map as 'dust2' | 'warehouse' | 'italy' | undefined;
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

  getMapId(): 'dust2' | 'warehouse' | 'italy' {
    return this.mapId;
  }

  show(): void {
    this.element.style.display = 'flex';
    // Focus first button for keyboard navigation
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

  // Get buttons for external control if needed
  getButton(action: string): HTMLButtonElement | undefined {
    return this.buttons.get(action);
  }
}
