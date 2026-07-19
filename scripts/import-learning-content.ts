import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

type JsonRecord = Record<string, unknown>;
type SourceFile = { file: string; aliases: string[]; importSubjects: boolean; format?: "guided_sessions_v3" };

const sources: SourceFile[] = [
  { file: "bac-france-2026-maths-j1.json", aliases: ["elima_bac_francais_2026_jour1_correction_interactive.json"], importSubjects: true },
  { file: "bac-ci-2026-maths-serie-c.json", aliases: ["elima_bac_c_2026_correction_interactive.json"], importSubjects: true },
  { file: "terminale-c-demo-bank.json", aliases: ["elima_terminale_c_demo_bank.json"], importSubjects: false },
  { file: "6eme-maths-guided-sessions-v3.json", aliases: [], importSubjects: false, format: "guided_sessions_v3" },
];
const selectedSources = process.argv.includes("--guided-only") ? sources.filter((source) => source.format === "guided_sessions_v3") : sources;

function records(value: unknown, label: string): JsonRecord[] {
  if (!Array.isArray(value)) throw new Error(`${label} doit être un tableau.`);
  return value.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error(`${label}[${index}] doit être un objet.`);
    return item as JsonRecord;
  });
}

function required(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} est requis.`);
  return value.trim();
}

function slug(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function countryCode(value: unknown) {
  const country = String(value ?? "").toLowerCase();
  if (country.includes("ivoire")) return "CI";
  if (country.includes("france")) return "FR";
  return null;
}

function educationSystem(country: string | null) {
  return country === "CI" ? "cote-divoire" : country === "FR" ? "france" : null;
}

function questionType(validation: JsonRecord) {
  const type = String(validation.type ?? "semantic");
  if (type === "choice") return "choice";
  if (type === "boolean") return "boolean";
  if (["numeric", "integer", "rational"].includes(type)) return type;
  if (type === "code_line") return "code";
  return "math_expression";
}

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function guidedOptions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => typeof item === "string"
    ? { id: String(index), label: item }
    : { id: String((item as JsonRecord).id ?? index), label: String((item as JsonRecord).label ?? "") });
}

function guidedValidation(step: JsonRecord) {
  const type = String(step.type ?? "acknowledgement");
  if (type === "single_choice") return { type: "choice", correct: strings(step.correct_option_ids)[0] ?? null, feedback: step.feedback ?? null };
  if (type === "multiple_choice") return { type: "multiple_choice", correct: strings(step.correct_option_ids) };
  if (type === "ordering") return { type: "ordering", correct: strings(step.correct_order) };
  if (type === "self_assessment") return { type: "acknowledgement", masteryWeights: Object.fromEntries((Array.isArray(step.options) ? step.options : []).map((item) => {
    const option = item as JsonRecord;
    return [String(option.id ?? ""), Number(option.mastery_weight ?? 0)];
  })) };
  return { type: "acknowledgement" };
}

function guidedQuestionType(step: JsonRecord) {
  return String(step.type ?? "acknowledgement");
}

async function loadSource(source: SourceFile) {
  const candidates = [source.file, ...source.aliases];
  for (const candidate of candidates) {
    try {
      const body = await readFile(path.resolve("data/exams", candidate), "utf8");
      const parsed = JSON.parse(body) as JsonRecord;
      return { parsed, candidate };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw new Error(`${candidate}: ${(error as Error).message}`);
    }
  }
  throw new Error(`Fichier introuvable : data/exams/${source.file} (alias accepté : ${source.aliases.join(", ")}).`);
}

const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("SUPABASE_DB_URL est manquante.");
const sql = postgres(databaseUrl, { ssl: "require", max: 1, prepare: false });
const counts = { exams: 0, exercises: 0, parts: 0, questions: 0, hints: 0, corrections: 0 };

try {
  const loaded = await Promise.all(selectedSources.map(async (source) => ({ source, ...(await loadSource(source)) })));
  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtext('elima-learning-content-import'))`;
    for (const { source, parsed, candidate } of loaded) {
      if (source.format === "guided_sessions_v3") {
        const sessions = records(parsed.sessions, `${candidate}.sessions`);

        // Les anciens parcours 6e ne doivent plus apparaître. Leurs réponses sont
        // supprimées par cascade avec les tentatives, puis le contenu est archivé.
        await tx`
          delete from public.learning_attempts
          where exercise_id in (
            select id from public.learning_exercises
            where external_id like 'CI-6M-%' and external_id not like 'CI-6M-V2-%'
          )`;
        await tx`
          update public.learning_exercises
          set status='archived', updated_at=now()
          where external_id like 'CI-6M-%' and external_id not like 'CI-6M-V2-%'`;

        for (const session of sessions) {
          const externalId = required(session.id, `${candidate}.session.id`);
          const levelLabel = required(session.level, `${externalId}.level`);
          const subjectLabel = required(session.subject, `${externalId}.subject`);
          const country = countryCode(session.country);
          const levelExternal = `${country ?? "INT"}:${slug(levelLabel)}`;
          const [level] = await tx`
            insert into public.learning_levels(external_id,label,country_code,education_system,is_exam_level)
            values(${levelExternal},${levelLabel},${country},${educationSystem(country)},false)
            on conflict(external_id) do update set label=excluded.label,country_code=excluded.country_code,
              education_system=excluded.education_system,updated_at=now()
            returning id`;
          const subjectExternal = slug(subjectLabel);
          const [subjectRow] = await tx`
            insert into public.learning_subjects(external_id,label) values(${subjectExternal},${subjectLabel})
            on conflict(external_id) do update set label=excluded.label returning id`;
          const chapterLabel = required(session.chapter, `${externalId}.chapter`);
          const chapterExternal = `${subjectExternal}:${slug(chapterLabel)}`;
          const [chapter] = await tx`
            insert into public.learning_chapters(external_id,subject_id,label) values(${chapterExternal},${subjectRow.id},${chapterLabel})
            on conflict(external_id) do update set label=excluded.label,subject_id=excluded.subject_id returning id`;

          const flow = records(session.session_flow, `${externalId}.session_flow`);
          const transfer = session.final_transfer_check && typeof session.final_transfer_check === "object"
            ? { ...(session.final_transfer_check as JsonRecord), id: "transfer", title: "Question de transfert", type: "single_choice", is_transfer: true,
                options: guidedOptions((session.final_transfer_check as JsonRecord).options),
                correct_option_ids: [String((session.final_transfer_check as JsonRecord).correct_index ?? 0)] }
            : null;
          const steps = transfer ? [...flow, transfer] : flow;
          const assessedSteps = steps.filter((step) => ["single_choice", "multiple_choice", "ordering"].includes(String(step.type))).length;
          const statement = session.statement && typeof session.statement === "object" ? session.statement as JsonRecord : {};
          const metadata = {
            engine: "guided_session_v3",
            version: String((parsed.metadata as JsonRecord)?.version ?? "3.0.0"),
            objective: session.objective ?? null,
            situation: session.situation ?? null,
            materials: strings(session.materials),
            skills: strings(session.skills),
            paperRequired: Boolean(session.paper_required),
            statement,
            statementBeforeGuidance: session.statement_before_guidance !== false,
            remediation: strings(session.remediation),
            scoring: session.scoring ?? {},
          };
          const description = String(statement.context ?? session.situation ?? session.objective ?? "");
          const [exerciseRow] = await tx`
            insert into public.learning_exercises(external_id,title,description,country_code,education_system,level_id,subject_id,chapter_id,difficulty,estimated_minutes,total_points,status,source_type,metadata)
            values(${externalId},${required(session.title, `${externalId}.title`)},${description},${country},${educationSystem(country)},${level.id},${subjectRow.id},${chapter.id},${String(session.difficulty ?? "intermediaire")},${Number(session.estimated_minutes ?? 25)},${assessedSteps},'published','guided_session_v3',${tx.json(metadata)})
            on conflict(external_id) do update set title=excluded.title,description=excluded.description,country_code=excluded.country_code,education_system=excluded.education_system,level_id=excluded.level_id,subject_id=excluded.subject_id,chapter_id=excluded.chapter_id,difficulty=excluded.difficulty,estimated_minutes=excluded.estimated_minutes,total_points=excluded.total_points,status='published',source_type=excluded.source_type,metadata=excluded.metadata,updated_at=now()
            returning id`;
          const [partRow] = await tx`
            insert into public.learning_exercise_parts(exercise_id,external_id,title,position,metadata)
            values(${exerciseRow.id},'session','Parcours guidé',0,${tx.json({ paperRequired: Boolean(session.paper_required) })})
            on conflict(exercise_id,external_id) do update set title=excluded.title,position=excluded.position,metadata=excluded.metadata returning id`;
          counts.exercises++;
          counts.parts++;

          for (const [position, step] of steps.entries()) {
            const questionExternal = required(step.id, `${externalId}.step.id`);
            const validation = guidedValidation(step);
            const rawOptions = guidedOptions(step.options);
            const publicMetadata = {
              stepType: String(step.type),
              options: rawOptions,
              items: guidedOptions(step.items),
              checklist: strings(step.checklist),
              responseOptions: guidedOptions(step.response_options),
              mainQuestions: strings(step.main_questions),
              paperInstructions: strings(step.paper_instructions),
              display: step.display ?? null,
              actionLabel: step.action_label ?? null,
              hintCount: strings(step.hints).length,
              isTransfer: Boolean(step.is_transfer),
            };
            const expected = validation.type === "choice" ? validation.correct
              : validation.type === "multiple_choice" || validation.type === "ordering" ? validation.correct
              : "acknowledged";
            const [questionRow] = await tx`
              insert into public.learning_questions(exercise_id,part_id,external_id,title,prompt,question_type,position,points,skills,public_metadata)
              values(${exerciseRow.id},${partRow.id},${questionExternal},${String(step.title ?? "Étape")},${required(step.prompt, `${externalId}.${questionExternal}.prompt`)},${guidedQuestionType(step)},${position},${["single_choice", "multiple_choice", "ordering"].includes(String(step.type)) ? 1 : 0},${tx.json(strings(session.skills))},${tx.json(publicMetadata)})
              on conflict(exercise_id,external_id) do update set part_id=excluded.part_id,title=excluded.title,prompt=excluded.prompt,question_type=excluded.question_type,position=excluded.position,points=excluded.points,skills=excluded.skills,public_metadata=excluded.public_metadata returning id`;
            await tx`
              insert into public.learning_question_secrets(question_id,expected_answer,validation_config,correction_metadata)
              values(${questionRow.id},${tx.json(expected)},${tx.json(validation)},${tx.json({ source: candidate, feedback: step.feedback ?? null })})
              on conflict(question_id) do update set expected_answer=excluded.expected_answer,validation_config=excluded.validation_config,correction_metadata=excluded.correction_metadata,updated_at=now()`;
            await tx`delete from public.learning_question_hints where question_id=${questionRow.id}`;
            for (const [index, hint] of strings(step.hints).slice(0, 3).entries()) {
              await tx`insert into public.learning_question_hints(question_id,level,content,position,score_penalty) values(${questionRow.id},${index + 1},${hint},${index},${index + 1})`;
              counts.hints++;
            }
            await tx`delete from public.learning_solution_steps where question_id=${questionRow.id}`;
            const solutionBlocks = Array.isArray(step.solution_blocks) ? step.solution_blocks : [];
            for (const [index, rawBlock] of solutionBlocks.entries()) {
              const block = rawBlock as JsonRecord;
              const content = typeof block.content === "string" ? block.content : JSON.stringify(block.content ?? "");
              await tx`insert into public.learning_solution_steps(question_id,position,title,content,validation_config) values(${questionRow.id},${index},${String(block.kind ?? "Étape")},${content},${tx.json({ kind: block.kind ?? "step" })})`;
              counts.corrections++;
            }
            counts.questions++;
          }
        }
        continue;
      }
      const exercises = records(parsed.exercises, `${candidate}.exercises`);
      const subjects = records(parsed.subjects, `${candidate}.subjects`);
      const subjectByExercise = new Map<string, JsonRecord>();
      for (const subject of subjects) for (const id of recordsOrStrings(subject.exercise_ids)) subjectByExercise.set(String(id), subject);

      for (const exercise of exercises) {
        const externalId = required(exercise.id, `${candidate}.exercise.id`);
        const parent = subjectByExercise.get(externalId) ?? {};
        const levelLabel = required(exercise.level ?? parent.level, `${externalId}.level`);
        const subjectLabel = required(exercise.subject ?? parent.subject ?? "Mathématiques", `${externalId}.subject`);
        const country = countryCode(exercise.country ?? parent.country);
        const levelExternal = `${country ?? "INT"}:${slug(levelLabel)}`;
        const [level] = await tx`
          insert into public.learning_levels(external_id,label,country_code,education_system,is_exam_level)
          values(${levelExternal},${levelLabel},${country},${educationSystem(country)},${source.importSubjects})
          on conflict(external_id) do update set label=excluded.label,country_code=excluded.country_code,
            education_system=excluded.education_system,is_exam_level=public.learning_levels.is_exam_level or excluded.is_exam_level,updated_at=now()
          returning id`;
        const subjectExternal = slug(subjectLabel);
        const [subjectRow] = await tx`
          insert into public.learning_subjects(external_id,label) values(${subjectExternal},${subjectLabel})
          on conflict(external_id) do update set label=excluded.label returning id`;
        const chapterLabel = required(exercise.chapter ?? "Questions transversales", `${externalId}.chapter`);
        const chapterExternal = `${subjectExternal}:${slug(chapterLabel)}`;
        const [chapter] = await tx`
          insert into public.learning_chapters(external_id,subject_id,label) values(${chapterExternal},${subjectRow.id},${chapterLabel})
          on conflict(external_id) do update set label=excluded.label,subject_id=excluded.subject_id returning id`;
        const metadata = { statement: exercise.statement ?? exercise.context ?? null, instructions: exercise.instructions ?? [], tags: exercise.tags ?? [] };
        const [exerciseRow] = await tx`
          insert into public.learning_exercises(external_id,title,description,country_code,education_system,level_id,subject_id,chapter_id,difficulty,estimated_minutes,total_points,status,source_type,metadata)
          values(${externalId},${required(exercise.title, `${externalId}.title`)},${String(exercise.context ?? exercise.statement ?? "") || null},${country},${educationSystem(country)},${level.id},${subjectRow.id},${chapter.id},${String(exercise.difficulty ?? "intermediaire")},${Number(exercise.estimated_minutes ?? 15)},${Number(exercise.points ?? 0)},'published',${source.importSubjects ? "official_exam" : "exercise_bank"},${tx.json(metadata)})
          on conflict(external_id) do update set title=excluded.title,description=excluded.description,country_code=excluded.country_code,education_system=excluded.education_system,level_id=excluded.level_id,subject_id=excluded.subject_id,chapter_id=excluded.chapter_id,difficulty=excluded.difficulty,estimated_minutes=excluded.estimated_minutes,total_points=excluded.total_points,status='published',source_type=excluded.source_type,metadata=excluded.metadata,updated_at=now()
          returning id`;
        counts.exercises++;
        await tx`delete from public.learning_exercise_parts where exercise_id=${exerciseRow.id}`;
        const partList = Array.isArray(exercise.parts) ? records(exercise.parts, `${externalId}.parts`) : [{ id: "main", title: "Exercice", questions: exercise.questions }];
        let questionPosition = 0;
        for (const [partIndex, part] of partList.entries()) {
          const partExternal = String(part.id ?? `part-${partIndex + 1}`);
          const [partRow] = await tx`insert into public.learning_exercise_parts(exercise_id,external_id,title,position) values(${exerciseRow.id},${partExternal},${String(part.title ?? "Exercice")},${partIndex}) returning id`;
          counts.parts++;
          for (const question of records(part.questions, `${externalId}.${partExternal}.questions`)) {
            const questionExternal = required(question.id, `${externalId}.question.id`);
            const validation = (question.validation && typeof question.validation === "object" ? question.validation : { type: "semantic" }) as JsonRecord;
            const skills = Array.isArray(question.skills) ? question.skills : Array.isArray(exercise.tags) ? exercise.tags : [];
            const publicMetadata = { answerFormat: validation.type ?? "semantic", options: question.options ?? validation.options ?? null };
            const [questionRow] = await tx`
              insert into public.learning_questions(exercise_id,part_id,external_id,title,prompt,question_type,position,points,skills,public_metadata)
              values(${exerciseRow.id},${partRow.id},${questionExternal},${String(question.title ?? "Question")},${required(question.prompt, `${externalId}.${questionExternal}.prompt`)},${questionType(validation)},${questionPosition++},${Number(question.points ?? 0)},${tx.json(skills)},${tx.json(publicMetadata)})
              on conflict(exercise_id,external_id) do update set part_id=excluded.part_id,title=excluded.title,prompt=excluded.prompt,question_type=excluded.question_type,position=excluded.position,points=excluded.points,skills=excluded.skills,public_metadata=excluded.public_metadata returning id`;
            await tx`
              insert into public.learning_question_secrets(question_id,expected_answer,validation_config,correction_metadata)
              values(${questionRow.id},${tx.json(question.expected_answer ?? null)},${tx.json(validation)},${tx.json({ source: candidate })})
              on conflict(question_id) do update set expected_answer=excluded.expected_answer,validation_config=excluded.validation_config,correction_metadata=excluded.correction_metadata,updated_at=now()`;
            await tx`delete from public.learning_question_hints where question_id=${questionRow.id}`;
            for (const [index, hint] of (Array.isArray(question.hints) ? question.hints : []).slice(0, 2).entries()) {
              await tx`insert into public.learning_question_hints(question_id,level,content,position,score_penalty) values(${questionRow.id},${index + 1},${String(hint)},${index},${index + 1})`;
              counts.hints++;
            }
            await tx`delete from public.learning_solution_steps where question_id=${questionRow.id}`;
            const solution = Array.isArray(question.solution_steps) ? question.solution_steps : Array.isArray(question.solution) ? question.solution : question.solution ? [question.solution] : [];
            for (const [index, step] of solution.entries()) {
              await tx`insert into public.learning_solution_steps(question_id,position,content) values(${questionRow.id},${index},${String(step)})`;
              counts.corrections++;
            }
            counts.questions++;
          }
        }
      }

      if (source.importSubjects) for (const exam of subjects) {
        const externalId = required(exam.id, `${candidate}.subject.id`);
        const levelLabel = required(exam.level, `${externalId}.level`);
        const subjectLabel = required(exam.subject ?? "Mathématiques", `${externalId}.subject`);
        const country = countryCode(exam.country);
        const [level] = await tx`select id from public.learning_levels where external_id=${`${country ?? "INT"}:${slug(levelLabel)}`}`;
        const [subjectRow] = await tx`select id from public.learning_subjects where external_id=${slug(subjectLabel)}`;
        const title = required(exam.title, `${externalId}.title`);
        const pdfPath = country === "FR" ? "france/bac-2026-mathematiques-jour-1.pdf" : country === "CI" ? "cote-divoire/bac-2026-mathematiques-serie-c.pdf" : null;
        const [examRow] = await tx`
          insert into public.exam_subjects(external_id,slug,title,country_code,education_system,level_id,subject_id,year,session,exam_type,duration_minutes,total_points,coefficient,source_pdf_path,status,instructions,metadata)
          values(${externalId},${slug(externalId)},${title},${country},${educationSystem(country)},${level.id},${subjectRow.id},${Number(exam.year ?? 2026)},${String(exam.session ?? "Session 2026")},'official',${Number(exam.duration_minutes ?? 240)},${Number(exam.total_points ?? 20)},${exam.coefficient == null ? null : Number(exam.coefficient)},${pdfPath},'published',${tx.json(exam.instructions ?? [])},${tx.json({ sourceType: exam.source_type ?? "official" })})
          on conflict(external_id) do update set title=excluded.title,country_code=excluded.country_code,education_system=excluded.education_system,level_id=excluded.level_id,subject_id=excluded.subject_id,year=excluded.year,session=excluded.session,duration_minutes=excluded.duration_minutes,total_points=excluded.total_points,coefficient=excluded.coefficient,source_pdf_path=excluded.source_pdf_path,status='published',instructions=excluded.instructions,metadata=excluded.metadata,updated_at=now() returning id`;
        await tx`delete from public.exam_subject_exercises where exam_subject_id=${examRow.id}`;
        for (const [position, exerciseId] of recordsOrStrings(exam.exercise_ids).entries()) {
          const [exerciseRow] = await tx`select id from public.learning_exercises where external_id=${String(exerciseId)}`;
          if (!exerciseRow) throw new Error(`${externalId}: exercice référencé introuvable (${exerciseId}).`);
          await tx`insert into public.exam_subject_exercises(exam_subject_id,exercise_id,position) values(${examRow.id},${exerciseRow.id},${position})`;
        }
        counts.exams++;
      }
    }
  });
  console.log("Import terminé :");
  console.table({ Examens: counts.exams, Exercices: counts.exercises, Parties: counts.parts, Questions: counts.questions, Indices: counts.hints, Corrections: counts.corrections });
} finally {
  await sql.end({ timeout: 5 });
}

function recordsOrStrings(value: unknown): Array<string | number> {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string | number => typeof item === "string" || typeof item === "number");
}
