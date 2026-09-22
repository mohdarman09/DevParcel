import { Readable } from 'stream';
import {
  ICloudStorageProvider,
  UploadOptions,
  UploadResult,
} from './cloudStorageProvider.interface';

export class MockStorageProvider implements ICloudStorageProvider {
  public readonly id = 'mock';
  public readonly name = 'Mock Storage Provider';
  public storage = new Map<string, Buffer>();
  public shouldFailUpload = false;
  public shouldFailDelete = false;

  public async upload(
    key: string,
    stream: NodeJS.ReadableStream,
    _options?: UploadOptions
  ): Promise<UploadResult> {
    if (this.shouldFailUpload) {
      throw new Error('Simulated storage upload failure');
    }

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    this.storage.set(key, buffer);
    return { key, size: buffer.length };
  }

  public async getDownloadUrl(
    key: string,
    fileName: string,
    _expiresInSeconds: number
  ): Promise<string> {
    if (!this.storage.has(key)) {
      throw new Error('Object not found in mock storage');
    }
    return `https://mock-storage.local/${key}?download=${encodeURIComponent(fileName)}`;
  }

  public async getDownloadStream(key: string): Promise<NodeJS.ReadableStream> {
    const buffer = this.storage.get(key);
    if (!buffer) {
      throw new Error('Object not found in mock storage');
    }
    return Readable.from(buffer);
  }

  public async delete(key: string): Promise<void> {
    if (this.shouldFailDelete) {
      throw new Error('Simulated storage delete failure');
    }
    this.storage.delete(key);
  }

  public async exists(key: string): Promise<boolean> {
    return this.storage.has(key);
  }

  public clear(): void {
    this.storage.clear();
    this.shouldFailUpload = false;
    this.shouldFailDelete = false;
  }
}
