import { Router } from 'express';
import { ShareController } from '../controllers/shareController';
import { validateShareTokenParam, validateSenderId } from '../middleware/validateRequest';
import {
  createShareLimiter,
  metadataLookupLimiter,
  verifyPasswordLimiter,
  downloadLimiter,
} from '../middleware/rateLimiter';

export function createShareRouter(controller = new ShareController()): Router {
  const router = Router();

  // Create temporary share (streaming multipart upload with strict rate limit)
  router.post('/', createShareLimiter, controller.createShare);

  // Get share history for sender (registered before :token to avoid route collision)
  router.get('/history', validateSenderId, controller.getShareHistory);

  // Get share public metadata (with enumeration protection rate limit)
  router.get('/:token', metadataLookupLimiter, validateShareTokenParam, controller.getShare);

  // Revoke share link (requires sender identity)
  router.post('/:token/revoke', validateShareTokenParam, validateSenderId, controller.revokeShare);

  // Verify password for password-protected share (brute force rate limited)
  router.post('/:token/verify-password', verifyPasswordLimiter, validateShareTokenParam, controller.verifyPassword);

  // Download share package
  router.get('/:token/download', downloadLimiter, validateShareTokenParam, controller.downloadShare);

  return router;
}

export const shareRouter = createShareRouter();
