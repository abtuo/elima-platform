import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";
import { assertTeacherAssignment, resolveTeacher } from "@/lib/teacher/server";
import { homeworkInputSchema } from "@/lib/validation";

/** List homeworks for a class (optionally filtered by subject). */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const classId = url.searchParams.get("classId");
    const subjectId = url.searchParams.get("subjectId");

    const ctx = await resolveTeacher();
    if ("error" in ctx) return ctx.error;
    const admin = await createSupabaseAdminServerClient();

    let query = admin
      .from("homeworks")
      .select("id, class_id, subject_id, teacher_id, title, description, resource_url, due_date, created_at")
      .eq("school_id", ctx.schoolId)
      .order("due_date", { ascending: false })
      .limit(200);
    if (classId) query = query.eq("class_id", classId);
    if (subjectId) query = query.eq("subject_id", subjectId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    return NextResponse.json({ homeworks: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}

/** Create a homework. */
export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = homeworkInputSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ message: "Données invalides", issues: parsed.error.issues }, { status: 400 });
    }
    const ctx = await resolveTeacher();
    if ("error" in ctx) return ctx.error;
    const admin = await createSupabaseAdminServerClient();
    const assignmentError = await assertTeacherAssignment(admin, ctx, parsed.data.classId, parsed.data.subjectId);
    if (assignmentError) return assignmentError;

    const { data, error } = await admin
      .from("homeworks")
      .insert({
        school_id: ctx.schoolId,
        class_id: parsed.data.classId,
        subject_id: parsed.data.subjectId,
        teacher_id: ctx.teacherId,
        title: parsed.data.title.trim(),
        description: parsed.data.description ?? null,
        resource_url: parsed.data.resourceUrl ?? null,
        due_date: parsed.data.dueDate,
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

/** Update a homework owned by the teacher's school and assignment. */
export async function PUT(request: Request) {
  try {
    const json = (await request.json()) as { id?: string };
    const id = String(json.id ?? "").trim();
    const parsed = homeworkInputSchema.safeParse(json);
    if (!id) return NextResponse.json({ message: "id requis" }, { status: 400 });
    if (!parsed.success) {
      return NextResponse.json({ message: "DonnÃ©es invalides", issues: parsed.error.issues }, { status: 400 });
    }

    const ctx = await resolveTeacher();
    if ("error" in ctx) return ctx.error;
    const admin = await createSupabaseAdminServerClient();
    const assignmentError = await assertTeacherAssignment(admin, ctx, parsed.data.classId, parsed.data.subjectId);
    if (assignmentError) return assignmentError;

    const { error } = await admin
      .from("homeworks")
      .update({
        class_id: parsed.data.classId,
        subject_id: parsed.data.subjectId,
        teacher_id: ctx.teacherId,
        title: parsed.data.title.trim(),
        description: parsed.data.description ?? null,
        resource_url: parsed.data.resourceUrl ?? null,
        due_date: parsed.data.dueDate,
      } as never)
      .eq("id", id)
      .eq("school_id", ctx.schoolId);
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}

/** Delete a homework owned by the teacher's school. */
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ message: "id requis" }, { status: 400 });

    const ctx = await resolveTeacher();
    if ("error" in ctx) return ctx.error;
    const admin = await createSupabaseAdminServerClient();

    const { error } = await admin.from("homeworks").delete().eq("id", id).eq("school_id", ctx.schoolId);
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
