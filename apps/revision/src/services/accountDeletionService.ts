import { apiFetch } from "./api/apiClient";
import { getValidElimaIdentityAccessToken } from "./elimaIdentityService";
import { mainDbClient } from "./mainDbClient";

export type AccountDeletionResult = { status: "deleted" | "shared_identity"; identityDeleted: boolean };

export async function deleteCurrentAccount(password: string, confirmation: string): Promise<AccountDeletionResult> {
  if (!mainDbClient) throw new Error("Service indisponible.");
  const [localSession, identityAccessToken] = await Promise.all([
    mainDbClient.auth.getSession(),
    getValidElimaIdentityAccessToken(),
  ]);
  const localToken = localSession.data.session?.access_token;
  if (!localToken || !identityAccessToken) throw new Error("Ta session a expiré. Reconnecte-toi puis réessaie.");
  const response = await apiFetch("/api/account-delete", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${localToken}` },
    body: JSON.stringify({ identityAccessToken, password, confirmation }),
  });
  const payload = await response.json().catch(() => null) as (Partial<AccountDeletionResult> & { message?: string }) | null;
  if (!response.ok || !payload?.status) throw new Error(payload?.message ?? "La suppression du compte est momentanément indisponible.");
  return payload as AccountDeletionResult;
}
