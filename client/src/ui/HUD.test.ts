import { describe, expect, it, vi } from 'vitest';
import { HUD } from './HUD.js';
import { MatchSnapshot } from '../game/types.js';
import { getCs16BuyableWeaponIdsForTeam } from '../game/Cs16Weapons.js';

describe('HUD notifications and weapon slots', () => {
  it('renders a categorized buy menu with armor, grenades, and prices', () => {
    const hud = new HUD();
    document.body.appendChild(hud.getElement());

    hud.toggleBuyMenu(true);

    const buyMenu = hud.getElement().querySelector('.buy-menu') as HTMLElement;
    expect(buyMenu.textContent).toContain('Pistols');
    expect(buyMenu.textContent).toContain('SMGs');
    expect(buyMenu.textContent).toContain('Shotguns');
    expect(buyMenu.textContent).toContain('Rifles');
    expect(buyMenu.textContent).toContain('Snipers');
    expect(buyMenu.textContent).toContain('Machine Gun');
    expect(buyMenu.textContent).toContain('Equipment');
    expect(buyMenu.textContent).toContain('Glock 18');
    expect(buyMenu.textContent).toContain('USP .45');
    expect(buyMenu.textContent).toContain('Five-SeveN');
    expect(buyMenu.textContent).toContain('MP5 Navy');
    expect(buyMenu.textContent).toContain('M4A1');
    expect(buyMenu.textContent).toContain('AK-47');
    expect(buyMenu.textContent).toContain('AWP');
    expect(buyMenu.textContent).toContain('$500');
    expect(buyMenu.textContent).toContain('$2500');
    expect(buyMenu.textContent).toContain('防弹衣');
    expect(buyMenu.textContent).toContain('防弹衣+头盔');
    expect(buyMenu.textContent).toContain('拆弹钳');
    expect(buyMenu.textContent).toContain('高爆雷');
    expect(buyMenu.textContent).toContain('$200');
    expect(buyMenu.textContent).toContain('$650');
    expect(buyMenu.textContent).toContain('$300');

    hud.dispose();
  });

  it('disables CS1.6 buy items outside the current team policy', () => {
    const hud = new HUD();
    document.body.appendChild(hud.getElement());

    hud.toggleBuyMenu(true, {
      solo: true,
      policy: {
        allowedWeaponIds: getCs16BuyableWeaponIdsForTeam('attackers'),
        money: 800,
      },
    });

    const akButton = hud.getElement().querySelector<HTMLButtonElement>('[data-weapon="ak47"]')!;
    const m4Button = hud.getElement().querySelector<HTMLButtonElement>('[data-weapon="m4a1"]')!;
    const uspButton = hud.getElement().querySelector<HTMLButtonElement>('[data-weapon="usp"]')!;

    expect(akButton.disabled).toBe(true);
    expect(akButton.title).toBe('金钱不足');
    expect(m4Button.disabled).toBe(true);
    expect(m4Button.title).toBe('当前阵营不能购买');
    expect(uspButton.disabled).toBe(true);
    expect(uspButton.title).toBe('当前阵营不能购买');

    hud.dispose();
  });

  it('emits a helmet buy request from the equipment menu', () => {
    const hud = new HUD();
    document.body.appendChild(hud.getElement());
    const onBuy = vi.fn();
    hud.onBuy(onBuy);
    hud.toggleBuyMenu(true);

    const helmetButton = hud.getElement().querySelector<HTMLButtonElement>('[data-helmet="true"]')!;
    helmetButton.click();

    expect(onBuy).toHaveBeenCalledWith({ helmet: true });
    hud.dispose();
  });

  it('emits a defuse kit buy request from the equipment menu', () => {
    const hud = new HUD();
    document.body.appendChild(hud.getElement());
    const onBuy = vi.fn();
    hud.onBuy(onBuy);
    hud.toggleBuyMenu(true);

    const kitButton = hud.getElement().querySelector<HTMLButtonElement>('[data-defuse-kit="true"]')!;
    kitButton.click();

    expect(onBuy).toHaveBeenCalledWith({ defuseKit: true });
    hud.dispose();
  });

  it('can disable defuse kit purchases for non-defusal modes', () => {
    const hud = new HUD();
    document.body.appendChild(hud.getElement());

    hud.toggleBuyMenu(true, { policy: { allowDefuseKit: false, money: 800 } });

    const kitButton = hud.getElement().querySelector<HTMLButtonElement>('[data-defuse-kit="true"]')!;
    expect(kitButton.disabled).toBe(true);
    expect(kitButton.title).toBe('当前模式不能购买');
    hud.dispose();
  });

  it('uses CS1.6 helmet upgrade pricing when armor is already owned', () => {
    const hud = new HUD();
    document.body.appendChild(hud.getElement());

    hud.toggleBuyMenu(true, { policy: { armor: 100, hasHelmet: false, money: 350 } });

    const helmetButton = hud.getElement().querySelector<HTMLButtonElement>('[data-helmet="true"]')!;
    expect(helmetButton.disabled).toBe(false);
    expect(helmetButton.dataset.price).toBe('350');
    expect(helmetButton.querySelector('.buy-item-price')?.textContent).toBe('$350');

    hud.toggleBuyMenu(true, { policy: { armor: 100, hasHelmet: true, money: 16000 } });
    expect(helmetButton.disabled).toBe(true);
    expect(helmetButton.title).toBe('已拥有头盔和防弹衣');
    hud.dispose();
  });

  it('emits a grenade buy request from the equipment menu', () => {
    const hud = new HUD();
    document.body.appendChild(hud.getElement());
    const onBuy = vi.fn();
    hud.onBuy(onBuy);
    hud.toggleBuyMenu(true);

    const heButton = hud.getElement().querySelector<HTMLButtonElement>('[data-grenade="he"]')!;
    heButton.click();

    expect(onBuy).toHaveBeenCalledWith({ grenadeId: 'he' });
    hud.dispose();
  });

  it('stacks notifications up to 3 items', () => {
    vi.useFakeTimers();
    const hud = new HUD();
    document.body.appendChild(hud.getElement());

    hud.showNotification('已选择闪光弹');
    hud.showNotification('已选择烟雾弹');
    hud.showNotification('投掷烟雾弹');

    const notifications = hud.getElement().querySelectorAll('.notification-item');
    expect(notifications).toHaveLength(3);
    expect(notifications[2].textContent).toBe('投掷烟雾弹');

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

  it('renders bomb plant, defuse, and planted progress from multiplayer snapshots', () => {
    const hud = new HUD();
    document.body.appendChild(hud.getElement());
    const snapshot = createSnapshot() as MatchSnapshot;
    snapshot.config.mode = 'defusal';
    snapshot.serverTime = 2000;
    snapshot.bomb = { carrierId: 'local' };

    hud.updateMatch(snapshot, 'local');
    const progress = hud.getElement().querySelector('.bomb-progress') as HTMLElement;
    const fill = hud.getElement().querySelector('.bomb-progress-fill') as HTMLElement;
    expect(progress.classList.contains('hidden')).toBe(false);
    expect(progress.textContent).toContain('你携带 C4');
    expect(fill.style.width).toBe('100%');

    snapshot.bomb = { carrierId: 'teammate' };
    hud.updateMatch(snapshot, 'local');
    expect(progress.textContent).toContain('C4 由队友携带');

    snapshot.bomb = { position: { x: 8, y: 0, z: -4 } };
    hud.updateMatch(snapshot, 'local');
    expect(progress.textContent).toContain('C4 掉落');
    expect(fill.style.width).toBe('0%');

    snapshot.bomb = { plantStartedAt: 500, plantingPlayerId: 'local', carrierId: 'local' };
    hud.updateMatch(snapshot, 'local');
    expect(progress.textContent).toContain('正在安装 C4 50%');
    expect(fill.style.width).toBe('50%');

    snapshot.serverTime = 4500;
    snapshot.players[0].team = 'defenders';
    snapshot.players[0].hasDefuseKit = true;
    snapshot.bomb = {
      plantedAt: 1000,
      position: { x: 0, y: 0, z: 0 },
      defuseStartedAt: 2000,
      defusingPlayerId: 'local'
    };
    hud.updateMatch(snapshot, 'local');
    expect(progress.textContent).toContain('正在拆除 C4 - 拆弹钳 50%');
    expect(fill.style.width).toBe('50%');

    snapshot.roundTimeRemaining = 20;
    snapshot.bomb = { plantedAt: 1000, position: { x: 0, y: 0, z: 0 } };
    hud.updateMatch(snapshot, 'local');
    expect(progress.textContent).toContain('C4 已安放 50%');
    expect(fill.style.width).toBe('50%');

    snapshot.bomb = undefined;
    hud.updateMatch(snapshot, 'local');
    expect(progress.classList.contains('hidden')).toBe(true);

    hud.dispose();
  });

  it('clamps multiplayer latency and renders mouse input status', () => {
    const hud = new HUD();
    document.body.appendChild(hud.getElement());

    hud.updateMatch(createSnapshot(1200), 'local', { latencyMs: 1200, inputStatus: 'Raw' });

    expect(hud.getElement().querySelector('.network-text')?.textContent).toContain('999ms');
    expect(hud.getElement().querySelector('.network-text')?.textContent).toContain('Raw');
    expect(hud.getElement().querySelector('.scoreboard')?.textContent).toContain('999');

    hud.dispose();
  });

  it('shows sub-millisecond connected latency as at least 1ms', () => {
    const hud = new HUD();
    document.body.appendChild(hud.getElement());

    hud.updateMatch(createSnapshot(0), 'local', { latencyMs: 0.2, inputStatus: 'Locked' });

    expect(hud.getElement().querySelector('.network-text')?.textContent).toContain('1ms');

    hud.dispose();
  });

  it('shows sniper scope overlay and hides the crosshair while scoped', () => {
    const hud = new HUD();
    document.body.appendChild(hud.getElement());

    hud.setScoped(true);

    expect(hud.getElement().querySelector('.scope-overlay')?.classList.contains('hidden')).toBe(false);
    expect(hud.getElement().querySelector('.crosshair')?.classList.contains('hidden')).toBe(true);

    hud.setScoped(false);

    expect(hud.getElement().querySelector('.scope-overlay')?.classList.contains('hidden')).toBe(true);
    expect(hud.getElement().querySelector('.crosshair')?.classList.contains('hidden')).toBe(false);

    hud.dispose();
  });

  it('can hide the crosshair without showing the scope overlay', () => {
    const hud = new HUD();
    document.body.appendChild(hud.getElement());

    hud.setScoped(false, true);

    expect(hud.getElement().querySelector('.scope-overlay')?.classList.contains('hidden')).toBe(true);
    expect(hud.getElement().querySelector('.crosshair')?.classList.contains('hidden')).toBe(true);

    hud.setScoped(false);

    expect(hud.getElement().querySelector('.crosshair')?.classList.contains('hidden')).toBe(false);

    hud.dispose();
  });

  it('renders mobile touch controls without showing them by default', () => {
    const hud = new HUD();
    document.body.appendChild(hud.getElement());

    expect(hud.getTouchControlsElement().querySelector('.touch-stick-base')).toBeTruthy();
    expect(hud.getTouchControlsElement().querySelector('[data-touch-key="MouseLeft"]')).toBeTruthy();
    expect(hud.getTouchControlsElement().classList.contains('hidden')).toBe(true);

    hud.dispose();
  });

  it('renders match summary when a multiplayer match ends', () => {
    const hud = new HUD();
    document.body.appendChild(hud.getElement());
    const snapshot = createSnapshot();
    snapshot.phase = 'matchEnd';
    snapshot.summary = {
      winner: 'attackers',
      topPlayer: { id: 'local', name: '<b>MVP</b>', kills: 3, deaths: 1 },
      finalScore: { attackers: 16, defenders: 14 },
      durationSeconds: 820
    };

    hud.showMatchSummary(snapshot, 'local');

    expect(hud.getElement().querySelector('.result-panel')?.classList.contains('hidden')).toBe(false);
    expect(hud.getElement().querySelector('.result-panel')?.textContent).toContain('T 胜利');
    expect(hud.getElement().querySelector('.result-panel')?.textContent).toContain('<b>MVP</b>');
    expect(hud.getElement().querySelector('.result-panel b')).toBeNull();

    hud.dispose();
  });
});

function createSnapshot(ping = 20): MatchSnapshot {
  return {
    roomId: 'room',
    config: {
      mode: 'tdm',
      mapId: 'dust2',
      maxPlayers: 10,
      tickRate: 64,
      isPrivate: false,
      roundLimit: 20,
      warmupSeconds: 5,
      startingMoney: 800,
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
        ping,
        isAlive: true,
        isReady: true
      }
    ],
    killFeed: ['<img src=x onerror=alert(2)> Vandal AR 爆头 defender'],
    bomb: undefined
  };
}
