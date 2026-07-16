import * as THREE from 'three';
import type { GrenadeId, Team, WeaponId } from './types.js';
import {
  CS16_KILL_REWARD,
  CS16_ROUND_LOSS_REWARD,
  CS16_ROUND_WIN_REWARD,
  CS16_STARTING_MONEY,
  clampCs16Money,
  canTeamBuyCs16Weapon,
  getCs16WeaponRule,
  isCs16Weapon,
} from './Cs16Weapons.js';

export type Cs16BotMatchPhase = 'freezeTime' | 'live' | 'roundEnd' | 'restart';
export type Cs16RoundEndReason = 'allBotsDead' | 'playerDead' | 'timeExpired' | null;

export interface Cs16BotMatchStats {
  phase: Cs16BotMatchPhase;
  round: number;
  roundTimeRemaining: number;
  freezeRemaining: number;
  buyTimeRemaining: number;
  buyTimeActive: boolean;
  roundEndRemaining: number;
  score: Record<Team, number>;
  money: number;
  kills: number;
  deaths: number;
  botsAlive: number;
  botsTotal: number;
  playerTeam: Team;
  objective: string;
  endReason: Cs16RoundEndReason;
}

export interface Cs16BuyResult {
  ok: boolean;
  reason?: string;
  money: number;
}

export interface Cs16BotSpawnPlan {
  id: string;
  position: THREE.Vector3;
  route: THREE.Vector3[];
  weaponId: WeaponId;
  holdSeconds: number;
}

export interface Cs16BotMatchOptions {
  freezeSeconds?: number;
  roundSeconds?: number;
  buySeconds?: number;
  roundEndSeconds?: number;
  botCount?: number;
  playerTeam?: Team;
  startingMoney?: number;
}

const CS16_GRENADE_RULES: Partial<Record<GrenadeId, { price: number; max: number }>> = {
  he: { price: 300, max: 1 },
  flashbang: { price: 200, max: 2 },
  smoke: { price: 300, max: 1 },
};

export class Cs16BotMatch {
  private phase: Cs16BotMatchPhase = 'restart';
  private round = 0;
  private score: Record<Team, number> = { attackers: 0, defenders: 0 };
  private money: number;
  private kills = 0;
  private deaths = 0;
  private botsAlive = 0;
  private botsTotal = 0;
  private phaseElapsed = 0;
  private roundElapsed = 0;
  private endReason: Cs16RoundEndReason = null;
  private readonly freezeSeconds: number;
  private readonly roundSeconds: number;
  private readonly buySeconds: number;
  private readonly roundEndSeconds: number;
  private readonly botCount: number;
  private readonly playerTeam: Team;
  private armor = 0;
  private hasHelmet = false;
  private onKillCallback: ((killer: string, victim: string, weapon: string, headshot?: boolean) => void) | null = null;
  private onRoundEndCallback: ((reason: Exclude<Cs16RoundEndReason, null>, winner: Team, stats: Cs16BotMatchStats) => void) | null = null;

  constructor(options: Cs16BotMatchOptions = {}) {
    this.freezeSeconds = options.freezeSeconds ?? 6;
    this.roundSeconds = options.roundSeconds ?? 300;
    this.buySeconds = options.buySeconds ?? 90;
    this.roundEndSeconds = options.roundEndSeconds ?? 4;
    this.botCount = options.botCount ?? 5;
    this.playerTeam = options.playerTeam ?? 'attackers';
    this.money = options.startingMoney ?? CS16_STARTING_MONEY;
  }

  onKill(callback: (killer: string, victim: string, weapon: string, headshot?: boolean) => void): void {
    this.onKillCallback = callback;
  }

  onRoundEnd(callback: (reason: Exclude<Cs16RoundEndReason, null>, winner: Team, stats: Cs16BotMatchStats) => void): void {
    this.onRoundEndCallback = callback;
  }

  private getWeaponName(weapon: string): string {
    const weaponNames: Record<string, string> = {
      'ak47': 'AK-47',
      'mp5': 'MP5',
      'usp': 'USP',
    };
    return weaponNames[weapon] || weapon;
  }

  private getOpponentTeam(): Team {
    return this.playerTeam === 'attackers' ? 'defenders' : 'attackers';
  }

  private teamLabel(team: Team): string {
    return team === 'attackers' ? 'T' : 'CT';
  }

