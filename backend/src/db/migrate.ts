import fs from 'fs';
import path from 'path';
import { getPool, disconnectDatabase } from '../config/database';
import { config } from '../config';

export async function runMigrations(): Promise<void> {
  console.log('[DevParcel Migrations] Initializing database migration runner...');

  if (!config.databaseUrl) {
    throw new Error(
      '[DevParcel Migrations] DATABASE_URL is not set in environment. Cannot execute migrations.'
    );
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    // 1. Create schema_migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Discover migration SQL files
    const migrationsDir = path.resolve(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.warn('[DevParcel Migrations] No migrations directory found at:', migrationsDir);
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    // 3. Query already applied migrations
    const appliedResult = await client.query(`SELECT name FROM schema_migrations;`);
    const appliedNames = new Set(appliedResult.rows.map((r) => r.name));

    let executedCount = 0;

    for (const file of files) {
      if (appliedNames.has(file)) {
        console.log(`[DevParcel Migrations] Skipping already applied migration: ${file}`);
        continue;
      }

      console.log(`[DevParcel Migrations] Executing migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      // Execute in a transaction
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO schema_migrations (name) VALUES ($1);`,
          [file]
        );
        await client.query('COMMIT');
        executedCount++;
        console.log(`[DevParcel Migrations] Successfully applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[DevParcel Migrations] Failed to execute ${file}. Rolled back.`, err);
        throw err;
      }
    }

    if (executedCount === 0) {
      console.log('[DevParcel Migrations] Database schema is already up to date.');
    } else {
      console.log(`[DevParcel Migrations] Successfully executed ${executedCount} migration(s).`);
    }
  } finally {
    client.release();
    await disconnectDatabase();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('[DevParcel Migrations] Migration process completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[DevParcel Migrations] Migration process failed:', err);
      process.exit(1);
    });
}
