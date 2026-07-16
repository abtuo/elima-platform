import { createClient } from "@supabase/supabase-js";

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ message: "Méthode non autorisée." });
  const url = String(process.env.VITE_SUPABASE_URL ?? "");
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) return response.status(500).json({ message: "Réception des demandes non configurée." });

  const body = request.body ?? {};
  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const identifier = String(body.identifier ?? "").trim();
  const schoolName = String(body.schoolName ?? "").trim();
  const schoolCity = String(body.schoolCity ?? "").trim();
  if (!firstName || !lastName || !identifier || !schoolName || !schoolCity) return response.status(400).json({ message: "Nom, contact, établissement et ville requis." });

  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin.from("school_registration_requests").insert({
    first_name: firstName,
    last_name: lastName,
    contact_identifier: identifier,
    school_name: schoolName,
    school_city: schoolCity,
    job_title: String(body.jobTitle ?? "").trim() || null,
    estimated_student_count: Number.parseInt(String(body.studentCount ?? ""), 10) || null,
    source: "app.elima.ci",
  });
  if (error) return response.status(400).json({ message: error.message.includes("school_registration_requests") ? "La migration des demandes d’établissement doit être appliquée." : error.message });
  return response.status(201).json({ ok: true });
}
