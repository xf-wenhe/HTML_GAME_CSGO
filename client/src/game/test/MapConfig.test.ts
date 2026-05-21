import { describe, expect, it } from 'vitest';
import { INDUSTRIAL_ARENA } from '../MapData.js';
import { MULTIPLAYER_MAPS } from '../config/maps.js';

describe('Forgepoint map scale and tactical layout', () => {
  it('is larger than the old box arena and has route-building colliders', () => {
    expect(INDUSTRIAL_ARENA.bounds.width).toBeGreaterThanOrEqual(70);
    expect(INDUSTRIAL_ARENA.bounds.depth).toBeGreaterThanOrEqual(90);
    expect(INDUSTRIAL_ARENA.colliders.length).toBeGreaterThanOrEqual(20);
    expect(INDUSTRIAL_ARENA.props.length).toBeGreaterThanOrEqual(10);
    expect(INDUSTRIAL_ARENA.colliders.some(collider => collider.name?.includes('gate'))).toBe(true);
    expect(INDUSTRIAL_ARENA.colliders.some(collider => collider.name?.includes('room'))).toBe(true);
    expect(INDUSTRIAL_ARENA.colliders.some(collider => collider.name?.includes('crouch-jump'))).toBe(true);
  });

  it('has two bomb sites, spawns, and readable callouts', () => {
    const map = MULTIPLAYER_MAPS.forgepoint;

    expect(map.bombSites.map(site => site.id).sort()).toEqual(['A', 'B']);
    expect(map.spawns.attackers).toHaveLength(5);
    expect(map.spawns.defenders).toHaveLength(5);
    expect(map.tdmSpawns.length).toBeGreaterThanOrEqual(8);
    expect(map.callouts.map(callout => callout.name)).toContain('Mid');
  });
});
