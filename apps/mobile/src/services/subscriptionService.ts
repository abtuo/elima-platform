import {createSubscriptionApi} from '@elima/revision-core';
import {apiFetch} from './api/apiClient';
import {revisionDbClient} from './revisionDbClient';
export const subscriptionRequest=createSubscriptionApi(apiFetch,async()=>(await revisionDbClient?.auth.getSession())?.data.session?.access_token);
