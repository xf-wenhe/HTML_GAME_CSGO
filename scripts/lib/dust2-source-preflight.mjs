import fs from 'node:fs';
import path from 'node:path';

export const SUPPORTED_DUST2_SOURCE_EXTENSIONS = new Set(['.bsp', '.map', '.rmf']);
export const IMPORTABLE_DUST2_SOURCE_KINDS = new Set(['bsp', 'map']);
export const GOLD_SRC_BSP_VERSION = 30;

export function isImportableDust2SourceKind(kind) {
  return IMPORTABLE_DUST2_SOURCE_KINDS.has(kind);
}

export function formatNonImportableDust2SourceMessage(inspection) {
  if (inspection?.kind === 'rmf') {
    return [
      'CS1.6 Dust2 RMF source was found, but RMF mesh export is not implemented in this pipeline.',
      'Convert de_dust2.rmf to de_dust2.map with a legal Worldcraft/Hammer-compatible tool, or provide the original de_dust2.bsp.',
      `Found RMF: ${inspection.path}`,
    ].join('\n');
  }

  return `Dust2 source kind is not importable: ${inspection?.kind ?? '<missing>'}`;
}

const DEFAULT_RELATIVE_CANDIDATES = [
  'de_dust2.bsp',
  'de_dust2.map',
  'de_dust2.rmf',
  'cstrike/maps/de_dust2.bsp',
  'cstrike/maps/de_dust2.map',
  'cstrike/maps/de_dust2.rmf',
  'valve/cstrike/maps/de_dust2.bsp',
  'valve/cstrike/maps/de_dust2.map',
  'valve/cstrike/maps/de_dust2.rmf',
];

export function getDust2SourceCandidates({ cwd = process.cwd(), env = process.env, sourcePath } = {}) {
  const candidates = [];

  if (sourcePath) {
    candidates.push(path.resolve(cwd, sourcePath));
  }

  if (env.DUST2_SOURCE) {
    candidates.push(path.resolve(cwd, env.DUST2_SOURCE));
  }

  const roots = [
    cwd,
    env.CS16_ROOT,
    env.STEAM_LIBRARY,
    env.HOME && path.join(env.HOME, 'Library/Application Support/Steam/steamapps/common/Half-Life'),
    env.HOME && path.join(env.HOME, '.steam/steam/steamapps/common/Half-Life'),
  ].filter(Boolean);

  for (const root of roots) {
    for (const relative of DEFAULT_RELATIVE_CANDIDATES) {
      candidates.push(path.resolve(root, relative));
    }
  }

  return [...new Set(candidates)];
}

export function findDust2Source(options = {}) {
  const candidates = getDust2SourceCandidates(options);
  return candidates.find(candidate => fs.existsSync(candidate)) ?? null;
}

export function inspectDust2Source(sourcePath) {
  const absolutePath = path.resolve(sourcePath);
  const ext = path.extname(absolutePath).toLowerCase();

  if (!SUPPORTED_DUST2_SOURCE_EXTENSIONS.has(ext)) {
    throw new Error(`Unsupported Dust2 source extension "${ext}". Expected .bsp, .map, or .rmf.`);
  }

  if (path.basename(absolutePath).toLowerCase() !== `de_dust2${ext}`) {
    throw new Error(`Dust2 source must be named de_dust2${ext}: ${absolutePath}`);
  }

  const stat = fs.statSync(absolutePath);
  if (!stat.isFile()) {
    throw new Error(`Dust2 source is not a file: ${absolutePath}`);
  }

  if (ext === '.bsp') {
    return inspectGoldSrcBsp(absolutePath, stat.size);
  }

  if (ext === '.map') {
    return inspectGoldSrcMap(absolutePath, stat.size);
  }

  return inspectWorldcraftRmf(absolutePath, stat.size);
}

function inspectGoldSrcBsp(filePath, size) {
  const header = Buffer.alloc(4);
  const fd = fs.openSync(filePath, 'r');
  try {
    fs.readSync(fd, header, 0, header.length, 0);
  } finally {
    fs.closeSync(fd);
  }

  const version = header.readInt32LE(0);
  if (version !== GOLD_SRC_BSP_VERSION) {
    throw new Error(`Not a GoldSrc BSP v${GOLD_SRC_BSP_VERSION}: ${filePath} has BSP version ${version}.`);
  }

  return {
    kind: 'bsp',
    engine: 'goldsrc',
    version,
    path: filePath,
    size,
  };
}

function inspectGoldSrcMap(filePath, size) {
  const sample = fs.readFileSync(filePath, 'utf8').slice(0, 8192);
  const hasWorldspawn = /"classname"\s+"worldspawn"/.test(sample);
  const hasBrushPlane = /\(\s*-?\d/.test(sample) && /\)\s*\(\s*-?\d/.test(sample);

  if (!hasWorldspawn || !hasBrushPlane) {
    throw new Error(`MAP file does not look like a GoldSrc brush source with worldspawn: ${filePath}`);
  }

  return {
    kind: 'map',
    engine: 'goldsrc',
    path: filePath,
    size,
  };
}

function inspectWorldcraftRmf(filePath, size) {
  const header = Buffer.alloc(64);
  const fd = fs.openSync(filePath, 'r');
  try {
    fs.readSync(fd, header, 0, header.length, 0);
  } finally {
    fs.closeSync(fd);
  }

  const signature = header.toString('latin1').replace(/\0+$/g, '');
  if (!signature.includes('Worldcraft') && !signature.includes('RMF')) {
    throw new Error(`RMF file does not expose a recognizable Worldcraft/RMF header: ${filePath}`);
  }

  return {
    kind: 'rmf',
    engine: 'goldsrc',
    path: filePath,
    size,
  };
}

export function formatMissingDust2SourceMessage(candidates) {
  const candidateList = candidates.map(candidate => `  - ${candidate}`).join('\n');
  return [
    'Missing CS1.6 de_dust2 source file.',
    '',
    '1:1 Dust2 reconstruction is blocked until a legal original source file is available.',
    'Set DUST2_SOURCE=/absolute/path/to/de_dust2.bsp, .map, or .rmf, or place it in one of these locations:',
    candidateList,
  ].join('\n');
}
