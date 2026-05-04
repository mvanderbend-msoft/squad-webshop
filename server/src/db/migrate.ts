import type { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrationsDir = join(__dirname, 'migrations');

/**
 * Forward-only migration runner.
 * Each `.sql` file in ./migrations is applied once, in lexicographic order,
 * and recorded in the `schema_migrations` table. No rollback.
 */
export function runMigrations(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const applied = new Set(
    (db.prepare('SELECT name FROM schema_migrations').all() as { name: string }[]).map(
      (r) => r.name,
    ),
  );

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const insert = db.prepare('INSERT INTO schema_migrations (name) VALUES (?)');

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    db.exec('BEGIN');
    try {
      db.exec(sql);
      insert.run(file);
      db.exec('COMMIT');
      console.log(`[db] Applied migration: ${file}`);
    } catch (err) {
      db.exec('ROLLBACK');
      throw new Error(`Migration failed: ${file} — ${(err as Error).message}`);
    }
  }
}
