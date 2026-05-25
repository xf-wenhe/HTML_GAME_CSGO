import { describe, expect, it, vi } from 'vitest';
import { HUD } from './HUD.js';
import { MatchSnapshot } from '../game/types.js';

describe('HUD notifications and weapon slots', () => {
  it('renders a categorized buy menu with armor, grenades, and prices', () => {
    const hud = new HUD();
    document.body.appendChild(hud.getElement());

    hud.toggleBuyMenu(true);

    const buyMenu = hud.getElement().querySelector('.buy-menu') as HTMLElement;
    expect(buyMenu.textContent).toContain('手枪');
    expect(buyMenu.textContent).toContain('步枪');
    expect(buyMenu.textContent).toContain('重型 / 狙击 / 近距');
    expect(buyMenu.textContent).toContain('投掷物 / 护甲');
    expect(buyMenu.textContent).toContain('防弹衣');
    expect(buyMenu.textContent).toContain('高爆雷');
    expect(buyMenu.textContent).toContain('$650');
    expect(buyMenu.textContent).toContain('$300');

    hud.dispose();
  });

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
    const initialSlots = Array.from(hud.getElement().querySelectorAll('.weapon-slot')).map(slot => (slot as HTMLElement).dataset.slot);

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
    expect(Array.from(hud.getElement().querySelectorAll('.weapon-slot')).map(slot => (slot as HTMLElement).dataset.slot)).toEqual(initialSlots);

    hud.dispose();
  });

  it('shows magazine and reserve ammo separately and hides ammo for knife-like weapons', () => {
    const hud = new HUD();
    document.body.appendChild(hud.getElement());

    hud.updateAmmo(17, 30, 73);
    expect(hud.getElement().querySelector('.ammo-current')?.textContent).toBe('17');
    expect(hud.getElement().querySelector('.ammo-reserve')?.textContent).toBe('73');

    hud.updateAmmo(1, 1, 0);
    expect(hud.getElement().querySelector('.ammo-current')?.textContent).toBe('--');

    hud.dispose();
  });

  it('renders multiplayer names and kill feed as escaped text', () => {
    const hud = new HUD();
    document.body.appendChild(hud.getElement());

    hud.updateMatch(createSnapshot(), 'local');

    expect(hud.getElement().querySelector('script')).toBeNull();
    expect(hud.getElement().textContent).toContain('<script>alert(1)</script>');
    expect(hud.getElement().textContent).toContain('<img src=x onerror=alert(2)>');
    expect(hud.getElement().querySelector('.kill-feed-live img')).toBeNull();
    expect(hud.getElement().querySelector('.kill-feed-live .kill-feed-row')?.textContent).toContain('爆头');
    expect(hud.getElement().querySelector('.kill-feed-live .kill-feed-weapon')?.textContent).toContain('Vandal AR');
    expect(hud.getElement().querySelector('.ammo-current')?.textContent).toBe('12');
    expect(hud.getElement().querySelector('.ammo-reserve')?.textContent).toBe('36');
    expect(hud.getElement().querySelector('.scoreboard')?.textContent).toContain('Ping');
    expect(hud.getElement().querySelector('.scoreboard')?.textContent).toContain('20');

    hud.dispose();
  });
});

function createSnapshot(): MatchSnapshot {
  return {
    roomId: 'room',
    config: {
      mode: 'tdm',
      mapId: 'dust2',
      maxPlayers: 10,
      tickRate: 30,
      isPrivate: false,
      roundLimit: 20,
      warmupSeconds: 5,
      friendlyFire: false
    },
    phase: 'live',
    serverTime: 0,
    round: 1,
    roundTimeRemaining: 90,
    score: { attackers: 1, defenders: 0 },
    players: [
      {
        id: 'local',
        name: '<script>alert(1)</script>',
        team: 'attackers',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        health: 100,
        armor: 50,
        money: 800,
        weaponId: 'sidearm',
        ammo: 12,
        reserveAmmo: 36,
        kills: 1,
        deaths: 0,
        assists: 0,
        ping: 20,
        isAlive: true,
        isReady: true
      }
    ],
    killFeed: ['<img src=x onerror=alert(2)> Vandal AR 爆头 defender'],
    bomb: undefined
  };
}
