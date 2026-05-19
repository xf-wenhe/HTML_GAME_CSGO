export class MainMenu {
  private element: HTMLElement;
  private eventHandlers: Map<string, (() => void)[]> = new Map();

  constructor() {
    this.element = this.createElement();
    this.setupEventListeners();
  }

  private createElement(): HTMLElement {
    const menu = document.createElement('div');
    menu.className = 'main-menu';
    menu.innerHTML = `
      <div class="menu-content">
        <h1 class="game-title">FPS WEB GAME</h1>
        <div class="menu-buttons">
          <button class="menu-button" data-action="solo">Solo Campaign</button>
          <button class="menu-button" data-action="multiplayer">Multiplayer</button>
        </div>
        <div class="game-info">
          <p>WASD - Move | Mouse - Look | Left Click - Shoot | R - Reload</p>
          <p>1/2/3 - Switch Weapon | Space - Jump | ESC - Menu</p>
        </div>
      </div>
    `;
    return menu;
  }

  private setupEventListeners(): void {
    const buttons = this.element.querySelectorAll('.menu-button');
    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const action = button.getAttribute('data-action');
        if (action) {
          this.emit(action);
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
  }

  hide(): void {
    this.element.style.display = 'none';
  }

  dispose(): void {
    this.element.remove();
    this.eventHandlers.clear();
  }
}