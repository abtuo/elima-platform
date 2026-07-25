export type AppEnvironment = "development" | "demo" | "production";

export function parseAppEnvironment(
  value: string | undefined,
  fallback: AppEnvironment = "development",
): AppEnvironment {
  if (value === "development" || value === "demo" || value === "production") {
    return value;
  }
  if (value === "local" || value === "preview" || value === "staging") {
    return "development";
  }
  return fallback;
}

export function assertEnvironmentPair(
  environment: AppEnvironment,
  supabaseUrl: string,
  demoProjectId?: string,
  productionProjectId?: string,
) {
  if (!supabaseUrl) return;
  const projectId = new URL(supabaseUrl).hostname.split(".")[0];
  if (environment === "demo" && demoProjectId && projectId !== demoProjectId) {
    throw new Error("La configuration Demo ne pointe pas vers le projet Supabase Demo.");
  }
  if (environment === "production" && productionProjectId && projectId !== productionProjectId) {
    throw new Error("La configuration Production ne pointe pas vers le projet Supabase Production.");
  }
  if (environment !== "production" && productionProjectId && projectId === productionProjectId) {
    throw new Error("Un environnement non-Production ne peut pas utiliser Supabase Production.");
  }
}
