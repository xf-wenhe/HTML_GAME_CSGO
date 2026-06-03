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
} from '../../../../scripts/lib/dust2-mesh-export.mjs';
import {
  parseDust2GeneratedMeshModule,
  verifyDust2GeneratedMeshResource,
} from '../../../../scripts/lib/dust2-generated-verify.mjs';

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
    expect(parsed.entities).toHaveLength(4);
    expect(manifest.worldspawnPresent).toBe(true);
    expect(manifest.entities).toMatchObject({
      entityCount: 4,
      classCounts: {
        worldspawn: 1,
        info_player_start: 1,
        info_player_deathmatch: 1,
        func_bomb_target: 1,
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
          model: '*1',
          targetname: 'bombsite_a',
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
      modelCount: 1,
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
        path: '/legal/cstrike/maps/de_dust2.bsp',
        manifest: {
          geometry: {
            worldMeshVertexCount: 4,
            worldMeshTriangleCount: 2,
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
        ],
        indices: [0, 1, 2, 0, 2, 3],
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

    expect(resource.mesh.positions).toHaveLength(4);
    expect(resource.mesh.indices).toEqual([0, 1, 2, 0, 2, 3]);
    expect(moduleSource).toContain('export const DUST2_WORLD_MESH_RESOURCE: Dust2WorldMeshResource | null =');
    expect(moduleSource).toContain(`"path": "${source}"`);
    expect(moduleSource).toContain('"worldMeshTriangleCount": 2');
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
    expect(output).toContain('"vertexCount": 4');
    expect(moduleSource).toContain(`"path": "${source}"`);
    expect(verifyDust2GeneratedMeshResource(parseDust2GeneratedMeshModule(moduleSource))).toMatchObject({
      sourcePath: source,
      vertexCount: 4,
      triangleCount: 2,
      hullCount: 4,
    });
  });

  it('refuses Dust2 screenshots until a source-backed generated resource exists', () => {
    expect(() =>
      execFileSync(
        'node',
        ['scripts/screenshot-dust2.mjs'],
        { cwd: process.cwd(), encoding: 'utf8', stdio: 'pipe' }
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
      vertexCount: 4,
      triangleCount: 2,
      hullCount: 4,
      entityCount: 4,
      tSpawnCount: 1,
      ctSpawnCount: 1,
      bombTargetCount: 1,
    });
    expect(() => verifyDust2GeneratedMeshResource(null)).toThrow(/resource is null/);
    expect(() =>
      verifyDust2GeneratedMeshResource({
        ...resource,
        mesh: {
          ...resource.mesh,
          indices: [0, 1, 2],
        },
      })
    ).toThrow(/indices do not match/);
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

  const models = Buffer.alloc(GOLD_SRC_BSP_STRUCT_SIZES.model);
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
      '"classname" "func_bomb_target"',
      '"model" "*1"',
      '"targetname" "bombsite_a"',
      '}',
      '',
    ].join('\n'),
    'latin1'
  );
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
