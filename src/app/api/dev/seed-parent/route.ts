import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";
import { phoneToEmail } from "@/lib/phone-auth";

// DEV ONLY: creates a demo school/class/student + a parent user that can login using phone+password.
// Protected by a simple secret header to avoid accidental exposure.

export async function POST(request: Request) {
  const secret = request.headers.get("x-elima-dev-secret");
  if (!process.env.ELIMA_DEV_SEED_SECRET || secret !== process.env.ELIMA_DEV_SEED_SECRET) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as null | { phone?: string; password?: string };
  const phone = String(body?.phone ?? "").trim();
  const password = String(body?.password ?? "");
  if (!phone || !password) {
    return NextResponse.json({ message: "Téléphone et mot de passe requis" }, { status: 400 });
  }

  const supabase = await createSupabaseAdminServerClient();
  const email = phoneToEmail(phone);

  // 1) Create auth user (or reuse)
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { phone },
  });

  if (createErr && !createErr.message.toLowerCase().includes("already")) {
    return NextResponse.json({ message: createErr.message }, { status: 400 });
  }

  // If already exists, find by email
  const userId = created?.user?.id
    ?? (await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })).data.users.find((u) => u.email === email)?.id;

  if (!userId) {
    return NextResponse.json({ message: "Impossible de récupérer l’utilisateur auth" }, { status: 500 });
  }

  // 2) Create school
  const { data: schoolRow, error: schoolErr } = await supabase
    .from("schools")
    .upsert({ name: "École Démo Elima", country: "Côte d’Ivoire", city: "Abidjan" }, { onConflict: "name" })
    .select("id")
    .single();
  if (schoolErr) return NextResponse.json({ message: schoolErr.message }, { status: 400 });

  // 3) Create parent user profile
  const { error: userErr } = await supabase.from("users").upsert(
    {
      id: userId,
      school_id: schoolRow.id,
      role: "PARENT",
      full_name: "Parent Démo",
      phone,
    },
    { onConflict: "id" },
  );
  if (userErr) return NextResponse.json({ message: userErr.message }, { status: 400 });

  // 4) parent table
  const { data: parentRow, error: parentErr } = await supabase
    .from("parents")
    .upsert({ school_id: schoolRow.id, user_id: userId }, { onConflict: "user_id" })
    .select("id")
    .single();
  if (parentErr) return NextResponse.json({ message: parentErr.message }, { status: 400 });

  // 5) class
  const { data: classRow, error: classErr } = await supabase
    .from("classes")
    .insert({ school_id: schoolRow.id, name: "6e A", level: "6e", academic_year: "2025-2026" })
    .select("id")
    .single();
  if (classErr && !classErr.message.toLowerCase().includes("duplicate")) {
    // If duplicate, just pick first matching
  }

  const classId = classRow?.id
    ?? (await supabase.from("classes").select("id").eq("school_id", schoolRow.id).eq("name", "6e A").single()).data?.id;

  if (!classId) return NextResponse.json({ message: "Impossible de récupérer la classe" }, { status: 500 });

  // 6) student
  const { data: studentRow, error: studentErr } = await supabase
    .from("students")
    .insert({ school_id: schoolRow.id, class_id: classId, full_name: "Élève Démo" })
    .select("id")
    .single();
  if (studentErr && !studentErr.message.toLowerCase().includes("duplicate")) {
    // ignore
  }
  const studentId = studentRow?.id
    ?? (await supabase.from("students").select("id").eq("school_id", schoolRow.id).eq("full_name", "Élève Démo").single()).data?.id;
  if (!studentId) return NextResponse.json({ message: "Impossible de récupérer l’élève" }, { status: 500 });

  // 7) link
  const { error: linkErr } = await supabase
    .from("student_parents")
    .upsert({ student_id: studentId, parent_id: parentRow.id, relationship: "Père/Mère" }, { onConflict: "student_id,parent_id" });
  if (linkErr) return NextResponse.json({ message: linkErr.message }, { status: 400 });

  return NextResponse.json({
    ok: true,
    parent: { phone, email, userId, parentId: parentRow.id },
    student: { studentId },
    school: { schoolId: schoolRow.id },
  });
}
