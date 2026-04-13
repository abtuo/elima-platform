import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";

type ConfigurePayload = {
  level: string;
  academicYear: string;
  numberOfClasses: number;
  numberingScheme: "letters" | "numbers";
  subjects: Array<{
    name: string;
    selected?: boolean;
    coefficient?: number | null;
  }>;
};

function buildClassName(level: string, index: number, scheme: "letters" | "numbers") {
  if (scheme === "letters") {
    const letter = String.fromCharCode(64 + index);
    return `${level} ${letter}`;
  }
  return `${level} ${index}`;
}

function getNextIndexFromNames(level: string, names: string[], scheme: "letters" | "numbers") {
  const normalizedLevel = level.trim();
  const prefix = normalizedLevel.toLowerCase();
  const indices = names
    .map((name) => String(name || "").trim())
    .filter((name) => name.toLowerCase().startsWith(prefix))
    .map((name) => name.slice(normalizedLevel.length).trim())
    .map((suffix) => {
      if (!suffix) return null;
      if (scheme === "letters") {
        const char = suffix.trim().charAt(0).toUpperCase();
        const code = char.charCodeAt(0);
        if (code >= 65 && code <= 90) return code - 64;
        return null;
      }
      const match = suffix.match(/\d+/);
      return match ? Number(match[0]) : null;
    })
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (indices.length === 0) return 1;
  return Math.max(...indices) + 1;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => null)) as ConfigurePayload | null;
    if (!payload) return NextResponse.json({ message: "Données invalides." }, { status: 400 });

    const { level, academicYear, numberOfClasses, numberingScheme, subjects } = payload;

    if (!level?.trim()) return NextResponse.json({ message: "Le niveau est requis." }, { status: 400 });
    if (!academicYear?.trim()) return NextResponse.json({ message: "L'année scolaire est requise." }, { status: 400 });
    if (!numberOfClasses || numberOfClasses < 1)
      return NextResponse.json({ message: "Le nombre de classes doit être supérieur à 0." }, { status: 400 });
    if (!numberingScheme) return NextResponse.json({ message: "Le type de numérotation est requis." }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const admin = await createSupabaseAdminServerClient();

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ message: authErr.message }, { status: 401 });
    const userId = authData.user?.id;
    if (!userId) return NextResponse.json({ message: "Utilisateur non authentifié" }, { status: 401 });

    const { data: userRow, error: userErr } = await admin
      .from("users")
      .select("school_id, role")
      .eq("id", userId)
      .maybeSingle();

    if (userErr) return NextResponse.json({ message: userErr.message }, { status: 400 });
    if (!userRow?.school_id) return NextResponse.json({ message: "École introuvable." }, { status: 400 });
    if (userRow.role !== "SCHOOL_ADMIN")
      return NextResponse.json({ message: "Accès refusé." }, { status: 403 });

    const schoolId = String(userRow.school_id);

    const { data: existingClasses, error: existingClassesErr } = await admin
      .from("classes")
      .select("name")
      .eq("school_id", schoolId)
      .eq("level", level.trim());

    if (existingClassesErr)
      return NextResponse.json({ message: existingClassesErr.message }, { status: 400 });

    const startIndex = getNextIndexFromNames(
      level.trim(),
      (existingClasses ?? []).map((row) => String(row.name)),
      numberingScheme,
    );

    const classesToInsert = Array.from({ length: numberOfClasses }, (_, idx) => ({
      school_id: schoolId,
      name: buildClassName(level.trim(), startIndex + idx, numberingScheme),
      level: level.trim(),
      academic_year: academicYear.trim(),
    }));

    const { data: createdClasses, error: classErr } = await admin
      .from("classes")
      .insert(classesToInsert)
      .select("id, name, level, academic_year");

    if (classErr) return NextResponse.json({ message: classErr.message }, { status: 400 });

    const selectedSubjects = (subjects ?? []).filter((subject) => subject.selected !== false);
    if (selectedSubjects.length === 0) {
      return NextResponse.json({ classes: createdClasses ?? [], subjects: [] });
    }

    const { data: existingSubjects, error: existingSubjectsErr } = await admin
      .from("subjects")
      .select("id, name, coefficient")
      .eq("school_id", schoolId);

    if (existingSubjectsErr)
      return NextResponse.json({ message: existingSubjectsErr.message }, { status: 400 });

    const existingByName = new Map(
      (existingSubjects ?? []).map((subject) => [subject.name.toLowerCase(), subject]),
    );

    const subjectsToInsert = selectedSubjects
      .filter((subject) => !existingByName.has(subject.name.toLowerCase()))
      .map((subject) => ({
        school_id: schoolId,
        name: subject.name.trim(),
        coefficient: subject.coefficient ?? 1,
      }));

    let insertedSubjects: Array<{ id: string; name: string }> = [];
    if (subjectsToInsert.length > 0) {
      const { data: inserted, error: insertErr } = await admin
        .from("subjects")
        .insert(subjectsToInsert)
        .select("id, name");
      if (insertErr) return NextResponse.json({ message: insertErr.message }, { status: 400 });
      insertedSubjects = inserted ?? [];
    }

    const allSubjects = [...(existingSubjects ?? []), ...insertedSubjects];
    const selectedIds = selectedSubjects
      .map((subject) => allSubjects.find((row) => row.name.toLowerCase() === subject.name.toLowerCase()))
      .filter(Boolean)
      .map((row) => row!.id);

    const levelSubjectRows = selectedIds.map((subjectId) => ({
      school_id: schoolId,
      level: level.trim(),
      subject_id: subjectId,
    }));

    const { data: levelSubjects, error: levelErr } = await admin
      .from("level_subjects")
      .insert(levelSubjectRows)
      .select("id, subject_id");

    if (levelErr) {
      if (levelErr.message?.includes("level_subjects")) {
        return NextResponse.json({ classes: createdClasses ?? [], subjects: [] });
      }
      return NextResponse.json({ message: levelErr.message }, { status: 400 });
    }

    return NextResponse.json({ classes: createdClasses ?? [], subjects: levelSubjects ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}