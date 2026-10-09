import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { revisionConfig } from '../revision-config';

// Separate project => separate sb-<project>-auth-token cookies. No admin key needed.
export async function createRevisionServerClient() {
  const config = revisionConfig();
  if (!config) throw new Error('Configuration Révision incomplète.');
  const store = await cookies();
  return createServerClient(config.url, config.publishableKey, {
    cookies: { getAll: () => store.getAll(), setAll: values => values.forEach(({name, value, options}) => store.set(name, value, options)) },
  });
}
