# Saul — Favorites tests (#5)

**Date:** 2026-05-04
**Author:** Saul (Tester)
**Status:** Proposed
**Issue:** [#5](https://github.com/mvanderbend-msoft/squad-webshop/issues/5) — depends on #3 (API), #4 (UI)

## 1. Express app factory — `createApp(db)`

To run integration tests against an **in-memory** SQLite handle (per the AC on #5: "API tests use in-memory SQLite, not the production DB"), the server needs a testing seam. Today `server/src/index.ts` mixes module-level DB init, route mounting, and `app.listen` — there's no way to inject a different DB.

**Proposal:**

```ts
// server/src/app.ts
import type { DatabaseSync } from 'node:sqlite';
import express, { Express } from 'express';

export function createApp(db: DatabaseSync): Express {
  const app = express();
  app.use(express.json());
  app.use(cors({ /* ... */ }));
  app.use('/api/auth',       authRouter(db));
  app.use('/api/products',   productsRouter(db));
  app.use('/api/categories', categoriesRouter(db));
  app.use('/api/cart',       cartRouter(db));
  app.use('/api/orders',     ordersRouter(db));
  app.use('/api/favorites',  favoritesRouter(db));
  return app;
}
```

`server/src/index.ts` becomes a thin entrypoint:

```ts
import { db } from './db/connection.js';
import { createApp } from './app.js';
const app = createApp(db);
app.listen(PORT, ...);
```

Each router becomes a factory that takes `db`. This is a small refactor of existing routers (they currently import the singleton `db` from `connection.js`).

**Why this matters for tests:**

- `tests/helpers/testApp.ts` calls `createApp(buildInMemoryDb())` per test, giving each test a clean DB.
- No global state leaks between tests (no shared file DB, no WAL files in `server/data/`).
- Production behavior is unchanged — `index.ts` keeps using the existing file-backed DB.

## 2. JWT secret in tests

Tests mint their own JWTs using the same `JWT_SECRET` fallback (`'dev-secret-change-me'`) as the middleware. If/when the secret becomes mandatory in production, the test helper should pull it from `process.env.JWT_SECRET` so CI can override it.

## 3. `node:sqlite` cannot be statically imported under Vitest

`import { DatabaseSync } from 'node:sqlite'` fails Vite's transform step ("Failed to load url sqlite"). The workaround that works today is:

```ts
import { createRequire } from 'node:module';
const requireFromHere = createRequire(import.meta.url);
const { DatabaseSync } = requireFromHere('node:sqlite');
```

Anyone writing future server tests should reuse `server/tests/helpers/testApp.ts` rather than re-discovering this.

## 4. Test layout

- `server/tests/` — integration tests (supertest)
- `server/tests/helpers/` — shared fixtures
- `client/src/components/__tests__/` and `client/src/pages/__tests__/` — co-located component/page tests (matches issue #5's "Files likely to change" list)

## 5. Contract-first / skip-when-missing

Until #3 and #4 merge, contract tests use `describe.skip` if their target module is absent. Trade-off: the suite currently reports 17 skipped tests on `server` and 13 on `client`, but the pipeline stays green. Once the implementations land, `appAvailable` / `componentAvailable` flips to `true` and the assertions execute as written.
