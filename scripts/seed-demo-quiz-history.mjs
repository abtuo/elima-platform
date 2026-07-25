import { createHash } from "node:crypto";
import postgres from "postgres";
import { assertDemoTarget, getTargetConfig, verifyServerKey } from "./lib/supabase-target.mjs";

const demoStudents = [
  { email: "eleve.awa@demo.elima.invalid", scores: [72, 80, 86, 78, 92, 88] },
  { email: "eleve.yao@demo.elima.invalid", scores: [58, 64, 70, 76, 74, 82] },
  { email: "eleve.lina@demo.elima.invalid", scores: [84, 90, 88, 94, 92, 96] },
  { email: "eleve.eli@demo.elima.invalid", scores: [66, 72, 78, 80, 86, 90] },
  { email: "eleve.kader@demo.elima.invalid", scores: [74, 82, 78, 88, 84, 92] },
];
const subjects = ["Mathématiques", "Français", "Anglais", "SVT", "Physique-Chimie", "Histoire-Géographie"];

function stableUuid(input) {
  const hex = createHash("sha256").update(input).digest("hex").slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = ["8", "9", "a", "b"][Number.parseInt(hex[16], 16) % 4];
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
}

const config = getTargetConfig();
assertDemoTarget(config);
await verifyServerKey(config);
const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("SUPABASE_DB_URL est manquante.");
const parsedDbUrl = new URL(databaseUrl);
const directRef = parsedDbUrl.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i)?.[1];
const poolerRef = decodeURIComponent(parsedDbUrl.username).match(/^postgres\.([a-z0-9]+)$/i)?.[1];
if ((directRef ?? poolerRef) !== config.targetRef) throw new Error("SUPABASE_DB_URL ne désigne pas le nouveau projet.");

const sql = postgres(databaseUrl, { ssl: "require", max: 1, connect_timeout: 15, prepare: false, onnotice: () => {} });
const users = await sql`select id, lower(email) as email from auth.users where lower(email) in ${sql(demoStudents.map((student) => student.email))}`;
const userByEmail = new Map(users.map((user) => [user.email, user]));
let seeded = 0;

try {
  await sql.begin(async (tx) => {
    for (const student of demoStudents) {
      const user = userByEmail.get(student.email);
      if (!user) {
        console.warn(`Historique ignoré : compte démo absent (${student.email}).`);
        continue;
      }
      const attempts = student.scores.map((score, index) => {
        const date = new Date(Date.UTC(2026, 5, 10 + index * 3, 17, 0, 0));
        return {
          id: stableUuid(`demo-quiz|${student.email}|${index}`), user_id: user.id,
          quiz_ref: `demo-history-${index + 1}`, subject_label: subjects[index], score,
          total_questions: 10, correct_answers: Math.round(score / 10),
          earned_xp: Math.max(10, Math.round(score * 0.5)), completed_at: date.toISOString(),
        };
      });
      await tx`insert into public.quiz_attempts ${tx(attempts)} on conflict (id) do update set
        score = excluded.score, correct_answers = excluded.correct_answers,
        earned_xp = excluded.earned_xp, completed_at = excluded.completed_at`;
      const xp = attempts.reduce((sum, attempt) => sum + attempt.earned_xp, 0);
      const average = attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length;
      await tx`insert into public.user_progress
        (user_id, xp, streak_days, completed_quiz_count, average_score, last_activity_date)
        values (${user.id}, ${xp}, ${attempts.length}, ${attempts.length}, ${average}, ${attempts.at(-1).completed_at.slice(0, 10)})
        on conflict (user_id) do update set xp = excluded.xp, streak_days = excluded.streak_days,
        completed_quiz_count = excluded.completed_quiz_count, average_score = excluded.average_score,
        last_activity_date = excluded.last_activity_date, updated_at = now()`;
      seeded += 1;
    }
  });
} finally {
  await sql.end({ timeout: 5 });
}

console.log(`Historique quiz ajouté pour ${seeded}/${demoStudents.length} élève(s) de démonstration.`);
