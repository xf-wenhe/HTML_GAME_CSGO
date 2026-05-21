import { Weapon } from '../game/Weapon.js';
import { MatchSnapshot, WeaponId } from '../game/types.js';

export class HUD {
  private element: HTMLElement;
  private healthFill: HTMLElement;
  private healthText: HTMLElement;
  private ammoCurrent: HTMLElement;
  private ammoSeparator: HTMLElement;
  private ammoReserve: HTMLElement;
  private weaponName: HTMLElement;
  private waveText: HTMLElement;
  private enemiesText: HTMLElement;
  private scoreText: HTMLElement;
  private timerText: HTMLElement;
  private damageOverlay: HTMLElement;
  private resultPanel: HTMLElement;
  private pausePanel: HTMLElement;
  private scoreboard: HTMLElement;
  private buyMenu: HTMLElement;
  private crosshair: HTMLElement;
  private notificationContainer: HTMLElement;
  private currentHealth = 100;
  private maxHealth = 100;
  private currentAmmo = 0;
  private maxAmmo = 0;
  private notificationTimeout: number | null = null;
  private buyHandler: ((weaponId: WeaponId) => void) | null = null;
  private resumeHandler: (() => void) | null = null;

  constructor() {
    this.element = this.createElement();
    this.healthFill = this.element.querySelector('.health-fill') as HTMLElement;
    this.healthText = this.element.querySelector('.health-text') as HTMLElement;
    this.ammoCurrent = this.element.querySelector('.ammo-current') as HTMLElement;
    this.ammoSeparator = this.element.querySelector('.ammo-separator') as HTMLElement;
    this.ammoReserve = this.element.querySelector('.ammo-reserve') as HTMLElement;
    this.weaponName = this.element.querySelector('.weapon-name') as HTMLElement;
    this.waveText = this.element.querySelector('.wave-text') as HTMLElement;
    this.enemiesText = this.element.querySelector('.enemies-text') as HTMLElement;
    this.scoreText = this.element.querySelector('.score-text') as HTMLElement;
    this.timerText = this.element.querySelector('.timer-text') as HTMLElement;
    this.damageOverlay = this.element.querySelector('.damage-overlay') as HTMLElement;
    this.resultPanel = this.element.querySelector('.result-panel') as HTMLElement;
    this.pausePanel = this.element.querySelector('.pause-panel') as HTMLElement;
    this.scoreboard = this.element.querySelector('.scoreboard') as HTMLElement;
    this.buyMenu = this.element.querySelector('.buy-menu') as HTMLElement;
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
      <div class="hud-top-center">
        <div class="round-strip">
          <span class="wave-text">WAVE 0</span>
          <span class="enemies-text">0 HOSTILES</span>
          <span class="timer-text">00:00</span>
        </div>
      </div>
      <div class="hud-top-right">
        <div class="ammo-container">
          <span class="score-text">0</span>
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
      <div class="damage-overlay" aria-hidden="true"></div>
      <div class="result-panel hidden" role="dialog" aria-label="Match results"></div>
      <div class="pause-panel hidden" role="dialog" aria-label="Paused">
        <h2>PAUSED</h2>
        <p>Click resume to lock mouse and continue.</p>
        <button class="resume-button" type="button">Resume</button>
        <p class="result-hint">Press ESC again to return to menu</p>
      </div>
      <div class="scoreboard hidden" aria-label="Scoreboard"></div>
      <div class="buy-menu hidden" aria-label="Buy menu">
        <button data-weapon="sidearm">S-9</button>
        <button data-weapon="heavy_pistol">Rook</button>
        <button data-weapon="vandal">Vandal</button>
        <button data-weapon="sentinel">Sentinel</button>
        <button data-weapon="operator">Longbow</button>
        <button data-weapon="specter">Specter</button>
        <button data-weapon="bulldog">Bulldog</button>
      </div>
      <div class="hud-bottom">
        <div class="notifications" aria-live="polite" aria-atomic="true"></div>
      </div>
    `;
    hud.querySelectorAll<HTMLButtonElement>('.buy-menu button').forEach(button => {
      button.addEventListener('click', () => {
        const weaponId = button.dataset.weapon as WeaponId | undefined;
        if (weaponId) this.buyHandler?.(weaponId);
      });
    });
    hud.querySelector<HTMLButtonElement>('.resume-button')?.addEventListener('click', () => this.resumeHandler?.());
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

  updateSurvival(stats: { wave: number; enemiesRemaining: number; score: number; timeSurvived: number; prepRemaining: number; phase: string }): void {
    this.waveText.textContent = stats.prepRemaining > 0
      ? `WAVE ${stats.wave + 1} IN ${Math.ceil(stats.prepRemaining)}`
      : `WAVE ${stats.wave}`;
    this.enemiesText.textContent = `${stats.enemiesRemaining} HOSTILES`;
    this.scoreText.textContent = stats.score.toString().padStart(5, '0');
    const minutes = Math.floor(stats.timeSurvived / 60).toString().padStart(2, '0');
    const seconds = Math.floor(stats.timeSurvived % 60).toString().padStart(2, '0');
    this.timerText.textContent = `${minutes}:${seconds}`;
  }

  updateMatch(snapshot: MatchSnapshot, localPlayerId?: string): void {
    const localPlayer = snapshot.players.find(player => player.id === localPlayerId);
    this.waveText.textContent = `${snapshot.config.mode.toUpperCase()} R${snapshot.round}`;
    this.enemiesText.textContent = `${snapshot.score.attackers} - ${snapshot.score.defenders}`;
    this.timerText.textContent = `${Math.ceil(snapshot.roundTimeRemaining)}s`;
    this.scoreText.textContent = localPlayer ? `$${localPlayer.money}` : 'READY';
    if (localPlayer) {
      this.updateHealth(localPlayer.health, 100);
      this.ammoCurrent.textContent = localPlayer.ammo.toString();
      this.weaponName.textContent = localPlayer.weaponId.replace('_', ' ').toUpperCase();
    }

    const rows = snapshot.players
      .slice()
      .sort((a, b) => b.kills - a.kills)
      .map(player => `
        <tr class="${player.id === localPlayerId ? 'local' : ''}">
          <td>${player.team === 'attackers' ? 'ATK' : 'DEF'}</td>
          <td>${player.name}</td>
          <td>${player.kills}</td>
          <td>${player.deaths}</td>
          <td>${player.money}</td>
        </tr>
      `)
      .join('');
    this.scoreboard.innerHTML = `
      <table>
        <thead><tr><th>Team</th><th>Name</th><th>K</th><th>D</th><th>$</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="kill-feed">${snapshot.killFeed.map(item => `<p>${item}</p>`).join('')}</div>
    `;
  }

  toggleScoreboard(show?: boolean): void {
    this.scoreboard.classList.toggle('hidden', show === undefined ? !this.scoreboard.classList.contains('hidden') : !show);
  }

  toggleBuyMenu(show?: boolean): void {
    this.buyMenu.classList.toggle('hidden', show === undefined ? !this.buyMenu.classList.contains('hidden') : !show);
  }

  isBuyMenuOpen(): boolean {
    return !this.buyMenu.classList.contains('hidden');
  }

  isScoreboardOpen(): boolean {
    return !this.scoreboard.classList.contains('hidden');
  }

  showPause(): void {
    this.pausePanel.classList.remove('hidden');
  }

  hidePause(): void {
    this.pausePanel.classList.add('hidden');
  }

  onBuy(handler: (weaponId: WeaponId) => void): void {
    this.buyHandler = handler;
  }

  onResume(handler: () => void): void {
    this.resumeHandler = handler;
  }

  showDamage(): void {
    this.damageOverlay.classList.remove('damage-flash');
    void this.damageOverlay.offsetWidth;
    this.damageOverlay.classList.add('damage-flash');
  }

  showResults(stats: { wave: number; kills: number; score: number; timeSurvived: number }): void {
    this.resultPanel.classList.remove('hidden');
    this.resultPanel.innerHTML = `
      <h2>MISSION FAILED</h2>
      <p>Wave ${stats.wave} reached</p>
      <dl>
        <div><dt>Kills</dt><dd>${stats.kills}</dd></div>
        <div><dt>Score</dt><dd>${stats.score}</dd></div>
        <div><dt>Time</dt><dd>${Math.floor(stats.timeSurvived)}s</dd></div>
      </dl>
      <p class="result-hint">Press ESC to return to menu</p>
    `;
  }

  hideResults(): void {
    this.resultPanel.classList.add('hidden');
    this.resultPanel.innerHTML = '';
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
    this.toggleBuyMenu(false);
    this.toggleScoreboard(false);
    this.hidePause();
  }

  show(): void {
    this.element.classList.remove('hidden');
    this.hideResults();
    this.hidePause();
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
