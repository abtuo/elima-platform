import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, isMainDbConfigured } from "./env";

export const mainDbClient: SupabaseClient | null = isMainDbConfigured()
  ? createClient(env.mainSupabaseUrl, env.mainSupabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
