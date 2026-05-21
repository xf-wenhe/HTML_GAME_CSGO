import { describe, expect, it } from 'vitest';
import { MULTIPLAYER_MAPS } from '../config/maps.js';
import { MULTIPLAYER_WEAPONS } from '../config/weapons.js';

describe('multiplayer config', () => {
  it('defines CSGO-style core weapons with buy prices and damage roles', () => {
    expect(Object.keys(MULTIPLAYER_WEAPONS)).toEqual([
      'sidearm',
      'heavy_pistol',
      'vandal',
      'sentinel',
      'operator',
      'specter',
      'bulldog'
    ]);
    expect(MULTIPLAYER_WEAPONS.operator.damage).toBeGreaterThan(MULTIPLAYER_WEAPONS.vandal.damage);
    expect(MULTIPLAYER_WEAPONS.vandal.price).toBeGreaterThan(MULTIPLAYER_WEAPONS.sidearm.price);
  });

  it('defines Forgepoint for TDM and defusal layouts', () => {
    const map = MULTIPLAYER_MAPS.forgepoint;

    expect(map.spawns.attackers).toHaveLength(5);
    expect(map.spawns.defenders).toHaveLength(5);
    expect(map.tdmSpawns.length).toBeGreaterThanOrEqual(6);
    expect(map.bombSites.map(site => site.id).sort()).toEqual(['A', 'B']);
  });
});
