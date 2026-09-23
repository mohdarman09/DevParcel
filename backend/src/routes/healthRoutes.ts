import { Router } from 'express';
import { HealthController } from '../controllers/healthController';

export const healthRouter = Router();

// GET /health - Lightweight liveness probe
healthRouter.get('/', HealthController.getLiveness);

// GET /health/ready - Operational readiness check
healthRouter.get('/ready', HealthController.getReadiness);
