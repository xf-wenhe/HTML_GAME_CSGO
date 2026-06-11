#!/usr/bin/env node
import { loadDust2SourceResource } from './lib/dust2-source-resource.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourcePath = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;

if (sourceIndex >= 0 && !sourcePath) {
  console.error('Missing value for --source.');
  process.exit(1);
}

try {
  const { summary } = loadDust2SourceResource({ sourcePath });
  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}
