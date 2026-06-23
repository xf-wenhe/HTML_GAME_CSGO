import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Cs16BotMatch } from '../Cs16BotMatch.js';
import { canCs16WeaponScope, isCs16Weapon } from '../Cs16Weapons.js';

describe('Cs16BotMatch', () => {
  it('runs freeze time, live, round end, and restart phases', () => {
    const match = new Cs16BotMatch({ freezeSeconds: 1, roundEndSeconds: 1, botCount: 2 });

    expect(match.update(0, false).shouldRestartRound).toBe(true);
    expect(match.getStats().phase).toBe('freezeTime');

    match.update(1.1, false);
    expect(match.getStats().phase).toBe('live');

    match.recordBotKill();
    expect(match.getStats().botsAlive).toBe(1);
    match.recordBotKill();

    const won = match.getStats();
    expect(won.phase).toBe('roundEnd');
    expect(won.score.attackers).toBe(1);
    expect(won.money).toBeGreaterThan(800);

    expect(match.update(1.1, false).shouldRestartRound).toBe(true);
    expect(match.getStats().phase).toBe('restart');
  });

  it('enforces CS1.6 buy timing, buy zone, whitelist, and money', () => {
    const match = new Cs16BotMatch({ freezeSeconds: 2, startingMoney: 800 });
    match.update(0, false);

    expect(match.tryBuy({ weaponId: 'ak47' }, false).ok).toBe(false);
    expect(match.tryBuy({ weaponId: 'm4a1s' }, true).ok).toBe(false);
    expect(match.tryBuy({ weaponId: 'm4a1' }, true).reason).toBe('该阵营不能购买此武器');
    expect(match.tryBuy({ weaponId: 'awp' }, true).reason).toBe('金钱不足');

    const result = match.tryBuy({ weaponId: 'deagle' }, true);
    expect(result.ok).toBe(true);
    expect(result.money).toBe(150);

    const grenadeMatch = new Cs16BotMatch({ freezeSeconds: 2, startingMoney: 800 });
    grenadeMatch.update(0, false);
    const he = grenadeMatch.tryBuy({ grenadeId: 'he' }, true, {});
    expect(he.ok).toBe(true);
    expect(he.money).toBe(500);
    expect(grenadeMatch.tryBuy({ grenadeId: 'he' }, true, { he: 1 }).reason).toBe('投掷物数量已达上限');
    expect(grenadeMatch.tryBuy({ grenadeId: 'incendiary' }, true, {}).reason).toBe('无法购买该投掷物');

    const helmetMatch = new Cs16BotMatch({ freezeSeconds: 2, startingMoney: 1000 });
    helmetMatch.update(0, false);
    const helmet = helmetMatch.tryBuy({ helmet: true }, true);
    expect(helmet.ok).toBe(true);
    expect(helmet.money).toBe(0);

    const armorUpgradeMatch = new Cs16BotMatch({ freezeSeconds: 2, startingMoney: 1000 });
    armorUpgradeMatch.update(0, false);
    expect(armorUpgradeMatch.tryBuy({ armor: true }, true).money).toBe(350);
    expect(armorUpgradeMatch.tryBuy({ helmet: true }, true).money).toBe(0);

    match.update(2.1, false);
    expect(match.tryBuy({ armor: true }, true).ok).toBe(false);

    const ctMatch = new Cs16BotMatch({ freezeSeconds: 2, startingMoney: 4000, playerTeam: 'defenders' });
    ctMatch.update(0, false);
    expect(ctMatch.tryBuy({ weaponId: 'ak47' }, true).reason).toBe('该阵营不能购买此武器');
    expect(ctMatch.tryBuy({ weaponId: 'm4a1' }, true).ok).toBe(true);
  });

  it('keeps movement, bots, and shooting frozen during buy time', () => {
    const match = new Cs16BotMatch({ freezeSeconds: 2 });
    match.update(0, false);

    expect(match.getStats().phase).toBe('freezeTime');
    expect(match.canPlayerMove()).toBe(false);
    expect(match.canBotsMove()).toBe(false);
    expect(match.canPlayerShoot()).toBe(false);

    match.update(2.1, false);
    expect(match.getStats().phase).toBe('live');
    expect(match.canPlayerMove()).toBe(true);
    expect(match.canBotsMove()).toBe(true);
    expect(match.canPlayerShoot()).toBe(true);
  });

  it('scores CT-side solo rounds from the actual winner', () => {
    const deathMatch = new Cs16BotMatch({ playerTeam: 'defenders', freezeSeconds: 0 });
    deathMatch.update(0, false);
    deathMatch.update(0, false);
    deathMatch.recordPlayerDeath();

    expect(deathMatch.getStats().phase).toBe('roundEnd');
    expect(deathMatch.getStats().score.attackers).toBe(1);
    expect(deathMatch.getStats().score.defenders).toBe(0);
    expect(deathMatch.getStats().objective).toContain('T 胜利');

    const clearMatch = new Cs16BotMatch({ playerTeam: 'defenders', freezeSeconds: 0, botCount: 1 });
    clearMatch.update(0, false);
    clearMatch.update(0, false);
    clearMatch.recordBotKill();

    expect(clearMatch.getStats().score.attackers).toBe(0);
    expect(clearMatch.getStats().score.defenders).toBe(1);
    expect(clearMatch.getStats().objective).toContain('CT 胜利');
  });

  it('creates deterministic bot plans and exposes CS1.6 weapon scope policy', () => {
    const match = new Cs16BotMatch({ botCount: 3 });
    match.update(0, false);
    const plans = match.createBotPlans([new THREE.Vector3(1, 1, 1)], index => [new THREE.Vector3(index, 1, index)]);

    expect(plans).toHaveLength(3);
    expect(plans.map(plan => plan.weaponId)).toEqual(['m4a1', 'mp5', 'usp']);
    expect(plans[1].route[0].x).toBe(1);
    expect(isCs16Weapon('ak47')).toBe(true);
    expect(isCs16Weapon('m4a1s')).toBe(false);
    expect(canCs16WeaponScope('ak47')).toBe(false);
    expect(canCs16WeaponScope('awp')).toBe(true);
  });

  it('uses side-correct CS1.6 bot loadouts for the enemy team', () => {
    const ctPlayerMatch = new Cs16BotMatch({ botCount: 3, playerTeam: 'defenders' });
    ctPlayerMatch.update(0, false);

    const plans = ctPlayerMatch.createBotPlans([new THREE.Vector3(1, 1, 1)], index => [new THREE.Vector3(index, 1, index)]);

    expect(plans.map(plan => plan.weaponId)).toEqual(['ak47', 'mp5', 'glock']);
  });

  it('keeps part of a five-bot Dust2 squad posted instead of full-rushing every round', () => {
    const match = new Cs16BotMatch({ botCount: 5 });
    match.update(0, false);
    const plans = match.createBotPlans([new THREE.Vector3(1, 1, 1)], index => [new THREE.Vector3(index, 1, index)]);

    expect(plans.map(plan => plan.route.length)).toEqual([1, 1, 1, 0, 0]);
    expect(plans.map(plan => plan.holdSeconds)).toEqual([0, 0, 1.4, 0, 0]);
  });
});
