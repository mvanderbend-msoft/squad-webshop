import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Vite (vitest's bundler) cannot resolve the `node:sqlite` builtin, so we
// alias it to a tiny stub that re-imports it via `createRequire` at
// runtime — see src/__tests__/node-sqlite-stub.ts.
const sqliteStub = fileURLToPath(
  new URL('./src/__tests__/node-sqlite-stub.ts', import.meta.url)
);

export default defineConfig({
  resolve: {
    alias: {
      'node:sqlite': sqliteStub,
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    testTimeout: 15000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});




