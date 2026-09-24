import { createClient } from "@supabase/supabase-js";
import { parsePublicSupabaseConfig, type PublicSupabaseConfig } from "./config";

export function createPublicSupabaseClient(
  input: PublicSupabaseConfig,
  options?: Parameters<typeof createClient>[2],
) {
  const config = parsePublicSupabaseConfig(input);
  return createClient(config.url, config.publishableKey, options);
}
