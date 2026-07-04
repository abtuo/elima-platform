import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";
import { assertTeacherAssignment, resolveTeacher, resolveTermId } from "@/lib/teacher/server";
import { lessonLogInputSchema } from "@/lib/validation";

/** List lesson-log entries (cahier de textes) for a class. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const classId = url.searchParams.get("classId");
    const subjectId = url.searchParams.get("subjectId");

    const ctx = await resolveTeacher();
    if ("error" in ctx) return ctx.error;
    const admin = await createSupabaseAdminServerClient();

    let query = admin
      .from("lesson_logs")
      .select("id, class_id, subject_id, teacher_id, term_id, lesson_date, content, resource_url, created_at")
      .eq("school_id", ctx.schoolId)
      .order("lesson_date", { ascending: false })
      .limit(200);
    if (classId) query = query.eq("class_id", classId);
    if (subjectId) query = query.eq("subject_id", subjectId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    return NextResponse.json({ lessons: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}

/** Create a lesson-log entry. */
export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = lessonLogInputSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ message: "Données invalides", issues: parsed.error.issues }, { status: 400 });
    }
    const ctx = await resolveTeacher();
    if ("error" in ctx) return ctx.error;
    const admin = await createSupabaseAdminServerClient();
    const assignmentError = await assertTeacherAssignment(admin, ctx, parsed.data.classId, parsed.data.subjectId);
    if (assignmentError) return assignmentError;
    const termId = await resolveTermId(admin, ctx.schoolId, parsed.data.term ?? null);

    const { data, error } = await admin
      .from("lesson_logs")
      .insert({
        school_id: ctx.schoolId,
        class_id: parsed.data.classId,
        subject_id: parsed.data.subjectId,
        teacher_id: ctx.teacherId,
        term_id: termId,
        lesson_date: parsed.data.lessonDate,
        content: parsed.data.content.trim(),
        resource_url: parsed.data.resourceUrl ?? null,
      } as never)
      .select("id")
      .single();
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, id: (data as { id: string }).id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}

/** Delete a lesson-log entry owned by the teacher's school. */
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ message: "id requis" }, { status: 400 });

    const ctx = await resolveTeacher();
    if ("error" in ctx) return ctx.error;
    const admin = await createSupabaseAdminServerClient();

    const { error } = await admin.from("lesson_logs").delete().eq("id", id).eq("school_id", ctx.schoolId);
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
