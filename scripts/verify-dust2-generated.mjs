#!/usr/bin/env node
import {
  readDust2GeneratedMeshResource,
  verifyDust2GeneratedMeshResource,
} from './lib/dust2-generated-verify.mjs';

const modulePath = process.argv[2] ?? 'client/src/game/generated/dust2-world-mesh.ts';

try {
  const resource = readDust2GeneratedMeshResource(modulePath);
  const summary = verifyDust2GeneratedMeshResource(resource);
  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}
