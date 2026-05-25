import { describe, expect, it } from 'vitest';
import { MULTIPLAYER_MAPS } from '../config/maps.js';
import { MULTIPLAYER_WEAPONS } from '../config/weapons.js';
import type { MapId } from '../types.js';

const MAP_IDS: MapId[] = ['dust2', 'warehouse', 'italy', 'mirage', 'inferno', 'nuke', 'train', 'overpass'];

describe('multiplayer config', () => {
  it('defines CSGO-style core weapons with buy prices and damage roles', () => {
    expect(Object.keys(MULTIPLAYER_WEAPONS)).toEqual([
      'sidearm',
      'heavy_pistol',
      'vandal',
      'sentinel',
      'operator',
      'specter',
      'bulldog',
      'knife'
    ]);
    expect(MULTIPLAYER_WEAPONS.operator.damage).toBeGreaterThan(MULTIPLAYER_WEAPONS.vandal.damage);
    expect(MULTIPLAYER_WEAPONS.vandal.price).toBeGreaterThan(MULTIPLAYER_WEAPONS.sidearm.price);
    expect(MULTIPLAYER_WEAPONS.knife.price).toBe(0);
  });

  it('defines Dust2 for TDM and defusal layouts', () => {
    const map = MULTIPLAYER_MAPS.dust2;

    expect(map.spawns.attackers).toHaveLength(5);
    expect(map.spawns.defenders).toHaveLength(5);
    expect(map.tdmSpawns.length).toBeGreaterThanOrEqual(6);
    expect(map.bombSites.map(site => site.id).sort()).toEqual(['A', 'B']);
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
      expect(Math.hypot(firstAttacker.x - firstDefender.x, firstAttacker.z - firstDefender.z)).toBeGreaterThan(45);
    }
  });
});
