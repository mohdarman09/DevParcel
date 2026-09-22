import crypto from 'crypto';

/**
 * Generates an internal object storage key that is completely isolated from user input.
 * Format: shares/{randomUuid}/package.zip
 */
export function generateStorageKey(): string {
  const randomId = crypto.randomUUID();
  return `shares/${randomId}/package.zip`;
}

/**
 * Validates that a storage key does not contain path traversal characters.
 */
export function isValidStorageKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  if (key.includes('..') || key.includes('\\') || key.includes('\0')) return false;
  return key.startsWith('shares/') && key.endsWith('.zip');
}
