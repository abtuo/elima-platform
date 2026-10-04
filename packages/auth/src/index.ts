export { normalizeEmail, normalizePhone, phoneToEmail, type AuthUser } from "./identity.ts";
export { createWhatsAppAuthApi, type AccountRegistrationInput } from './whatsapp.ts';
export {
  browserLocalAuthStorage,
  browserSessionAuthStorage,
  clearAsyncAuthSession,
  clearAuthSession,
  clearStoredAuth,
  hasUsableAccessToken,
  readAuthSession,
  readAsyncAuthSession,
  readStoredJson,
  writeAuthSession,
  writeAsyncAuthSession,
  writeStoredJson,
  NativeSecureStorage,
  WebStorage,
  type AsyncAuthStorage,
  type AuthStorage,
  type NativeSecureStorageDriver,
  type StoredAuthSession,
} from "./storage.ts";
