import { AppConfig } from './index';

export interface EnvValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates the runtime configuration on server startup.
 * Ensures all security-critical settings are properly configured.
 * Never outputs secret values in error or warning messages.
 */
export function validateEnvironment(cfg: AppConfig): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProduction = cfg.nodeEnv === 'production';

  // 1. Database Configuration
  if (!cfg.databaseUrl) {
    if (isProduction) {
      errors.push('DATABASE_URL is required in production.');
    } else {
      warnings.push('DATABASE_URL is not configured; running in detached/mock database mode.');
    }
  } else if (!cfg.databaseUrl.startsWith('postgres://') && !cfg.databaseUrl.startsWith('postgresql://')) {
    errors.push('DATABASE_URL must be a valid PostgreSQL connection URI.');
  }

  // 2. Cloud Storage Configuration
  if (isProduction) {
    if (!cfg.storage.endpoint) {
      errors.push('STORAGE_ENDPOINT is required in production.');
    }
    if (!cfg.storage.bucket) {
      errors.push('STORAGE_BUCKET is required in production.');
    }
    if (!cfg.storage.accessKeyId) {
      errors.push('STORAGE_ACCESS_KEY is required in production.');
    }
    if (!cfg.storage.secretAccessKey) {
      errors.push('STORAGE_SECRET_KEY is required in production.');
    }
  } else {
    if (!cfg.storage.endpoint) {
      warnings.push('STORAGE_ENDPOINT is not configured; storage operations may use mock fallback.');
    }
    if (!cfg.storage.accessKeyId || !cfg.storage.secretAccessKey) {
      warnings.push('Storage credentials not configured in development.');
    }
  }

  // 3. Expiry and Upload Limits Validation
  if (cfg.expiry.minHours < 1 || cfg.expiry.minHours > cfg.expiry.maxHours) {
    errors.push(`Invalid MIN_LINK_EXPIRY_HOURS (${cfg.expiry.minHours}). Must be >= 1 and <= MAX_LINK_EXPIRY_HOURS.`);
  }

  if (cfg.expiry.maxHours > 720) {
    warnings.push(`MAX_LINK_EXPIRY_HOURS is set to ${cfg.expiry.maxHours}h (over 30 days). Consider shorter expiry for security.`);
  }

  if (cfg.upload.maxSizeMb <= 0 || cfg.upload.maxSizeMb > 500) {
    errors.push(`Invalid MAX_UPLOAD_SIZE_MB (${cfg.upload.maxSizeMb}). Must be between 1 and 500 MB.`);
  }

  // 4. Production Security Check: Client & Public URLs
  if (isProduction) {
    if (cfg.clientUrl.includes('localhost') || cfg.clientUrl.includes('127.0.0.1')) {
      warnings.push('CLIENT_URL points to localhost in production mode.');
    }
    if (!cfg.publicShareBaseUrl.startsWith('https://')) {
      warnings.push('PUBLIC_SHARE_BASE_URL should use HTTPS in production.');
    }
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    warnings,
  };
}

/**
 * Executes startup environment validation and terminates process safely if critical errors are present.
 */
export function runStartupEnvValidation(cfg: AppConfig): void {
  const result = validateEnvironment(cfg);

  for (const warning of result.warnings) {
    console.warn(`[DevParcel Config Warning] ${warning}`);
  }

  if (!result.isValid) {
    console.error('[DevParcel Config Error] Startup halted due to configuration errors:');
    for (const error of result.errors) {
      console.error(`  - ${error}`);
    }
    throw new Error('[DevParcel Config] Environment validation failed. Halting startup.');
  }
}
