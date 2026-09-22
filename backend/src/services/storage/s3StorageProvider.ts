import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import {
  ICloudStorageProvider,
  UploadOptions,
  UploadResult,
} from './cloudStorageProvider.interface';

export interface S3StorageOptions {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  forcePathStyle?: boolean;
}

export class S3StorageProvider implements ICloudStorageProvider {
  public readonly id = 's3';
  public readonly name = 'S3-Compatible Storage';
  private client: S3Client;
  private bucket: string;

  constructor(options: S3StorageOptions) {
    this.bucket = options.bucket;
    this.client = new S3Client({
      endpoint: options.endpoint,
      region: options.region,
      credentials:
        options.accessKeyId && options.secretAccessKey
          ? {
              accessKeyId: options.accessKeyId,
              secretAccessKey: options.secretAccessKey,
            }
          : undefined,
      forcePathStyle: options.forcePathStyle,
    });
  }

  public async upload(
    key: string,
    stream: NodeJS.ReadableStream,
    options?: UploadOptions
  ): Promise<UploadResult> {
    console.log(`[Storage] Starting upload to key: ${key}`);
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: key,
        Body: stream as any,
        ContentType: options?.contentType || 'application/zip',
        Metadata: options?.metadata,
      },
    });

    const timeoutMs = 90000;
    let timeoutHandle: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        try {
          upload.abort();
        } catch {
          // ignore abort failure
        }
        reject(
          new Error(
            'Cloud upload timed out. Please check your storage configuration or network connection.'
          )
        );
      }, timeoutMs);
    });

    try {
      await Promise.race([upload.done(), timeoutPromise]);
      console.log(`[Storage] Upload completed for key: ${key}`);
      return { key };
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  public async getDownloadUrl(
    key: string,
    fileName: string,
    expiresInSeconds: number
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(fileName)}"`,
    });

    const url = await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
    console.log(`[Storage] Signed URL generated for key: ${key}`);
    return url;
  }

  public async getDownloadStream(key: string): Promise<NodeJS.ReadableStream> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);
    return response.Body as NodeJS.ReadableStream;
  }

  public async delete(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
    } catch (err: any) {
      if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
        return;
      }
      throw err;
    }
  }

  public async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch (err: any) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw err;
    }
  }
}
