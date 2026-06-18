import type { GameSettings } from './Settings.js';

export interface CrosshairSettings {
  size: number;
  thickness: number;
  gap: number;
  centerDot: boolean;
  outline: boolean;
  color: string;
  opacity: number;
  style: 'classic' | 'dot' | 't-cross' | 'static';
}

export const DEFAULT_CROSSHAIR: CrosshairSettings = {
  size: 8,
  thickness: 2,
  gap: 5,
  centerDot: false,
  outline: true,
  color: '#00e600',
  opacity: 0.92,
  style: 'classic',
};

export class CrosshairEditor {
  private element: HTMLElement;
  private preview: HTMLElement;
  private values: CrosshairSettings;
  private onApply: ((s: CrosshairSettings) => void) | null = null;
  private onClose: (() => void) | null = null;
  private colorInput: HTMLInputElement | null = null;
  private presetButtons: HTMLButtonElement[] = [];

  constructor(initial: CrosshairSettings = DEFAULT_CROSSHAIR) {
    this.values = { ...initial };
    this.element = this.createElement();
    this.preview = this.element.querySelector('.crosshair-preview') as HTMLElement;
  }

  syncFromSettings(settings: {
    crosshairStyle: string;
    crosshairColor: string;
    crosshairSize: number;
    crosshairThickness: number;
    crosshairGap: number;
    crosshairCenterDot: boolean;
    crosshairOutline: boolean;
    crosshairOpacity: number;
  }): void {
    const isHex = settings.crosshairColor.startsWith('#');
    this.values = {
      style: settings.crosshairStyle as CrosshairSettings['style'],
      color: isHex ? settings.crosshairColor : (settings.crosshairColor === 'green' ? '#00e600' : settings.crosshairColor === 'cyan' ? '#00c8dc' : settings.crosshairColor === 'white' ? '#dcdcdc' : settings.crosshairColor === 'yellow' ? '#dcc800' : '#00e600'),
      size: settings.crosshairSize,
      thickness: settings.crosshairThickness,
      gap: settings.crosshairGap,
      centerDot: settings.crosshairCenterDot,
      outline: settings.crosshairOutline,
      opacity: settings.crosshairOpacity,
    };
    this.syncUI();
    this.updatePreview();
  }

  getSettings(): CrosshairSettings {
    return { ...this.values };
  }

  onApplyHandler(handler: (s: CrosshairSettings) => void): void {
    this.onApply = handler;
  }

  onCloseHandler(handler: () => void): void {
    this.onClose = handler;
  }

  show(): void {
    this.syncUI();
    this.updatePreview();
    this.element.classList.remove('hidden');
  }

  hide(): void {
    this.element.classList.add('hidden');
    this.onClose?.();
  }

  private createColorPresets(): { label: string; value: string }[] {
    return [
      { label: '经典绿', value: '#00e600' },
      { label: '青色', value: '#00c8dc' },
      { label: '白色', value: '#dcdcdc' },
      { label: '黄色', value: '#dcc800' },
      { label: '红色', value: '#ff3b3b' },
      { label: '橙色', value: '#ff8c00' },
      { label: '粉色', value: '#ff69b4' },
      { label: '紫色', value: '#b24dff' },
    ];
  }

