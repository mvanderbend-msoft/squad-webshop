// Vitest/vite cannot resolve `node:sqlite` (Node 22+ builtin). This stub
// is aliased in `vitest.config.ts` so test imports of `node:sqlite` go
// through here, where `createRequire` lets Node load the real builtin
// at runtime — bypassing vite's resolver entirely.
import { createRequire } from 'node:module';

const nodeRequire = createRequire(import.meta.url);
const sqlite = nodeRequire('node:sqlite');

export const DatabaseSync = sqlite.DatabaseSync;
export default sqlite;
