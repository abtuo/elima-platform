import postgres from "postgres";

const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("SUPABASE_DB_URL est manquante.");

const sql = postgres(databaseUrl, { ssl: "require", max: 1, prepare: false });

try {
  const [counts] = await sql`
    select
      (select count(*)::int from public.exam_subjects where status = 'published') as exams,
      (select count(*)::int from public.learning_exercises where status = 'published') as exercises,
      (select count(*)::int from public.learning_questions) as questions,
      (select count(*)::int from public.learning_question_hints) as hints,
      (select count(*)::int from public.learning_solution_steps) as corrections
  `;
  const exams = await sql`
    select e.title, l.label as level, s.label as subject, e.country_code,
      count(distinct ese.exercise_id)::int as exercises,
      count(q.id)::int as questions
    from public.exam_subjects e
    join public.learning_levels l on l.id = e.level_id
    join public.learning_subjects s on s.id = e.subject_id
    join public.exam_subject_exercises ese on ese.exam_subject_id = e.id
    join public.learning_questions q on q.exercise_id = ese.exercise_id
    where e.status = 'published'
    group by e.id, l.label, s.label
    order by e.country_code
  `;
  const [security] = await sql`
    select
      not has_table_privilege('authenticated', 'public.learning_question_secrets', 'select') as secrets_protected,
      not has_table_privilege('authenticated', 'public.learning_question_hints', 'select') as hints_protected,
      not has_table_privilege('authenticated', 'public.learning_solution_steps', 'select') as solutions_protected,
      (select relrowsecurity from pg_class where oid = 'public.learning_attempts'::regclass) as attempts_rls,
      (select relrowsecurity from pg_class where oid = 'public.learning_answers'::regclass) as answers_rls,
      (select relrowsecurity from pg_class where oid = 'public.learning_ai_evaluations'::regclass) as ai_evaluations_rls,
      not has_table_privilege('authenticated', 'public.learning_ai_evaluations', 'insert') as ai_evaluations_server_only
  `;
  const bucket = await sql`select id, public from storage.buckets where id = 'exam-sources'`;
  const pdfs = await sql`select name from storage.objects where bucket_id = 'exam-sources' order by name`;
  const examProfiles = await sql`
    select u.email, class.name as class_name, class.level,
      coalesce(config.is_exam_level, false) as is_exam_level
    from public.users u
    join public.students student on student.user_id = u.id
    join public.classes class on class.id = student.class_id
    left join public.learning_levels config
      on lower(config.label) = lower(class.level)
      and (config.country_code is null or config.country_code = 'CI')
    where lower(u.email) like '%kader%'
  `;

  console.log("Catalogue publié :", counts);
  console.table(exams);
  console.log("Sécurité :", security);
  console.log("Bucket :", bucket[0] ?? "absent");
  console.log("PDF présents :", pdfs.map((item) => item.name));
  console.log("Profil Terminale C :", examProfiles);

  if (counts.exams !== 2 || counts.exercises < 30 || counts.questions < 152) throw new Error("Le catalogue importé est incomplet.");
  if (!security.secrets_protected || !security.hints_protected || !security.solutions_protected || !security.attempts_rls || !security.answers_rls || !security.ai_evaluations_rls || !security.ai_evaluations_server_only) throw new Error("Un contrôle de sécurité Learning a échoué.");
  if (!bucket[0] || bucket[0].public) throw new Error("Le bucket exam-sources doit exister et rester privé.");
} finally {
  await sql.end({ timeout: 5 });
}
