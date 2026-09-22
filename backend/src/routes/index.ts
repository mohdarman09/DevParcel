import { Router } from 'express';
import { shareRouter } from './shareRoutes';

const apiRouter = Router();

// Health check endpoint
apiRouter.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'devparcel-backend', timestamp: new Date().toISOString() });
});

// Shares resource routes
apiRouter.use('/shares', shareRouter);

export default apiRouter;
