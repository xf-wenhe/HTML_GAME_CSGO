import { describe, expect, it } from 'vitest';
import {
  DUST2_WORLD_MESH_SCHEMA,
  type Dust2WorldMeshResource,
  meshSpecFromDust2WorldMeshResource,
} from '../Dust2MeshResource.js';
import { ARENA_MAPS, resolveDust2SourceGeometry, resolveDust2SourceSpawns } from '../MapData.js';
import { DUST2_WORLD_MESH_RESOURCE } from '../generated/dust2-world-mesh.js';
import { PLAYER_EYE_HEIGHT } from '../constants/MapUnits.js';

const resource = (overrides: Partial<Dust2WorldMeshResource> = {}): Dust2WorldMeshResource => ({
  schema: DUST2_WORLD_MESH_SCHEMA,
  source: {
    engine: 'goldsrc',
    kind: 'bsp',
    version: 30,
    path: '/legal/cstrike/maps/de_dust2.bsp',
    manifest: {
      entities: {
        entityCount: 4,
        classCounts: {
          worldspawn: 1,
          info_player_start: 1,
          info_player_deathmatch: 1,
          func_bomb_target: 1,
        },
        playerSpawns: [
          {
            entityIndex: 1,
            classname: 'info_player_start',
            team: 'ct',
            hammerOrigin: { x: 128, y: 256, z: 64 },
            gamePosition: { x: 1.28, y: 0.64, z: -2.56 },
          },
          {
            entityIndex: 2,
            classname: 'info_player_deathmatch',
            team: 't',
            hammerOrigin: { x: -128, y: -256, z: 32 },
            gamePosition: { x: -1.28, y: 0.32, z: 2.56 },
          },
        ],
        bombTargets: [
          {
            entityIndex: 3,
            classname: 'func_bomb_target',
            model: '*1',
            targetname: 'bombsite_a',
          },
        ],
      },
      geometry: {
        worldMeshVertexCount: 3,
        worldMeshTriangleCount: 1,
        collision: {
          worldHullSummaries: [
            { hull: 0, contents: { empty: 1, solid: 1 } },
          ],
        },
      },
    },
  },
  mesh: {
    name: 'dust2-goldsrc-world-mesh',
    color: 0xc8b898,
    positions: [
      [0, 0, 0],
      [1, 0, 0],
      [0, 0, -1],
    ],
    indices: [0, 1, 2],
  },
  ...overrides,
});

