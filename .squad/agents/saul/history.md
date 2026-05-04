# Project Context

- **Project:** squad-webshop — a small e-commerce app
- **Stack:** React (client), Node.js + Express (server), SQLite (database)
- **Created:** 2026-05-04

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

- **PRD #1:** Add to Favorites feature — data model, API, UI coordination. See decisions.md for details.
- **Assigned:** #5 (Test coverage integration & components) — p2 priority. See decisions.md work breakdown.

### 2026-05-04 — Favorites tests (#5 → draft PR)

- **Test infra was empty.** No Vitest/Jest/supertest in the repo. Bootstrapped Vitest in both workspaces; supertest on `server`; `@testing-library/react` + jsdom on `client`. Added `test` and `test:watch` scripts to both workspace `package.json` files; the root `npm test` already fans out via `npm --workspaces --if-present run test`.
- **Stack uses `node:sqlite`** (Node ≥ 22.5, experimental built-in) rather than `better-sqlite3`. `DatabaseSync(':memory:')` works for in-memory fixtures. Schema bootstrap reads `server/src/db/schema.sql`; the favorites table DDL is duplicated in the test helper for now and should move into schema.sql once Rusty's #2 lands.
- **Vitest + Vite gotcha #1 — `node:` imports.** Vite's transform pipeline can't statically resolve `node:sqlite` (and likely other `node:` built-ins). `import { DatabaseSync } from 'node:sqlite'` blows up with "Failed to load url sqlite". Workaround: `createRequire(import.meta.url)('node:sqlite')`. `pool: 'forks'` + `server.deps.external: [/^node:/]` did **not** fix it on its own.
- **Vitest + Vite gotcha #2 — probing optional modules.** `await import('../FavoriteButton')` is rejected at transform time when the file doesn't exist, *even inside a try/catch*. `/* @vite-ignore */` alone wasn't enough; building the specifier from a runtime concat (`'../' + 'Favorites'`) skips static resolution. This is the trick that lets contract-first tests skip cleanly until the implementation lands.
- **Auth pattern:** Bearer JWT signed with `process.env.JWT_SECRET || 'dev-secret-change-me'`. Tests must mint tokens with the same fallback secret; the auth middleware lives at `server/src/middleware/auth.ts` and rejects malformed tokens with 401.
- **Edge cases worth pinning to tests on this PRD:**
  - POST/DELETE idempotency on `/api/favorites/:productId` (composite PK is the source of truth — test that a duplicate INSERT throws *and* that the API converts it to a 200).
  - `isFavorited` per-user isolation (Alice favoriting must not flip Bob's flag) and falsiness for unauthenticated GETs.
  - FK `ON DELETE CASCADE` survives migrations — a schema-level test catches accidental drops of the cascade clause.
  - Non-numeric `:productId` must be 4xx, never 5xx.
  - FavoriteButton: optimistic update *and* its rollback path; rapid double-click must not double-fire; keyboard activation (Space) must work too.
  - `/favorites` page: loading, error, empty, populated — and the unauth path must never call the API.
- **Proposed test seam:** `server/src/app.ts` should export `createApp(db)` so tests can inject an in-memory SQLite handle. Filed as `.squad/decisions/inbox/saul-favorites-tests.md` for the Scribe to merge into the shared decisions doc.
- **Pipeline strategy:** because #3 (API) and #4 (UI) are not merged, all contract tests `describe.skip` themselves when the target module is missing. CI stays green. The cascade tests run today (4 passing) because they only depend on the schema.
