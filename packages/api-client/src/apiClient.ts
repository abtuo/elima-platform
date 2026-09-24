import { normalizeApiBase, resolveApiUrl, type ApiUrlConfig } from "./apiUrl";

export type ApiClient = {
  resolveApiUrl(endpoint: string): string;
  apiFetch(endpoint: string, options?: RequestInit): Promise<Response>;
};

export function createApiClient(
  config: ApiUrlConfig,
  fetchImplementation: typeof fetch = globalThis.fetch,
): ApiClient {
  normalizeApiBase(config);
  return {
    resolveApiUrl(endpoint) {
      return resolveApiUrl(endpoint, config);
    },
    apiFetch(endpoint, options) {
      return fetchImplementation(resolveApiUrl(endpoint, config), options);
    },
  };
}
