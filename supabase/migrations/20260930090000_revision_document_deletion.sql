create or replace function public.delete_revision_document(
  p_user_id uuid,
  p_document_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.revision_documents
    where id = p_document_id and user_id = p_user_id
  ) then
    return false;
  end if;

  delete from public.user_course_summaries
  where user_id = p_user_id
    and cache_key = 'document-analysis:' || p_document_id::text;

  update public.quiz_attempts
  set source_document_id = null
  where user_id = p_user_id and source_document_id = p_document_id;

  delete from public.revision_documents
  where id = p_document_id and user_id = p_user_id;

  return found;
end;
$$;

revoke all on function public.delete_revision_document(uuid, uuid) from public, anon, authenticated;
grant execute on function public.delete_revision_document(uuid, uuid) to service_role;
