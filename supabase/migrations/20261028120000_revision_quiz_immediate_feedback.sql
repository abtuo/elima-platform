-- Immediate QCM feedback without trusting a corrected client submission.
-- The first answer to each question is locked server-side before its correction is revealed.

create or replace function public.check_revision_quiz_answer(
  p_session_id uuid,
  p_user_id uuid,
  p_question_id text,
  p_answer_id text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.quiz_attempt_sessions%rowtype;
  v_question jsonb;
  v_existing jsonb;
  v_locked_answer_id text;
  v_answers jsonb;
begin
  if p_user_id is null or nullif(trim(p_question_id), '') is null or nullif(trim(p_answer_id), '') is null then
    raise exception 'Invalid quiz answer';
  end if;

  select * into v_session
  from public.quiz_attempt_sessions
  where id = p_session_id and user_id = p_user_id
  for update;

  if not found then raise exception 'Quiz attempt not found'; end if;
  if v_session.status <> 'in_progress' then raise exception 'Quiz attempt is not active'; end if;

  select value into v_question
  from jsonb_array_elements(v_session.question_snapshot -> 'questions')
  where value ->> 'id' = p_question_id
  limit 1;
  if v_question is null then raise exception 'Invalid quiz question'; end if;
  if not exists (
    select 1 from jsonb_array_elements(v_question -> 'options') option_row
    where option_row ->> 'id' = p_answer_id
  ) then
    raise exception 'Invalid answer option';
  end if;

  v_answers := coalesce(v_session.submitted_answers, '[]'::jsonb);
  select value into v_existing
  from jsonb_array_elements(v_answers)
  where value ->> 'questionId' = p_question_id
  limit 1;

  if v_existing is null then
    v_locked_answer_id := p_answer_id;
    v_answers := v_answers || jsonb_build_array(jsonb_build_object(
      'questionId', p_question_id,
      'answerId', p_answer_id
    ));
    update public.quiz_attempt_sessions
    set submitted_answers = v_answers, updated_at = now()
    where id = v_session.id;
  else
    v_locked_answer_id := v_existing ->> 'answerId';
  end if;

  return jsonb_build_object(
    'questionId', p_question_id,
    'correct', v_locked_answer_id = v_question ->> 'correctAnswerId',
    'correctAnswerId', v_question ->> 'correctAnswerId',
    'explanation', coalesce(v_question ->> 'explanation', '')
  );
end;
$$;

revoke all on function public.check_revision_quiz_answer(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.check_revision_quiz_answer(uuid, uuid, text, text) to service_role;

create or replace function public.submit_revision_quiz_attempt(
  p_session_id uuid,
  p_user_id uuid,
  p_answers jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.quiz_attempt_sessions%rowtype;
  v_progress public.user_progress%rowtype;
  v_question jsonb;
  v_answer jsonb;
  v_answer_id text;
  v_scoring_answers jsonb;
  v_total integer;
  v_correct integer := 0;
  v_score integer;
  v_xp integer;
  v_count integer;
  v_average numeric(5,2);
  v_streak integer;
  v_day date := timezone('utc', now())::date;
  v_attempt_id uuid;
  v_corrections jsonb := '[]'::jsonb;
  v_result jsonb;
begin
  if p_user_id is null or p_answers is null or jsonb_typeof(p_answers) <> 'array' then
    raise exception 'Invalid quiz submission';
  end if;

  select * into v_session
  from public.quiz_attempt_sessions
  where id = p_session_id and user_id = p_user_id
  for update;

  if not found then raise exception 'Quiz attempt not found'; end if;
  if v_session.status = 'submitted' then return v_session.result; end if;
  if v_session.status <> 'in_progress' then raise exception 'Quiz attempt is not active'; end if;

  v_total := jsonb_array_length(v_session.question_snapshot -> 'questions');
  -- Old clients submit only once and remain compatible. As soon as immediate
  -- feedback was requested, every first answer must have been locked server-side.
  if v_session.submitted_answers is null then
    v_scoring_answers := p_answers;
  else
    v_scoring_answers := v_session.submitted_answers;
    if jsonb_array_length(v_scoring_answers) <> v_total then
      raise exception 'Quiz answers are incomplete';
    end if;
  end if;

  if jsonb_array_length(v_scoring_answers) > v_total then raise exception 'Too many quiz answers'; end if;
  if (select count(*) from jsonb_array_elements(v_scoring_answers)) <>
     (select count(distinct item ->> 'questionId') from jsonb_array_elements(v_scoring_answers) item) then
    raise exception 'Duplicate quiz answer';
  end if;
  if exists (
    select 1 from jsonb_array_elements(v_scoring_answers) submitted
    where not exists (
      select 1 from jsonb_array_elements(v_session.question_snapshot -> 'questions') question_row
      where question_row ->> 'id' = submitted ->> 'questionId'
    )
  ) then
    raise exception 'Invalid quiz question';
  end if;

  for v_question in select value from jsonb_array_elements(v_session.question_snapshot -> 'questions') loop
    select value into v_answer
    from jsonb_array_elements(v_scoring_answers)
    where value ->> 'questionId' = v_question ->> 'id'
    limit 1;
    v_answer_id := v_answer ->> 'answerId';

    if v_answer_id is not null and not exists (
      select 1 from jsonb_array_elements(v_question -> 'options') option_row
      where option_row ->> 'id' = v_answer_id
    ) then
      raise exception 'Invalid answer option';
    end if;

    if v_answer_id is not null and v_answer_id = v_question ->> 'correctAnswerId' then
      v_correct := v_correct + 1;
    end if;
    v_corrections := v_corrections || jsonb_build_array(jsonb_build_object(
      'questionId', v_question ->> 'id',
      'correctAnswerId', v_question ->> 'correctAnswerId',
      'explanation', coalesce(v_question ->> 'explanation', '')
    ));
    v_answer := null;
    v_answer_id := null;
  end loop;

  v_score := round(v_correct * 100.0 / greatest(v_total, 1));
  v_xp := greatest(10, round(v_score * 0.5));

  select * into v_progress from public.user_progress where user_id = p_user_id for update;
  if not found then
    insert into public.user_progress(
      user_id, verified_xp, verified_streak_days, verified_completed_quiz_count,
      verified_average_score, verified_last_activity_date
    ) values (p_user_id, v_xp, 1, 1, v_score, v_day);
  else
    v_count := v_progress.verified_completed_quiz_count + 1;
    v_average := round(((v_progress.verified_average_score * v_progress.verified_completed_quiz_count) + v_score)::numeric / v_count, 2);
    v_streak := case
      when v_progress.verified_last_activity_date = v_day then v_progress.verified_streak_days
      when v_progress.verified_last_activity_date = v_day - 1 then v_progress.verified_streak_days + 1
      else 1
    end;
    update public.user_progress set
      verified_xp = verified_xp + v_xp,
      verified_streak_days = v_streak,
      verified_completed_quiz_count = v_count,
      verified_average_score = v_average,
      verified_last_activity_date = greatest(coalesce(verified_last_activity_date, v_day), v_day),
      updated_at = now()
    where user_id = p_user_id;
  end if;

  insert into public.quiz_attempts(
    user_id, quiz_ref, subject_label, topic, source, source_document_id,
    score, total_questions, correct_answers, earned_xp, completed_at,
    score_trust, server_attempt_id
  ) values (
    p_user_id, v_session.quiz_ref, v_session.subject_label, v_session.topic,
    v_session.source, v_session.source_document_id, v_score, v_total, v_correct,
    v_xp, now(), 'server_verified', v_session.id
  ) returning id into v_attempt_id;

  v_result := jsonb_build_object(
    'attemptId', v_attempt_id,
    'sessionId', v_session.id,
    'score', v_score,
    'totalQuestions', v_total,
    'correctAnswers', v_correct,
    'earnedXp', v_xp,
    'scoreTrust', 'server_verified',
    'corrections', v_corrections
  );

  update public.quiz_attempt_sessions set
    status = 'submitted', submitted_answers = v_scoring_answers, result = v_result,
    submitted_at = now(), updated_at = now()
  where id = v_session.id;

  return v_result;
end;
$$;

revoke all on function public.submit_revision_quiz_attempt(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.submit_revision_quiz_attempt(uuid, uuid, jsonb) to service_role;
