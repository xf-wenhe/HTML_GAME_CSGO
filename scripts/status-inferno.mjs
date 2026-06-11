import path from 'node:path';
import {
  findInfernoSource,
  formatMissingInfernoSourceMessage,
  formatNonImportableInfernoSourceMessage,
  getInfernoSourceCandidates,
  inspectInfernoSource,
  isImportableInfernoSourceKind,
} from './lib/inferno-source-preflight.mjs';
import { readInfernoGeneratedMeshResource, verifyInfernoGeneratedMeshResource } from './lib/inferno-generated-verify.mjs';

export const DEFAULT_INFERNO_GENERATED_MODULE = 'client/src/game/generated/inferno-world-mesh.ts';

export function createInfernoStatus({ cwd = process.cwd(), env = process.env, sourcePath, generatedModule = DEFAULT_INFERNO_GENERATED_MODULE } = {}) {
  const sourceOptions = { cwd, env, sourcePath };
  const sourceCandidates = getInfernoSourceCandidates(sourceOptions);
  const discoveredSource = findInfernoSource(sourceOptions);
  const status = {
    sourceBacked: false,
    classicInfernoStrict: false,
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
      message: formatMissingInfernoSourceMessage(sourceCandidates),
    });
  } else {
    try {
      const inspection = inspectInfernoSource(discoveredSource);
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
        passed: isImportableInfernoSourceKind(inspection.kind),
        message: isImportableInfernoSourceKind(inspection.kind)
          ? `Source kind ${inspection.kind} can be imported into Inferno mesh resource.`
          : formatNonImportableInfernoSourceMessage(inspection),
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
    const resource = readInfernoGeneratedMeshResource(status.generated.path);
    status.generated.present = true;
    status.generated.summary = verifyInfernoGeneratedMeshResource(resource);
    status.generated.valid = true;
    status.gates.push({
      id: 'generated-resource',
      passed: true,
      message: `Generated resource is source-backed: ${status.generated.summary.sourcePath}`,
    });
    status.gates.push(...createStrictInfernoGates(resource, status.generated.summary, discoveredSource));
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
  status.classicInfernoStrict = status.sourceBacked
    && status.gates.filter(gate => gate.id.startsWith('strict-')).every(gate => gate.passed);
  status.nextAction = status.classicInfernoStrict
    ? 'Run npm run inferno:screenshots for source-backed screenshot verification.'
    : 'Provide a legal original CS1.6 de_inferno.bsp or de_inferno.map, or convert de_inferno.rmf to de_inferno.map, run npm run inferno:import, then re-run npm run inferno:status.';

  return status;
}

function createStrictInfernoGates(resource, summary, discoveredSource) {
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
      message: `Exported ${summary.exportedModelCount} renderable source models, ${summary.vertexCount} vertices, ${summary.triangleCount} triangles.`,
    },
    {
      id: 'strict-map-scale',
      passed: summary.vertexCount >= 1000 && summary.triangleCount >= 1000,
      message: `Expected source-scale Inferno geometry (>=1000 vertices and triangles), found ${summary.vertexCount} vertices and ${summary.triangleCount} triangles.`,
    },
    {
      id: 'strict-collision-hulls',
      passed: Array.isArray(geometry.collision?.modelHullSummaries)
        && geometry.collision.modelHullSummaries.length >= summary.collisionModelCount
        && ((geometry.collision.brushSolidCount ?? 1) > 0),
      message: `Collision summaries: ${geometry.collision?.modelHullSummaries?.length ?? 0}; collision source models: ${summary.collisionModelCount}; solid MAP brushes: ${geometry.collision?.brushSolidCount ?? 'n/a'}.`,
    },
  ];
}
