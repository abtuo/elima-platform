import { redirect } from 'next/navigation';
import { createSupabaseServerClient, createSupabaseAdminServerClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { isValidRole } from '@/lib/rbac';
import { getRoleHomePath } from '@/lib/role-home';

export default async function PlatformHome() {
  let destination = '/login';
  if (isSupabaseConfigured()) {
    try {
      const client = await createSupabaseServerClient();
      const { data, error } = await client.auth.getUser();
      if (!error && data.user) {
        const admin = await createSupabaseAdminServerClient();
        const profile = await admin.from('users').select('role').eq('id', data.user.id).maybeSingle();
        if (!profile.error && isValidRole(String(profile.data?.role))) destination = getRoleHomePath(profile.data!.role);
      }
    } catch { /* Login remains available when the session or configuration is unavailable. */ }
  }
  redirect(destination);
}
