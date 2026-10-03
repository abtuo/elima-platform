import { createApiClient, type ApiUrlConfig } from "@elima/api-client";
import { env } from "../env";
import { isNativeBuild, isNativeRuntime } from "../nativeRuntime";

const config: ApiUrlConfig = {
  baseUrl: env.revisionApiBaseUrl,
  environment: import.meta.env.PROD ? "production" : env.appEnv,
  requireRemoteBackend: isNativeRuntime() || isNativeBuild(),
};
// Fail early on invalid configuration, before transmitting credentials/tokens.
const client = createApiClient(config);
export const resolveApiUrl = client.resolveApiUrl;
export const apiFetch: typeof client.apiFetch = async (...args) => {
  const response = await client.apiFetch(...args);
  if (response.status === 429) {
    const body = await response.clone().json().catch(() => null);
    if (body?.code === "quota_exceeded" && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("revision-quota-exceeded", { detail: body }));
    }
  }
  return response;
};
