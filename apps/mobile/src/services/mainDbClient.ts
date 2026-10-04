import type { SupabaseClient } from "@supabase/supabase-js";
import { createPublicSupabaseClient } from "@elima/supabase-client";
import { env, isMainDbConfigured } from "./env";

export const mainDbClient: SupabaseClient | null = isMainDbConfigured()
  ? createPublicSupabaseClient({ url: env.mainSupabaseUrl, publishableKey: env.mainSupabaseAnonKey }, {
      auth: { storageKey: 'elima-mobile-identity', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null;
