import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Scoreboard } from '../Scoreboard';

describe('Scoreboard', () => {
  let container: HTMLDivElement;
  let scoreboard: Scoreboard;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    scoreboard = new Scoreboard(container);
  });

  afterEach(() => {
    scoreboard.destroy();
    container.remove();
  });

  it('should create and show the scoreboard', () => {
    expect(scoreboard.isVisible()).toBe(false);
    scoreboard.show();
    expect(scoreboard.isVisible()).toBe(true);
  });

  it('should toggle visibility', () => {
    scoreboard.show();
    expect(scoreboard.isVisible()).toBe(true);
    scoreboard.toggle();
    expect(scoreboard.isVisible()).toBe(false);
    scoreboard.toggle();
    expect(scoreboard.isVisible()).toBe(true);
  });

  it('should hide the scoreboard', () => {
    scoreboard.show();
    scoreboard.hide();
    expect(scoreboard.isVisible()).toBe(false);
  });

  it('should update players and stats', () => {
    scoreboard.updatePlayers([
      { name: 'Player 1', team: 'attackers', kills: 10, deaths: 5, ping: 20 },
      { name: 'Player 2', team: 'defenders', kills: 8, deaths: 7, ping: 35 },
    ]);
    scoreboard.updateStats({ round: 2, score: { attackers: 1, defenders: 1 } });

    expect(container.textContent).toContain('Player 1');
    expect(container.textContent).toContain('Player 2');
    expect(container.textContent).toContain('第 2 回合');
  });

  it('should mark local player', () => {
    scoreboard.updatePlayers([
      { name: 'Local Player', team: 'attackers', kills: 5, deaths: 2, ping: 10, isLocalPlayer: true },
    ]);
    expect(container.querySelector('.scoreboard-local-player')).toBeTruthy();
  });

  it('should mark bots', () => {
    scoreboard.updatePlayers([
      { name: 'Bot 1', team: 'defenders', kills: 0, deaths: 0, ping: 0, isBot: true },
    ]);
    expect(container.querySelector('.scoreboard-bot')).toBeTruthy();
  });
});