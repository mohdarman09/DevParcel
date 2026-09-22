import crypto from 'crypto';

const TOKEN_REGEX = /^[A-Za-z0-9_-]{16,48}$/;

/**
 * Generates a cryptographically secure random token with high entropy (128+ bits).
 * Uses URL-safe base64 encoding without padding.
 */
export function generateShareToken(byteLength = 16): string {
  return crypto.randomBytes(byteLength).toString('base64url');
}

/**
 * Validates that a token adheres to the allowed safe character set and length bounds.
 */
export function isValidShareToken(token: unknown): token is string {
  if (typeof token !== 'string') return false;
  return TOKEN_REGEX.test(token);
}
