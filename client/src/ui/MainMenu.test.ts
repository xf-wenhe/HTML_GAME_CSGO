import { describe, expect, it } from 'vitest';
import { MULTIPLAYER_MAPS } from '../game/config/maps.js';
import { MainMenu } from './MainMenu.js';

describe('MainMenu room browser', () => {
  it('shows Dust2 source import state according to the generated resource', () => {
    const menu = new MainMenu();
    document.body.appendChild(menu.getElement());

    const dust2Option = menu.getElement().querySelector<HTMLButtonElement>('.map-option[data-map="dust2"]');
    if (MULTIPLAYER_MAPS.dust2.source?.sourceBacked) {
      expect(dust2Option?.textContent).toContain('CS1.6 源文件导入');
      expect(dust2Option?.disabled).toBe(false);
      expect(dust2Option?.classList.contains('active')).toBe(true);
      expect(menu.getMapId()).toBe('dust2');
    } else {
      expect(dust2Option?.textContent).toContain('待导入原版 BSP');
      expect(dust2Option?.textContent).toContain('需要 CS1.6 原版 de_dust2.bsp');
      expect(dust2Option?.disabled).toBe(true);
      expect(dust2Option?.classList.contains('active')).toBe(false);
      expect(menu.getMapId()).toBe('mirage');
    }

    menu.dispose();
  });

  it('handles Dust2 selection according to source-backed availability', () => {
    const menu = new MainMenu();
    document.body.appendChild(menu.getElement());

    const dust2Option = menu.getElement().querySelector<HTMLButtonElement>('.map-option[data-map="dust2"]');
    dust2Option?.click();

    if (MULTIPLAYER_MAPS.dust2.source?.sourceBacked) {
      expect(menu.getMapId()).toBe('dust2');
      expect(dust2Option?.classList.contains('active')).toBe(true);
    } else {
      expect(menu.getMapId()).toBe('mirage');
      expect(dust2Option?.classList.contains('active')).toBe(false);
    }

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
