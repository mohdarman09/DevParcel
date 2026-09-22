import { IShareRepository } from './shareRepository.interface';
import { PostgresShareRepository } from './postgresShareRepository';
import { MockShareRepository } from './mockShareRepository';

export * from './shareRepository.interface';
export * from './postgresShareRepository';
export * from './mockShareRepository';

let defaultRepository: IShareRepository | undefined;

export function getShareRepository(): IShareRepository {
  if (defaultRepository) {
    return defaultRepository;
  }

  // Use in-memory mock repository during tests unless explicitly testing live PG
  if (process.env.NODE_ENV === 'test' && !process.env.FORCE_PG_TEST) {
    defaultRepository = new MockShareRepository();
    return defaultRepository;
  }

  defaultRepository = new PostgresShareRepository();
  return defaultRepository;
}

export function setShareRepository(repo: IShareRepository): void {
  defaultRepository = repo;
}
