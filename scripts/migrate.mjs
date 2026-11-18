import { readFile, readdir } from 'node:fs/promises';
import pg from 'pg';
import { migrationVersion, pendingMigrations } from './migration-plan.mjs';
if (!process.env.DATABASE_URL?.trim()) {
  if (process.argv.includes('--if-configured') && !process.env.REDIS_URL?.trim()) {
    console.log('MIGRATION_SKIPPED_UI_ONLY');
    process.exit(0);
  }
  console.error('MIGRATION_DATABASE_URL_REQUIRED');
  process.exit(1);
}
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 5000 });
let client;
try {
  client = await pool.connect();
  // One deployment at a time may read and advance this database's schema.
  await client.query('SELECT pg_advisory_lock(hashtextextended($1, 0))', ['landing-zone:control-plane-schema']);
  const migrationsUrl = new URL('../migrations/', import.meta.url);
  const migrations = (await readdir(migrationsUrl))
    .filter(name => /^\d+_[a-z0-9_]+\.sql$/.test(name))
    .sort();
  if (migrations.length === 0 || migrationVersion(migrations[0]) !== 1) throw new Error('INITIAL_MIGRATION_REQUIRED');

  // Migration 001 bootstraps schema_versions and is idempotent. Once that
  // registry exists, never replay an applied historical migration: a former
  // constraint can be incompatible with data admitted by a later version.
  await client.query(await readFile(new URL(migrations[0], migrationsUrl), 'utf8'));
  const applied = new Set((await client.query('SELECT version FROM schema_versions')).rows.map(row => Number(row.version)));
  for (const migration of pendingMigrations(migrations.slice(1), applied)) {
    await client.query(await readFile(new URL(migration, migrationsUrl), 'utf8'));
    await client.query('INSERT INTO schema_versions(version) VALUES ($1) ON CONFLICT DO NOTHING', [migrationVersion(migration)]);
  }
  console.log('MIGRATION_COMPLETE');
} catch { console.error('MIGRATION_FAILED'); process.exitCode = 1; }
finally {
  // Closing this session releases the advisory lock and rolls back any open transaction.
  client?.release(true);
  await pool.end().catch(() => {});
}
