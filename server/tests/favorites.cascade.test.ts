// Schema-level tests for FK CASCADE on the favorites table.
// Contract: decisions.md §"Favorites data model — composite PK".
//
// We exercise the in-memory schema directly (no HTTP). This catches a class
// of bugs the API tests can't see: e.g. someone disabling `PRAGMA foreign_keys`
// or dropping the ON DELETE CASCADE clause during a future migration.

import { describe, it, expect, beforeEach } from 'vitest';
import { buildInMemoryDb, seedBasicFixture, type SeededFixture } from './helpers/testApp.js';

let fx: SeededFixture;

beforeEach(async () => {
  const db = await buildInMemoryDb();
  fx = await seedBasicFixture(db);
});

describe('favorites — FK CASCADE', () => {
  it('deletes favorites when the user is deleted', () => {
    const { db, users, products } = fx;
    db.prepare('INSERT INTO favorites (user_id, product_id) VALUES (?, ?)').run(
      users[0].id,
      products[0].id
    );
    db.prepare('INSERT INTO favorites (user_id, product_id) VALUES (?, ?)').run(
      users[0].id,
      products[1].id
    );

    db.prepare('DELETE FROM users WHERE id = ?').run(users[0].id);

    const remaining = db
      .prepare('SELECT COUNT(*) as n FROM favorites WHERE user_id = ?')
      .get(users[0].id) as { n: number };
    expect(remaining.n).toBe(0);
  });

  it('deletes favorites when the product is deleted', () => {
    const { db, users, products } = fx;
    db.prepare('INSERT INTO favorites (user_id, product_id) VALUES (?, ?)').run(
      users[0].id,
      products[0].id
    );
    db.prepare('INSERT INTO favorites (user_id, product_id) VALUES (?, ?)').run(
      users[1].id,
      products[0].id
    );

    db.prepare('DELETE FROM products WHERE id = ?').run(products[0].id);

    const remaining = db
      .prepare('SELECT COUNT(*) as n FROM favorites WHERE product_id = ?')
      .get(products[0].id) as { n: number };
    expect(remaining.n).toBe(0);
  });

  it('rejects orphan rows (FK enforcement on insert)', () => {
    const { db } = fx;
    expect(() =>
      db
        .prepare('INSERT INTO favorites (user_id, product_id) VALUES (?, ?)')
        .run(99999, 99999)
    ).toThrow();
  });

  it('composite PK forbids duplicate (user, product) rows', () => {
    const { db, users, products } = fx;
    db.prepare('INSERT INTO favorites (user_id, product_id) VALUES (?, ?)').run(
      users[0].id,
      products[0].id
    );
    expect(() =>
      db
        .prepare('INSERT INTO favorites (user_id, product_id) VALUES (?, ?)')
        .run(users[0].id, products[0].id)
    ).toThrow();
  });
});
