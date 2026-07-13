export const env = {
  appEnv: import.meta.env.VITE_APP_ENV ?? "development",
  webBaseUrl: import.meta.env.VITE_WEB_BASE_URL ?? "https://www.elima.ci",
  mainSupabaseUrl: import.meta.env.VITE_MAIN_SUPABASE_URL ?? "",
  mainSupabaseAnonKey: import.meta.env.VITE_MAIN_SUPABASE_ANON_KEY ?? "",
  revisionSupabaseUrl: import.meta.env.VITE_REVISION_SUPABASE_URL ?? "",
  revisionSupabaseAnonKey: import.meta.env.VITE_REVISION_SUPABASE_ANON_KEY ?? "",
  mainApiBaseUrl: import.meta.env.VITE_MAIN_API_BASE_URL ?? "",
  revisionApiBaseUrl: import.meta.env.VITE_REVISION_API_BASE_URL ?? "",
  enableDemoMode: import.meta.env.VITE_ENABLE_DEMO_MODE !== "false",
  enableRevision: import.meta.env.VITE_ENABLE_REVISION !== "false",
  enableStudentScanner: import.meta.env.VITE_ENABLE_STUDENT_SCANNER !== "false",
  enableTeacherOffline: import.meta.env.VITE_ENABLE_TEACHER_OFFLINE !== "false",
  enableWhatsappOption: import.meta.env.VITE_ENABLE_WHATSAPP_OPTION === "true",
} as const;

export function isMainDbConfigured() {
  return Boolean(env.mainSupabaseUrl && env.mainSupabaseAnonKey);
}

export function isRevisionDbConfigured() {
  return Boolean(env.revisionSupabaseUrl && env.revisionSupabaseAnonKey);
}

export function isDemoModeActive() {
  return env.enableDemoMode && !isMainDbConfigured();
}

export function isDemoModeEnabled() {
  return env.enableDemoMode;
}
