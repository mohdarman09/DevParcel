import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/responseFormatter';

const isTest = process.env.NODE_ENV === 'test';

const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message: string;
}) => {
  if (isTest) {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }

  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req: Request, res: Response) => {
      sendError(
        res,
        'RATE_LIMIT_EXCEEDED',
        options.message,
        429
      );
    },
  });
};

/**
 * Standard API rate limiter for general endpoint protection (120 req / 15 min).
 */
export const standardApiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: 'Too many requests from this IP. Please try again later.',
});

/**
 * Strict limiter for share creation (20 uploads / 15 min).
 * Prevents flood and storage exhaustion.
 */
export const createShareLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Share creation rate limit exceeded. Please wait before creating more shares.',
});

/**
 * Strict limiter for password verification (10 attempts / 15 min per IP).
 * Complements token-specific lockout.
 */
export const verifyPasswordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many password verification attempts from this IP. Please try again later.',
});

/**
 * Download endpoint limiter (60 downloads / 15 min).
 */
export const downloadLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: 'Download request limit exceeded. Please wait before attempting further downloads.',
});

/**
 * Share metadata lookup limiter (100 lookups / 15 min).
 * Protects against high-rate token enumeration attacks.
 */
export const metadataLookupLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Share lookup rate limit exceeded. Please wait before querying more shares.',
});

/**
 * Dedicated rate limiter for health check monitoring endpoints (300 requests / 15 min).
 * Allows external uptime services to monitor at high frequency (e.g. 10-15s intervals)
 * while mitigating excessive flooding and denial-of-service attempts.
 */
export const healthCheckLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: 'Health check rate limit exceeded. Please reduce monitoring polling frequency.',
});

