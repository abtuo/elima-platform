import { createApiClient, type ApiUrlConfig } from "@elima/api-client";
import { env } from "../env";

const config: ApiUrlConfig = {
  baseUrl: env.revisionApiBaseUrl,
  environment: import.meta.env.PROD ? "production" : env.appEnv,
};
// Fail early on invalid configuration, before transmitting credentials/tokens.
export const { resolveApiUrl, apiFetch } = createApiClient(config);
