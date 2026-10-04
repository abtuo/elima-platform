import {
  parseAppEnvironment,
} from "@elima/shared-domain/environment";

export const env = {
  appEnv: parseAppEnvironment(import.meta.env.VITE_APP_ENV),
  appMode: import.meta.env.VITE_APP_MODE ?? "auto",
  webBaseUrl: import.meta.env.VITE_WEB_BASE_URL ?? "https://www.elima.ci",
  mainSupabaseUrl: import.meta.env.VITE_ELIMA_IDENTITY_URL ?? "https://nnsgvnjzfrcmbxfwlyow.supabase.co",
  mainSupabaseAnonKey: import.meta.env.VITE_ELIMA_IDENTITY_PUBLISHABLE_KEY ?? "",
  revisionSupabaseUrl: import.meta.env.VITE_REVISION_SUPABASE_URL ?? "https://rydnrvvmwixrkmnvpajf.supabase.co",
  revisionSupabaseKey: import.meta.env.VITE_REVISION_SUPABASE_PUBLISHABLE_KEY ?? "",
  demoProjectId: import.meta.env.VITE_SUPABASE_DEMO_PROJECT_ID ?? "",
  productionProjectId: import.meta.env.VITE_SUPABASE_PRODUCTION_PROJECT_ID ?? "",
  mainApiBaseUrl: import.meta.env.VITE_MAIN_API_BASE_URL ?? "",
  revisionApiBaseUrl: import.meta.env.VITE_REVISION_API_BASE_URL ?? "",
  enableDemoMode: import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_MODE === "true",
  enableRevision: import.meta.env.VITE_ENABLE_REVISION !== "false",
  enableStudentScanner: import.meta.env.VITE_ENABLE_STUDENT_SCANNER !== "false",
  enableTeacherOffline: import.meta.env.VITE_ENABLE_TEACHER_OFFLINE !== "false",
  enableWhatsappOption: import.meta.env.VITE_ENABLE_WHATSAPP_OPTION === "true",
  elimaIdentityUrl: import.meta.env.VITE_ELIMA_IDENTITY_URL ?? "",
  elimaOAuthClientId: import.meta.env.VITE_ELIMA_OAUTH_CLIENT_ID ?? "",
  elimaOAuthRedirectUri: import.meta.env.VITE_ELIMA_OAUTH_REDIRECT_URI ?? "",
} as const;

if (env.mainSupabaseUrl.replace(/\/+$/, '') !== 'https://nnsgvnjzfrcmbxfwlyow.supabase.co' || env.revisionSupabaseUrl.replace(/\/+$/, '') !== 'https://rydnrvvmwixrkmnvpajf.supabase.co') throw new Error('Configuration des projets Identity/Révision incorrecte.');

export function getRuntimeHostname() {
  return typeof window === "undefined" ? "" : window.location.hostname.toLowerCase();
}

export function isDemoHost() {
  const hostname = getRuntimeHostname();
  if (env.appMode === "demo") return true;
  if (env.appMode === "production") return false;
  return hostname === "demo.app.elima.ci" || hostname.startsWith("demo-app-");
}

export function isPublicLandingEnabled() {
  return true;
}

export function isMainDbConfigured() {
  return Boolean(env.mainSupabaseUrl && env.mainSupabaseAnonKey);
}

export const isRevisionDbConfigured = () => Boolean(env.revisionSupabaseUrl && env.revisionSupabaseKey);

export function isDemoModeActive() {
  return env.enableDemoMode && env.appEnv !== "production" && !isMainDbConfigured();
}

export function shouldShowSeedAccounts() {
  return isDemoModeActive();
}
