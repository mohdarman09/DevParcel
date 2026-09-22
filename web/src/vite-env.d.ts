/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_DEVPARCEL_MARKETPLACE_URL?: string;
  readonly VITE_CREATOR_NAME?: string;
  readonly VITE_CREATOR_LINKEDIN?: string;
  readonly VITE_CREATOR_PORTFOLIO?: string;
  readonly VITE_CREATOR_GITHUB?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
