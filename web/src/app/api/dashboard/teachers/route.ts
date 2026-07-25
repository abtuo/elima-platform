import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";

type TeacherRow = {
  id: string;
  user_id: string;
};

type UserRow = {
  id: string;
  full_name: string | null;
};

function slugEmailPart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

function randomPassword(length = 14) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let out = "ELM-";
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const admin = await createSupabaseAdminServerClient();

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ message: authErr.message }, { status: 401 });
    const userId = authData.user?.id;
    if (!userId) return NextResponse.json({ message: "Utilisateur non authentifié" }, { status: 401 });

    const { data: userRow, error: userErr } = await admin
      .from("users")
      .select("school_id")
      .eq("id", userId)
      .maybeSingle();

    if (userErr) return NextResponse.json({ message: userErr.message }, { status: 400 });
    if (!userRow?.school_id) return NextResponse.json({ teachers: [] });

    const { data: teachersData, error: teachersErr } = await admin
      .from("teachers")
      .select("id, user_id")
      .eq("school_id", userRow.school_id)
      .order("created_at", { ascending: true });

    if (teachersErr) return NextResponse.json({ message: teachersErr.message }, { status: 400 });

    const teachers = (teachersData ?? []) as TeacherRow[];
    if (!teachers.length) return NextResponse.json({ teachers: [] });

    const userIds = teachers.map((teacher) => teacher.user_id);
    const { data: usersData, error: usersErr } = await admin
      .from("users")
      .select("id, full_name")
      .in("id", userIds);

    if (usersErr) return NextResponse.json({ message: usersErr.message }, { status: 400 });

    const usersById = new Map<string, UserRow>((usersData ?? []).map((row) => [row.id, row as UserRow]));
    const payload = teachers.map((teacher) => ({
      id: teacher.id,
      fullName: usersById.get(teacher.user_id)?.full_name ?? "Enseignant sans nom",
    }));

    return NextResponse.json({ teachers: payload });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { teachers?: Array<{ fullName?: string; email?: string | null }> }
      | null;
    const entries = body?.teachers ?? [];
    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ message: "Aucun enseignant à créer." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const admin = await createSupabaseAdminServerClient();

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ message: authErr.message }, { status: 401 });
    const userId = authData.user?.id;
    if (!userId) return NextResponse.json({ message: "Utilisateur non authentifié" }, { status: 401 });

    const { data: actorRow, error: actorErr } = await admin
      .from("users")
      .select("school_id, role")
      .eq("id", userId)
      .maybeSingle();
    if (actorErr) return NextResponse.json({ message: actorErr.message }, { status: 400 });
    if (!actorRow?.school_id) return NextResponse.json({ message: "École introuvable." }, { status: 404 });
    if (actorRow.role !== "SCHOOL_ADMIN" && actorRow.role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Accès refusé." }, { status: 403 });
    }
    const schoolId = String(actorRow.school_id);

    const { data: existingTeacherUsers } = await admin
      .from("users")
      .select("id, full_name")
      .eq("school_id", schoolId)
      .eq("role", "TEACHER");
    const existingNames = new Set(
      (existingTeacherUsers ?? [])
        .map((u) => String((u as { full_name?: string | null }).full_name ?? "").trim().toLocaleLowerCase("fr"))
        .filter(Boolean),
    );

    const created: Array<{ id: string; fullName: string; source: "created" }> = [];
    const skipped: Array<{ fullName: string; reason: string }> = [];

    for (let i = 0; i < entries.length; i += 1) {
      const fullName = String(entries[i]?.fullName ?? "").trim().replace(/\s+/g, " ");
      if (!fullName) continue;

      const key = fullName.toLocaleLowerCase("fr");
      if (existingNames.has(key)) {
        skipped.push({ fullName, reason: "Déjà existant" });
        continue;
      }

      const maybeEmail = String(entries[i]?.email ?? "").trim().toLowerCase();
      const emailLocal = slugEmailPart(fullName) || `teacher${Date.now()}`;
      const finalEmail = maybeEmail || `${emailLocal}.${Date.now()}.${i}@elima.local`;
      const tempPassword = randomPassword();

      const authCreate = await admin.auth.admin.createUser({
        email: finalEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          role: "TEACHER",
          school_id: schoolId,
          full_name: fullName,
        },
      });
      if (authCreate.error || !authCreate.data.user?.id) {
        skipped.push({ fullName, reason: authCreate.error?.message ?? "Création Auth impossible" });
        continue;
      }

      const authUserId = authCreate.data.user.id;
      const { error: upsertUserErr } = await admin.from("users").upsert(
        {
          id: authUserId,
          email: finalEmail,
          school_id: schoolId,
          role: "TEACHER",
          full_name: fullName,
        },
        { onConflict: "id" },
      );
      if (upsertUserErr) {
        skipped.push({ fullName, reason: upsertUserErr.message });
        continue;
      }

      const { data: teacherRow, error: teacherErr } = await admin
        .from("teachers")
        .upsert({ school_id: schoolId, user_id: authUserId }, { onConflict: "user_id" })
        .select("id")
        .maybeSingle();
      if (teacherErr || !teacherRow?.id) {
        skipped.push({ fullName, reason: teacherErr?.message ?? "Création teacher impossible" });
        continue;
      }

      existingNames.add(key);
      created.push({ id: String(teacherRow.id), fullName, source: "created" });
    }

    return NextResponse.json({ created, skipped });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
