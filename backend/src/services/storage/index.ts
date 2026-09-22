import { config } from '../../config';
import { ICloudStorageProvider } from './cloudStorageProvider.interface';
import { S3StorageProvider } from './s3StorageProvider';
import { MockStorageProvider } from './mockStorageProvider';

export * from './cloudStorageProvider.interface';
export * from './s3StorageProvider';
export * from './mockStorageProvider';

let defaultStorageProvider: ICloudStorageProvider | undefined;

export function getStorageProvider(): ICloudStorageProvider {
  if (defaultStorageProvider) {
    return defaultStorageProvider;
  }

  // If testing or explicitly configured as mock
  if (process.env.NODE_ENV === 'test' && !process.env.FORCE_S3_TEST) {
    defaultStorageProvider = new MockStorageProvider();
    return defaultStorageProvider;
  }

  defaultStorageProvider = new S3StorageProvider({
    endpoint: config.storage.endpoint,
    region: config.storage.region,
    bucket: config.storage.bucket,
    accessKeyId: config.storage.accessKeyId,
    secretAccessKey: config.storage.secretAccessKey,
    forcePathStyle: config.storage.forcePathStyle,
  });

  return defaultStorageProvider;
}

export function setStorageProvider(provider: ICloudStorageProvider): void {
  defaultStorageProvider = provider;
}
