/**
 * Kill Feed Component
 * Manages display of kill events in top-right corner
 * CS 1.6 style kill feed with auto-fadeout
 */

export interface KillFeedEntry {
  killer: string;
  victim: string;
  weapon: string;
  headshot?: boolean;
  timestamp: number;
  element?: HTMLElement;
}

export class KillFeed {
  private container: HTMLElement;
  private entries: KillFeedEntry[] = [];
  private maxEntries: number = 5;
  private displayDuration: number = 3000; // 3 seconds as specified

  constructor(container: HTMLElement) {
    this.container = container;
  }

  addKill(killer: string, victim: string, weapon: string, headshot: boolean = false): void {
    const entry: KillFeedEntry = {
      killer,
      victim,
      weapon,
      headshot,
      timestamp: Date.now(),
    };

    entry.element = this.createEntryElement(entry);
    this.entries.unshift(entry);

    if (this.container.firstChild) {
      this.container.insertBefore(entry.element, this.container.firstChild);
    } else {
      this.container.appendChild(entry.element);
    }

    if (this.entries.length > this.maxEntries) {
      const removed = this.entries.pop();
      if (removed?.element) {
        removed.element.remove();
      }
    }

    this.scheduleRemoval(entry);
  }

  clear(): void {
    this.entries.forEach(entry => {
      if (entry.element) {
        entry.element.remove();
      }
    });
    this.entries = [];
  }

  getEntries(): KillFeedEntry[] {
    return [...this.entries];
  }

  private createEntryElement(entry: KillFeedEntry): HTMLElement {
    const row = document.createElement('div');
    row.className = 'kill-feed-row kill-feed-entry';

    const killerSpan = document.createElement('span');
    killerSpan.className = 'kill-feed-player kill-feed-attacker';
    killerSpan.textContent = entry.killer;
    row.appendChild(killerSpan);

    const weaponSpan = document.createElement('span');
    weaponSpan.className = 'kill-feed-weapon';
    weaponSpan.textContent = entry.weapon;
    row.appendChild(weaponSpan);

    if (entry.headshot) {
      const headshotSpan = document.createElement('span');
      headshotSpan.className = 'kill-feed-headshot';
      headshotSpan.textContent = '爆头';
      row.appendChild(headshotSpan);
    }

    const victimSpan = document.createElement('span');
    victimSpan.className = 'kill-feed-player kill-feed-victim';
    victimSpan.textContent = entry.victim;
    row.appendChild(victimSpan);

    return row;
  }

  private scheduleRemoval(entry: KillFeedEntry): void {
    const fadeTimer = setTimeout(() => {
      if (entry.element) {
        entry.element.classList.add('kill-feed-fading');
      }
    }, this.displayDuration);

    const removeTimer = setTimeout(() => {
      const index = this.entries.indexOf(entry);
      if (index !== -1) {
        this.entries.splice(index, 1);
        if (entry.element) {
          entry.element.remove();
        }
      }
    }, this.displayDuration + 500);

    (entry as any)._fadeTimer = fadeTimer;
    (entry as any)._removeTimer = removeTimer;
  }

  destroy(): void {
    this.entries.forEach(entry => {
      const timers = entry as any;
      if (timers._fadeTimer) clearTimeout(timers._fadeTimer);
      if (timers._removeTimer) clearTimeout(timers._removeTimer);
    });
    this.clear();
  }
}