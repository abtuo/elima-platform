import type { SupabaseClient } from "@supabase/supabase-js";
import { createPublicSupabaseClient } from "@elima/supabase-client";
import { env, isMainDbConfigured } from "./env";
import { sensitiveAuthStorage } from "./authStorage";
import { isNativeRuntime } from "./nativeRuntime";

// Explicitly preserve Supabase's existing default key for session migration/cleanup.
export const revisionSessionStorageKey = isMainDbConfigured()
  ? `sb-${new URL(env.mainSupabaseUrl).hostname.split(".")[0]}-auth-token` : "elima_revision_session";

export const mainDbClient: SupabaseClient | null = isMainDbConfigured()
  ? createPublicSupabaseClient({ url: env.mainSupabaseUrl, publishableKey: env.mainSupabaseAnonKey }, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: !isNativeRuntime(), storage: sensitiveAuthStorage, storageKey: revisionSessionStorageKey },
    })
  : null;
