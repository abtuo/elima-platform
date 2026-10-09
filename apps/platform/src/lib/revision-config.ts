import { parsePublicSupabaseConfig } from '@elima/supabase-client';
import { requireProject, REVISION_PROJECT } from './elima-api';

export function revisionConfig() {
  const url = requireProject(process.env.NEXT_PUBLIC_REVISION_SUPABASE_URL, REVISION_PROJECT);
  return parsePublicSupabaseConfig({ url, publishableKey: process.env.NEXT_PUBLIC_REVISION_SUPABASE_ANON_KEY });
}
