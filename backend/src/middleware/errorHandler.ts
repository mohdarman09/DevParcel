import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/responseFormatter';
import { ShareServiceError } from '../services/sharing/shareService';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Never leak internal stack traces or database connection strings
  if (err instanceof ShareServiceError) {
    sendError(res, err.code, err.message, err.statusCode);
    return;
  }

  // Handle payload too large from express/busboy
  if (err.type === 'entity.too.large' || err.code === 'LIMIT_FILE_SIZE') {
    sendError(res, 'FILE_TOO_LARGE', 'The uploaded file exceeds the maximum allowed upload size.', 413);
    return;
  }

  // Handle CORS errors
  if (err.message && err.message.includes('CORS')) {
    sendError(res, 'CORS_ERROR', 'Cross-origin request blocked by CORS policy.', 403);
    return;
  }

  console.error('[DevParcel Backend] Unhandled server error:', err.message || err);

  sendError(
    res,
    'INTERNAL_SERVER_ERROR',
    'An unexpected error occurred while processing your request.',
    500
  );
}
