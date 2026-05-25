import { describe, expect, it } from 'vitest';
import { ARENA_MAPS, BoxSpec, INDUSTRIAL_ARENA } from '../MapData.js';
import { MULTIPLAYER_MAPS } from '../config/maps.js';
import type { MapId, Vector3 } from '../types.js';

const MAP_IDS: MapId[] = ['dust2', 'warehouse', 'italy'];

const hasNamedElement = (boxes: BoxSpec[], pattern: RegExp) => boxes.some(box => pattern.test(box.name ?? ''));

const footprint = (boxes: BoxSpec[]) =>
  boxes
    .map(box => `${box.name}:${box.position.x},${box.position.y},${box.position.z}:${box.size.x},${box.size.y},${box.size.z}:${box.color}`)
    .sort()
    .join('|');

const distance2d = (a: Vector3, b: Vector3) => Math.hypot(a.x - b.x, a.z - b.z);

const forwardPathIsClear = (spawn: Vector3, colliders: BoxSpec[]) => {
  const pathXHalfWidth = 1.1;
  const pathDepth = 10;
  const bodyHeight = 2;
  const pathMinZ = spawn.z - pathDepth;
  const pathMaxZ = spawn.z - 0.75;

  return colliders.every(collider => {
    const minX = collider.position.x - collider.size.x / 2;
    const maxX = collider.position.x + collider.size.x / 2;
    const minY = collider.position.y - collider.size.y / 2;
    const maxY = collider.position.y + collider.size.y / 2;
    const minZ = collider.position.z - collider.size.z / 2;
    const maxZ = collider.position.z + collider.size.z / 2;
    const overlapsX = maxX >= spawn.x - pathXHalfWidth && minX <= spawn.x + pathXHalfWidth;
    const overlapsY = maxY >= 0 && minY <= spawn.y + bodyHeight;
    const overlapsZ = maxZ >= pathMinZ && minZ <= pathMaxZ;

    return !(overlapsX && overlapsY && overlapsZ);
  });
};