  private createElement(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'crosshair-editor hidden';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '准星自定义');
    panel.setAttribute('aria-modal', 'true');
    panel.innerHTML = `
      <div class="crosshair-editor-container">
        <h2 class="crosshair-editor-title">准星自定义</h2>

        <div class="crosshair-preview-area">
          <div class="crosshair-preview-bg"></div>
          <div class="crosshair-preview" aria-hidden="true">
            <div class="ch-top"></div>
            <div class="ch-bottom"></div>
            <div class="ch-left"></div>
            <div class="ch-right"></div>
            <div class="ch-dot"></div>
          </div>
        </div>

        <div class="crosshair-editor-body">
          <div class="settings-group">
            <h3>样式</h3>
            <div class="setting-row">
              <label for="ch-style">准星类型</label>
              <select id="ch-style">
                <option value="classic">经典十字</option>
                <option value="dot">圆点</option>
                <option value="t-cross">T 型</option>
                <option value="static">静态</option>
              </select>
            </div>
          </div>

          <div class="settings-group">
            <h3>尺寸</h3>
            <div class="setting-row">
              <label for="ch-size">长度</label>
              <div class="slider-row">
                <input type="range" id="ch-size" min="2" max="20" step="1" value="${this.values.size}">
                <span class="slider-value" id="ch-size-value">${this.values.size}</span>
              </div>
            </div>
            <div class="setting-row">
              <label for="ch-thickness">粗细</label>
              <div class="slider-row">
                <input type="range" id="ch-thickness" min="1" max="6" step="1" value="${this.values.thickness}">
                <span class="slider-value" id="ch-thickness-value">${this.values.thickness}</span>
              </div>
            </div>
            <div class="setting-row">
              <label for="ch-gap">间隙</label>
              <div class="slider-row">
                <input type="range" id="ch-gap" min="0" max="20" step="1" value="${this.values.gap}">
                <span class="slider-value" id="ch-gap-value">${this.values.gap}</span>
              </div>
            </div>
          </div>

          <div class="settings-group">
            <h3>外观</h3>
            <div class="setting-row setting-row-toggle">
              <label for="ch-center-dot">中心点</label>
              <button class="toggle-btn ${this.values.centerDot ? 'active' : ''}" id="ch-center-dot" type="button" aria-pressed="${this.values.centerDot}">
                ${this.values.centerDot ? '开' : '关'}
              </button>
            </div>
            <div class="setting-row setting-row-toggle">
              <label for="ch-outline">描边</label>
              <button class="toggle-btn ${this.values.outline ? 'active' : ''}" id="ch-outline" type="button" aria-pressed="${this.values.outline}">
                ${this.values.outline ? '开' : '关'}
              </button>
            </div>
            <div class="setting-row">
              <label for="ch-opacity">透明度</label>
              <div class="slider-row">
                <input type="range" id="ch-opacity" min="0.2" max="1" step="0.05" value="${this.values.opacity}">
                <span class="slider-value" id="ch-opacity-value">${Math.round(this.values.opacity * 100)}%</span>
              </div>
            </div>
          </div>

          <div class="settings-group">
            <h3>颜色</h3>
            <div class="color-presets" id="ch-color-presets">
              ${this.createColorPresets().map(p => `
                <button class="color-preset ${p.value === this.values.color ? 'active' : ''}" type="button" data-color="${p.value}" style="background:${p.value}" title="${p.label}" aria-label="${p.label}"></button>
              `).join('')}
            </div>
            <div class="setting-row">
              <label for="ch-color-custom">自定义</label>
              <input type="color" id="ch-color-custom" value="${this.values.color}">
            </div>
          </div>
        </div>

        <div class="crosshair-editor-footer">
          <button class="crosshair-editor-btn" id="ch-reset" type="button">重置默认</button>
          <button class="crosshair-editor-btn crosshair-editor-btn-close" id="ch-close" type="button">确定</button>
        </div>
      </div>`;

