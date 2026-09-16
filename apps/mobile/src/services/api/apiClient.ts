import { env } from "../env";
import { normalizeApiBase, resolveApiUrl as resolveConfiguredApiUrl, type ApiUrlConfig } from "./apiUrl";

const config: ApiUrlConfig = {
  baseUrl: env.revisionApiBaseUrl,
  environment: import.meta.env.PROD ? "production" : env.appEnv,
};
// Fail early on invalid configuration, before transmitting credentials/tokens.
normalizeApiBase(config);

export function resolveApiUrl(endpoint: string): string {
  return resolveConfiguredApiUrl(endpoint, config);
}

export function apiFetch(endpoint: string, options?: RequestInit): Promise<Response> {
  return fetch(resolveApiUrl(endpoint), options);
}
