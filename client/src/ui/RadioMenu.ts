import type { InputMode } from '../game/InputMode.js';

export type RadioMenuPage = 'z' | 'x' | 'c';

export type RadioCommand = {
  key: number;
  label: string;
};

export type RadioPageConfig = {
  header: string;
  commands: RadioCommand[];
};

const PAGES: Record<RadioMenuPage, RadioPageConfig> = {
  z: {
    header: '团队指令',
    commands: [
      { key: 1, label: '收到' },
      { key: 2, label: '否定' },
      { key: 3, label: '前进' },
      { key: 4, label: '撤退' },
      { key: 5, label: '就位' },
      { key: 6, label: '掩护我' },
    ],
  },
  x: {
    header: '小队指令',
    commands: [
      { key: 1, label: '跟我来' },
      { key: 2, label: '固守位置' },
      { key: 3, label: '分散进攻' },
      { key: 4, label: '集中进攻' },
      { key: 5, label: '跟紧我' },
      { key: 6, label: '各打各的' },
    ],
  },
  c: {
    header: '通讯指令',
    commands: [
      { key: 1, label: 'Cover me' },
      { key: 2, label: 'Regroup' },
      { key: 3, label: 'Fall back' },
      { key: 4, label: 'Stick together' },
      { key: 5, label: 'Flank them' },
      { key: 6, label: 'Wait' },
    ],
  },
};

const VALID_PAGES: RadioMenuPage[] = ['z', 'x', 'c'];

export class RadioMenu {
  private element: HTMLElement;
  private menuElement: HTMLElement | null = null;
  private messageElement: HTMLElement | null = null;
  private messageTimeout: number | null = null;
  private currentPage: RadioMenuPage | null = null;
  private onCommand: ((page: RadioMenuPage, cmdKey: number, label: string) => void) | null = null;

  constructor() {
    this.element = this.createElement();
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'radio-menu';
    container.setAttribute('aria-label', '无线电菜单');
    container.innerHTML = `
      <div class="radio-menu-messages" aria-live="polite" aria-atomic="true"></div>
    `;
    this.messageElement = container.querySelector('.radio-menu-messages');
    return container;
  }

  open(page: RadioMenuPage | null): void {
    const pageKey: RadioMenuPage | null = page === 'z' || page === 'x' || page === 'c' ? page : null;
    if (this.currentPage === pageKey && pageKey !== null) {
      this.close();
      return;
    }
    this.currentPage = pageKey;
    if (pageKey === null) {
      this.closeMenu();
      return;
    }
    this.showMenu(pageKey);
  }

  selectNumber(key: number): void {
    if (this.currentPage === null) return;
    const config = PAGES[this.currentPage];
    const cmd = config.commands.find(c => c.key === key);
    if (!cmd) return;
    this.onCommand?.(this.currentPage, cmd.key, cmd.label);
    this.showMessage(this.currentPage, cmd.label);
    this.closeMenu();
  }

  isOpen(): boolean {
    return this.currentPage !== null;
  }

  onCommandSelected(handler: (page: RadioMenuPage, cmdKey: number, label: string) => void): void {
    this.onCommand = handler;
  }

  showMessage(page: RadioMenuPage, label: string): void {
    if (!this.messageElement) return;
    this.clearMessageTimeout();
    const pageHeader = PAGES[page].header;
    const entry = document.createElement('div');
    entry.className = 'radio-message-entry';
    entry.innerHTML = `<span class="radio-msg-header">${this.escapeHtml(pageHeader)}</span><span class="radio-msg-label">${this.escapeHtml(label)}</span>`;

    const frag = document.createDocumentFragment();
    frag.appendChild(entry);
    this.messageElement.insertBefore(frag, this.messageElement.firstChild);

    while (this.messageElement.children.length > 3) {
      this.messageElement.lastElementChild?.remove();
    }

    this.messageTimeout = window.setTimeout(() => {
      entry.classList.add('radio-message-fade');
      setTimeout(() => entry.remove(), 400);
    }, 3000);
  }

  show(): void {
    this.element.classList.remove('hidden');
  }

  hide(): void {
    this.element.classList.add('hidden');
    this.closeMenu();
  }

  getElement(): HTMLElement {
    return this.element;
  }

  dispose(): void {
    this.clearMessageTimeout();
    this.element.remove();
  }

  private showMenu(page: RadioMenuPage): void {
    this.closeMenu();
    const config = PAGES[page];

    const menu = document.createElement('div');
    menu.className = 'radio-menu-panel';
    menu.innerHTML = `
      <div class="radio-menu-header">${this.escapeHtml(config.header)}</div>
      <div class="radio-menu-options">
        ${config.commands.map(cmd => `
          <div class="radio-menu-option" data-key="${cmd.key}">
            <span class="radio-opt-key">${cmd.key}</span>
            <span class="radio-opt-label">${this.escapeHtml(cmd.label)}</span>
          </div>
        `).join('')}
      </div>
      <div class="radio-menu-footer">按数字键选择 · ${page.toUpperCase()} 关闭</div>
    `;

    this.element.appendChild(menu);
    this.menuElement = menu;
  }

  private closeMenu(): void {
    if (this.menuElement) {
      this.menuElement.remove();
      this.menuElement = null;
    }
  }

  private close(): void {
    this.currentPage = null;
    this.closeMenu();
  }

  private clearMessageTimeout(): void {
    if (this.messageTimeout !== null) {
      window.clearTimeout(this.messageTimeout);
      this.messageTimeout = null;
    }
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
