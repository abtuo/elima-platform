import { createPedagogicalLearningApi } from "@elima/revision-core";
import { apiFetch } from "./api/apiClient";
import { revisionDbClient } from "./revisionDbClient";

export const pedagogicalLearning = createPedagogicalLearningApi({
  apiFetch,
  async getAccessToken() { return (await revisionDbClient?.auth.getSession())?.data.session?.access_token; },
});
