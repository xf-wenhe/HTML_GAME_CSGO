#!/usr/bin/env node
import {
  findDust2Source,
  formatMissingDust2SourceMessage,
  formatNonImportableDust2SourceMessage,
  getDust2SourceCandidates,
  inspectDust2Source,
  isImportableDust2SourceKind,
} from './lib/dust2-source-preflight.mjs';
import { createGoldSrcBspManifest, parseGoldSrcBspFile } from './lib/goldsrc-bsp.mjs';
import {
  writeDust2MeshResourceFromBsp,
  writeDust2MeshResourceFromMap,
  writeDust2MeshResourceModuleFromBsp,
  writeDust2MeshResourceModuleFromMap,
} from './lib/dust2-mesh-export.mjs';
import { readDust2GeneratedMeshResource, verifyDust2GeneratedMeshResource } from './lib/dust2-generated-verify.mjs';
import { createGoldSrcMapManifest, parseGoldSrcMapFile } from './lib/goldsrc-map.mjs';

const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check');
const sourceIndex = process.argv.indexOf('--source');
const explicitSourcePath = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : null;
const outIndex = process.argv.indexOf('--out');
const outPath = outIndex >= 0 ? process.argv[outIndex + 1] : null;
const outTsIndex = process.argv.indexOf('--out-ts');
const outTsPath = outTsIndex >= 0 ? process.argv[outTsIndex + 1] : null;

if (sourceIndex >= 0 && !explicitSourcePath) {
  console.error('Missing value for --source.');
  process.exit(1);
}

if (outIndex >= 0 && !outPath) {
  console.error('Missing value for --out.');
  process.exit(1);
}

if (outTsIndex >= 0 && !outTsPath) {
  console.error('Missing value for --out-ts.');
  process.exit(1);
}

const sourceOptions = explicitSourcePath ? { sourcePath: explicitSourcePath } : {};
const sourcePath = findDust2Source(sourceOptions);

if (!sourcePath) {
  console.error(formatMissingDust2SourceMessage(getDust2SourceCandidates(sourceOptions)));
  process.exit(2);
}

let inspection;
try {
  inspection = inspectDust2Source(sourcePath);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(3);
}

console.log(JSON.stringify(inspection, null, 2));

if (inspection.kind === 'bsp') {
  const parsedBsp = parseGoldSrcBspFile(inspection.path);
  console.log(JSON.stringify(createGoldSrcBspManifest(parsedBsp), null, 2));
} else if (inspection.kind === 'map') {
  const parsedMap = parseGoldSrcMapFile(inspection.path);
  console.log(JSON.stringify(createGoldSrcMapManifest(parsedMap), null, 2));
}

if (outPath || outTsPath) {
  if (!isImportableDust2SourceKind(inspection.kind)) {
    console.error(formatNonImportableDust2SourceMessage(inspection));
    process.exit(5);
  }

  const resource = inspection.kind === 'bsp'
    ? (outTsPath
        ? writeDust2MeshResourceModuleFromBsp(inspection.path, outTsPath)
        : writeDust2MeshResourceFromBsp(inspection.path, outPath))
    : (outTsPath
        ? writeDust2MeshResourceModuleFromMap(inspection.path, outTsPath)
        : writeDust2MeshResourceFromMap(inspection.path, outPath));
  const verification = outTsPath
    ? verifyDust2GeneratedMeshResource(readDust2GeneratedMeshResource(outTsPath))
    : verifyDust2GeneratedMeshResource(resource);
  console.log(JSON.stringify({
    wrote: outTsPath ?? outPath,
    verified: true,
    schema: resource.schema,
    vertexCount: verification.vertexCount,
    triangleCount: verification.triangleCount,
    hullCount: verification.hullCount,
    modelMeshCount: verification.modelMeshCount,
    exportedModelCount: verification.exportedModelCount,
    collisionModelCount: verification.collisionModelCount,
    entityCount: verification.entityCount,
    tSpawnCount: verification.tSpawnCount,
    ctSpawnCount: verification.ctSpawnCount,
    bombTargetCount: verification.bombTargetCount,
  }, null, 2));
  process.exit(0);
}

if (!checkOnly) {
  console.error(
    [
      '',
      'Dust2 source validation passed. Use --out <path> for JSON or --out-ts <path> to write the generated Dust2 module.',
      'Recommended: --out-ts client/src/game/generated/dust2-world-mesh.ts',
    ].join('\n')
  );
  process.exit(4);
}
