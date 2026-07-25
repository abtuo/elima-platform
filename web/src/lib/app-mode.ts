export type AppMode = "demo" | "saas";

type EnvLike = Record<string, string | undefined>;

function normalizeMode(value: string | undefined): AppMode | null {
  if (value === "demo" || value === "saas") return value;
  return null;
}

function isProductionEnv(env: EnvLike) {
  return env.NODE_ENV === "production" || env.APP_ENV === "production" || env.VERCEL_ENV === "production";
}

export function resolveAppMode(env: EnvLike = process.env): AppMode {
  const serverMode = normalizeMode(env.ELIMA_APP_MODE);
  if (serverMode) return serverMode;

  const publicMode = normalizeMode(env.NEXT_PUBLIC_ELIMA_APP_MODE);
  if (publicMode) return publicMode;

  if (env.NODE_ENV === "development" || env.APP_ENV === "local") return "demo";
  return "saas";
}

export function getAppMode(): AppMode {
  const mode = resolveAppMode();
  if (mode === "demo" && isProductionEnv(process.env)) {
    console.warn("[elima] Demo mode is enabled in a production-like environment. Verify ELIMA_APP_MODE/APP_ENV.");
  }
  return mode;
}

export function isDemoMode() {
  return getAppMode() === "demo";
}

export function isSaasMode() {
  return getAppMode() === "saas";
}

export function assertDemoMode(options: { allowProductionDemo?: boolean } = {}) {
  const mode = getAppMode();
  if (mode !== "demo") {
    throw new Error("Cette action est reservee au mode demo. Definissez ELIMA_APP_MODE=demo.");
  }
  if (!options.allowProductionDemo && isProductionEnv(process.env)) {
    throw new Error("Execution demo refusee dans un environnement production-like.");
  }
}

export function assertSaasMode() {
  const mode = getAppMode();
  if (mode !== "saas") {
    throw new Error("Cette action est reservee au mode SaaS.");
  }
}
