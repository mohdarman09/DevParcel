import argon2 from 'argon2';

export class PasswordHasher {
  /**
   * Hashes a plaintext password using Argon2id with cryptographically secure parameters.
   */
  public static async hash(password: string): Promise<string> {
    if (!password || typeof password !== 'string' || password.length < 4) {
      throw new Error('Password must be at least 4 characters in length.');
    }

    return await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19456, // 19 MiB
      timeCost: 2,
      parallelism: 1,
    });
  }

  /**
   * Verifies a candidate password against an Argon2id hash.
   * Never throws on mismatch; returns boolean.
   */
  public static async verify(hash: string, candidate: string): Promise<boolean> {
    if (!hash || !candidate) {
      return false;
    }

    try {
      return await argon2.verify(hash, candidate);
    } catch {
      return false;
    }
  }
}
