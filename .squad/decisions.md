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

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
