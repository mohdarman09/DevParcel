export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  key: string;
  size?: number;
}

export interface ICloudStorageProvider {
  readonly id: string;
  readonly name: string;

  /**
   * Uploads a data stream to object storage without buffering the entire payload in memory.
   */
  upload(
    key: string,
    stream: NodeJS.ReadableStream,
    options?: UploadOptions
  ): Promise<UploadResult>;

  /**
   * Generates a short-lived pre-signed download URL for the object.
   */
  getDownloadUrl(
    key: string,
    fileName: string,
    expiresInSeconds: number
  ): Promise<string>;

  /**
   * Retrieves a readable stream directly from object storage (useful for streaming fallback or local dev).
   */
  getDownloadStream(key: string): Promise<NodeJS.ReadableStream>;

  /**
   * Deletes the specified object from storage. Safe/idempotent if object does not exist.
   */
  delete(key: string): Promise<void>;

  /**
   * Checks whether the specified key exists in storage.
   */
  exists(key: string): Promise<boolean>;
}
