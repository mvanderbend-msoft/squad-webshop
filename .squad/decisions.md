# Squad Decisions

## Active Decisions

### Add to Favorites — PRD & Data Model

**Date:** 2026-05-04  
**Author:** Danny (Lead)  
**Issue:** [#1 — [PRD] Add to Favorites](https://github.com/mvanderbend-msoft/squad-webshop/issues/1)  
**Status:** Accepted

#### 1. Favorites data model — composite PK

The `favorites` table uses a composite primary key on `(user_id, product_id)`. This is the source of truth for idempotency — no separate unique constraint is needed. FKs to `users` and `products`. Index on `user_id` for fast per-user queries. Forward-only SQLite migration.

```sql
CREATE TABLE favorites (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, product_id)
);
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
```

#### 2. `isFavorited` on product responses

All product API responses (list and detail) include `isFavorited: boolean` for the authenticated requesting user. This avoids waterfall requests on list pages. For unauthenticated users the field is always `false`. The value is computed via a DB join in the query layer, not the response serializer.

#### 3. v1 requires authentication

Guest favorites (localStorage fallback + merge-on-login) are explicitly out of scope for v1. The architecture does not block this being added later.

### Favorites Work Breakdown

**Date:** 2026-05-04  
**Author:** Danny (Lead)  
**Status:** Accepted

PRD #1 ([Add to Favorites](https://github.com/mvanderbend-msoft/squad-webshop/issues/1)) has been decomposed into five child work items (#2–#6).

#### Work Breakdown

| Issue | Title | Owner | Priority |
|-------|-------|-------|----------|
| #2 | [Favorites] Database — favorites table & migration | `squad:rusty` | p1 |
| #3 | [Favorites] Backend — REST API (list/add/remove + isFavorited) | `squad:rusty` | p1 |
| #4 | [Favorites] Frontend — FavoriteButton component & /favorites page | `squad:linus` | p2 |
| #5 | [Favorites] Tests — integration & component coverage | `squad:saul` | p2 |
| #6 | [Favorites] Docs — README + API reference update | `squad:danny` | p2 |

#### Dependency Order

DB (#2) → API (#3) → UI (#4). Tests (#5) track all three in parallel — API tests land after #3, component/page tests after #4. Docs (#6) go last.

#### Priority Rationale

Database and Backend are `priority:p1` because the entire feature is blocked on them — Frontend, Tests, and Docs cannot proceed without the data layer and API. The remaining three are `priority:p2`.

#### Conventions

- Child issues use `Refs #1` (not `Closes #1`) so the parent PRD stays open until all children are merged.
- All child issues follow the work-item template (`.github/ISSUE_TEMPLATE/work-item.md`).
- Branch naming: `squad/<issue-number>-<short-slug>`.

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