describe('Forgepoint map scale and tactical layout', () => {
  it('is larger than the old box arena and has route-building colliders', () => {
    expect(INDUSTRIAL_ARENA.bounds.width).toBeGreaterThanOrEqual(70);
    expect(INDUSTRIAL_ARENA.bounds.depth).toBeGreaterThanOrEqual(90);
    expect(INDUSTRIAL_ARENA.colliders.length).toBeGreaterThanOrEqual(20);
    expect(INDUSTRIAL_ARENA.props.length).toBeGreaterThanOrEqual(10);
    expect(INDUSTRIAL_ARENA.colliders.some(collider => collider.name?.includes('gate'))).toBe(true);
    expect(INDUSTRIAL_ARENA.colliders.some(collider => collider.name?.includes('room'))).toBe(true);
    expect(INDUSTRIAL_ARENA.colliders.some(collider => collider.name?.includes('crouch-jump'))).toBe(true);
    expect(INDUSTRIAL_ARENA.colliders.some(collider => collider.name?.includes('second-floor'))).toBe(true);
    expect(INDUSTRIAL_ARENA.colliders.filter(collider => collider.name?.includes('stair-step')).length).toBeGreaterThanOrEqual(10);
    expect(INDUSTRIAL_ARENA.colliders.some(collider => collider.name?.includes('jump-box'))).toBe(true);
    expect(INDUSTRIAL_ARENA.colliders.some(collider => collider.name?.includes('closed-room'))).toBe(true);
    expect(INDUSTRIAL_ARENA.props.some(prop => prop.name?.includes('glass-window') && prop.opacity && prop.opacity < 0.5)).toBe(true);
  });

  it('has two bomb sites, spawns, and readable callouts', () => {
    const map = MULTIPLAYER_MAPS.dust2;

    expect(map.bombSites.map(site => site.id).sort()).toEqual(['A', 'B']);
    expect(map.spawns.attackers).toHaveLength(5);
    expect(map.spawns.defenders).toHaveLength(5);
    expect(map.tdmSpawns.length).toBeGreaterThanOrEqual(8);
    expect(map.callouts.map(callout => callout.name)).toContain('Mid');
  });

  it('offers Dust2, Warehouse, and Italy map choices with separated team spawns', () => {
    expect(Object.keys(ARENA_MAPS).sort()).toEqual(['dust2', 'italy', 'warehouse']);
    expect(Object.keys(MULTIPLAYER_MAPS).sort()).toEqual(['dust2', 'italy', 'warehouse']);

    for (const map of Object.values(MULTIPLAYER_MAPS)) {
      const attackerSpawn = map.spawns.attackers[0];
      const defenderSpawn = map.spawns.defenders[0];
      const separation = Math.hypot(attackerSpawn.x - defenderSpawn.x, attackerSpawn.z - defenderSpawn.z);

      expect(separation, `${map.id} should not use the same attacker and defender spawn`).toBeGreaterThan(45);
    }
  });

  it('gives each map the required tactical elements and future audio material zones', () => {
    for (const mapId of MAP_IDS) {
      const arena = ARENA_MAPS[mapId];
      const multiplayerMap = MULTIPLAYER_MAPS[mapId];
      const allBoxes = [...arena.colliders, ...arena.props];
      const calloutNames = multiplayerMap.callouts.map(callout => callout.name.toLowerCase());

      expect(multiplayerMap.bombSites.map(site => site.id).sort(), `${mapId} should expose A and B sites`).toEqual(['A', 'B']);
      expect(calloutNames.some(name => name.includes('mid')), `${mapId} needs a middle-route callout`).toBe(true);
      expect(calloutNames.some(name => name.includes('site') && name.includes('a')), `${mapId} needs an A site callout`).toBe(true);
      expect(calloutNames.some(name => name.includes('site') && name.includes('b')), `${mapId} needs a B site callout`).toBe(true);
      expect(hasNamedElement(allBoxes, /(second-floor|catwalk|upper)/), `${mapId} needs an upper area`).toBe(true);
      expect(hasNamedElement(allBoxes, /closed-room/), `${mapId} needs a closed room`).toBe(true);
      expect(arena.props.some(prop => /glass-window|window-glass/.test(prop.name ?? '') && prop.opacity !== undefined && prop.opacity < 0.5), `${mapId} needs transparent glass`).toBe(true);
      expect(arena.materialZones?.length, `${mapId} needs material zones for footsteps/audio`).toBeGreaterThanOrEqual(3);
      expect(arena.materialZones?.map(zone => zone.material)).toContain('metal');
      expect(forwardPathIsClear(arena.playerSpawn, arena.colliders), `${mapId} should not block default forward movement from spawn`).toBe(true);

      for (const site of multiplayerMap.bombSites) {
        const nearestCallout = multiplayerMap.callouts.some(callout => distance2d(callout.position, site.position) <= site.radius + callout.radius);
        expect(nearestCallout, `${mapId} ${site.id} site should have nearby callout coverage`).toBe(true);
      }
    }
  });

  it('makes Dust2, Warehouse, and Italy structurally distinct arenas', () => {
    const colliderFootprints = MAP_IDS.map(mapId => footprint(ARENA_MAPS[mapId].colliders));
    const propFootprints = MAP_IDS.map(mapId => footprint(ARENA_MAPS[mapId].props));
    const spawnPositions = MAP_IDS.map(mapId => ARENA_MAPS[mapId].playerSpawn.toArray().join(','));
    const materialIdentities = MAP_IDS.map(mapId => ARENA_MAPS[mapId].materialZones?.map(zone => zone.material).join(','));

    expect(new Set(colliderFootprints).size, 'collider layouts should not be clones').toBe(MAP_IDS.length);
    expect(new Set(propFootprints).size, 'prop layouts should not be clones').toBe(MAP_IDS.length);
    expect(new Set(spawnPositions).size, 'solo player spawns should differ').toBe(MAP_IDS.length);
    expect(new Set(materialIdentities).size, 'material-zone identity should differ per map').toBe(MAP_IDS.length);
  });
});
