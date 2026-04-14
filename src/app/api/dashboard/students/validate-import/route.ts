import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";

type StudentPayload = {
  fullName: string;
  registrationNumber?: string | null;
  birthDate?: string | null;
};

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { classId?: string; students?: StudentPayload[] }
      | null;
    const classId = String(body?.classId ?? "").trim();
    const students = body?.students ?? [];
    if (!classId) return NextResponse.json({ message: "classId manquant" }, { status: 400 });
    if (!students.length) return NextResponse.json({ message: "Aucun eleve a valider" }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const admin = await createSupabaseAdminServerClient();

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ message: authErr.message }, { status: 401 });
    const userId = authData.user?.id;
    if (!userId) return NextResponse.json({ message: "Utilisateur non authentifie" }, { status: 401 });

    const { data: userRow, error: userErr } = await admin
      .from("users")
      .select("school_id")
      .eq("id", userId)
      .maybeSingle();
    if (userErr) return NextResponse.json({ message: userErr.message }, { status: 400 });
    if (!userRow?.school_id) return NextResponse.json({ message: "Aucune ecole associee" }, { status: 400 });
    const schoolId = String(userRow.school_id);

    const { data: classRow, error: classErr } = await admin
      .from("classes")
      .select("id")
      .eq("id", classId)
      .eq("school_id", schoolId)
      .maybeSingle();
    if (classErr) return NextResponse.json({ message: classErr.message }, { status: 400 });
    if (!classRow) return NextResponse.json({ message: "Classe invalide pour cette ecole" }, { status: 404 });

    const { data: existingRows, error: existingErr } = await admin
      .from("students")
      .select("full_name")
      .eq("school_id", schoolId)
      .eq("class_id", classId);
    if (existingErr) return NextResponse.json({ message: existingErr.message }, { status: 400 });

    const existingNames = new Set(
      (existingRows ?? []).map((row) => String((row as { full_name: string }).full_name).toLocaleLowerCase("fr")),
    );

    const seenInPayload = new Set<string>();
    const toInsert = students
      .map((student) => ({
        fullName: normalizeName(String(student.fullName ?? "")),
        registrationNumber: student.registrationNumber ? String(student.registrationNumber).trim() : null,
        birthDate: student.birthDate ? String(student.birthDate).trim() : null,
      }))
      .filter((student) => student.fullName.length >= 2)
      .filter((student) => {
        const key = student.fullName.toLocaleLowerCase("fr");
        if (seenInPayload.has(key)) return false;
        seenInPayload.add(key);
        return true;
      })
      .filter((student) => !existingNames.has(student.fullName.toLocaleLowerCase("fr")))
      .map((student) => ({
        school_id: schoolId,
        class_id: classId,
        full_name: student.fullName,
        registration_number: student.registrationNumber,
        birth_date: student.birthDate,
      }));

    if (toInsert.length > 0) {
      const { error: insertErr } = await admin.from("students").insert(toInsert);
      if (insertErr) return NextResponse.json({ message: insertErr.message }, { status: 400 });
    }

    return NextResponse.json({
      inserted: toInsert.length,
      skipped: students.length - toInsert.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
