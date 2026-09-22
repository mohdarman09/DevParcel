export interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  lockedUntil?: number;
}

export class PasswordRateLimiter {
  private static attempts = new Map<string, AttemptRecord>();
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  private static readonly LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

  /**
   * Checks whether the token is currently rate-limited/locked out.
   */
  public static isLocked(token: string): { locked: boolean; remainingSeconds: number } {
    const record = this.attempts.get(token);
    if (!record) {
      return { locked: false, remainingSeconds: 0 };
    }

    const now = Date.now();

    // Check if lockout is active
    if (record.lockedUntil && record.lockedUntil > now) {
      const remaining = Math.ceil((record.lockedUntil - now) / 1000);
      return { locked: true, remainingSeconds: remaining };
    }

    // Check if window has expired
    if (now - record.firstAttemptAt > this.WINDOW_MS) {
      this.attempts.delete(token);
      return { locked: false, remainingSeconds: 0 };
    }

    return { locked: false, remainingSeconds: 0 };
  }

  /**
   * Records a failed password attempt. If max reached, locks out for LOCKOUT_MS.
   */
  public static recordFailure(token: string): { locked: boolean; remainingAttempts: number } {
    const now = Date.now();
    let record = this.attempts.get(token);

    if (!record || now - record.firstAttemptAt > this.WINDOW_MS) {
      record = { count: 1, firstAttemptAt: now };
      this.attempts.set(token, record);
      return { locked: false, remainingAttempts: this.MAX_ATTEMPTS - 1 };
    }

    record.count += 1;

    if (record.count >= this.MAX_ATTEMPTS) {
      record.lockedUntil = now + this.LOCKOUT_MS;
      return { locked: true, remainingAttempts: 0 };
    }

    return { locked: false, remainingAttempts: this.MAX_ATTEMPTS - record.count };
  }

  /**
   * Clears failure attempts after successful verification.
   */
  public static recordSuccess(token: string): void {
    this.attempts.delete(token);
  }

  /**
   * For testing: resets all rate limiting state.
   */
  public static clear(): void {
    this.attempts.clear();
  }
}
