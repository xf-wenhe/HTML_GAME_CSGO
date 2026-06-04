import path from 'node:path';
import {
  findDust2Source,
  formatMissingDust2SourceMessage,
  formatNonImportableDust2SourceMessage,
  getDust2SourceCandidates,
  inspectDust2Source,
  isImportableDust2SourceKind,
} from './dust2-source-preflight.mjs';
import {
  readDust2GeneratedMeshResource,
  verifyDust2GeneratedMeshResource,
} from './dust2-generated-verify.mjs';

export const DEFAULT_DUST2_GENERATED_MODULE = 'client/src/game/generated/dust2-world-mesh.ts';

export function createDust2Status({ cwd = process.cwd(), env = process.env, sourcePath, generatedModule = DEFAULT_DUST2_GENERATED_MODULE } = {}) {
  const sourceOptions = { cwd, env, sourcePath };
  const sourceCandidates = getDust2SourceCandidates(sourceOptions);
  const discoveredSource = findDust2Source(sourceOptions);
  const status = {
    sourceBacked: false,
    classicDust2Strict: false,
    source: {
      found: false,
      path: discoveredSource,
      candidates: sourceCandidates,
    },
    generated: {
      path: path.resolve(cwd, generatedModule),
      present: false,
      valid: false,
      summary: null,
    },
    gates: [],
    nextAction: null,
  };

  if (!discoveredSource) {
    status.gates.push({
      id: 'source-file',
      passed: false,
      message: formatMissingDust2SourceMessage(sourceCandidates),
    });
  } else {
    try {
      const inspection = inspectDust2Source(discoveredSource);
      status.source = {
        ...status.source,
        found: true,
        inspection,
      };
      status.gates.push({
        id: 'source-file',
        passed: true,
        message: `Found source file: ${discoveredSource}`,
      });
      status.gates.push({
        id: 'source-importable',
        passed: isImportableDust2SourceKind(inspection.kind),
        message: isImportableDust2SourceKind(inspection.kind)
          ? `Source kind ${inspection.kind} can be imported into Dust2 mesh resource.`
          : formatNonImportableDust2SourceMessage(inspection),
      });
    } catch (error) {
      status.gates.push({
        id: 'source-file',
        passed: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  try {
    const resource = readDust2GeneratedMeshResource(status.generated.path);
    status.generated.present = true;
    status.generated.summary = verifyDust2GeneratedMeshResource(resource);
    status.generated.valid = true;
    status.gates.push({
      id: 'generated-resource',
      passed: true,
      message: `Generated resource is source-backed: ${status.generated.summary.sourcePath}`,
    });
    status.gates.push(...createStrictDust2Gates(resource, status.generated.summary, discoveredSource));
  } catch (error) {
    status.gates.push({
      id: 'generated-resource',
      passed: false,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  status.sourceBacked = status.gates.find(gate => gate.id === 'source-file')?.passed === true
    && status.gates.find(gate => gate.id === 'source-importable')?.passed !== false
    && status.gates.find(gate => gate.id === 'generated-resource')?.passed === true;
  status.classicDust2Strict = status.sourceBacked
    && status.gates.filter(gate => gate.id.startsWith('strict-')).every(gate => gate.passed);
  status.nextAction = status.classicDust2Strict
    ? 'Run npm run dust2:screenshots for source-backed screenshot verification.'
    : 'Provide a legal original CS1.6 de_dust2.bsp or de_dust2.map, or convert de_dust2.rmf to de_dust2.map, run npm run dust2:import, then re-run npm run dust2:status.';

  return status;
}

function createStrictDust2Gates(resource, summary, discoveredSource) {
  const entities = resource.source.manifest.entities;
  const geometry = resource.source.manifest.geometry;
  const sourcePathMatches = !discoveredSource || path.resolve(discoveredSource) === path.resolve(summary.sourcePath);
  const structuralBrushCount = entities.brushEntities?.filter(entity => entity.brushKind === 'structural').length ?? 0;
  const triggerBrushCount = entities.brushEntities?.filter(entity => entity.brushKind === 'trigger').length ?? 0;

  return [
    {
      id: 'strict-source-match',
      passed: sourcePathMatches,
      message: sourcePathMatches
        ? 'Generated resource source path matches the discovered source file.'
        : `Generated source path ${summary.sourcePath} does not match discovered source ${discoveredSource}.`,
    },
    {
      id: 'strict-bomb-sites',
      passed: summary.bombTargetCount >= 2,
      message: `Expected at least 2 source bomb target entities, found ${summary.bombTargetCount}.`,
    },
    {
      id: 'strict-structural-brushes',
      passed: structuralBrushCount > 0 && triggerBrushCount > 0,
      message: `Structural brush entities: ${structuralBrushCount}; trigger brush entities preserved but not exported: ${triggerBrushCount}.`,
    },
    {
      id: 'strict-exported-models',
      passed: summary.exportedModelCount > 0 && summary.vertexCount > 0 && summary.triangleCount > 0,
      message: `Exported ${summary.exportedModelCount} structural source models, ${summary.vertexCount} vertices, ${summary.triangleCount} triangles.`,
    },
    {
      id: 'strict-map-scale',
      passed: summary.vertexCount >= 1000 && summary.triangleCount >= 1000,
      message: `Expected source-scale Dust2 geometry (>=1000 vertices and triangles), found ${summary.vertexCount} vertices and ${summary.triangleCount} triangles.`,
    },
    {
      id: 'strict-collision-hulls',
      passed: Array.isArray(geometry.collision?.modelHullSummaries)
        && geometry.collision.modelHullSummaries.length >= summary.exportedModelCount
        && ((geometry.collision.brushSolidCount ?? 1) > 0),
      message: `Collision summaries: ${geometry.collision?.modelHullSummaries?.length ?? 0}; solid MAP brushes: ${geometry.collision?.brushSolidCount ?? 'n/a'}.`,
    },
  ];
}
