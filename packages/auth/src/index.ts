export { normalizeEmail, normalizePhone, phoneToEmail, type AuthUser } from "./identity";
export {
  browserLocalAuthStorage,
  browserSessionAuthStorage,
  clearAuthSession,
  clearStoredAuth,
  hasUsableAccessToken,
  readAuthSession,
  readStoredJson,
  writeAuthSession,
  writeStoredJson,
  type AuthStorage,
  type StoredAuthSession,
} from "./storage";
