#!/usr/bin/env node
import { createDust2Status, DEFAULT_DUST2_GENERATED_MODULE } from './lib/dust2-status.mjs';

const sourceIndex = process.argv.indexOf('--source');
const generatedIndex = process.argv.indexOf('--generated');
const sourcePath = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
const generatedModule = generatedIndex >= 0 ? process.argv[generatedIndex + 1] : DEFAULT_DUST2_GENERATED_MODULE;

if (sourceIndex >= 0 && !sourcePath) {
  console.error('Missing value for --source.');
  process.exit(2);
}

if (generatedIndex >= 0 && !generatedModule) {
  console.error('Missing value for --generated.');
  process.exit(2);
}

const status = createDust2Status({ sourcePath, generatedModule });
console.log(JSON.stringify(status, null, 2));
process.exit(status.classicDust2Strict ? 0 : 2);
