export interface GameSettings {
  mouseSensitivity: number;
  startingMoney: number;
  masterVolume: number;
  effectsVolume: number;
  quality: 'low' | 'medium' | 'high';
  crosshairStyle: 'classic' | 'dot' | 't-cross' | 'static';
  crosshairColor: 'green' | 'cyan' | 'white' | 'yellow';
  language: string;
}

const DEFAULT_SETTINGS: GameSettings = {
  mouseSensitivity: 1.0,
  startingMoney: 800,
  masterVolume: 0.8,
  effectsVolume: 0.8,
  quality: 'high',
  crosshairStyle: 'classic',
  crosshairColor: 'green',
  language: 'zh',
};

const STORAGE_KEY = 'fps-game-settings';

export class Settings {
  private element: HTMLElement;
  private values: GameSettings;
  private onChangeHandlers: Array<(s: GameSettings) => void> = [];
  private onCloseHandler: (() => void) | null = null;

  constructor() {
    this.values = this.load();
    this.element = this.createElement();
    document.getElementById('app')?.appendChild(this.element);
  }

  private load(): GameSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return { ...DEFAULT_SETTINGS };
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.values));
    } catch { /* ignore */ }
  }

  getSettings(): GameSettings {
    return { ...this.values };
  }

  onChange(handler: (s: GameSettings) => void): void {
    this.onChangeHandlers.push(handler);
  }

  onClose(handler: () => void): void {
    this.onCloseHandler = handler;
  }

  show(): void {
    this.syncUI();
    this.element.classList.remove('hidden');
  }

  hide(): void {
    this.save();
    this.element.classList.add('hidden');
    this.onChangeHandlers.forEach(h => h(this.values));
    this.onCloseHandler?.();
  }

  isVisible(): boolean {
    return !this.element.classList.contains('hidden');
  }

  private syncUI(): void {
    const sens = this.element.querySelector('#sens-slider') as HTMLInputElement;
    const sensVal = this.element.querySelector('#sens-value') as HTMLElement;
    if (sens) sens.value = String(this.values.mouseSensitivity);
    if (sensVal) sensVal.textContent = this.values.mouseSensitivity.toFixed(1);

    const money = this.element.querySelector('#starting-money') as HTMLInputElement;
    if (money) money.value = String(this.values.startingMoney);

    const mVol = this.element.querySelector('#master-vol') as HTMLInputElement;
    if (mVol) mVol.value = String(this.values.masterVolume);
    const mVolVal = this.element.querySelector('#master-vol-value') as HTMLElement;
    if (mVolVal) mVolVal.textContent = Math.round(this.values.masterVolume * 100) + '%';

    const eVol = this.element.querySelector('#effects-vol') as HTMLInputElement;
    if (eVol) eVol.value = String(this.values.effectsVolume);
    const eVolVal = this.element.querySelector('#effects-vol-value') as HTMLElement;
    if (eVolVal) eVolVal.textContent = Math.round(this.values.effectsVolume * 100) + '%';

    const qual = this.element.querySelector('#quality-select') as HTMLSelectElement;
    if (qual) qual.value = this.values.quality;

    const crossStyle = this.element.querySelector('#crosshair-style') as HTMLSelectElement;
    if (crossStyle) crossStyle.value = this.values.crosshairStyle;

    const crossColor = this.element.querySelector('#crosshair-color') as HTMLSelectElement;
    if (crossColor) crossColor.value = this.values.crosshairColor;
  }

  private createElement(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'settings-panel hidden';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '游戏设置');
    panel.setAttribute('aria-modal', 'true');
    panel.innerHTML = `
      <div class="settings-container">
        <h2 class="settings-title">游戏设置</h2>
        <div class="settings-body">
          <div class="settings-group">
            <h3>鼠标</h3>
            <div class="setting-row">
              <label for="sens-slider">灵敏度</label>
              <div class="slider-row">
                <input type="range" id="sens-slider" min="0.1" max="5.0" step="0.1" value="${this.values.mouseSensitivity}">
                <span class="slider-value" id="sens-value">${this.values.mouseSensitivity.toFixed(1)}</span>
              </div>
            </div>
          </div>
          <div class="settings-group">
            <h3>对局</h3>
            <div class="setting-row">
              <label for="starting-money">初始资金</label>
              <input type="number" id="starting-money" min="0" max="16000" step="100" value="${this.values.startingMoney}">
            </div>
          </div>
          <div class="settings-group">
            <h3>音频</h3>
            <div class="setting-row">
              <label for="master-vol">主音量</label>
              <div class="slider-row">
                <input type="range" id="master-vol" min="0" max="1" step="0.05" value="${this.values.masterVolume}">
                <span class="slider-value" id="master-vol-value">${Math.round(this.values.masterVolume * 100)}%</span>
              </div>
            </div>
            <div class="setting-row">
              <label for="effects-vol">音效</label>
              <div class="slider-row">
                <input type="range" id="effects-vol" min="0" max="1" step="0.05" value="${this.values.effectsVolume}">
                <span class="slider-value" id="effects-vol-value">${Math.round(this.values.effectsVolume * 100)}%</span>
              </div>
            </div>
          </div>
          <div class="settings-group">
            <h3>画质</h3>
            <div class="setting-row">
              <label for="quality-select">预设</label>
              <select id="quality-select">
                <option value="low" ${this.values.quality === 'low' ? 'selected' : ''}>低</option>
                <option value="medium" ${this.values.quality === 'medium' ? 'selected' : ''}>中</option>
                <option value="high" ${this.values.quality === 'high' ? 'selected' : ''}>高</option>
              </select>
            </div>
          </div>
          <div class="settings-group">
            <h3>准星</h3>
            <div class="setting-row">
              <label for="crosshair-style">样式</label>
              <select id="crosshair-style">
                <option value="classic" ${this.values.crosshairStyle === 'classic' ? 'selected' : ''}>经典十字</option>
                <option value="dot" ${this.values.crosshairStyle === 'dot' ? 'selected' : ''}>圆点</option>
                <option value="t-cross" ${this.values.crosshairStyle === 't-cross' ? 'selected' : ''}>T 型</option>
                <option value="static" ${this.values.crosshairStyle === 'static' ? 'selected' : ''}>静态</option>
              </select>
            </div>
            <div class="setting-row">
              <label for="crosshair-color">颜色</label>
              <select id="crosshair-color">
                <option value="green" ${this.values.crosshairColor === 'green' ? 'selected' : ''}>绿色</option>
                <option value="cyan" ${this.values.crosshairColor === 'cyan' ? 'selected' : ''}>青色</option>
                <option value="white" ${this.values.crosshairColor === 'white' ? 'selected' : ''}>白色</option>
                <option value="yellow" ${this.values.crosshairColor === 'yellow' ? 'selected' : ''}>黄色</option>
              </select>
            </div>
          </div>
          <div class="settings-group">
            <h3>按键绑定</h3>
            <div class="keybind-grid">
              <span>移动</span><span class="key-tag">W A S D</span>
              <span>跳跃</span><span class="key-tag">Space</span>
              <span>蹲下</span><span class="key-tag">Ctrl</span>
              <span>静步</span><span class="key-tag">Shift</span>
              <span>换弹</span><span class="key-tag">R</span>
              <span>购买</span><span class="key-tag">B</span>
              <span>互动</span><span class="key-tag">E</span>
              <span>计分板</span><span class="key-tag">Tab</span>
              <span>暂停</span><span class="key-tag">Esc</span>
            </div>
          </div>
        </div>
        <div class="settings-footer">
          <button class="settings-btn settings-btn-close" type="button">关闭</button>
        </div>
      </div>`;

    // Event listeners
    const sensSlider = panel.querySelector('#sens-slider') as HTMLInputElement;
    sensSlider?.addEventListener('input', () => {
      this.values.mouseSensitivity = parseFloat(sensSlider.value);
      const val = panel.querySelector('#sens-value');
      if (val) val.textContent = this.values.mouseSensitivity.toFixed(1);
      this.notifyChange();
    });

    const startingMoney = panel.querySelector('#starting-money') as HTMLInputElement;
    startingMoney?.addEventListener('input', () => {
      this.values.startingMoney = Math.max(0, Math.min(16000, Math.round(parseFloat(startingMoney.value) || 0)));
      this.notifyChange();
    });

    const mVol = panel.querySelector('#master-vol') as HTMLInputElement;
    mVol?.addEventListener('input', () => {
      this.values.masterVolume = parseFloat(mVol.value);
      const val = panel.querySelector('#master-vol-value');
      if (val) val.textContent = Math.round(this.values.masterVolume * 100) + '%';
      this.notifyChange();
    });

    const eVol = panel.querySelector('#effects-vol') as HTMLInputElement;
    eVol?.addEventListener('input', () => {
      this.values.effectsVolume = parseFloat(eVol.value);
      const val = panel.querySelector('#effects-vol-value');
      if (val) val.textContent = Math.round(this.values.effectsVolume * 100) + '%';
      this.notifyChange();
    });

    const qual = panel.querySelector('#quality-select') as HTMLSelectElement;
    qual?.addEventListener('change', () => { this.values.quality = qual.value as GameSettings['quality']; this.notifyChange(); });

    const cStyle = panel.querySelector('#crosshair-style') as HTMLSelectElement;
    cStyle?.addEventListener('change', () => { this.values.crosshairStyle = cStyle.value as GameSettings['crosshairStyle']; this.notifyChange(); });

    const cColor = panel.querySelector('#crosshair-color') as HTMLSelectElement;
    cColor?.addEventListener('change', () => { this.values.crosshairColor = cColor.value as GameSettings['crosshairColor']; this.notifyChange(); });

    const closeBtn = panel.querySelector('.settings-btn-close');
    closeBtn?.addEventListener('click', () => this.hide());

    // ESC to close
    panel.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hide();
    });

    return panel;
  }

  getElement(): HTMLElement {
    return this.element;
  }

  private notifyChange(): void {
    this.save();
    this.onChangeHandlers.forEach(h => h(this.values));
  }
}
