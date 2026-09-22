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

export const siteConfig: SiteConfig = {
  apiBaseUrl: (readEnv('VITE_API_BASE_URL') || 'http://localhost:3000').replace(/\/+$/, ''),
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
    githubUrl: readEnv('VITE_CREATOR_GITHUB')?.trim() || null,
  },
};
