import { ISharingProvider, ShareOptions, ShareResult } from '../sharingTypes';

export class UnsupportedShareProvider implements ISharingProvider {
  public readonly id = 'unsupported-share';
  public readonly name = 'Unsupported Sharing Provider';
  public readonly isSupported = false;

  public canShare(_filePath: string): boolean {
    return false;
  }

  public async share(_filePath: string, _options?: ShareOptions): Promise<ShareResult> {
    return {
      success: false,
      provider: this.id,
      error: 'Native file sharing is not available on this platform.'
    };
  }
}
