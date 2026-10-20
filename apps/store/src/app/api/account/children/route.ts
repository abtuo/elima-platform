import { NextResponse } from "next/server";
import { createIdentityClient, isIdentityConfigured } from "@/lib/supabase-server";
export async function GET() {
  if (!isIdentityConfigured()) return NextResponse.json({ configured: false, authenticated: false, children: [] });
  const supabase = await createIdentityClient(); const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ configured: true, authenticated: false, children: [] }, { headers: { "Cache-Control": "no-store" } });
  const { data: parent } = await supabase.from("parents").select("id").eq("user_id", auth.user.id).maybeSingle();
  if (!parent?.id) return NextResponse.json({ configured: true, authenticated: true, children: [] }, { headers: { "Cache-Control": "no-store" } });
  const { data, error } = await supabase.from("student_parents").select("student:students!student_parents_student_id_fkey(id, full_name, class:classes!students_class_id_fkey(name), school:schools!students_school_id_fkey(name))").eq("parent_id", parent.id);
  if (error) return NextResponse.json({ configured: true, authenticated: true, children: [], integrationAvailable: false }, { headers: { "Cache-Control": "no-store" } });
  const children = (data || []).flatMap((row: { student: unknown }) => { const raw = row.student as unknown; const student = (Array.isArray(raw) ? raw[0] : raw) as { id?: string; full_name?: string; class?: { name?: string } | { name?: string }[]; school?: { name?: string } | { name?: string }[] } | null; if (!student?.id) return []; const classRow = Array.isArray(student.class) ? student.class[0] : student.class; const schoolRow = Array.isArray(student.school) ? student.school[0] : student.school; return [{ id: student.id, name: student.full_name || "Élève", grade: classRow?.name || "Niveau non renseigné", school: schoolRow?.name || "Établissement partenaire", supplyListAvailable: false }]; });
  return NextResponse.json({ configured: true, authenticated: true, children, integrationAvailable: true }, { headers: { "Cache-Control": "no-store" } });
}
