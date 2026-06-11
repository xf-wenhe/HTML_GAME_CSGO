#!/usr/bin/env node
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadDust2SourceResource } from './lib/dust2-source-resource.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourcePath = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (sourceIndex >= 0 && !sourcePath) {
  console.error('Missing value for --source.');
  process.exit(1);
}

const tempDir = mkdtempSync(join(tmpdir(), 'dust2-source-render-'));
const resourcePath = join(tempDir, 'dust2-resource.json');

try {
  const { resource } = loadDust2SourceResource({ sourcePath });
  writeFileSync(resourcePath, `${JSON.stringify(resource)}\n`);

  const result = spawnSync('python3', ['scripts/render-dust2-software.py'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DUST2_RESOURCE_JSON: resourcePath,
    },
    encoding: 'utf8',
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
