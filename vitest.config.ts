import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['client/src/test/setupCanvas.ts'],
    include: ['client/src/**/*.test.ts', 'server/**/*.test.ts'],
    exclude: [
      'client/src/game/generated/**',
      'client/src/game/source/**',
      'claude-mem/**',
      'dist/**',
      'node_modules/**',
      'tests/e2e/**'
    ]
  }
});
