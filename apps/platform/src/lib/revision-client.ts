'use client';

import { createBrowserClient } from '@supabase/ssr';
import { createApiClient } from '@elima/api-client';
import { createRevisionDataService, createRevisionDocumentService, createSubjectPreferencesService, createSubscriptionApi } from '@elima/revision-core';
import { revisionConfig } from './revision-config';

let services: ReturnType<typeof initializeRevision> | undefined;
export function createPlatformRevision() {
  return services ??= initializeRevision();
}

function initializeRevision() {
  const config = revisionConfig();
  if (!config) throw new Error('Configuration Révision incomplète.');
  const client = createBrowserClient(config.url, config.publishableKey, { isSingleton: false });
  const { apiFetch } = createApiClient({ baseUrl: process.env.NEXT_PUBLIC_REVISION_API_BASE_URL, environment: 'production', requireRemoteBackend: true });
  const subscription = createSubscriptionApi(apiFetch, async () => (await client.auth.getSession()).data.session?.access_token);
  return {
    client, subscription,
    data: createRevisionDataService({ revisionDbClient: client, apiFetch, isDemoModeActive: () => false, subscriptionRequest: subscription }),
    documents: createRevisionDocumentService({ mainDbClient: client, apiFetch }),
    subjects: createSubjectPreferencesService({ mainDbClient: client }),
  };
}
