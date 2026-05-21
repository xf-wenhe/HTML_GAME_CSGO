import { describe, expect, it, vi } from 'vitest';
import { HUD } from './HUD.js';

describe('HUD notifications and weapon slots', () => {
  it('replaces notifications instead of stacking them', () => {
    vi.useFakeTimers();
    const hud = new HUD();
    document.body.appendChild(hud.getElement());

    hud.showNotification('已选择闪光弹');
    hud.showNotification('已选择烟雾弹');
    hud.showNotification('投掷烟雾弹');

    const notifications = hud.getElement().querySelectorAll('.notification');
    expect(notifications).toHaveLength(1);
    expect(notifications[0].textContent).toBe('投掷烟雾弹');

    hud.dispose();
    vi.useRealTimers();
  });

  it('marks the active weapon slot and updates grenade count', () => {
    const hud = new HUD();
    document.body.appendChild(hud.getElement());

    hud.updateWeaponSlots({
      activeSlot: 'grenade',
      primary: '狙击枪',
      pistol: '重型手枪',
      knife: '战术刀',
      grenadeLabel: '烟雾弹',
      grenadeCount: 0
    });

    const active = hud.getElement().querySelector('.weapon-slot.active') as HTMLElement;
    expect(active.dataset.slot).toBe('grenade');
    expect(active.textContent).toContain('烟雾弹 x0');
    expect(hud.getElement().textContent).toContain('狙击枪');
    expect(hud.getElement().textContent).toContain('重型手枪');

    hud.dispose();
  });
});
