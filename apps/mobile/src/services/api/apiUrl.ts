import type { AppEnvironment } from "@elima/shared-domain/environment";

export type ApiUrlConfig = {
  baseUrl?: string;
  environment: AppEnvironment;
  /** Future native bootstrap must opt in; no native runtime is enabled here. */
  requireRemoteBackend?: boolean;
};

export function normalizeApiBase(config: ApiUrlConfig): string {
  const value = config.baseUrl?.trim() ?? "";
  if (!value) {
    if (config.requireRemoteBackend) throw new Error("Une base API HTTPS distante est obligatoire pour ce runtime.");
    return "";
  }
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("VITE_REVISION_API_BASE_URL doit être une origine HTTPS valide."); }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || !/^\/*$/.test(url.pathname)) {
    throw new Error("La base API doit être une origine sans credentials, chemin /api, query ni fragment.");
  }
  const localHttp = url.protocol === "http:" && loopback && config.environment === "development" && !config.requireRemoteBackend;
  if (url.protocol !== "https:" && !localHttp) throw new Error("La base API exige HTTPS ; HTTP est réservé au développement localhost.");
  if (config.requireRemoteBackend && loopback) throw new Error("La base API distante ne peut pas cibler localhost.");
  return url.origin;
}

export function resolveApiUrl(endpoint: string, config: ApiUrlConfig): string {
  if (!/^\/api\/[A-Za-z0-9][A-Za-z0-9/_-]*(?:\?[^#]*)?$/.test(endpoint)) {
    throw new Error("Un endpoint Elima doit commencer par /api/ et ne peut pas changer d'origine.");
  }
  const base = normalizeApiBase(config);
  return base ? new URL(endpoint, base).href : endpoint;
}
