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
    expect(match.tryBuy({ weaponId: 'awp' }, true).reason).toBe('金钱不足');

    const result = match.tryBuy({ weaponId: 'deagle' }, true);
    expect(result.ok).toBe(true);
    expect(result.money).toBe(150);

    match.update(2.1, false);
    expect(match.tryBuy({ armor: true }, true).ok).toBe(false);
  });

  it('allows the player to move during buy time while keeping bots and shooting frozen', () => {
    const match = new Cs16BotMatch({ freezeSeconds: 2 });
    match.update(0, false);

    expect(match.getStats().phase).toBe('freezeTime');
    expect(match.canPlayerMove()).toBe(true);
    expect(match.canBotsMove()).toBe(false);
    expect(match.canPlayerShoot()).toBe(false);

    match.update(2.1, false);
    expect(match.getStats().phase).toBe('live');
    expect(match.canBotsMove()).toBe(true);
    expect(match.canPlayerShoot()).toBe(true);
  });

  it('creates deterministic bot plans and exposes CS1.6 weapon scope policy', () => {
    const match = new Cs16BotMatch({ botCount: 3 });
    match.update(0, false);
    const plans = match.createBotPlans([new THREE.Vector3(1, 1, 1)], index => [new THREE.Vector3(index, 1, index)]);

    expect(plans).toHaveLength(3);
    expect(plans[0].weaponId).toBe('m4a4');
    expect(plans[1].route[0].x).toBe(1);
    expect(isCs16Weapon('ak47')).toBe(true);
    expect(isCs16Weapon('m4a1s')).toBe(false);
    expect(canCs16WeaponScope('ak47')).toBe(false);
    expect(canCs16WeaponScope('awp')).toBe(true);
  });
});
