import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import {
  GOLD_SRC_BSP_VERSION,
  findDust2Source,
  getDust2SourceCandidates,
  inspectDust2Source,
  isImportableDust2SourceKind,
} from '../../../../scripts/lib/dust2-source-preflight.mjs';
import {
  GOLD_SRC_BSP_HEADER_BYTES,
  GOLD_SRC_BSP_LUMP_COUNT,
  GOLD_SRC_BSP_STRUCT_SIZES,
  createGoldSrcBspManifest,
  buildTriangleMeshFromPolygons,
  describeGoldSrcClipChild,
  hammerPlaneToGame,
  hammerVectorToGame,
  parseGoldSrcEntities,
  parseGoldSrcBspBuffer,
  parseHammerOrigin,
  summarizeClipTree,
} from '../../../../scripts/lib/goldsrc-bsp.mjs';
import {
  createDust2MeshResource,
  createDust2MeshResourceModule,
  writeDust2MeshResourceModuleFromBsp,
  writeDust2MeshResourceModuleFromMap,
} from '../../../../scripts/lib/dust2-mesh-export.mjs';
import {
  createGoldSrcMapManifest,
  parseGoldSrcMapSource,
} from '../../../../scripts/lib/goldsrc-map.mjs';
import {
  parseDust2GeneratedMeshModule,
  verifyDust2GeneratedMeshResource,
} from '../../../../scripts/lib/dust2-generated-verify.mjs';
import { createDust2Status } from '../../../../scripts/lib/dust2-status.mjs';

let tempDirs: string[] = [];

const makeTempDir = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dust2-source-preflight-'));
  tempDirs.push(dir);
  return dir;
};

afterEach(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  tempDirs = [];
});

