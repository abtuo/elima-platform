import type {SupabaseClient} from '@supabase/supabase-js';

export function createSubjectPreferencesService(dependencies:{mainDbClient:SupabaseClient|null}) {
const {mainDbClient}=dependencies;

async function getSubjectPreferences(userId?: string): Promise<string[]> {
  if (!mainDbClient || !userId) return [];
  const { data, error } = await mainDbClient.from("student_revision_subject_preferences").select("subject_id").eq("user_id", userId);
  if (error) return [];
  return (data ?? []).map(row => String(row.subject_id));
}

async function saveSubjectPreferences(subjectIds: string[]) {
  const selected = [...new Set(subjectIds.map(value => value.trim()).filter(Boolean))];
  if (!selected.length) throw new Error("Choisis au moins une matière.");
  if (!mainDbClient) throw new Error("Service indisponible.");
  const { data: auth } = await mainDbClient.auth.getUser();
  if (!auth.user) throw new Error("Session expirée.");
  const { data: existing, error: readError } = await mainDbClient.from("student_revision_subject_preferences").select("subject_id").eq("user_id", auth.user.id);
  if (readError) throw new Error(readError.message);
  const current = new Set((existing ?? []).map(row => String(row.subject_id)));
  const additions = selected.filter(id => !current.has(id));
  const removals = [...current].filter(id => !selected.includes(id));
  if (additions.length) {
    const inserted = await mainDbClient.from("student_revision_subject_preferences").insert(additions.map(subjectId => ({ user_id: auth.user!.id, subject_id: subjectId })));
    if (inserted.error) throw new Error(inserted.error.message);
  }
  if (removals.length) {
    const removed = await mainDbClient.from("student_revision_subject_preferences").delete().eq("user_id", auth.user.id).in("subject_id", removals);
    if (removed.error) throw new Error(removed.error.message);
  }
}

return {getSubjectPreferences,saveSubjectPreferences};
}
