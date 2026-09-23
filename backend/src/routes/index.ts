import { Router } from 'express';
import { shareRouter } from './shareRoutes';
import { HealthController } from '../controllers/healthController';

const apiRouter = Router();

// Health check endpoint (backward compatibility under /api/v1/health)
apiRouter.get('/health', HealthController.getLiveness);

// Shares resource routes
apiRouter.use('/shares', shareRouter);

export default apiRouter;
