/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_APP_ENV: string;
  readonly VITE_APP_MODE?: "auto" | "production" | "demo";
  readonly VITE_WEB_BASE_URL: string;
  readonly VITE_MAIN_SUPABASE_URL: string;
  readonly VITE_MAIN_SUPABASE_ANON_KEY: string;
  readonly VITE_MAIN_API_BASE_URL: string;
  readonly VITE_REVISION_API_BASE_URL: string;
  readonly VITE_ENABLE_DEMO_MODE: string;
  readonly VITE_ENABLE_REVISION: string;
  readonly VITE_ELIMA_IDENTITY_URL?: string;
  readonly VITE_ELIMA_OAUTH_CLIENT_ID?: string;
  readonly VITE_ELIMA_OAUTH_REDIRECT_URI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
