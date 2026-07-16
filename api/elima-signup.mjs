function normalizeIdentifier(value) {
  const identifier = String(value ?? "").trim().toLowerCase();
  if (identifier.includes("@")) return { email: identifier, phone: "" };
  const phone = identifier.replace(/[\s\-().]/g, "");
  return { email: phone ? `${phone}@phone.elima` : "", phone };
}

const roleMap = {
  student: "STUDENT",
  teacher: "TEACHER",
  parent: "PARENT",
  school_staff: "SCHOOL_STAFF",
};

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ message: "Méthode non autorisée." });
  const webBaseUrl = String(process.env.VITE_WEB_BASE_URL || "https://www.elima.ci").replace(/\/+$/, "");
  const input = request.body ?? {};
  const role = roleMap[String(input.role ?? "")];
  const { email, phone } = normalizeIdentifier(input.identifier);
  if (!role || !email) return response.status(400).json({ message: "Rôle et email ou téléphone valides requis." });

  const upstream = await fetch(`${webBaseUrl}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Elima-Client": "mobile-app" },
    body: JSON.stringify({
      firstName: String(input.firstName ?? "").trim(),
      lastName: String(input.lastName ?? "").trim(),
      email,
      phone,
      password: String(input.password ?? ""),
      role,
      schoolCode: String(input.schoolCode ?? "").trim(),
      schoolLevel: String(input.schoolLevel ?? "").trim(),
      declaredSchoolName: String(input.declaredSchoolName ?? "").trim(),
      declaredSchoolCity: String(input.declaredSchoolCity ?? "").trim(),
      returnTo: "https://app.elima.ci/auth/elima/start",
    }),
  });
  const body = await upstream.json().catch(() => null);
  return response.status(upstream.status).json(body ?? { message: upstream.ok ? "Compte créé." : "Inscription Elima impossible." });
}
