import { describe, expect, it } from 'vitest';
import { MainMenu } from './MainMenu.js';

describe('MainMenu room browser', () => {
  it('disables Dust2 and marks it as pending source import when no source-backed resource exists', () => {
    const menu = new MainMenu();
    document.body.appendChild(menu.getElement());

    const dust2Option = menu.getElement().querySelector<HTMLButtonElement>('.map-option[data-map="dust2"]');
    expect(dust2Option?.textContent).toContain('待导入原版 BSP');
    expect(dust2Option?.textContent).toContain('需要 CS1.6 原版 de_dust2.bsp');
    expect(dust2Option?.disabled).toBe(true);
    expect(dust2Option?.classList.contains('active')).toBe(false);
    expect(menu.getMapId()).toBe('mirage');

    menu.dispose();
  });

  it('does not select disabled Dust2 when clicked', () => {
    const menu = new MainMenu();
    document.body.appendChild(menu.getElement());

    const dust2Option = menu.getElement().querySelector<HTMLButtonElement>('.map-option[data-map="dust2"]');
    dust2Option?.click();

    expect(menu.getMapId()).toBe('mirage');
    expect(dust2Option?.classList.contains('active')).toBe(false);

    menu.dispose();
  });

  it('renders join and spectator actions for online rooms', () => {
    const menu = new MainMenu();
    document.body.appendChild(menu.getElement());
    const events: Array<{ type: string; roomId?: unknown }> = [];
    menu.on('joinRoom', roomId => events.push({ type: 'joinRoom', roomId }));
    menu.on('spectateRoom', roomId => events.push({ type: 'spectateRoom', roomId }));

    menu.updateRooms([{
      id: 'room-1',
      mode: 'defusal',
      mapId: 'dust2',
      playerCount: 7,
      spectatorCount: 2,
      maxPlayers: 10,
      phase: 'live'
    }]);

    expect(menu.getElement().querySelector('.room-list')?.textContent).toContain('爆破');
    expect(menu.getElement().querySelector('.room-list')?.textContent).toContain('观战 2');

    menu.getElement().querySelector<HTMLButtonElement>('.room-join')?.click();
    menu.getElement().querySelector<HTMLButtonElement>('.room-spectate')?.click();

    expect(events).toEqual([
      { type: 'joinRoom', roomId: 'room-1' },
      { type: 'spectateRoom', roomId: 'room-1' }
    ]);

    menu.dispose();
  });
});
