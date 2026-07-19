import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { sendNotificationEmail } from "@/lib/email";
import { checkSchoolFeature } from "@/lib/plans-server";
import { createHash } from "node:crypto";

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
    role?: "SCHOOL_ADMIN" | "SCHOOL_STAFF" | "TEACHER" | "PARENT" | "STUDENT";
    schoolName?: string;
    phone?: string;
    city?: string;
    schoolLevel?: string;
    declaredSchoolName?: string;
    declaredSchoolCity?: string;
    returnTo?: string;
    schoolCode?: string;
  };

  const firstName = String(body?.firstName ?? "").trim();
  const lastName = String(body?.lastName ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const role = body?.role ?? null;
  const schoolName = String(body?.schoolName ?? "").trim();
  const phone = String(body?.phone ?? "").trim();
  const city = String(body?.city ?? "").trim();
  const schoolCode = String(body?.schoolCode ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  const isStandaloneStudent = role === "STUDENT";
  const isSchoolHead = role === "SCHOOL_ADMIN";
  const isSchoolMember = role === "SCHOOL_STAFF" || role === "TEACHER" || role === "PARENT";
  if (!firstName || !lastName || !email || !password || !role || (isSchoolHead && !schoolName) || (isSchoolMember && schoolCode.length < 6)) {
    return NextResponse.json(
      { message: "Nom, prénom, email, mot de passe et informations d’établissement requis." },
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
  if (role === "STUDENT") {
    schoolId = null;
  } else if (isSchoolHead) {
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
  } else if (isSchoolMember) {
    const codeHash = createHash("sha256").update(schoolCode).digest("hex");
    const authRole = role === "SCHOOL_STAFF" ? "ADMIN" : role;
    const { data: joinCode, error: codeError } = await admin
      .from("school_join_codes")
      .select("id, school_id, allowed_roles, expires_at, max_uses, use_count, active")
      .eq("code_hash", codeHash)
      .maybeSingle();
    const allowedRoles = Array.isArray(joinCode?.allowed_roles) ? joinCode.allowed_roles.map(String) : [];
    const expired = joinCode?.expires_at && new Date(String(joinCode.expires_at)).getTime() <= Date.now();
    const exhausted = joinCode?.max_uses != null && Number(joinCode.use_count ?? 0) >= Number(joinCode.max_uses);
    if (codeError || !joinCode || !joinCode.active || expired || exhausted || !allowedRoles.includes(String(authRole))) {
      return NextResponse.json({ message: "Code école invalide, expiré ou non autorisé pour ce rôle." }, { status: 400 });
    }
    schoolId = String(joinCode.school_id);
    const planErr = await checkSchoolFeature(schoolId, "online_enrollment");
    if (planErr) return planErr;
    await admin.from("school_join_codes").update({ use_count: Number(joinCode.use_count ?? 0) + 1, updated_at: new Date().toISOString() }).eq("id", joinCode.id);
  }

  const authRole = role === "SCHOOL_STAFF" ? "ADMIN" : role;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: authRole,
      school_id: schoolId,
      full_name: fullName,
      phone,
    },
  });

  if (error) {
    const status = error.message.toLowerCase().includes("unauthorized") ? 401 : 400;
    return NextResponse.json({ message: signupAuthErrorToMessage(error.message) }, { status });
  }

  if (role === "STUDENT" && data.user?.id) {
    const { error: prospectError } = await admin.from("student_prospects").upsert({
      user_id: data.user.id,
      declared_school_name: String(body?.declaredSchoolName ?? "").trim() || null,
      declared_school_city: String(body?.declaredSchoolCity ?? "").trim() || null,
      school_level: String(body?.schoolLevel ?? "").trim() || null,
      updated_at: new Date().toISOString(),
    });
    if (prospectError) return NextResponse.json({ message: `Compte créé, mais profil incomplet : ${prospectError.message}` }, { status: 500 });
  }

  try {
    await sendNotificationEmail({
      subject: "Nouvelle inscription Elima",
      html: `
        <h2>Nouvelle inscription</h2>
        <p><strong>Nom:</strong> ${fullName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Rôle:</strong> ${authRole}</p>
        <p><strong>Établissement:</strong> ${schoolName}</p>
        ${phone ? `<p><strong>Téléphone:</strong> ${phone}</p>` : ""}
        ${city ? `<p><strong>Ville:</strong> ${city}</p>` : ""}
      `,
      text: `Nouvelle inscription: ${fullName} (${email}) - rôle ${authRole} - école ${schoolName || schoolId || "indépendant"}`,
    });
  } catch (mailError) {
    console.error("Signup email error", mailError);
  }

  const requestedReturn = safeStudentReturn(String(body?.returnTo ?? ""));
  const loginUrl = requestedReturn ? `/login/email?redirect=${encodeURIComponent(requestedReturn)}` : "/login/email";
  let session: { access_token: string; refresh_token: string; expires_in: number } | null = null;
  if (request.headers.get("x-elima-client") === "mobile-app") {
    const authClient = await createSupabaseServerClient();
    const signedIn = await authClient.auth.signInWithPassword({ email, password });
    if (signedIn.data.session) {
      session = {
        access_token: signedIn.data.session.access_token,
        refresh_token: signedIn.data.session.refresh_token,
        expires_in: signedIn.data.session.expires_in,
      };
    } else if (signedIn.error) {
      console.error("[signup] automatic mobile login failed", signedIn.error.message);
    }
  }
  return NextResponse.json({ ok: true, userId: data.user?.id ?? null, loginUrl, session });
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

function safeStudentReturn(value: string) {
  try {
    const url = new URL(value);
    if (url.origin === "https://app.elima.ci" && url.pathname === "/auth/elima/start") return url.toString();
    if (process.env.NODE_ENV !== "production" && url.origin === "http://localhost:5173" && url.pathname === "/auth/elima/start") return url.toString();
  } catch { /* URL absente ou invalide */ }
  return null;
}