describe('CS1.6 Dust2 source preflight', () => {
  it('prefers an explicit DUST2_SOURCE path', () => {
    const dir = makeTempDir();
    const source = path.join(dir, 'de_dust2.bsp');
    fs.writeFileSync(source, Buffer.from([GOLD_SRC_BSP_VERSION, 0, 0, 0]));

    expect(findDust2Source({ cwd: dir, env: { DUST2_SOURCE: source } })).toBe(source);
  });

  it('prefers an explicit sourcePath over DUST2_SOURCE', () => {
    const dir = makeTempDir();
    const envSource = path.join(dir, 'env-de_dust2.bsp');
    const explicitSource = path.join(dir, 'explicit-de_dust2.bsp');
    fs.writeFileSync(envSource, Buffer.from([GOLD_SRC_BSP_VERSION, 0, 0, 0]));
    fs.writeFileSync(explicitSource, Buffer.from([GOLD_SRC_BSP_VERSION, 0, 0, 0]));

    const candidates = getDust2SourceCandidates({
      cwd: dir,
      env: { DUST2_SOURCE: envSource },
      sourcePath: explicitSource,
    });

    expect(candidates[0]).toBe(explicitSource);
    expect(findDust2Source({ cwd: dir, env: { DUST2_SOURCE: envSource }, sourcePath: explicitSource })).toBe(explicitSource);
  });

  it('recognizes a GoldSrc BSP v30 header', () => {
    const dir = makeTempDir();
    const source = path.join(dir, 'de_dust2.bsp');
    const header = Buffer.alloc(4);
    header.writeInt32LE(GOLD_SRC_BSP_VERSION, 0);
    fs.writeFileSync(source, header);

    expect(inspectDust2Source(source)).toMatchObject({
      kind: 'bsp',
      engine: 'goldsrc',
      version: GOLD_SRC_BSP_VERSION,
      path: source,
    });
  });

  it('rejects non-GoldSrc BSP versions', () => {
    const dir = makeTempDir();
    const source = path.join(dir, 'de_dust2.bsp');
    const header = Buffer.alloc(4);
    header.writeInt32LE(29, 0);
    fs.writeFileSync(source, header);

    expect(() => inspectDust2Source(source)).toThrow(/Not a GoldSrc BSP/);
  });

  it('rejects GoldSrc sources that are not named de_dust2', () => {
    const dir = makeTempDir();
    const source = path.join(dir, 'aim_map.bsp');
    const header = Buffer.alloc(4);
    header.writeInt32LE(GOLD_SRC_BSP_VERSION, 0);
    fs.writeFileSync(source, header);

    expect(() => inspectDust2Source(source)).toThrow(/must be named de_dust2\.bsp/);
  });

  it('recognizes a minimal GoldSrc MAP worldspawn with brush planes', () => {
    const dir = makeTempDir();
    const source = path.join(dir, 'de_dust2.map');
    fs.writeFileSync(
      source,
      [
        '{',
        '"classname" "worldspawn"',
        '{',
        '( 0 0 0 ) ( 128 0 0 ) ( 128 128 0 ) TEXTURE 0 0 0 1 1',
        '}',
        '}',
      ].join('\n')
    );

    expect(inspectDust2Source(source)).toMatchObject({
      kind: 'map',
      engine: 'goldsrc',
      path: source,
    });
  });

  it('recognizes RMF headers but does not treat RMF as directly importable', () => {
    const dir = makeTempDir();
    const source = path.join(dir, 'de_dust2.rmf');
    fs.writeFileSync(source, Buffer.from('Worldcraft RMF\0'.padEnd(64, '\0'), 'latin1'));

    const inspection = inspectDust2Source(source);

    expect(inspection).toMatchObject({
      kind: 'rmf',
      engine: 'goldsrc',
      path: source,
    });
    expect(isImportableDust2SourceKind(inspection.kind)).toBe(false);
  });

  it('reports deterministic source search candidates', () => {
    const dir = makeTempDir();
    const candidates = getDust2SourceCandidates({
      cwd: dir,
      env: { HOME: path.join(dir, 'home') },
    });

    expect(candidates[0]).toBe(path.join(dir, 'de_dust2.bsp'));
    expect(candidates).toContain(path.join(dir, 'cstrike/maps/de_dust2.bsp'));
  });

  it('parses a GoldSrc BSP header and entity lump manifest', () => {
    const buffer = createSyntheticBspBuffer();

    const parsed = parseGoldSrcBspBuffer(buffer, { sourcePath: 'synthetic-de_dust2.bsp' });
    const manifest = createGoldSrcBspManifest(parsed);

    expect(parsed.lumps).toHaveLength(GOLD_SRC_BSP_LUMP_COUNT);
    expect(parsed.lumps[0]).toMatchObject({
      index: 0,
      name: 'entities',
      offset: GOLD_SRC_BSP_HEADER_BYTES,
      length: createSyntheticEntityLump().length,
    });
    expect(parsed.entitiesText).toContain('"classname" "worldspawn"');
    expect(parsed.entities).toHaveLength(6);
    expect(parsed.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.sha256).toBe(parsed.sha256);
    expect(manifest.worldspawnPresent).toBe(true);
    expect(manifest.entities).toMatchObject({
      entityCount: 6,
      classCounts: {
        worldspawn: 1,
        info_player_start: 1,
        info_player_deathmatch: 1,
        func_door: 1,
        func_bomb_target: 2,
      },
      playerSpawns: [
        {
          classname: 'info_player_start',
          team: 'ct',
          hammerOrigin: { x: 128, y: 256, z: 64 },
          gamePosition: { x: 1.28, y: 0.64, z: -2.56 },
        },
        {
          classname: 'info_player_deathmatch',
          team: 't',
          hammerOrigin: { x: -128, y: -256, z: 32 },
          gamePosition: { x: -1.28, y: 0.32, z: 2.56 },
        },
      ],
      bombTargets: [
        {
          classname: 'func_bomb_target',
          model: '*2',
          targetname: 'bombsite_a',
        },
        {
          classname: 'func_bomb_target',
          model: '*3',
          targetname: 'bombsite_b',
        },
      ],
      brushEntities: [
        {
          classname: 'func_door',
          model: '*1',
          modelIndex: 1,
          brushKind: 'structural',
        },
        {
          classname: 'func_bomb_target',
          model: '*2',
          modelIndex: 2,
          brushKind: 'trigger',
        },
        {
          classname: 'func_bomb_target',
          model: '*3',
          modelIndex: 3,
          brushKind: 'trigger',
        },
      ],
    });
  });

  it('parses GoldSrc entity keyvalues and Hammer origins', () => {
    const entities = parseGoldSrcEntities(createSyntheticEntityLump().toString('latin1'));

    expect(entities.map(entity => entity.classname)).toEqual([
      'worldspawn',
      'info_player_start',
      'info_player_deathmatch',
      'func_door',
      'func_bomb_target',
      'func_bomb_target',
    ]);
    expect(parseHammerOrigin('1 2 3')).toEqual({ x: 1, y: 2, z: 3 });
    expect(parseHammerOrigin('not an origin')).toBeNull();
  });

  it('parses render geometry lumps and world model bounds', () => {
    const parsed = parseGoldSrcBspBuffer(createSyntheticBspBuffer());
    const manifest = createGoldSrcBspManifest(parsed);

    expect(parsed.geometry.vertices.map(vertex => vertex.position)).toEqual([
      { x: 0, y: 0, z: 0 },
      { x: 128, y: 0, z: 0 },
      { x: 128, y: 128, z: 0 },
      { x: 0, y: 128, z: 0 },
    ]);
    expect(parsed.geometry.edges[1].vertices).toEqual([1, 2]);
    expect(parsed.geometry.surfaceEdges.map(surfaceEdge => surfaceEdge.edgeIndex)).toEqual([0, 1, 2, 3]);
    expect(parsed.geometry.faces[0]).toMatchObject({
      planeIndex: 0,
      firstSurfaceEdge: 0,
      edgeCount: 4,
      textureInfoIndex: 0,
      lightmapOffset: -1,
    });
    expect(parsed.geometry.worldModel).toMatchObject({
      mins: { x: 0, y: 0, z: 0 },
      maxs: { x: 128, y: 128, z: 64 },
      headnodes: [0, -1, -1, -1],
      firstFace: 0,
      faceCount: 1,
    });
    expect(manifest.geometry).toMatchObject({
      vertexCount: 4,
      planeCount: 1,
      clipNodeCount: 1,
      edgeCount: 4,
      surfaceEdgeCount: 4,
      faceCount: 1,
      polygonCount: 1,
      worldPolygonCount: 1,
      worldMeshVertexCount: 4,
      worldMeshTriangleCount: 2,
      modelCount: 4,
      exportedMeshVertexCount: 16,
      exportedMeshTriangleCount: 8,
      exportedModelIndexes: [0, 1, 2, 3],
      modelMeshes: [
        {
          modelIndex: 0,
          vertexCount: 4,
          triangleCount: 2,
        },
        {
          modelIndex: 1,
          vertexCount: 4,
          triangleCount: 2,
        },
        {
          modelIndex: 2,
          vertexCount: 4,
          triangleCount: 2,
        },
        {
          modelIndex: 3,
          vertexCount: 4,
          triangleCount: 2,
        },
      ],
      worldModel: {
        gameBounds: {
          mins: { x: 0, y: 0, z: -0 },
          maxs: { x: 1.28, y: 0.64, z: -1.28 },
        },
      },
    });
  });

  it('parses collision planes and clipnodes used by GoldSrc hulls', () => {
    const parsed = parseGoldSrcBspBuffer(createSyntheticBspBuffer());
    const manifest = createGoldSrcBspManifest(parsed);

    expect(parsed.geometry.collision.planes).toEqual([
      {
        index: 0,
        normal: { x: 0, y: 0, z: 1 },
        distance: 64,
        gameNormal: { x: 0, y: 1, z: -0 },
        gameDistance: 0.64,
        type: 2,
      },
    ]);
    expect(parsed.geometry.collision.clipNodes).toEqual([
      {
        index: 0,
        planeIndex: 0,
        children: [-1, -2],
        childRefs: [
          { kind: 'contents', value: -1, contents: 'empty' },
          { kind: 'contents', value: -2, contents: 'solid' },
        ],
      },
    ]);
    expect(parsed.geometry.collision.worldHeadnodes).toEqual([0, -1, -1, -1]);
    expect(parsed.geometry.collision.worldHullSummaries).toEqual([
      {
        hull: 0,
        headnode: 0,
        nodeCount: 1,
        contents: { empty: 1, solid: 1 },
        missingNodes: [],
        cycles: [],
      },
      {
        hull: 1,
        headnode: -1,
        nodeCount: 0,
        contents: { empty: 1 },
        missingNodes: [],
        cycles: [],
      },
      {
        hull: 2,
        headnode: -1,
        nodeCount: 0,
        contents: { empty: 1 },
        missingNodes: [],
        cycles: [],
      },
      {
        hull: 3,
        headnode: -1,
        nodeCount: 0,
        contents: { empty: 1 },
        missingNodes: [],
        cycles: [],
      },
    ]);
    expect(manifest.geometry.worldModel?.headnodes).toEqual([0, -1, -1, -1]);
    expect(manifest.geometry.collision.worldHullSummaries[0]).toMatchObject({
      hull: 0,
      nodeCount: 1,
      contents: { empty: 1, solid: 1 },
    });
    expect(manifest.geometry.collision.modelHullSummaries).toHaveLength(4);
    expect(manifest.geometry.collision.modelHullSummaries.map(summary => summary.modelIndex)).toEqual([0, 1, 2, 3]);
    expect(manifest.geometry.collision.modelHullSummaries[1].hulls[0]).toMatchObject({
      hull: 0,
      contents: { empty: 1, solid: 1 },
    });
  });

  it('triangulates world face polygons into renderable mesh data', () => {
    const parsed = parseGoldSrcBspBuffer(createSyntheticBspBuffer());

    expect(parsed.geometry.worldMesh.positions).toEqual([
      { x: 0, y: 0, z: -0 },
      { x: 1.28, y: 0, z: -0 },
      { x: 1.28, y: 0, z: -1.28 },
      { x: 0, y: 0, z: -1.28 },
    ]);
    expect(parsed.geometry.worldMesh.indices).toEqual([0, 1, 2, 0, 2, 3]);
    expect(parsed.geometry.worldMesh.faceRanges).toEqual([
      {
        faceIndex: 0,
        firstVertex: 0,
        vertexCount: 4,
        firstIndex: 0,
        indexCount: 6,
      },
    ]);
  });

  it('does not emit triangles for degenerate polygons', () => {
    const mesh = buildTriangleMeshFromPolygons([
      {
        faceIndex: 42,
        gamePositions: [
          { x: 0, y: 0, z: 0 },
          { x: 1, y: 0, z: 0 },
        ],
      },
    ]);

    expect(mesh.positions).toHaveLength(2);
    expect(mesh.indices).toEqual([]);
    expect(mesh.faceRanges[0]).toMatchObject({
      faceIndex: 42,
      indexCount: 0,
    });
  });

  it('exports a Dust2 mesh JSON resource from parsed BSP geometry', () => {
    const parsed = parseGoldSrcBspBuffer(createSyntheticBspBuffer(), { sourcePath: '/legal/cstrike/maps/de_dust2.bsp' });
    const resource = createDust2MeshResource(parsed);

    expect(resource).toMatchObject({
      schema: 'fps-web-game/dust2-world-mesh/v1',
      source: {
        engine: 'goldsrc',
        kind: 'bsp',
        version: GOLD_SRC_BSP_VERSION,
        sha256: parsed.sha256,
        path: '/legal/cstrike/maps/de_dust2.bsp',
        manifest: {
          sha256: parsed.sha256,
          geometry: {
            worldMeshVertexCount: 4,
            worldMeshTriangleCount: 2,
            exportedMeshVertexCount: 8,
            exportedMeshTriangleCount: 4,
          },
        },
      },
      mesh: {
        name: 'dust2-goldsrc-world-mesh',
        positions: [
          [0, 0, -0],
          [1.28, 0, -0],
          [1.28, 0, -1.28],
          [0, 0, -1.28],
          [0, 0, -0],
          [1.28, 0, -0],
          [1.28, 0, -1.28],
          [0, 0, -1.28],
        ],
        indices: [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7],
      },
    });
  });

  it('serializes the Dust2 mesh resource as the generated TypeScript module', () => {
    const parsed = parseGoldSrcBspBuffer(createSyntheticBspBuffer(), { sourcePath: '/legal/cstrike/maps/de_dust2.bsp' });
    const resource = createDust2MeshResource(parsed);
    const moduleSource = createDust2MeshResourceModule(resource);

    expect(moduleSource).toContain("import type { Dust2WorldMeshResource } from '../Dust2MeshResource.js';");
    expect(moduleSource).toContain('export const DUST2_WORLD_MESH_RESOURCE: Dust2WorldMeshResource | null =');
    expect(moduleSource).toContain('"schema": "fps-web-game/dust2-world-mesh/v1"');
    expect(moduleSource).toContain('"name": "dust2-goldsrc-world-mesh"');
    expect(moduleSource).toContain('"indices": [');
  });

  it('writes a generated TypeScript mesh module from a BSP file', () => {
    const dir = makeTempDir();
    const source = path.join(dir, 'de_dust2.bsp');
    const out = path.join(dir, 'generated', 'dust2-world-mesh.ts');
    fs.writeFileSync(source, createSyntheticBspBuffer());

    const resource = writeDust2MeshResourceModuleFromBsp(source, out);
    const moduleSource = fs.readFileSync(out, 'utf8');

    expect(resource.mesh.positions).toHaveLength(8);
    expect(resource.mesh.indices).toEqual([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
    expect(moduleSource).toContain('export const DUST2_WORLD_MESH_RESOURCE: Dust2WorldMeshResource | null =');
    expect(moduleSource).toContain(`"path": "${source}"`);
    expect(moduleSource).toContain('"exportedMeshTriangleCount": 4');
  });

  it('parses a GoldSrc MAP source into structural brush geometry', () => {
    const parsed = parseGoldSrcMapSource(createSyntheticMapSource(), { sourcePath: '/legal/cstrike/maps/de_dust2.map' });
    const manifest = createGoldSrcMapManifest(parsed);

    expect(parsed).toMatchObject({
      kind: 'map',
      engine: 'goldsrc',
      version: null,
      sourcePath: '/legal/cstrike/maps/de_dust2.map',
    });
    expect(parsed.mapEntities.map(entity => entity.classname)).toEqual([
      'worldspawn',
      'info_player_start',
      'info_player_deathmatch',
      'func_door',
      'func_bomb_target',
      'func_bomb_target',
    ]);
    expect(manifest.entities).toMatchObject({
      entityCount: 6,
      classCounts: {
        worldspawn: 1,
        info_player_start: 1,
        info_player_deathmatch: 1,
        func_door: 1,
        func_bomb_target: 2,
      },
    });
    expect(manifest.entities.brushEntities).toEqual([
      expect.objectContaining({ classname: 'func_door', brushKind: 'structural', model: null, modelIndex: null }),
      expect.objectContaining({ classname: 'func_bomb_target', brushKind: 'trigger', model: null, modelIndex: null }),
      expect.objectContaining({ classname: 'func_bomb_target', brushKind: 'trigger', model: null, modelIndex: null }),
    ]);
    expect(manifest.geometry).toMatchObject({
      brushCount: 4,
      structuralBrushCount: 2,
      triggerBrushCount: 2,
      worldMeshTriangleCount: 12,
      exportedMeshTriangleCount: 24,
      collision: {
        brushSolidCount: 2,
      },
    });
  });

  it('writes and verifies a generated TypeScript mesh module from a MAP file', () => {
    const dir = makeTempDir();
    const source = path.join(dir, 'de_dust2.map');
    const out = path.join(dir, 'generated', 'dust2-world-mesh.ts');
    fs.writeFileSync(source, createSyntheticMapSource());

    const resource = writeDust2MeshResourceModuleFromMap(source, out);
    const moduleSource = fs.readFileSync(out, 'utf8');
    const verification = verifyDust2GeneratedMeshResource(parseDust2GeneratedMeshModule(moduleSource));

    expect(resource.source).toMatchObject({
      kind: 'map',
      version: null,
      path: source,
    });
    expect(resource.mesh.indices).toHaveLength(72);
    expect(moduleSource).toContain('"kind": "map"');
    expect(verification).toMatchObject({
      sourcePath: source,
      vertexCount: 48,
      triangleCount: 24,
      hullCount: 1,
      modelMeshCount: 1,
      exportedModelCount: 1,
      collisionModelCount: 1,
      entityCount: 6,
      tSpawnCount: 1,
      ctSpawnCount: 1,
      bombTargetCount: 2,
    });
  });

  it('runs the Dust2 import CLI end-to-end and verifies the generated module', () => {
    const dir = makeTempDir();
    const source = path.join(dir, 'de_dust2.bsp');
    const out = path.join(dir, 'generated', 'dust2-world-mesh.ts');
    fs.writeFileSync(source, createSyntheticBspBuffer());

    const output = execFileSync(
      'node',
      ['scripts/import-dust2-goldsrc.mjs', '--source', source, '--out-ts', out],
      { cwd: process.cwd(), encoding: 'utf8' }
    );
    const moduleSource = fs.readFileSync(out, 'utf8');

    expect(output).toContain('"kind": "bsp"');
    expect(output).toContain('"worldMeshTriangleCount": 2');
    expect(output).toContain('"verified": true');
    expect(output).toContain('"vertexCount": 8');
    expect(output).toContain('"exportedModelCount": 2');
    expect(moduleSource).toContain(`"path": "${source}"`);
    expect(moduleSource).toContain('"exportedMeshTriangleCount": 4');
    expect(moduleSource).toContain('"exportedModelIndexes": [');
    expect(verifyDust2GeneratedMeshResource(parseDust2GeneratedMeshModule(moduleSource))).toMatchObject({
      sourcePath: source,
      vertexCount: 8,
      triangleCount: 4,
      hullCount: 4,
      modelMeshCount: 4,
      exportedModelCount: 2,
      collisionModelCount: 2,
    });
  });

  it('runs the Dust2 MAP import CLI end-to-end and verifies the generated module', () => {
    const dir = makeTempDir();
    const source = path.join(dir, 'de_dust2.map');
    const out = path.join(dir, 'generated', 'dust2-world-mesh.ts');
    fs.writeFileSync(source, createSyntheticMapSource());

    const output = execFileSync(
      'node',
      ['scripts/import-dust2-goldsrc.mjs', '--source', source, '--out-ts', out],
      { cwd: process.cwd(), encoding: 'utf8' }
    );
    const moduleSource = fs.readFileSync(out, 'utf8');

    expect(output).toContain('"kind": "map"');
    expect(output).toContain('"brushCount": 4');
    expect(output).toContain('"verified": true');
    expect(output).toContain('"vertexCount": 48');
    expect(output).toContain('"exportedModelCount": 1');
    expect(moduleSource).toContain(`"path": "${source}"`);
    expect(verifyDust2GeneratedMeshResource(parseDust2GeneratedMeshModule(moduleSource))).toMatchObject({
      sourcePath: source,
      vertexCount: 48,
      triangleCount: 24,
      hullCount: 1,
      modelMeshCount: 1,
      exportedModelCount: 1,
      collisionModelCount: 1,
    });
  });

  it('refuses to export RMF directly and tells the caller to convert it first', () => {
    const dir = makeTempDir();
    const source = path.join(dir, 'de_dust2.rmf');
    const out = path.join(dir, 'generated', 'dust2-world-mesh.ts');
    fs.writeFileSync(source, Buffer.from('Worldcraft RMF\0'.padEnd(64, '\0'), 'latin1'));

    expect(() =>
      execFileSync(
        'node',
        ['scripts/import-dust2-goldsrc.mjs', '--source', source, '--out-ts', out],
        { cwd: process.cwd(), encoding: 'utf8', stdio: 'pipe' }
      )
    ).toThrow(/RMF mesh export is not implemented/);
    expect(fs.existsSync(out)).toBe(false);
  });

  it('reports Dust2 status without treating synthetic source-backed data as strict 1:1 Dust2', () => {
    const dir = makeTempDir();
    const source = path.join(dir, 'de_dust2.bsp');
    const out = path.join(dir, 'generated', 'dust2-world-mesh.ts');
    fs.writeFileSync(source, createSyntheticBspBuffer());
    writeDust2MeshResourceModuleFromBsp(source, out);

    const status = createDust2Status({
      cwd: dir,
      sourcePath: source,
      generatedModule: out,
      env: {},
    });

    expect(status.sourceBacked).toBe(true);
    expect(status.classicDust2Strict).toBe(false);
    expect(status.gates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'strict-bomb-sites', passed: true }),
        expect.objectContaining({ id: 'strict-map-scale', passed: false }),
        expect.objectContaining({ id: 'strict-structural-brushes', passed: true }),
      ])
    );
  });

  it('reports RMF sources as found but not directly importable', () => {
    const dir = makeTempDir();
    const source = path.join(dir, 'de_dust2.rmf');
    const generatedModule = path.join(dir, 'generated', 'dust2-world-mesh.ts');
    fs.mkdirSync(path.dirname(generatedModule), { recursive: true });
    fs.writeFileSync(source, Buffer.from('Worldcraft RMF\0'.padEnd(64, '\0'), 'latin1'));
    fs.writeFileSync(
      generatedModule,
      "import type { Dust2WorldMeshResource } from '../Dust2MeshResource.js';\n\nexport const DUST2_WORLD_MESH_RESOURCE: Dust2WorldMeshResource | null = null;\n"
    );

    const status = createDust2Status({
      cwd: dir,
      sourcePath: source,
      generatedModule,
      env: {},
    });

    expect(status.source.found).toBe(true);
    expect(status.sourceBacked).toBe(false);
    expect(status.gates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'source-file', passed: true }),
        expect.objectContaining({ id: 'source-importable', passed: false }),
        expect.objectContaining({ id: 'generated-resource', passed: false }),
      ])
    );
    expect(status.nextAction).toContain('convert de_dust2.rmf to de_dust2.map');
  });

  it('reports Dust2 status as not ready while source and generated resource are missing', () => {
    const dir = makeTempDir();
    const status = createDust2Status({
      cwd: dir,
      generatedModule: path.join(dir, 'missing-dust2-world-mesh.ts'),
      env: {},
    });

    expect(status.sourceBacked).toBe(false);
    expect(status.classicDust2Strict).toBe(false);
    expect(status.gates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'source-file', passed: false }),
        expect.objectContaining({ id: 'generated-resource', passed: false }),
      ])
    );
  });

  it('refuses Dust2 screenshots until a source-backed generated resource exists', () => {
    const dir = makeTempDir();
    const generatedModule = path.join(dir, 'dust2-world-mesh.ts');
    fs.writeFileSync(
      generatedModule,
      "import type { Dust2WorldMeshResource } from '../Dust2MeshResource.js';\n\nexport const DUST2_WORLD_MESH_RESOURCE: Dust2WorldMeshResource | null = null;\n"
    );

    expect(() =>
      execFileSync(
        'node',
        ['scripts/screenshot-dust2.mjs'],
        {
          cwd: process.cwd(),
          encoding: 'utf8',
          stdio: 'pipe',
          env: { ...process.env, DUST2_GENERATED_MODULE: generatedModule },
        }
      )
    ).toThrow(/Dust2 generated mesh resource is null/);
  });

  it('verifies generated Dust2 mesh modules before treating them as source-backed', () => {
    const parsed = parseGoldSrcBspBuffer(createSyntheticBspBuffer(), { sourcePath: '/legal/cstrike/maps/de_dust2.bsp' });
    const resource = createDust2MeshResource(parsed);
    const moduleSource = createDust2MeshResourceModule(resource);

    expect(parseDust2GeneratedMeshModule('export const DUST2_WORLD_MESH_RESOURCE = null;')).toBeNull();
    expect(verifyDust2GeneratedMeshResource(parseDust2GeneratedMeshModule(moduleSource))).toEqual({
      schema: 'fps-web-game/dust2-world-mesh/v1',
      sourcePath: '/legal/cstrike/maps/de_dust2.bsp',
      vertexCount: 8,
      triangleCount: 4,
      hullCount: 4,
      modelMeshCount: 4,
      exportedModelCount: 2,
      collisionModelCount: 2,
      entityCount: 6,
      tSpawnCount: 1,
      ctSpawnCount: 1,
      bombTargetCount: 2,
    });
    expect(() => verifyDust2GeneratedMeshResource(null)).toThrow(/resource is null/);
    expect(() =>
      verifyDust2GeneratedMeshResource({
        ...resource,
        source: {
          ...resource.source,
          manifest: {
            ...resource.source.manifest,
            sha256: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
          },
        },
      })
    ).toThrow(/SHA-256/);
    expect(() =>
      verifyDust2GeneratedMeshResource({
        ...resource,
        mesh: {
          ...resource.mesh,
          indices: [0, 1, 2],
        },
      })
    ).toThrow(/indices do not match/);
    expect(() =>
      verifyDust2GeneratedMeshResource({
        ...resource,
        source: {
          ...resource.source,
          manifest: {
            ...resource.source.manifest,
            geometry: {
              ...resource.source.manifest.geometry,
              collision: {
                ...resource.source.manifest.geometry.collision,
                modelHullSummaries: [
                  {
                    modelIndex: 0,
                    hulls: [
                      { hull: 0, contents: { solid: 1 }, missingNodes: [9], cycles: [] },
                    ],
                  },
                  ...resource.source.manifest.geometry.collision.modelHullSummaries.slice(1),
                ],
              },
            },
          },
        },
      })
    ).toThrow(/unresolved clipnode/);
  });

  it('assembles face polygons from signed surfedges', () => {
    const parsed = parseGoldSrcBspBuffer(createSyntheticBspBuffer({ signedSurfEdges: [0, 1, -2, -3] }));
    const polygon = parsed.geometry.facePolygons[0];

    expect(polygon.vertexIndices).toEqual([0, 1, 3, 0]);
    expect(polygon.positions).toEqual([
      { x: 0, y: 0, z: 0 },
      { x: 128, y: 0, z: 0 },
      { x: 0, y: 128, z: 0 },
      { x: 0, y: 0, z: 0 },
    ]);
    expect(polygon.gamePositions).toEqual([
      { x: 0, y: 0, z: -0 },
      { x: 1.28, y: 0, z: -0 },
      { x: 0, y: 0, z: -1.28 },
      { x: 0, y: 0, z: -0 },
    ]);
    expect(parsed.geometry.worldFacePolygons).toHaveLength(1);
  });

  it('rejects faces that reference missing surfedges', () => {
    const buffer = createSyntheticBspBuffer({ faceEdgeCount: 5 });

    expect(() => parseGoldSrcBspBuffer(buffer)).toThrow(/references missing surfedge/);
  });

  it('rejects BSP lumps outside file bounds', () => {
    const buffer = Buffer.alloc(GOLD_SRC_BSP_HEADER_BYTES);
    buffer.writeInt32LE(GOLD_SRC_BSP_VERSION, 0);
    buffer.writeInt32LE(GOLD_SRC_BSP_HEADER_BYTES + 100, 4);
    buffer.writeInt32LE(16, 8);

    expect(() => parseGoldSrcBspBuffer(buffer)).toThrow(/extends beyond file bounds/);
  });

  it('converts Hammer coordinates into the current game coordinate system', () => {
    expect(hammerVectorToGame({ x: 128, y: 256, z: 64 })).toEqual({
      x: 1.28,
      y: 0.64,
      z: -2.56,
    });
  });

  it('converts Hammer planes into the current game coordinate system', () => {
    expect(hammerPlaneToGame({ normal: { x: 0, y: 1, z: 0 }, distance: 256 })).toEqual({
      normal: { x: 0, y: 0, z: -1 },
      distance: 2.56,
    });
  });

  it('describes GoldSrc clipnode children as node refs or contents', () => {
    expect(describeGoldSrcClipChild(7)).toEqual({ kind: 'node', value: 7 });
    expect(describeGoldSrcClipChild(-1)).toEqual({ kind: 'contents', value: -1, contents: 'empty' });
    expect(describeGoldSrcClipChild(-2)).toEqual({ kind: 'contents', value: -2, contents: 'solid' });
    expect(describeGoldSrcClipChild(-99)).toEqual({ kind: 'contents', value: -99, contents: 'unknown' });
  });

  it('summarizes clipnode trees and reports missing nodes or cycles', () => {
    expect(summarizeClipTree([{ children: [1, -2] }, { children: [-1, -2] }], 0, 1)).toEqual({
      hull: 1,
      headnode: 0,
      nodeCount: 2,
      contents: { empty: 1, solid: 2 },
      missingNodes: [],
      cycles: [],
    });
    expect(summarizeClipTree([{ children: [9, -2] }], 0, 2)).toMatchObject({
      hull: 2,
      missingNodes: [9],
      contents: { solid: 1 },
    });
    expect(summarizeClipTree([{ children: [0, -2] }], 0, 3)).toMatchObject({
      hull: 3,
      cycles: [0],
      contents: { solid: 1 },
    });
  });
});

