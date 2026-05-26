import { describe, expect, it } from 'vitest';
import { MainMenu } from './MainMenu.js';

describe('MainMenu room browser', () => {
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
