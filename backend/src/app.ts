import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import apiRouter from './routes';
import { errorHandler } from './middleware/errorHandler';
import { sendError } from './utils/responseFormatter';
import { standardApiLimiter } from './middleware/rateLimiter';

export function createApp(): Express {
  const app = express();
  const isProduction = config.nodeEnv === 'production';

  // 1. Security Headers via Helmet
  const allowedOrigins = config.clientUrl.split(',').map((url) => url.trim());

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'", ...allowedOrigins, 'https://*.supabase.co'],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: isProduction ? [] : null,
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: isProduction
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          }
        : false,
    })
  );

  // 2. CORS configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, VS Code extension host)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || config.nodeEnv === 'development') {
          return callback(null, true);
        }
        return callback(new Error('CORS origin denied'));
      },
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Sender-Id', 'X-Access-Ticket'],
      credentials: true,
    })
  );

  // 3. Rate limiting for API routes
  app.use('/api/v1', standardApiLimiter);

  // 4. JSON body parsing for standard endpoints
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 5. Mount API routes
  app.use('/api/v1', apiRouter);

  // 6. Root route
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'DevParcel Backend API',
      version: '0.1.0',
      status: 'online',
    });
  });

  // 7. 404 Handler
  app.use((_req: Request, res: Response) => {
    sendError(res, 'NOT_FOUND', 'The requested endpoint does not exist.', 404);
  });

  // 8. Global Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
