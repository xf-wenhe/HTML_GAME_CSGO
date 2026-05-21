export class MainMenu {
  private element: HTMLElement;
  private eventHandlers: Map<string, (() => void)[]> = new Map();
  private buttons: Map<string, HTMLButtonElement> = new Map();

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
        <p class="menu-kicker">Industrial Survival Arena</p>
        <h1 id="game-title" class="game-title">FORGEPOINT</h1>
        <nav class="menu-buttons" role="navigation" aria-label="Game modes">
          <button class="menu-button" data-action="solo" type="button">
            Survival
          </button>
          <button class="menu-button" data-action="tdm" type="button">
            Team Deathmatch
          </button>
          <button class="menu-button" data-action="defusal" type="button">
            5v5 Defusal
          </button>
        </nav>
        <div class="game-info" role="note" aria-label="Controls and instructions">
          <p><kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> — Move</p>
          <p><kbd>Shift</kbd> — Sprint</p>
          <p><kbd>Mouse</kbd> — Look</p>
          <p><kbd>Left Click</kbd> — Shoot</p>
          <p><kbd>R</kbd> — Reload</p>
          <p><kbd>B</kbd> — Buy Menu</p>
          <p><kbd>E</kbd> — Plant / Defuse</p>
          <p><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> — Switch Weapon</p>
          <p><kbd>Space</kbd> — Jump</p>
          <p><kbd>ESC</kbd> — Menu</p>
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
