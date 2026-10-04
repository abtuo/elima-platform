import {createPublicSupabaseClient} from '@elima/supabase-client';
import {env,isRevisionDbConfigured} from './env';
export const revisionDbClient=isRevisionDbConfigured()?createPublicSupabaseClient({url:env.revisionSupabaseUrl,publishableKey:env.revisionSupabaseKey},{auth:{storageKey:'elima-mobile-revision',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}):null;
