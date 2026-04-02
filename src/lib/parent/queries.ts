import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ParentChild = {
  student_id: string;
  full_name: string;
  class_id: string;
  class_name: string;
};

export type ParentStudentGrade = {
  id: string;
  score: number;
  evaluation_title: string;
  evaluation_date: string;
  max_score: number;
  subject_name: string;
  subject_coefficient: number;
};

export async function getParentChildren() {
  // Parent login is disabled in this deployment.
  // Parents exist as domain entities (public.parents) without Auth accounts.
  // Therefore, any query relying on auth.uid() / parents.user_id must be disabled.
  return { userId: null, children: [] as ParentChild[] };

  // (Unreachable)
}

export async function getStudentGrades(studentId: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("grades")
    .select(
      `id, score,
       evaluation:evaluations!grades_evaluation_id_fkey(
         title, evaluation_date, max_score,
         subject:subjects!evaluations_subject_id_fkey(name, coefficient)
       )`,
    )
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  type GradeRow = {
    id: string;
    score: number;
    evaluation: null | {
      title: string;
      evaluation_date: string;
      max_score: number;
      subject: null | { name: string; coefficient: number };
    };
  };

  const rows = ((data as unknown as GradeRow[]) ?? []).map((r) => {
    const evaluation = r.evaluation;
    const subject = evaluation?.subject;
    return {
      id: String(r.id),
      score: Number(r.score),
      evaluation_title: String(evaluation?.title ?? "—"),
      evaluation_date: String(evaluation?.evaluation_date ?? ""),
      max_score: Number(evaluation?.max_score ?? 20),
      subject_name: String(subject?.name ?? "—"),
      subject_coefficient: Number(subject?.coefficient ?? 1),
    } satisfies ParentStudentGrade;
  });

  return rows;
}

export async function getStudentAttendance(studentId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("attendance")
    .select("id, date, status")
    .eq("student_id", studentId)
    .order("date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getStudentReports(studentId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("reports")
    .select("id, term, average_score, attendance_rate, created_at, pdf_url")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
