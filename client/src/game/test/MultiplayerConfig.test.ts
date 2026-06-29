import { describe, expect, it } from 'vitest';
import { MULTIPLAYER_MAPS } from '../config/maps.js';
import { CS16_MULTIPLAYER_WEAPON_IDS, MULTIPLAYER_WEAPONS } from '../config/weapons.js';
import { WEAPON_DEFINITIONS } from '../Weapons.js';
import type { MapId } from '../types.js';

const MAP_IDS: MapId[] = ['bloodstrike', 'dust2', 'warehouse', 'italy', 'mirage', 'inferno', 'nuke', 'train', 'overpass'];

describe('multiplayer config', () => {
  it('defines CSGO-style core weapons with buy prices and damage roles', () => {
    expect(Object.keys(MULTIPLAYER_WEAPONS)).toEqual(expect.arrayContaining([
      'sidearm',
      'heavy_pistol',
      'vandal',
      'sentinel',
      'operator',
      'specter',
      'bulldog',
      'knife',
      'mp5sd',
      'sawedoff',
      'zeus'
    ]));
    for (const weaponId of CS16_MULTIPLAYER_WEAPON_IDS) {
      expect(MULTIPLAYER_WEAPONS[weaponId], `${weaponId} should have multiplayer config`).toBeDefined();
    }
    expect(MULTIPLAYER_WEAPONS.mp5.price).toBe(1500);
    expect(MULTIPLAYER_WEAPONS.p228.price).toBe(600);
    expect(MULTIPLAYER_WEAPONS.awp.magazineSize).toBe(10);
    expect(MULTIPLAYER_WEAPONS.awp.reloadTime).toBe(2.5);
    expect(MULTIPLAYER_WEAPONS.awp.movementSpeedMultiplier).toBe(0.84);
    expect(MULTIPLAYER_WEAPONS.m4a1.teams).toEqual(['defenders']);
    expect(MULTIPLAYER_WEAPONS.ak47.teams).toEqual(['attackers']);
    expect(MULTIPLAYER_WEAPONS.operator.damage).toBeGreaterThan(MULTIPLAYER_WEAPONS.vandal.damage);
    expect(MULTIPLAYER_WEAPONS.vandal.price).toBeGreaterThan(MULTIPLAYER_WEAPONS.glock.price);
    expect(MULTIPLAYER_WEAPONS.glock.teams).toEqual(['attackers']);
    expect(MULTIPLAYER_WEAPONS.knife.price).toBe(0);
    expect(MULTIPLAYER_WEAPONS.knife.movementSpeedMultiplier).toBe(1);
  });

  it('defines Dust2 for TDM and defusal layouts', () => {
    const map = MULTIPLAYER_MAPS.dust2;

    expect(map.spawns.attackers).toHaveLength(5);
    expect(map.spawns.defenders).toHaveLength(5);
    expect(map.tdmSpawns.length).toBeGreaterThanOrEqual(6);
    expect(map.bombSites.map(site => site.id).sort()).toEqual(['A', 'B']);
  });

  it('uses exact CS 1.6 per-weapon maximum movement speeds', () => {
    const expected = {
      glock: [1, 1],
      ak47: [221 / 250, 221 / 250],
      m4a1: [230 / 250, 230 / 250],
      m3: [230 / 250, 230 / 250],
      p90: [245 / 250, 245 / 250],
      scout: [260 / 250, 220 / 250],
      awp: [210 / 250, 150 / 250],
      g3sg1: [210 / 250, 150 / 250],
      m249: [220 / 250, 220 / 250]
    } as const;

    for (const [weaponId, [normal, scoped]] of Object.entries(expected)) {
      expect(WEAPON_DEFINITIONS[weaponId].movementSpeedMultiplier, `${weaponId} client speed`).toBeCloseTo(normal, 5);
      expect(WEAPON_DEFINITIONS[weaponId].scopedMovementSpeedMultiplier, `${weaponId} scoped speed`).toBeCloseTo(scoped, 5);
      expect(MULTIPLAYER_WEAPONS[weaponId].movementSpeedMultiplier, `${weaponId} server speed`).toBeCloseTo(normal, 5);
    }
  });

  it('uses exact CS 1.6 primary-fire cycle times', () => {
    const expectedCycles = {
      glock: 0.15,
      usp: 0.15,
      p228: 0.15,
      deagle: 0.225,
      mp5: 0.075,
      tmp: 0.07,
      p90: 0.066,
      m3: 0.875,
      xm1014: 0.25,
      ak47: 0.0955,
      m4a1: 0.0875,
      scout: 1.25,
      awp: 1.45,
      g3sg1: 0.25,
      m249: 0.1
    } as const;

    for (const [weaponId, cycle] of Object.entries(expectedCycles)) {
      expect(1 / WEAPON_DEFINITIONS[weaponId].fireRate, `${weaponId} client cycle`).toBeCloseTo(cycle, 5);
      expect(1 / MULTIPLAYER_WEAPONS[weaponId].fireRate, `${weaponId} server cycle`).toBeCloseTo(cycle, 5);
    }
  });

  it('defines distinct tactical metadata for each available map', () => {
    const calloutFingerprints = MAP_IDS.map(mapId =>
      MULTIPLAYER_MAPS[mapId].callouts.map(callout => callout.name).sort().join('|')
    );
    const attackerSpawnFingerprints = MAP_IDS.map(mapId =>
      MULTIPLAYER_MAPS[mapId].spawns.attackers.map(spawn => `${spawn.x},${spawn.z}`).join('|')
    );

    expect(Object.keys(MULTIPLAYER_MAPS).sort()).toEqual([...MAP_IDS].sort());
    expect(new Set(calloutFingerprints).size).toBe(MAP_IDS.length);
    expect(new Set(attackerSpawnFingerprints).size).toBe(MAP_IDS.length);

    for (const mapId of MAP_IDS) {
      const map = MULTIPLAYER_MAPS[mapId];
      const callouts = map.callouts.map(callout => callout.name.toLowerCase());
      const firstAttacker = map.spawns.attackers[0];
      const firstDefender = map.spawns.defenders[0];

      expect(map.bombSites.map(site => site.id).sort()).toEqual(['A', 'B']);
      expect(callouts.some(callout => callout.includes('mid'))).toBe(true);
      if (mapId === 'bloodstrike') {
        expect(Math.hypot(firstAttacker.x - firstDefender.x, firstAttacker.z - firstDefender.z)).toBeGreaterThan(10);
      } else {
        expect(Math.hypot(firstAttacker.x - firstDefender.x, firstAttacker.z - firstDefender.z)).toBeGreaterThan(40);
      }
    }
  });
});
