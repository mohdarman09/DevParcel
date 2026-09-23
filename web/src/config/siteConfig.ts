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

function resolveApiBaseUrl(): string {
  const envUrl = readEnv('VITE_API_BASE_URL');
  if (envUrl && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // Runtime browser check: non-localhost hosts (such as dev-parcel.vercel.app) use production backend
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return 'https://devparcel.onrender.com';
    }
  }

  // Build-time production mode check
  if (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.PROD) {
    return 'https://devparcel.onrender.com';
  }

  // Local development fallback
  return 'http://localhost:3000';
}

export const siteConfig: SiteConfig = {
  apiBaseUrl: resolveApiBaseUrl(),
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
