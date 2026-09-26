export interface CreatorConfig {
  name: string;
  role: string;
  bio: string;
  linkedinUrl: string;
  portfolioUrl: string;
  githubUrl: string | null;
}

export interface SiteConfig {
  apiBaseUrl: string;
  marketplaceUrl: string | null;
  creator: CreatorConfig;
}

function readEnv(key: string): string | undefined {
  if (typeof import.meta !== 'undefined' && (import.meta as any)?.env) {
    return (import.meta as any).env[key];
  }
  return undefined;
}

export function resolveApiBaseUrl(): string {
  const envUrl = readEnv('VITE_API_BASE_URL')?.trim();
  const isEnvLocalhost = !envUrl || /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/i.test(envUrl);

  // Runtime browser environment check
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    const isBrowserLocalhost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '';

    // If browser is running on production/deployed host (e.g., dev-parcel.vercel.app or any domain)
    if (!isBrowserLocalhost) {
      // If a non-localhost custom API URL was explicitly set, use it; otherwise use the deployed Render backend
      if (envUrl && !isEnvLocalhost) {
        return envUrl.replace(/\/+$/, '');
      }
      return 'https://devparcel.onrender.com';
    }

    // Browser is on localhost
    if (envUrl && envUrl !== '') {
      return envUrl.replace(/\/+$/, '');
    }
    return 'http://localhost:3000';
  }

  // Build-time / Node environment check
  const isProd = Boolean(typeof import.meta !== 'undefined' && (import.meta as any)?.env?.PROD);
  if (isProd) {
    if (envUrl && !isEnvLocalhost) {
      return envUrl.replace(/\/+$/, '');
    }
    return 'https://devparcel.onrender.com';
  }

  return envUrl && envUrl !== '' ? envUrl.replace(/\/+$/, '') : 'http://localhost:3000';
}

let apiBaseUrlOverride: string | null = null;

export function setApiBaseUrlOverride(url: string | null): void {
  apiBaseUrlOverride = url;
}

export const siteConfig: SiteConfig = {
  get apiBaseUrl() {
    if (apiBaseUrlOverride) {
      return apiBaseUrlOverride.replace(/\/+$/, '');
    }
    return resolveApiBaseUrl();
  },
  set apiBaseUrl(url: string) {
    apiBaseUrlOverride = url;
  },
  marketplaceUrl: readEnv('VITE_DEVPARCEL_MARKETPLACE_URL')?.trim() || null,
  creator: {
    name: readEnv('VITE_CREATOR_NAME')?.trim() || 'Mohd Arman',
    role: 'Developer • Builder • Learner',
    bio: "Creating tools that make developers' lives easier.",
    linkedinUrl:
      readEnv('VITE_CREATOR_LINKEDIN')?.trim() ||
      'https://www.linkedin.com/in/mohd-arman-6417a7320/',
    portfolioUrl:
      readEnv('VITE_CREATOR_PORTFOLIO')?.trim() ||
      'https://mohd-arman-portfolio.vercel.app/',
    githubUrl:
      readEnv('VITE_CREATOR_GITHUB')?.trim() ||
      'https://github.com/mohdarman09/DevParcel',
  },
};