  private botWeaponForIndex(index: number): WeaponId {
    const enemyTeam = this.getOpponentTeam();
    const loadout: WeaponId[] = enemyTeam === 'defenders'
      ? ['m4a1', 'mp5', 'usp']
      : ['ak47', 'mp5', 'glock'];
    return loadout[index % loadout.length];
  }

  startRound(): void {
    this.round++;
    this.phase = 'freezeTime';
    this.phaseElapsed = 0;
    this.roundElapsed = 0;
    this.endReason = null;
    this.botsTotal = this.botCount;
    this.botsAlive = this.botCount;
    this.armor = 0;
    this.hasHelmet = false;
  }

  update(dt: number, playerDead: boolean): { shouldRestartRound: boolean } {
    if (this.phase === 'restart') {
      this.startRound();
      return { shouldRestartRound: true };
    }

    this.phaseElapsed += Math.max(0, dt);
    if (this.phase === 'freezeTime' || this.phase === 'live') {
      this.roundElapsed += Math.max(0, dt);
    }

    if (this.phase === 'freezeTime' && this.phaseElapsed >= this.freezeSeconds) {
      this.phase = 'live';
      this.phaseElapsed = 0;
    }

    if (this.phase === 'live') {
      if (playerDead) this.recordPlayerDeath();
      else if (this.botsAlive <= 0) this.endRound('allBotsDead');
      else if (this.phaseElapsed >= this.roundSeconds) this.endRound('timeExpired');
    }

    if (this.phase === 'roundEnd' && this.phaseElapsed >= this.roundEndSeconds) {
      this.phase = 'restart';
      return { shouldRestartRound: true };
    }

    return { shouldRestartRound: false };
  }

  createBotPlans(spawns: THREE.Vector3[], routeFactory: (index: number) => THREE.Vector3[]): Cs16BotSpawnPlan[] {
    const fallback = spawns[0] ?? new THREE.Vector3(2.56, 1, -22.4);
    const advancingBots = Math.max(1, Math.ceil(this.botCount * 0.6));
    return Array.from({ length: this.botCount }, (_, index) => ({
      id: `cs16_bot_${this.round}_${index}`,
      position: (spawns[index % spawns.length] ?? fallback).clone(),
      route: index < advancingBots ? routeFactory(index) : [],
      weaponId: this.botWeaponForIndex(index),
      holdSeconds: index === advancingBots - 1 && advancingBots > 1 ? 1.4 : 0,
    }));
  }

  recordBotKill(weapon: string = 'ak47', headshot: boolean = false): void {
    if (this.botsAlive <= 0 || this.phase === 'roundEnd') return;
    this.botsAlive--;
    this.kills++;
    this.money = clampCs16Money(this.money + CS16_KILL_REWARD);

    if (this.onKillCallback) {
      const weaponName = this.getWeaponName(weapon);
      this.onKillCallback('你', 'BOT', weaponName, headshot);
    }

    if (this.botsAlive <= 0) this.endRound('allBotsDead');
  }

  recordPlayerDeath(weapon: string = 'ak47', headshot: boolean = false): void {
    if (this.phase !== 'live') return;
    this.deaths++;

    if (this.onKillCallback) {
      const weaponName = this.getWeaponName(weapon);
      this.onKillCallback('BOT', '你', weaponName, headshot);
    }

    this.endRound('playerDead');
  }

