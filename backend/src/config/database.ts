import { Pool, PoolConfig } from 'pg';
import { config } from './index';

let pool: Pool | null = null;

export function getPoolConfig(connectionString?: string): PoolConfig {
  const url = connectionString || config.databaseUrl;
  const isSupabase = url.includes('supabase.co') || url.includes('pooler.supabase.com');
  const isProduction = config.nodeEnv === 'production';

  const poolConfig: PoolConfig = {
    connectionString: url,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };

  // Enable SSL for Supabase or remote connections
  if (isSupabase || isProduction || url.includes('sslmode=require')) {
    poolConfig.ssl = {
      rejectUnauthorized: false,
    };
  }

  return poolConfig;
}

export function getPool(): Pool {
  if (pool) {
    return pool;
  }

  if (!config.databaseUrl) {
    if (process.env.NODE_ENV === 'test') {
      // In tests without live database, return a lazy uninitialized pool
      pool = new Pool({ max: 0 });
      return pool;
    }
    throw new Error(
      '[DevParcel Database] DATABASE_URL is not defined in environment variables. PostgreSQL connection required.'
    );
  }

  pool = new Pool(getPoolConfig());

  pool.on('error', (err) => {
    console.error('[DevParcel Database] Unexpected error on idle PostgreSQL client:', err);
  });

  return pool;
}

export function setPool(customPool: Pool | null): void {
  pool = customPool;
}

export async function connectDatabase(connectionString?: string): Promise<Pool> {
  const currentPool = connectionString ? new Pool(getPoolConfig(connectionString)) : getPool();

  if (connectionString) {
    pool = currentPool;
  }

  // Healthcheck ping
  const client = await currentPool.connect();
  try {
    const res = await client.query('SELECT NOW() AS server_time, current_database() AS db_name');
    const sanitizedUrl = (connectionString || config.databaseUrl).replace(
      /:([^:@]+)@/,
      ':***@'
    );
    console.log(
      `[DevParcel Backend] Connected to PostgreSQL (${res.rows[0]?.db_name || 'postgres'}) at ${sanitizedUrl}`
    );
    return currentPool;
  } finally {
    client.release();
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[DevParcel Backend] Disconnected from PostgreSQL pool.');
  }
}
