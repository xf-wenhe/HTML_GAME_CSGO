import { createInfernoStatus } from './lib/inferno-status.mjs';
const status = createInfernoStatus();
if (!status.sourceBacked) {
  console.error(JSON.stringify(status, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(status, null, 2));
