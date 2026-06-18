/**
 * Scoreboard Component
 * Displays player stats, team scores, and round information
 * CS 1.6 style scoreboard with Tab key toggle
 */

import type { Team } from '../game/types.js';

export interface ScoreboardPlayer {
  name: string;
  team: Team;
  kills: number;
  deaths: number;
  ping: number;
  isBot?: boolean;
  isLocalPlayer?: boolean;
}

export interface ScoreboardStats {
  round: number;
  score: Record<Team, number>;
  roundTimeRemaining?: number;
}

export class Scoreboard {
  private container: HTMLElement;
  private element: HTMLElement;
  private visible = false;
  private players: ScoreboardPlayer[] = [];
  private stats: ScoreboardStats = { round: 1, score: { attackers: 0, defenders: 0 } };

  constructor(container: HTMLElement) {
    this.container = container;
    this.element = this.createScoreboardElement();
    this.container.appendChild(this.element);
  }

  show(): void {
    this.visible = true;
    this.element.classList.add('scoreboard-visible');
  }

  hide(): void {
    this.visible = false;
    this.element.classList.remove('scoreboard-visible');
  }

  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  isVisible(): boolean {
    return this.visible;
  }

  updatePlayers(players: ScoreboardPlayer[]): void {
    this.players = players;
    this.render();
  }

  updateStats(stats: Partial<ScoreboardStats>): void {
    this.stats = { ...this.stats, ...stats };
    this.render();
  }

  private createScoreboardElement(): HTMLElement {
    const scoreboard = document.createElement('div');
    scoreboard.className = 'scoreboard';
    return scoreboard;
  }

  private render(): void {
    this.element.innerHTML = '';

    // Header with round info and team scores
    const header = this.createHeader();
    this.element.appendChild(header);

    // Players list
    const playersContainer = document.createElement('div');
    playersContainer.className = 'scoreboard-players';

    // Split players by team
    const attackers = this.players.filter(p => p.team === 'attackers');
    const defenders = this.players.filter(p => p.team === 'defenders');

    // Render defenders (CT) first, then attackers (T)
    if (defenders.length > 0) {
      const defendersSection = this.createTeamSection('defenders', defenders);
      playersContainer.appendChild(defendersSection);
    }

    if (attackers.length > 0) {
      const attackersSection = this.createTeamSection('attackers', attackers);
      playersContainer.appendChild(attackersSection);
    }

    this.element.appendChild(playersContainer);
  }

  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'scoreboard-header';

    const roundInfo = document.createElement('div');
    roundInfo.className = 'scoreboard-round';
    roundInfo.textContent = `第 ${this.stats.round} 回合`;
    header.appendChild(roundInfo);

    const scores = document.createElement('div');
    scores.className = 'scoreboard-team-scores';

    const ctScore = document.createElement('div');
    ctScore.className = 'scoreboard-team-score scoreboard-ct-score';
    ctScore.textContent = `${this.stats.score.defenders}`;
    scores.appendChild(ctScore);

    const separator = document.createElement('div');
    separator.className = 'scoreboard-score-separator';
    separator.textContent = ':';
    scores.appendChild(separator);

    const tScore = document.createElement('div');
    tScore.className = 'scoreboard-team-score scoreboard-t-score';
    tScore.textContent = `${this.stats.score.attackers}`;
    scores.appendChild(tScore);

    header.appendChild(scores);

    if (this.stats.roundTimeRemaining !== undefined) {
      const timeInfo = document.createElement('div');
      timeInfo.className = 'scoreboard-time';
      timeInfo.textContent = `${Math.ceil(this.stats.roundTimeRemaining)}s`;
      header.appendChild(timeInfo);
    }

    return header;
  }

  private createTeamSection(team: Team, players: ScoreboardPlayer[]): HTMLElement {
    const section = document.createElement('div');
    section.className = `scoreboard-team-section scoreboard-team-${team}`;

    const teamHeader = document.createElement('div');
    teamHeader.className = 'scoreboard-team-header';
    teamHeader.textContent = team === 'defenders' ? 'CT (反恐精英)' : 'T (恐怖分子)';
    section.appendChild(teamHeader);

    const table = document.createElement('div');
    table.className = 'scoreboard-table';

    // Table header
    const tableHeader = document.createElement('div');
    tableHeader.className = 'scoreboard-table-row scoreboard-table-header';

    const nameHeader = document.createElement('div');
    nameHeader.className = 'scoreboard-col-name';
    nameHeader.textContent = '玩家';
    tableHeader.appendChild(nameHeader);

    const killsHeader = document.createElement('div');
    killsHeader.className = 'scoreboard-col-kills';
    killsHeader.textContent = '击杀';
    tableHeader.appendChild(killsHeader);

    const deathsHeader = document.createElement('div');
    deathsHeader.className = 'scoreboard-col-deaths';
    deathsHeader.textContent = '死亡';
    tableHeader.appendChild(deathsHeader);

    const pingHeader = document.createElement('div');
    pingHeader.className = 'scoreboard-col-ping';
    pingHeader.textContent = '延迟';
    tableHeader.appendChild(pingHeader);

    table.appendChild(tableHeader);

    // Player rows
    players.forEach(player => {
      const row = this.createPlayerRow(player);
      table.appendChild(row);
    });

    section.appendChild(table);
    return section;
  }

  private createPlayerRow(player: ScoreboardPlayer): HTMLElement {
    const row = document.createElement('div');
    row.className = 'scoreboard-table-row';
    if (player.isLocalPlayer) {
      row.classList.add('scoreboard-local-player');
    }

    const nameCol = document.createElement('div');
    nameCol.className = 'scoreboard-col-name';
    if (player.isBot) {
      nameCol.classList.add('scoreboard-bot');
    }
    nameCol.textContent = player.name;
    row.appendChild(nameCol);

    const killsCol = document.createElement('div');
    killsCol.className = 'scoreboard-col-kills';
    killsCol.textContent = `${player.kills}`;
    row.appendChild(killsCol);

    const deathsCol = document.createElement('div');
    deathsCol.className = 'scoreboard-col-deaths';
    deathsCol.textContent = `${player.deaths}`;
    row.appendChild(deathsCol);

    const pingCol = document.createElement('div');
    pingCol.className = 'scoreboard-col-ping';
    pingCol.textContent = `${player.ping}ms`;
    row.appendChild(pingCol);

    return row;
  }

  destroy(): void {
    this.element.remove();
  }
}