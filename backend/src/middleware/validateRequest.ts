import { Request, Response, NextFunction } from 'express';
import { isValidShareToken } from '../utils/tokenGenerator';
import { sendError } from '../utils/responseFormatter';

const SENDER_ID_REGEX = /^[A-Za-z0-9_-]{8,64}$/;

/**
 * Validates that the share token parameter in routes matches the expected cryptographic pattern.
 */
export function validateShareTokenParam(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { token } = req.params;

  if (!token || !isValidShareToken(token)) {
    sendError(res, 'INVALID_TOKEN', 'The provided share token is invalid or malformed.', 400);
    return;
  }

  next();
}

/**
 * Validates the format of the sender ID if provided in headers, query, or body.
 */
export function validateSenderId(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const senderId =
    (req.headers['x-sender-id'] as string) ||
    (req.query.senderId as string) ||
    req.body?.senderId;

  if (senderId !== undefined && senderId !== null) {
    if (typeof senderId !== 'string' || !SENDER_ID_REGEX.test(senderId.trim())) {
      sendError(res, 'INVALID_SENDER_ID', 'The provided sender ID is not a valid identifier.', 400);
      return;
    }
  }

  next();
}
