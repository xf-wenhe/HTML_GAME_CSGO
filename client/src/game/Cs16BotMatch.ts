import * as THREE from 'three';
import type { Team, WeaponId } from './types.js';
import {
  CS16_KILL_REWARD,
  CS16_ROUND_LOSS_REWARD,
  CS16_ROUND_WIN_REWARD,
  CS16_STARTING_MONEY,
  clampCs16Money,
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
}

export interface Cs16BotMatchOptions {
  freezeSeconds?: number;
  roundSeconds?: number;
  roundEndSeconds?: number;
  botCount?: number;
  playerTeam?: Team;
  startingMoney?: number;
}

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
  private endReason: Cs16RoundEndReason = null;
  private readonly freezeSeconds: number;
  private readonly roundSeconds: number;
  private readonly roundEndSeconds: number;
  private readonly botCount: number;
  private readonly playerTeam: Team;

  constructor(options: Cs16BotMatchOptions = {}) {
    this.freezeSeconds = options.freezeSeconds ?? 5;  // CS1.6标准冻结时间5秒
    this.roundSeconds = options.roundSeconds ?? 115;
    this.roundEndSeconds = options.roundEndSeconds ?? 4;
    this.botCount = options.botCount ?? 5;
    this.playerTeam = options.playerTeam ?? 'attackers';
    this.money = options.startingMoney ?? CS16_STARTING_MONEY;
  }

  startRound(): void {
    this.round++;
    this.phase = 'freezeTime';
    this.phaseElapsed = 0;
    this.endReason = null;
    this.botsTotal = this.botCount;
    this.botsAlive = this.botCount;
  }

  update(dt: number, playerDead: boolean): { shouldRestartRound: boolean } {
    if (this.phase === 'restart') {
      this.startRound();
      return { shouldRestartRound: true };
    }

    this.phaseElapsed += Math.max(0, dt);

    if (this.phase === 'freezeTime' && this.phaseElapsed >= this.freezeSeconds) {
      this.phase = 'live';
      this.phaseElapsed = 0;
    }

    if (this.phase === 'live') {
      if (playerDead) this.endRound('playerDead');
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
    return Array.from({ length: this.botCount }, (_, index) => ({
      id: `cs16_bot_${this.round}_${index}`,
      position: (spawns[index % spawns.length] ?? fallback).clone(),
      route: routeFactory(index),
      weaponId: index % 3 === 0 ? 'm4a4' : index % 3 === 1 ? 'mp5sd' : 'usp_s',
    }));
  }

  recordBotKill(): void {
    if (this.botsAlive <= 0 || this.phase === 'roundEnd') return;
    this.botsAlive--;
    this.kills++;
    this.money = clampCs16Money(this.money + CS16_KILL_REWARD);
    if (this.botsAlive <= 0) this.endRound('allBotsDead');
  }

  recordPlayerDeath(): void {
    if (this.phase !== 'live') return;
    this.deaths++;
    this.endRound('playerDead');
  }

  tryBuy(request: { weaponId?: string; armor?: boolean }, inBuyZone: boolean): Cs16BuyResult {
    if (this.phase !== 'freezeTime') return { ok: false, reason: '只能在冻结购买时间购买', money: this.money };
    if (!inBuyZone) return { ok: false, reason: '必须站在出生买区内购买', money: this.money };

    const price = request.armor ? 650 : request.weaponId ? getCs16WeaponRule(request.weaponId)?.price : undefined;
    if (request.weaponId && !isCs16Weapon(request.weaponId)) {
      return { ok: false, reason: '该武器不属于 CS1.6 子集', money: this.money };
    }
    if (typeof price !== 'number') return { ok: false, reason: '无法购买该物品', money: this.money };
    if (price > this.money) return { ok: false, reason: '金钱不足', money: this.money };

    this.money = clampCs16Money(this.money - price);
    return { ok: true, money: this.money };
  }

  canPlayerMove(): boolean {
    return this.phase !== 'freezeTime' && this.phase !== 'roundEnd';
  }

  canPlayerShoot(): boolean {
    return this.phase === 'live';
  }

  getStats(): Cs16BotMatchStats {
    return {
      phase: this.phase,
      round: this.round,
      roundTimeRemaining: this.phase === 'live' ? Math.max(0, this.roundSeconds - this.phaseElapsed) : this.roundSeconds,
      freezeRemaining: this.phase === 'freezeTime' ? Math.max(0, this.freezeSeconds - this.phaseElapsed) : 0,
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
    const winner: Team = reason === 'allBotsDead' ? this.playerTeam : 'defenders';
    this.score[winner]++;
    this.money = clampCs16Money(this.money + (winner === this.playerTeam ? CS16_ROUND_WIN_REWARD : CS16_ROUND_LOSS_REWARD));
    if (reason === 'playerDead') this.deaths++;
  }

  private objective(): string {
    if (this.phase === 'freezeTime') return `购买时间 ${Math.ceil(Math.max(0, this.freezeSeconds - this.phaseElapsed))} 秒`;
    if (this.phase === 'roundEnd') {
      return this.endReason === 'allBotsDead' ? 'T 胜利：敌方全灭' : 'CT 胜利';
    }
    return 'Dust2 Bot Match';
  }
}