describe('Dust2 mesh resource conversion', () => {
  it('keeps Dust2 mesh disabled until a generated source-backed resource exists', () => {
    expect(DUST2_WORLD_MESH_RESOURCE).toBeNull();
    expect(ARENA_MAPS.dust2.meshes).toEqual([]);
  });

  it('replaces hand-authored Dust2 placeholder geometry when a source-backed mesh exists', () => {
    const sourceMesh = meshSpecFromDust2WorldMeshResource(resource());
    const geometry = resolveDust2SourceGeometry(
      [sourceMesh],
      [
        {
          position: sourceMesh.positions[0],
          size: sourceMesh.positions[1],
          color: 0,
          name: 'placeholder-collider',
        },
      ],
      [
        {
          position: sourceMesh.positions[0],
          size: sourceMesh.positions[1],
          color: 0,
          name: 'placeholder-prop',
        },
      ]
    );

    expect(geometry.colliders).toEqual([]);
    expect(geometry.props).toEqual([]);
    expect(geometry.meshes).toEqual([sourceMesh]);
  });

  it('converts exported mesh JSON into an Arena MeshSpec', () => {
    const mesh = meshSpecFromDust2WorldMeshResource(resource());

    expect(mesh).toMatchObject({
      name: 'dust2-goldsrc-world-mesh',
      color: 0xc8b898,
      indices: [0, 1, 2],
      roughness: 0.82,
      metalness: 0.04,
    });
    expect(mesh.positions.map(position => position.toArray())).toEqual([
      [0, 0, 0],
      [1, 0, 0],
      [0, 0, -1],
    ]);
  });

  it('uses source entity spawns when a source-backed Dust2 resource exists', () => {
    const fallbackPlayerSpawn = meshSpecFromDust2WorldMeshResource(resource()).positions[0];
    const fallbackEnemySpawns = [
      {
        position: meshSpecFromDust2WorldMeshResource(resource()).positions[1],
        type: 'patrol' as const,
      },
    ];
    const spawns = resolveDust2SourceSpawns(resource(), fallbackPlayerSpawn, fallbackEnemySpawns);

    expect(spawns.playerSpawn.toArray()).toEqual([-1.28, 0.32 + PLAYER_EYE_HEIGHT, 2.56]);
    expect(spawns.enemySpawns).toHaveLength(1);
    expect(spawns.enemySpawns[0].position.toArray()).toEqual([1.28, 0.64 + PLAYER_EYE_HEIGHT, -2.56]);
    expect(spawns.enemySpawns[0].type).toBe('shooter');
  });

  it('keeps fallback spawns while Dust2 generated resource is unavailable', () => {
    const fallbackPlayerSpawn = meshSpecFromDust2WorldMeshResource(resource()).positions[0];
    const fallbackEnemySpawns = [
      {
        position: meshSpecFromDust2WorldMeshResource(resource()).positions[1],
        type: 'patrol' as const,
      },
    ];

    expect(resolveDust2SourceSpawns(null, fallbackPlayerSpawn, fallbackEnemySpawns)).toEqual({
      playerSpawn: fallbackPlayerSpawn,
      enemySpawns: fallbackEnemySpawns,
    });
  });

  it('rejects unsupported mesh schemas', () => {
    expect(() => meshSpecFromDust2WorldMeshResource(resource({ schema: 'wrong/schema' as typeof DUST2_WORLD_MESH_SCHEMA }))).toThrow(
      /Unsupported Dust2 world mesh schema/
    );
  });

  it('rejects mesh resources that are not backed by a GoldSrc BSP30 manifest', () => {
    expect(() =>
      meshSpecFromDust2WorldMeshResource(resource({
        source: {
          ...resource().source,
          version: 29,
        },
      }))
    ).toThrow(/GoldSrc BSP30/);

    expect(() =>
      meshSpecFromDust2WorldMeshResource(resource({
        source: {
          ...resource().source,
          manifest: {
            entities: resource().source.manifest.entities,
            geometry: { worldMeshVertexCount: 3, worldMeshTriangleCount: 1 },
          },
        },
      }))
    ).toThrow(/collision hull summaries/);
  });

  it('rejects mesh resources without source entity evidence', () => {
    expect(() =>
      meshSpecFromDust2WorldMeshResource(resource({
        source: {
          ...resource().source,
          manifest: {
            ...resource().source.manifest,
            entities: undefined,
          },
        },
      }))
    ).toThrow(/entity manifest/);

    expect(() =>
      meshSpecFromDust2WorldMeshResource(resource({
        source: {
          ...resource().source,
          manifest: {
            ...resource().source.manifest,
            entities: {
              entityCount: 2,
              playerSpawns: [
                {
                  entityIndex: 1,
                  classname: 'info_player_start',
                  team: 'ct',
                  hammerOrigin: { x: 0, y: 0, z: 0 },
                  gamePosition: { x: 0, y: 0, z: 0 },
                },
              ],
              bombTargets: [],
            },
          },
        },
      }))
    ).toThrow(/T and CT player spawns/);
  });

  it('rejects indices that are not complete triangles', () => {
    expect(() =>
      meshSpecFromDust2WorldMeshResource(resource({
        mesh: {
          ...resource().mesh,
          indices: [0, 1],
        },
      }))
    ).toThrow(/indices must be an array of triangles/);
  });

  it('rejects indices outside the position array', () => {
    expect(() =>
      meshSpecFromDust2WorldMeshResource(resource({
        mesh: {
          ...resource().mesh,
          indices: [0, 1, 99],
        },
      }))
    ).toThrow(/references missing vertex/);
  });
});
