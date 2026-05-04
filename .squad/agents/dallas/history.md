# Project Context

- **Owner:** mvanderbend
- **Project:** squad-webshop — sample webshop, starting point for the Squad demo. Feature-complete *except* "Add to Favorites" (the live demo target).
- **Stack:** React 18 + Vite + TypeScript (client, port 5173), Node.js + Express + TypeScript (server, port 4000), SQLite via `node:sqlite` (Node 22+), JWT auth with `bcryptjs`, npm workspaces.
- **Created:** 2026-05-04

## Reminders

- **2026-05-04:** Rude-naming convention is team-wide policy (not Lambert-exclusive). All squad members should adopt for their internal identifiers (CSS classes, local vars, helpers, list keys). Excludes exported names, user-facing copy, routes, shared props.

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

### 2026-05-04 — Charter Rule Visibility

Charter rules buried in bullet lists alongside competing rules tend to get ignored — promote critical rules to their own top-level section with explicit conflict-resolution language.

### 2026-05-04 — PRD #1 Decomposition (Add to Favorites)

**What:** Decomposed the Favorites PRD into 9 child issues (#11–#19) across Parker (backend), Lambert (frontend), Ripley (testing), Dallas (docs).

**Dependency graph:**
```
#11 (DB migration)
 ├── #12 (CRUD endpoints) ──┬── #16 (/favorites page)
 │                          ├── #17 (backend tests)
 │                          └── #19 (docs)
 └── #13 (isFavorited)  ───┬── #15 (integrate button)
                            ├── #17 (backend tests)
                            └── #19 (docs)
#14 (FavoriteButton) ──────┬── #15 (integrate button)
                           ├── #16 (/favorites page)
                           └── #18 (frontend tests)
```

**Architecture decisions baked in:**
- `isFavorited` computed via LEFT JOIN in DB query layer (not response serializer) — avoids N+1 and waterfalls
- Composite PK `(user_id, product_id)` is the idempotency mechanism — no separate upsert logic needed
- Optional auth middleware pattern: extract userId if token present, otherwise null (don't 401 on product routes)
- No localStorage fallback for guests in v1; no pagination on /favorites in v1
- Existing labels (squad:rusty etc.) don't match our roster; created squad:parker, squad:lambert, squad:ripley, squad:dallas
