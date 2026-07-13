import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, isRevisionDbConfigured } from "./env";

export const revisionDbClient: SupabaseClient | null = isRevisionDbConfigured()
  ? createClient(env.revisionSupabaseUrl, env.revisionSupabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