    this.bindEvents(panel);
    return panel;
  }

  private bindEvents(panel: HTMLElement): void {
    const styleSelect = panel.querySelector('#ch-style') as HTMLSelectElement;
    styleSelect?.addEventListener('change', () => {
      this.values.style = styleSelect.value as CrosshairSettings['style'];
      this.updatePreview();
      this.notifyApply();
    });

    const sizeSlider = panel.querySelector('#ch-size') as HTMLInputElement;
    const sizeVal = panel.querySelector('#ch-size-value') as HTMLElement;
    sizeSlider?.addEventListener('input', () => {
      this.values.size = parseInt(sizeSlider.value);
      if (sizeVal) sizeVal.textContent = sizeSlider.value;
      this.updatePreview();
      this.notifyApply();
    });

    const thickSlider = panel.querySelector('#ch-thickness') as HTMLInputElement;
    const thickVal = panel.querySelector('#ch-thickness-value') as HTMLElement;
    thickSlider?.addEventListener('input', () => {
      this.values.thickness = parseInt(thickSlider.value);
      if (thickVal) thickVal.textContent = thickSlider.value;
      this.updatePreview();
      this.notifyApply();
    });

    const gapSlider = panel.querySelector('#ch-gap') as HTMLInputElement;
    const gapVal = panel.querySelector('#ch-gap-value') as HTMLElement;
    gapSlider?.addEventListener('input', () => {
      this.values.gap = parseInt(gapSlider.value);
      if (gapVal) gapVal.textContent = gapSlider.value;
      this.updatePreview();
      this.notifyApply();
    });

    const opacitySlider = panel.querySelector('#ch-opacity') as HTMLInputElement;
    const opacityVal = panel.querySelector('#ch-opacity-value') as HTMLElement;
    opacitySlider?.addEventListener('input', () => {
      this.values.opacity = parseFloat(opacitySlider.value);
      if (opacityVal) opacityVal.textContent = Math.round(this.values.opacity * 100) + '%';
      this.updatePreview();
      this.notifyApply();
    });

    const centerDotBtn = panel.querySelector('#ch-center-dot') as HTMLButtonElement;
    centerDotBtn?.addEventListener('click', () => {
      this.values.centerDot = !this.values.centerDot;
      centerDotBtn.classList.toggle('active', this.values.centerDot);
      centerDotBtn.textContent = this.values.centerDot ? '开' : '关';
      centerDotBtn.setAttribute('aria-pressed', String(this.values.centerDot));
      this.updatePreview();
      this.notifyApply();
    });

    const outlineBtn = panel.querySelector('#ch-outline') as HTMLButtonElement;
    outlineBtn?.addEventListener('click', () => {
      this.values.outline = !this.values.outline;
      outlineBtn.classList.toggle('active', this.values.outline);
      outlineBtn.textContent = this.values.outline ? '开' : '关';
      outlineBtn.setAttribute('aria-pressed', String(this.values.outline));
      this.updatePreview();
      this.notifyApply();
    });

    this.colorInput = panel.querySelector('#ch-color-custom') as HTMLInputElement;
    this.colorInput?.addEventListener('input', () => {
      this.values.color = this.colorInput.value;
      this.clearPresetSelection();
      this.updatePreview();
      this.notifyApply();
    });

    this.presetButtons = Array.from(panel.querySelectorAll('.color-preset'));
    this.presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.values.color = btn.dataset.color ?? this.values.color;
        this.clearPresetSelection();
        btn.classList.add('active');
        if (this.colorInput) this.colorInput.value = this.values.color;
        this.updatePreview();
        this.notifyApply();
      });
    });

    panel.querySelector('#ch-reset')?.addEventListener('click', () => {
      this.values = { ...DEFAULT_CROSSHAIR };
      this.syncUI();
      this.updatePreview();
      this.notifyApply();
    });

    panel.querySelector('#ch-close')?.addEventListener('click', () => this.hide());
  }

  private clearPresetSelection(): void {
    this.presetButtons.forEach(btn => btn.classList.remove('active'));
  }

  private syncUI(): void {
    const panel = this.element;
    const styleSelect = panel.querySelector('#ch-style') as HTMLSelectElement | null;
    if (styleSelect) styleSelect.value = this.values.style;

    const sizeSlider = panel.querySelector('#ch-size') as HTMLInputElement | null;
    const sizeVal = panel.querySelector('#ch-size-value') as HTMLElement | null;
    if (sizeSlider) sizeSlider.value = String(this.values.size);
    if (sizeVal) sizeVal.textContent = String(this.values.size);

    const thickSlider = panel.querySelector('#ch-thickness') as HTMLInputElement | null;
    const thickVal = panel.querySelector('#ch-thickness-value') as HTMLElement | null;
    if (thickSlider) thickSlider.value = String(this.values.thickness);
    if (thickVal) thickVal.textContent = String(this.values.thickness);

    const gapSlider = panel.querySelector('#ch-gap') as HTMLInputElement | null;
    const gapVal = panel.querySelector('#ch-gap-value') as HTMLElement | null;
    if (gapSlider) gapSlider.value = String(this.values.gap);
    if (gapVal) gapVal.textContent = String(this.values.gap);

    const opacitySlider = panel.querySelector('#ch-opacity') as HTMLInputElement | null;
    const opacityVal = panel.querySelector('#ch-opacity-value') as HTMLElement | null;
    if (opacitySlider) opacitySlider.value = String(this.values.opacity);
    if (opacityVal) opacityVal.textContent = Math.round(this.values.opacity * 100) + '%';

    const centerDotBtn = panel.querySelector('#ch-center-dot') as HTMLButtonElement | null;
    if (centerDotBtn) {
      centerDotBtn.classList.toggle('active', this.values.centerDot);
      centerDotBtn.textContent = this.values.centerDot ? '开' : '关';
      centerDotBtn.setAttribute('aria-pressed', String(this.values.centerDot));
    }

    const outlineBtn = panel.querySelector('#ch-outline') as HTMLButtonElement | null;
    if (outlineBtn) {
      outlineBtn.classList.toggle('active', this.values.outline);
      outlineBtn.textContent = this.values.outline ? '开' : '关';
      outlineBtn.setAttribute('aria-pressed', String(this.values.outline));
    }

    this.presetButtons = Array.from(panel.querySelectorAll('.color-preset'));
    this.clearPresetSelection();
    const matching = this.presetButtons.find(b => b.dataset.color === this.values.color);
    if (matching) matching.classList.add('active');
    if (this.colorInput) this.colorInput.value = this.values.color;
  }

  private updatePreview(): void {
    if (!this.preview) return;
    const { size, thickness, gap, centerDot, outline, color, opacity, style } = this.values;

    this.preview.className = 'crosshair-preview';
    if (style === 'dot') this.preview.classList.add('crosshair-dot');
    if (style === 't-cross') this.preview.classList.add('crosshair-t');
    if (style === 'static') this.preview.classList.add('crosshair-static');

    const hexToRgba = (hex: string, a: number): string => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    };

    const bgColor = hexToRgba(color, opacity);
    const outlineStr = outline ? `, 0 0 0 1px rgba(0,0,0,1), 0 0 4px rgba(0,0,0,0.8)` : '';

    Object.values(this.preview.children).forEach((child) => {
      const el = child as HTMLElement;
      el.style.backgroundColor = bgColor;
      el.style.boxShadow = outline ? `0 0 0 1px rgba(0,0,0,1), 0 0 4px rgba(0,0,0,0.8)` : 'none';

      if (el.classList.contains('ch-top') || el.classList.contains('ch-bottom')) {
        el.style.width = `${thickness}px`;
        el.style.height = `${size}px`;
        el.style.bottom = style === 'dot' ? 'auto' : `${gap}px`;
        el.style.top = style === 'dot' ? '-1px' : `${gap}px`;
        el.style.left = `${-thickness / 2}px`;
        el.style.borderRadius = style === 'dot' ? '50%' : '0';
      }
      if (el.classList.contains('ch-left') || el.classList.contains('ch-right')) {
        el.style.height = `${thickness}px`;
        el.style.width = `${size}px`;
        el.style.right = style === 'dot' ? 'auto' : `${gap}px`;
        el.style.left = style === 'dot' ? '-1px' : `${gap}px`;
        el.style.top = `${-thickness / 2}px`;
        el.style.borderRadius = style === 'dot' ? '50%' : '0';
      }
    });

    const dotEl = this.preview.querySelector('.ch-dot') as HTMLElement | null;
    if (dotEl) {
      dotEl.style.display = centerDot ? 'block' : 'none';
      dotEl.style.width = `${thickness}px`;
      dotEl.style.height = `${thickness}px`;
      dotEl.style.borderRadius = '50%';
      dotEl.style.backgroundColor = bgColor;
      if (outline) {
        dotEl.style.boxShadow = `0 0 0 1px rgba(0,0,0,1), 0 0 4px rgba(0,0,0,0.8)`;
      } else {
        dotEl.style.boxShadow = 'none';
      }
    }
  }

  private notifyApply(): void {
    this.onApply?.({ ...this.values });
  }

  getElement(): HTMLElement {
    return this.element;
  }

  dispose(): void {
    this.element.remove();
  }
}
