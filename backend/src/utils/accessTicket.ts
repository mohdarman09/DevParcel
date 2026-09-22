import crypto from 'crypto';
import { config } from '../config';

// Use storage secret key or a fallback server secret
const SECRET_KEY = config.storage.secretAccessKey || 'devparcel-internal-ticket-secret-salt-2026';

export class AccessTicket {
  private static readonly TTL_MS = 10 * 60 * 1000; // 10 minutes

  /**
   * Generates a signed, short-lived download authorization ticket for a password-protected share token.
   */
  public static create(token: string): string {
    const expiresAt = Date.now() + this.TTL_MS;
    const payload = `${token}:${expiresAt}`;
    const signature = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(payload)
      .digest('hex');

    return `${expiresAt}.${signature}`;
  }

  /**
   * Verifies that a ticket is authentic, bound to the specified share token, and not expired.
   */
  public static verify(token: string, ticket: string | undefined): boolean {
    if (!token || !ticket || typeof ticket !== 'string') {
      return false;
    }

    const parts = ticket.split('.');
    if (parts.length !== 2) {
      return false;
    }

    const [expiresAtStr, signature] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      return false; // Expired or malformed
    }

    const payload = `${token}:${expiresAt}`;
    const expectedSignature = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(payload)
      .digest('hex');

    if (signature.length !== expectedSignature.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }
}
