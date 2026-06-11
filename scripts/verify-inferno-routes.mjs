#!/usr/bin/env node
import {
  readInfernoGeneratedMeshResource,
  verifyInfernoGeneratedMeshResource,
} from './lib/inferno-generated-verify.mjs';

const GENERATED_RESOURCE_PATH = process.env.INFERNO_GENERATED_MODULE ?? 'client/src/game/generated/inferno-world-mesh.ts';

async function main() {
  const resource = readInfernoGeneratedMeshResource(GENERATED_RESOURCE_PATH);
  const summary = verifyInfernoGeneratedMeshResource(resource);
  console.log(JSON.stringify({
    status: 'ready',
    sourcePath: summary.sourcePath,
    vertexCount: summary.vertexCount,
    triangleCount: summary.triangleCount,
    entityCount: summary.entityCount,
    tSpawnCount: summary.tSpawnCount,
    ctSpawnCount: summary.ctSpawnCount,
    bombTargetCount: summary.bombTargetCount,
    exportedModelCount: summary.exportedModelCount,
    collisionModelCount: summary.collisionModelCount,
  }, null, 2));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
});