function createSyntheticBspBuffer({ signedSurfEdges = [0, 1, 2, 3], faceEdgeCount = signedSurfEdges.length } = {}) {
  const entities = createSyntheticEntityLump();
  const planes = Buffer.alloc(GOLD_SRC_BSP_STRUCT_SIZES.plane);
  writeVector(planes, 0, 0, 0, 1);
  planes.writeFloatLE(64, 12);
  planes.writeInt32LE(2, 16);

  const vertices = Buffer.alloc(GOLD_SRC_BSP_STRUCT_SIZES.vertex * 4);
  writeVector(vertices, 0, 0, 0, 0);
  writeVector(vertices, 12, 128, 0, 0);
  writeVector(vertices, 24, 128, 128, 0);
  writeVector(vertices, 36, 0, 128, 0);

  const faces = Buffer.alloc(GOLD_SRC_BSP_STRUCT_SIZES.face);
  faces.writeUInt16LE(0, 0);
  faces.writeUInt16LE(0, 2);
  faces.writeUInt32LE(0, 4);
  faces.writeUInt16LE(faceEdgeCount, 8);
  faces.writeUInt16LE(0, 10);
  faces.writeUInt8(255, 12);
  faces.writeUInt8(255, 13);
  faces.writeUInt8(255, 14);
  faces.writeUInt8(255, 15);
  faces.writeInt32LE(-1, 16);

  const clipNodes = Buffer.alloc(GOLD_SRC_BSP_STRUCT_SIZES.clipNode);
  clipNodes.writeInt32LE(0, 0);
  clipNodes.writeInt16LE(-1, 4);
  clipNodes.writeInt16LE(-2, 6);

  const edges = Buffer.alloc(GOLD_SRC_BSP_STRUCT_SIZES.edge * 4);
  writeEdge(edges, 0, 0, 1);
  writeEdge(edges, 4, 1, 2);
  writeEdge(edges, 8, 2, 3);
  writeEdge(edges, 12, 3, 0);

  const surfaceEdges = Buffer.alloc(GOLD_SRC_BSP_STRUCT_SIZES.surfEdge * 4);
  signedSurfEdges.forEach((edgeIndex, index) => {
    surfaceEdges.writeInt32LE(edgeIndex, index * GOLD_SRC_BSP_STRUCT_SIZES.surfEdge);
  });

  const models = Buffer.alloc(GOLD_SRC_BSP_STRUCT_SIZES.model * 4);
  writeVector(models, 0, 0, 0, 0);
  writeVector(models, 12, 128, 128, 64);
  writeVector(models, 24, 0, 0, 0);
  models.writeInt32LE(0, 36);
  models.writeInt32LE(-1, 40);
  models.writeInt32LE(-1, 44);
  models.writeInt32LE(-1, 48);
  models.writeInt32LE(1, 52);
  models.writeInt32LE(0, 56);
  models.writeInt32LE(1, 60);

  writeVector(models, 64, 0, 0, 0);
  writeVector(models, 76, 128, 128, 64);
  writeVector(models, 88, 0, 0, 0);
  models.writeInt32LE(0, 100);
  models.writeInt32LE(-1, 104);
  models.writeInt32LE(-1, 108);
  models.writeInt32LE(-1, 112);
  models.writeInt32LE(1, 116);
  models.writeInt32LE(0, 120);
  models.writeInt32LE(1, 124);

  writeVector(models, 128, 0, 0, 0);
  writeVector(models, 140, 128, 128, 64);
  writeVector(models, 152, 0, 0, 0);
  models.writeInt32LE(0, 164);
  models.writeInt32LE(-1, 168);
  models.writeInt32LE(-1, 172);
  models.writeInt32LE(-1, 176);
  models.writeInt32LE(1, 180);
  models.writeInt32LE(0, 184);
  models.writeInt32LE(1, 188);

  writeVector(models, 192, 0, 0, 0);
  writeVector(models, 204, 128, 128, 64);
  writeVector(models, 216, 0, 0, 0);
  models.writeInt32LE(0, 228);
  models.writeInt32LE(-1, 232);
  models.writeInt32LE(-1, 236);
  models.writeInt32LE(-1, 240);
  models.writeInt32LE(1, 244);
  models.writeInt32LE(0, 248);
  models.writeInt32LE(1, 252);

  const lumps = new Map([
    [0, entities],
    [1, planes],
    [3, vertices],
    [7, faces],
    [9, clipNodes],
    [12, edges],
    [13, surfaceEdges],
    [14, models],
  ]);
  const totalLength = [...lumps.values()].reduce((length, lump) => length + lump.length, GOLD_SRC_BSP_HEADER_BYTES);
  const buffer = Buffer.alloc(totalLength);
  buffer.writeInt32LE(GOLD_SRC_BSP_VERSION, 0);

  let cursor = GOLD_SRC_BSP_HEADER_BYTES;
  for (const [index, lump] of lumps) {
    const headerOffset = 4 + index * 8;
    buffer.writeInt32LE(cursor, headerOffset);
    buffer.writeInt32LE(lump.length, headerOffset + 4);
    lump.copy(buffer, cursor);
    cursor += lump.length;
  }

  return buffer;
}

