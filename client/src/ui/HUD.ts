import { Weapon } from '../game/Weapon.js';

export class HUD {
  private element: HTMLElement;
  private healthFill: HTMLElement;
  private healthText: HTMLElement;
  private ammoText: HTMLElement;
  private weaponName: HTMLElement;
  private crosshair: HTMLElement;
  private notificationContainer: HTMLElement;
  private currentHealth = 100;
  private currentAmmo = 0;
  private maxAmmo = 0;
  private notificationTimeout: number | null = null;

  constructor() {
    this.element = this.createElement();
    this.healthFill = this.element.querySelector('.health-fill') as HTMLElement;
    this.healthText = this.element.querySelector('.health-text') as HTMLElement;
    this.ammoText = this.element.querySelector('.ammo-text') as HTMLElement;
    this.weaponName = this.element.querySelector('.weapon-name') as HTMLElement;
    this.crosshair = this.element.querySelector('.crosshair') as HTMLElement;
    this.notificationContainer = this.element.querySelector('.notifications') as HTMLElement;
  }

  private createElement(): HTMLElement {
    const hud = document.createElement('div');
    hud.className = 'hud';
    hud.innerHTML = `
      <div class="hud-top-left">
        <div class="health-bar"><div class="health-fill" style="width: 100%"></div></div>
        <div class="health-text">100 HP</div>
      </div>
      <div class="hud-top-right">
        <div class="weapon-name">Pistol</div>
        <div class="ammo-display"><span class="ammo-text">12</span> / <span class="ammo-reserve">∞</span></div>
      </div>
      <div class="hud-center"><div class="crosshair"></div></div>
      <div class="hud-bottom"><div class="notifications"></div></div>
    `;
    return hud;
  }

  getElement(): HTMLElement {
    return this.element;
  }

  updateHealth(health: number, maxHealth: number = 100): void {
    this.currentHealth = Math.max(0, Math.min(maxHealth, health));
    const percentage = (this.currentHealth / maxHealth) * 100;
    this.healthFill.style.width = `${percentage}%`;
    this.healthText.textContent = `${this.currentHealth} HP`;

    if (this.currentHealth < 25) {
      this.healthFill.style.background = 'linear-gradient(to right, #ff0000, #ff3333)';
    } else if (this.currentHealth < 50) {
      this.healthFill.style.background = 'linear-gradient(to right, #ff8800, #ffaa33)';
    } else {
      this.healthFill.style.background = 'linear-gradient(to right, #ff4444, #ff6666)';
    }
  }

  updateAmmo(current: number, max: number): void {
    this.currentAmmo = current;
    this.maxAmmo = max;
    this.ammoText.textContent = `${current} / ∞`;

    if (current <= max * 0.2) {
      this.ammoText.style.color = '#ff4444';
    } else {
      this.ammoText.style.color = 'white';
    }
  }

  updateWeapon(weapon: Weapon): void {
    this.weaponName.textContent = weapon.name;
    this.updateAmmo(weapon.currentAmmo, weapon.magazineSize);
  }

  updateReloadProgress(progress: number): void {
    if (progress < 1) {
      this.ammoText.textContent = `Reloading... ${Math.round(progress * 100)}%`;
    }
  }

  showNotification(message: string, duration: number = 3000): void {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    this.notificationContainer.appendChild(notification);

    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }

    this.notificationTimeout = window.setTimeout(() => {
      notification.remove();
    }, duration);
  }

  updateCrosshair(spread: number): void {
    const size = 20 + spread * 30;
    this.crosshair.style.width = `${size}px`;
    this.crosshair.style.height = `${size}px`;
  }

  showHitMarker(): void {
    this.crosshair.style.color = '#ff4444';
    setTimeout(() => {
      this.crosshair.style.color = 'white';
    }, 100);
  }

  hide(): void {
    this.element.style.display = 'none';
  }

  show(): void {
    this.element.style.display = 'block';
  }

  dispose(): void {
    this.element.remove();
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
  }
}