  tryBuy(
    request: { weaponId?: string; armor?: boolean; helmet?: boolean; grenadeId?: GrenadeId },
    inBuyZone: boolean,
    currentGrenades: Partial<Record<GrenadeId, number>> = {}
  ): Cs16BuyResult {
    const disabledReason = this.getBuyDisabledReason(inBuyZone);
    if (disabledReason) return { ok: false, reason: disabledReason, money: this.money };

    const grenadeRule = request.grenadeId ? CS16_GRENADE_RULES[request.grenadeId] : undefined;
    const weaponRule = request.weaponId ? getCs16WeaponRule(request.weaponId) : undefined;
    const price = request.armor
      ? 650
      : request.helmet
        ? this.armor >= 100 ? 350 : 1000
        : request.weaponId ? weaponRule?.price : grenadeRule?.price;
    if (request.armor && this.armor >= 100) return { ok: false, reason: '已拥有防弹衣', money: this.money };
    if (request.helmet && this.hasHelmet && this.armor >= 100) return { ok: false, reason: '已拥有头盔和防弹衣', money: this.money };
    if (request.weaponId && !isCs16Weapon(request.weaponId)) {
      return { ok: false, reason: '该武器不属于 CS1.6 子集', money: this.money };
    }
    if (request.weaponId && !canTeamBuyCs16Weapon(request.weaponId, this.playerTeam)) {
      return { ok: false, reason: '该阵营不能购买此武器', money: this.money };
    }
    if (request.grenadeId && !grenadeRule) return { ok: false, reason: '无法购买该投掷物', money: this.money };
    if (request.grenadeId && (currentGrenades[request.grenadeId] ?? 0) >= grenadeRule!.max) {
      return { ok: false, reason: '投掷物数量已达上限', money: this.money };
    }
    if (typeof price !== 'number') return { ok: false, reason: '无法购买该物品', money: this.money };
    if (price > this.money) return { ok: false, reason: '金钱不足', money: this.money };

    this.money = clampCs16Money(this.money - price);
    if (request.armor) this.armor = 100;
    if (request.helmet) {
      this.armor = 100;
      this.hasHelmet = true;
    }
    return { ok: true, money: this.money };
  }

  canPlayerMove(): boolean {
    return this.phase === 'live';
  }

  canBotsMove(): boolean {
    return this.phase === 'live';
  }

  canPlayerShoot(): boolean {
    return this.phase === 'live';
  }

  getBuyDisabledReason(inBuyZone: boolean): string | undefined {
    if (this.phase !== 'freezeTime' && this.phase !== 'live') return '购买时间已结束';
    if (this.roundElapsed > this.buySeconds) return '购买时间已结束';
    if (!inBuyZone) return '必须站在出生买区内购买';
    return undefined;
  }

  getStats(): Cs16BotMatchStats {
    return {
      phase: this.phase,
      round: this.round,
      roundTimeRemaining: this.phase === 'live' ? Math.max(0, this.roundSeconds - this.phaseElapsed) : this.roundSeconds,
      freezeRemaining: this.phase === 'freezeTime' ? Math.max(0, this.freezeSeconds - this.phaseElapsed) : 0,
      buyTimeRemaining: this.phase === 'freezeTime' || this.phase === 'live' ? Math.max(0, this.buySeconds - this.roundElapsed) : 0,
      buyTimeActive: (this.phase === 'freezeTime' || this.phase === 'live') && this.roundElapsed <= this.buySeconds,
      roundEndRemaining: this.phase === 'roundEnd' ? Math.max(0, this.roundEndSeconds - this.phaseElapsed) : 0,
      score: { ...this.score },
      money: this.money,
      kills: this.kills,
      deaths: this.deaths,
      botsAlive: this.botsAlive,
      botsTotal: this.botsTotal,
      playerTeam: this.playerTeam,
      objective: this.objective(),
      endReason: this.endReason,
    };
  }

  private endRound(reason: Exclude<Cs16RoundEndReason, null>): void {
    if (this.phase === 'roundEnd') return;
    this.phase = 'roundEnd';
    this.phaseElapsed = 0;
    this.endReason = reason;
    const winner: Team = reason === 'allBotsDead'
      ? this.playerTeam
      : reason === 'playerDead'
        ? this.getOpponentTeam()
        : 'defenders';
    this.score[winner]++;
    this.money = clampCs16Money(this.money + (winner === this.playerTeam ? CS16_ROUND_WIN_REWARD : CS16_ROUND_LOSS_REWARD));
    this.onRoundEndCallback?.(reason, winner, this.getStats());
  }

  private objective(): string {
    if (this.phase === 'freezeTime') return `购买时间 ${Math.ceil(Math.max(0, this.freezeSeconds - this.phaseElapsed))} 秒`;
    if (this.phase === 'roundEnd') {
      if (this.endReason === 'allBotsDead') return `${this.teamLabel(this.playerTeam)} 胜利：敌方全灭`;
      if (this.endReason === 'playerDead') return `${this.teamLabel(this.getOpponentTeam())} 胜利：玩家阵亡`;
      return 'CT 胜利：时间耗尽';
    }
    return 'Dust2 Bot Match';
  }
}