function createSyntheticEntityLump() {
  return Buffer.from(
    [
      '{',
      '"classname" "worldspawn"',
      '}',
      '{',
      '"classname" "info_player_start"',
      '"origin" "128 256 64"',
      '}',
      '{',
      '"classname" "info_player_deathmatch"',
      '"origin" "-128 -256 32"',
      '}',
      '{',
      '"classname" "func_door"',
      '"model" "*1"',
      '"targetname" "a_door"',
      '}',
      '{',
      '"classname" "func_bomb_target"',
      '"model" "*2"',
      '"targetname" "bombsite_a"',
      '}',
      '{',
      '"classname" "func_bomb_target"',
      '"model" "*3"',
      '"targetname" "bombsite_b"',
      '}',
      '',
    ].join('\n'),
    'latin1'
  );
}

function createSyntheticMapSource() {
  return [
    '{',
    '"classname" "worldspawn"',
    createCubeBrush(0, 0, 0, 128, 128, 64),
    '}',
    '{',
    '"classname" "info_player_start"',
    '"origin" "128 256 64"',
    '}',
    '{',
    '"classname" "info_player_deathmatch"',
    '"origin" "-128 -256 32"',
    '}',
    '{',
    '"classname" "func_door"',
    '"targetname" "a_door"',
    createCubeBrush(160, 0, 0, 192, 128, 64),
    '}',
    '{',
    '"classname" "func_bomb_target"',
    '"targetname" "bombsite_a"',
    createCubeBrush(0, 160, 0, 128, 192, 32),
    '}',
    '{',
    '"classname" "func_bomb_target"',
    '"targetname" "bombsite_b"',
    createCubeBrush(160, 160, 0, 192, 192, 32),
    '}',
    '',
  ].join('\n');
}

