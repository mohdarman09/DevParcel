import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env if present
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface AppConfig {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  storage: {
    endpoint?: string;
    region: string;
    bucket: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    forcePathStyle: boolean;
  };
  expiry: {
    defaultHours: number;
    minHours: number;
    maxHours: number;
  };
  upload: {
    maxSizeMb: number;
    maxSizeBytes: number;
  };
  clientUrl: string;
  publicShareBaseUrl: string;
}

function parseNumber(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

const rawEndpoint = process.env.STORAGE_ENDPOINT?.trim();
let endpoint = rawEndpoint ? rawEndpoint.replace(/\/+$/, '') : undefined;
if (endpoint && !endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
  endpoint = `https://${endpoint}`;
}
const maxSizeMb = parseNumber(process.env.MAX_UPLOAD_SIZE_MB, 50);

export const config: AppConfig = {
  port: parseNumber(process.env.PORT, 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL?.trim() || '',
  storage: {
    endpoint,
    region: process.env.STORAGE_REGION ? process.env.STORAGE_REGION.trim() : 'us-east-1',
    bucket: process.env.STORAGE_BUCKET ? process.env.STORAGE_BUCKET.trim() : 'devparcel-shares',
    accessKeyId: process.env.STORAGE_ACCESS_KEY ? process.env.STORAGE_ACCESS_KEY.trim() : undefined,
    secretAccessKey: process.env.STORAGE_SECRET_KEY ? process.env.STORAGE_SECRET_KEY.trim() : undefined,
    forcePathStyle:
      process.env.STORAGE_FORCE_PATH_STYLE !== undefined
        ? process.env.STORAGE_FORCE_PATH_STYLE.trim().toLowerCase() === 'true'
        : true,
  },
  expiry: {
    defaultHours: parseNumber(process.env.DEFAULT_LINK_EXPIRY_HOURS, 24),
    minHours: parseNumber(process.env.MIN_LINK_EXPIRY_HOURS, 1),
    maxHours: parseNumber(process.env.MAX_LINK_EXPIRY_HOURS, 168),
  },
  upload: {
    maxSizeMb,
    maxSizeBytes: maxSizeMb * 1024 * 1024,
  },
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  publicShareBaseUrl: process.env.PUBLIC_SHARE_BASE_URL || 'http://localhost:5173',
};
