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

export async function checkDatabaseHealth(timeoutMs = 2000): Promise<{ isHealthy: boolean; error?: string }> {
  // If not configured, check environment expectation
  if (!config.databaseUrl) {
    if (config.nodeEnv === 'production') {
      return { isHealthy: false, error: 'DATABASE_URL is not configured in production.' };
    }
    return { isHealthy: true };
  }

  // If in test mode with mock repository and pool not connected, report healthy
  if (process.env.NODE_ENV === 'test' && !process.env.FORCE_PG_TEST && !pool) {
    return { isHealthy: true };
  }

  try {
    const currentPool = getPool();
    // In mock/test situations where max is 0, treat as healthy
    if ((currentPool as any).options?.max === 0) {
      return { isHealthy: true };
    }

    let client: any;
    let timer: NodeJS.Timeout;
    const connectPromise = currentPool.connect().then((c) => {
      client = c;
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Database health check timed out')), timeoutMs);
    });

    try {
      await Promise.race([connectPromise, timeoutPromise]);
      await client.query('SELECT 1');
      return { isHealthy: true };
    } finally {
      clearTimeout(timer!);
      if (client) {
        client.release();
      }
    }
  } catch (err: any) {
    const sanitizedError = (err?.message || 'Database connection error').replace(
      /:([^:@]+)@/,
      ':***@'
    );
    return { isHealthy: false, error: sanitizedError };
  }
}

