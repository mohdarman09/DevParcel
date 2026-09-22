import * as vscode from 'vscode';
import * as crypto from 'crypto';

export class SenderIdentityService {
  private static readonly STORAGE_KEY = 'devparcel.senderId';
  private static cachedSenderId: string | null = null;

  /**
   * Retrieves or initializes the persistent sender instance UUID.
   */
  public static getOrCreateSenderId(context?: vscode.ExtensionContext): string {
    if (this.cachedSenderId) {
      return this.cachedSenderId;
    }

    if (context) {
      const stored = context.globalState.get<string>(this.STORAGE_KEY);
      if (stored && typeof stored === 'string' && stored.trim().length > 0) {
        this.cachedSenderId = stored.trim();
        return this.cachedSenderId;
      }

      const newId = crypto.randomUUID();
      context.globalState.update(this.STORAGE_KEY, newId);
      this.cachedSenderId = newId;
      return newId;
    }

    // Fallback if context not yet provided
    if (!this.cachedSenderId) {
      this.cachedSenderId = crypto.randomUUID();
    }
    return this.cachedSenderId;
  }

  /**
   * For testing: manually sets the sender ID.
   */
  public static setSenderIdForTesting(senderId: string | null): void {
    this.cachedSenderId = senderId;
  }
}
