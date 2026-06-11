import {
  findDust2Source,
  formatMissingDust2SourceMessage,
  getDust2SourceCandidates,
  inspectDust2Source,
  isImportableDust2SourceKind,
  formatNonImportableDust2SourceMessage,
} from './dust2-source-preflight.mjs';
import { createDust2MeshResource } from './dust2-mesh-export.mjs';
import { parseGoldSrcBspFile } from './goldsrc-bsp.mjs';
import { parseGoldSrcMapFile } from './goldsrc-map.mjs';
import { verifyDust2GeneratedMeshResource } from './dust2-generated-verify.mjs';

export function loadDust2SourceResource({ cwd = process.cwd(), env = process.env, sourcePath } = {}) {
  const sourceOptions = { cwd, env, sourcePath };
  const discoveredSource = findDust2Source(sourceOptions);
  if (!discoveredSource) {
    throw new Error(formatMissingDust2SourceMessage(getDust2SourceCandidates(sourceOptions)));
  }

  const inspection = inspectDust2Source(discoveredSource);
  if (!isImportableDust2SourceKind(inspection.kind)) {
    throw new Error(formatNonImportableDust2SourceMessage(inspection));
  }

  const parsedSource = inspection.kind === 'bsp'
    ? parseGoldSrcBspFile(inspection.path)
    : parseGoldSrcMapFile(inspection.path);
  const resource = createDust2MeshResource(parsedSource);
  const summary = verifyDust2GeneratedMeshResource(resource);

  return {
    sourcePath: discoveredSource,
    inspection,
    resource,
    summary,
  };
}
