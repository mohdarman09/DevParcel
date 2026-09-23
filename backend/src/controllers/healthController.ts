import { Request, Response } from 'express';
import { config } from '../config';
import { validateEnvironment } from '../config/envValidator';
import { checkDatabaseHealth } from '../config/database';
import { getAppVersion } from '../utils/version';

type ReadinessOverrideFn = (() => Promise<{ ready: boolean; reason?: string }>) | null;

let readinessOverride: ReadinessOverrideFn = null;

export const HealthController = {
  /**
   * Lightweight public liveness health check endpoint (GET /health).
   * Verifies the process is alive without touching database or storage.
   */
  getLiveness(req: Request, res: Response): void {
    const timestamp = new Date().toISOString();
    const uptimeSeconds = Math.floor(process.uptime());
    const version = getAppVersion();
    const pathOnly = (req.originalUrl || req.url || '/health').split('?')[0];

    // Single-line concise health log (no headers, secrets, or sensitive details)
    console.log(`[HEALTH] ${timestamp} | ${req.method} ${pathOnly} | 200 | uptime: ${uptimeSeconds}s`);

    res.status(200).json({
      status: 'ok',
      service: 'devparcel-backend',
      version,
      uptime: uptimeSeconds,
      timestamp,
    });
  },

  /**
   * Operational readiness check endpoint (GET /health/ready).
   * Verifies configuration and backend operational state.
   */
  async getReadiness(req: Request, res: Response): Promise<void> {
    const timestamp = new Date().toISOString();
    const pathOnly = (req.originalUrl || req.url || '/health/ready').split('?')[0];

    let isReady = true;
    let internalReason: string | undefined;

    if (readinessOverride) {
      const overrideResult = await readinessOverride();
      isReady = overrideResult.ready;
      internalReason = overrideResult.reason;
    } else {
      // 1. Validate environment configuration
      const envValidation = validateEnvironment(config);
      if (!envValidation.isValid) {
        isReady = false;
        internalReason = `Environment validation failed: ${envValidation.errors.join('; ')}`;
      } else {
        // 2. Safely verify database health when database is configured
        const dbHealth = await checkDatabaseHealth();
        if (!dbHealth.isHealthy) {
          isReady = false;
          internalReason = `Database health check failed: ${dbHealth.error || 'Connection error'}`;
        }
      }
    }

    if (isReady) {
      console.log(`[READY] ${timestamp} | ${req.method} ${pathOnly} | 200`);
      res.status(200).json({
        status: 'ready',
        service: 'devparcel-backend',
        timestamp,
      });
    } else {
      // Log sanitized internal failure reason on the server without exposing to client
      const safeReason = (internalReason || 'Operational check failed').replace(
        /:([^:@]+)@/,
        ':***@'
      );
      console.error(`[DevParcel Readiness Internal Error] ${safeReason}`);
      console.log(`[READY] ${timestamp} | ${req.method} ${pathOnly} | 503`);

      res.status(503).json({
        status: 'not_ready',
        service: 'devparcel-backend',
        timestamp,
      });
    }
  },

  /**
   * Internal hook for deterministic testing of readiness failure scenarios.
   */
  setReadinessOverride(fn: ReadinessOverrideFn): void {
    readinessOverride = fn;
  },
};
