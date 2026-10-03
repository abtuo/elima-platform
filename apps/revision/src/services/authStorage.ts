import { NativeSecureStorage, WebStorage, type AsyncAuthStorage } from "@elima/auth";
import { SecureStorage } from "@aparajita/capacitor-secure-storage";
import { isNativeRuntime } from "./nativeRuntime";

const legacyWebStorage = new WebStorage("localStorage");

export const sensitiveAuthStorage: AsyncAuthStorage = isNativeRuntime()
  ? new NativeSecureStorage(legacyWebStorage, SecureStorage)
  : legacyWebStorage;
