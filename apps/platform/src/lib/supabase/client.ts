import { createBrowserClient } from "@supabase/ssr";
import { parsePublicSupabaseConfig } from "@elima/supabase-client";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const config = parsePublicSupabaseConfig({ url, publishableKey: anonKey });
  return createBrowserClient(config.url, config.publishableKey);
}
