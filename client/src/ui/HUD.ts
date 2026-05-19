import { Weapon } from '../game/Weapon.js';

export class HUD {
  private element: HTMLElement;
  private healthFill: HTMLElement;
  private healthText: HTMLElement;
  private ammoCurrent: HTMLElement;
  private ammoSeparator: HTMLElement;
  private ammoReserve: HTMLElement;
  private weaponName: HTMLElement;
  private crosshair: HTMLElement;
  private notificationContainer: HTMLElement;
  private currentHealth = 100;
  private maxHealth = 100;
  private currentAmmo = 0;
  private maxAmmo = 0;
  private notificationTimeout: number | null = null;

  constructor() {
    this.element = this.createElement();
    this.healthFill = this.element.querySelector('.health-fill') as HTMLElement;
    this.healthText = this.element.querySelector('.health-text') as HTMLElement;
    this.ammoCurrent = this.element.querySelector('.ammo-current') as HTMLElement;
    this.ammoSeparator = this.element.querySelector('.ammo-separator') as HTMLElement;
    this.ammoReserve = this.element.querySelector('.ammo-reserve') as HTMLElement;
    this.weaponName = this.element.querySelector('.weapon-name') as HTMLElement;
    this.crosshair = this.element.querySelector('.crosshair') as HTMLElement;
    this.notificationContainer = this.element.querySelector('.notifications') as HTMLElement;
  }

  private createElement(): HTMLElement {
    const hud = document.createElement('div');
    hud.className = 'hud';
    hud.setAttribute('role', 'status');
    hud.setAttribute('aria-live', 'polite');
    hud.innerHTML = `
      <div class="hud-top-left">
        <div class="health-container">
          <div class="health-bar" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" aria-label="Health">
            <div class="health-fill" style="width: 100%"></div>
          </div>
          <span class="health-text" aria-label="Health points">100 HP</span>
        </div>
      </div>
      <div class="hud-top-right">
        <div class="ammo-container">
          <span class="weapon-name" aria-label="Current weapon">Pistol</span>
          <div class="ammo-display" aria-label="Ammunition">
            <span class="ammo-current">12</span>
            <span class="ammo-separator" aria-hidden="true">/</span>
            <span class="ammo-reserve" aria-hidden="true">∞</span>
          </div>
        </div>
      </div>
      <div class="hud-center">
        <div class="crosshair" aria-hidden="true"></div>
      </div>
      <div class="hud-bottom">
        <div class="notifications" aria-live="polite" aria-atomic="true"></div>
      </div>
    `;
    return hud;
  }

  getElement(): HTMLElement {
    return this.element;
  }

  updateHealth(health: number, maxHealth: number = 100): void {
    this.currentHealth = Math.max(0, Math.min(maxHealth, health));
    this.maxHealth = maxHealth;
    const percentage = (this.currentHealth / this.maxHealth) * 100;

    this.healthFill.style.width = `${percentage}%`;
    this.healthText.textContent = `${this.currentHealth} HP`;

    // Update aria for screen readers
    const healthBar = this.element.querySelector('.health-bar') as HTMLElement;
    if (healthBar) {
      healthBar.setAttribute('aria-valuenow', this.currentHealth.toString());
      healthBar.setAttribute('aria-valuemax', maxHealth.toString());
    }

    // Update color based on health level
    if (this.currentHealth <= this.maxHealth * 0.25) {
      this.healthFill.style.background = 'var(--health-low)';
      this.healthFill.setAttribute('aria-label', `Critical health: ${this.currentHealth} HP`);
    } else if (this.currentHealth <= this.maxHealth * 0.5) {
      this.healthFill.style.background = 'var(--health-medium)';
      this.healthFill.setAttribute('aria-label', `Low health: ${this.currentHealth} HP`);
    } else {
      this.healthFill.style.background = 'var(--health-full)';
      this.healthFill.removeAttribute('aria-label');
    }
  }

  updateAmmo(current: number, max: number): void {
    this.currentAmmo = current;
    this.maxAmmo = max;
    this.ammoCurrent.textContent = current.toString();

    // Low ammo warning
    if (current <= max * 0.2) {
      this.ammoCurrent.classList.add('ammo-low');
      // Announce only once when low ammo starts
      if (!this.ammoCurrent.dataset.lowAnnounced) {
        this.announceForScreenReader('Low ammunition');
        this.ammoCurrent.dataset.lowAnnounced = 'true';
      }
    } else {
      this.ammoCurrent.classList.remove('ammo-low');
      delete this.ammoCurrent.dataset.lowAnnounced;
    }
  }

  updateWeapon(weapon: Weapon): void {
    this.weaponName.textContent = weapon.name;
    this.updateAmmo(weapon.currentAmmo, weapon.magazineSize);
  }

  updateReloadProgress(progress: number): void {
    if (progress < 1) {
      this.ammoCurrent.textContent = `Reloading ${Math.round(progress * 100)}%`;
      this.ammoCurrent.classList.remove('ammo-low');
    }
  }

  showNotification(message: string, duration: number = 3000): void {
    // Remove existing notification of same type to avoid spam
    const existing = this.notificationContainer.querySelector('.notification');
    if (existing && existing.textContent === message) {
      return;
    }

    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.setAttribute('role', 'alert');
    this.notificationContainer.appendChild(notification);

    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }

    this.notificationTimeout = window.setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(-10px)';
      setTimeout(() => notification.remove(), 250);
    }, duration);
  }

  updateCrosshair(spread: number): void {
    const baseSize = 24;
    const maxSize = 48;
    const size = Math.min(baseSize + spread * 30, maxSize);
    this.crosshair.style.width = `${size}px`;
    this.crosshair.style.height = `${size}px`;
  }

  showHitMarker(): void {
    this.crosshair.classList.add('hit');
    this.announceForScreenReader('Hit confirmed');
    setTimeout(() => {
      this.crosshair.classList.remove('hit');
    }, 100);
  }

  hide(): void {
    this.element.classList.add('hidden');
  }

  show(): void {
    this.element.classList.remove('hidden');
  }

  private announceForScreenReader(message: string): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.style.cssText = 'position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;';
    announcement.textContent = message;
    this.element.appendChild(announcement);
    setTimeout(() => announcement.remove(), 1000);
  }

  dispose(): void {
    this.element.remove();
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
  }
}