function createCubeBrush(minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number) {
  return [
    '{',
    `( ${minX} ${minY} ${minZ} ) ( ${maxX} ${maxY} ${minZ} ) ( ${maxX} ${minY} ${minZ} ) DUSTWALL 0 0 0 1 1`,
    `( ${minX} ${minY} ${maxZ} ) ( ${maxX} ${minY} ${maxZ} ) ( ${maxX} ${maxY} ${maxZ} ) DUSTWALL 0 0 0 1 1`,
    `( ${minX} ${minY} ${minZ} ) ( ${minX} ${minY} ${maxZ} ) ( ${minX} ${maxY} ${maxZ} ) DUSTWALL 0 0 0 1 1`,
    `( ${maxX} ${minY} ${minZ} ) ( ${maxX} ${maxY} ${maxZ} ) ( ${maxX} ${minY} ${maxZ} ) DUSTWALL 0 0 0 1 1`,
    `( ${minX} ${minY} ${minZ} ) ( ${maxX} ${minY} ${maxZ} ) ( ${minX} ${minY} ${maxZ} ) DUSTWALL 0 0 0 1 1`,
    `( ${minX} ${maxY} ${minZ} ) ( ${minX} ${maxY} ${maxZ} ) ( ${maxX} ${maxY} ${maxZ} ) DUSTWALL 0 0 0 1 1`,
    '}',
  ].join('\n');
}

function writeVector(buffer: Buffer, offset: number, x: number, y: number, z: number) {
  buffer.writeFloatLE(x, offset);
  buffer.writeFloatLE(y, offset + 4);
  buffer.writeFloatLE(z, offset + 8);
}

function writeEdge(buffer: Buffer, offset: number, start: number, end: number) {
  buffer.writeUInt16LE(start, offset);
  buffer.writeUInt16LE(end, offset + 2);
}
