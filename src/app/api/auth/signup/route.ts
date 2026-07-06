import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { sendNotificationEmail } from "@/lib/email";
import { checkSchoolFeature } from "@/lib/plans-server";

const DEFAULT_COUNTRY = "Côte d'Ivoire";

/** Messages Supabase Auth souvent en anglais → français pour l’UI. */
function signupAuthErrorToMessage(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("already been registered") || m.includes("already registered") || m.includes("user already exists")) {
    return "Un compte existe déjà avec cette adresse e-mail. Connecte-toi ou utilise « mot de passe oublié ».";
  }
  if (m.includes("email") && (m.includes("invalid") || m.includes("validate"))) {
    return "Adresse e-mail invalide ou refusée par le serveur.";
  }
  if (m.includes("password") && (m.includes("least") || m.includes("short") || m.includes("weak"))) {
    return "Mot de passe trop court ou trop faible. Vérifie la politique des mots de passe (Supabase → Authentication → Policies).";
  }
  if (m.includes("sign up") && m.includes("disabled")) {
    return "Les inscriptions par e-mail sont désactivées dans ton projet Supabase (Authentication → Providers → Email).";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Trop de tentatives. Réessaie dans quelques minutes.";
  }
  if (m.includes("unauthorized") || m.includes("invalid api key")) {
    return "Configuration serveur incorrecte (clé API Supabase). Vérifie SUPABASE_SERVICE_ROLE_KEY sur l’hébergement.";
  }
  return raw;
}

export async function POST(request: Request) {
  try {
  const body = (await request.json().catch(() => null)) as null | {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    role?: "SCHOOL_ADMIN" | "TEACHER" | "PARENT";
    schoolName?: string;
    phone?: string;
    city?: string;
  };

  const firstName = String(body?.firstName ?? "").trim();
  const lastName = String(body?.lastName ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const role = body?.role ?? null;
  const schoolName = String(body?.schoolName ?? "").trim();
  const phone = String(body?.phone ?? "").trim();
  const city = String(body?.city ?? "").trim();

  if (!firstName || !lastName || !email || !password || !role || !schoolName) {
    return NextResponse.json(
      { message: "Nom, prénom, email, mot de passe, rôle et établissement requis." },
      { status: 400 },
    );
  }

  if (!env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY === env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json(
      { message: "Clé service role Supabase manquante/invalide. Vérifiez SUPABASE_SERVICE_ROLE_KEY." },
      { status: 401 },
    );
  }

  const admin = await createSupabaseAdminServerClient();
  const { error: adminCheckError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (adminCheckError) {
    return NextResponse.json(
      {
        message: `Service role invalide ou projet incorrect: ${adminCheckError.message}`,
      },
      { status: 401 },
    );
  }
  const fullName = `${firstName} ${lastName}`.trim();

  let schoolId: string | null = null;
  if (role === "SCHOOL_ADMIN") {
    const { data: school, error: schoolError } = await admin
      .from("schools")
      .insert({
        name: schoolName,
        country: DEFAULT_COUNTRY,
        city: city || null,
        phone: phone || null,
        plan: "basic",
      })
      .select("id")
      .single();

    if (schoolError || !school) {
      return NextResponse.json({ message: schoolError?.message ?? "Création école impossible" }, { status: 400 });
    }
    schoolId = school.id;
  } else {
    const { data: existingSchool } = await admin
      .from("schools")
      .select("id")
      .ilike("name", schoolName)
      .maybeSingle();

    if (existingSchool?.id) {
      schoolId = existingSchool.id;
      const planErr = await checkSchoolFeature(String(schoolId), "online_enrollment");
      if (planErr) return planErr;
    } else {
      const { data: newSchool, error: newSchoolError } = await admin
        .from("schools")
        .insert({
          name: schoolName,
          country: DEFAULT_COUNTRY,
          city: city || null,
          phone: phone || null,
          plan: "basic",
        })
        .select("id")
        .single();

      if (newSchoolError || !newSchool) {
        return NextResponse.json(
          { message: newSchoolError?.message ?? "Création école impossible" },
          { status: 400 },
        );
      }
      schoolId = newSchool.id;
    }
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role,
      school_id: schoolId,
      full_name: fullName,
      phone,
    },
  });

  if (error) {
    const status = error.message.toLowerCase().includes("unauthorized") ? 401 : 400;
    return NextResponse.json({ message: signupAuthErrorToMessage(error.message) }, { status });
  }

  try {
    await sendNotificationEmail({
      subject: "Nouvelle inscription Elima",
      html: `
        <h2>Nouvelle inscription</h2>
        <p><strong>Nom:</strong> ${fullName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Rôle:</strong> ${role}</p>
        <p><strong>Établissement:</strong> ${schoolName}</p>
        ${phone ? `<p><strong>Téléphone:</strong> ${phone}</p>` : ""}
        ${city ? `<p><strong>Ville:</strong> ${city}</p>` : ""}
      `,
      text: `Nouvelle inscription: ${fullName} (${email}) - rôle ${role} - école ${schoolName}`,
    });
  } catch (mailError) {
    console.error("Signup email error", mailError);
  }

  return NextResponse.json({ ok: true, userId: data.user?.id ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    console.error("[signup]", err);
    return NextResponse.json(
      {
        message:
          message.includes("Missing required environment variable") || message.includes("SUPABASE")
            ? "Configuration serveur incomplète (variables d’environnement Supabase). Vérifie le déploiement."
            : message,
      },
      { status: 500 },
    );
  }
}