import { mainDbClient } from "./mainDbClient";
import { getValidElimaIdentityAccessToken } from "./elimaIdentityService";

export async function updateStandaloneStudentProfile(input: {
  schoolLevelId: string;
  declaredSchoolName: string;
  declaredSchoolCity: string;
}) {
  if (!mainDbClient) throw new Error("Service indisponible.");
  const { data: auth } = await mainDbClient.auth.getUser();
  if (!auth.user) throw new Error("Session expirée.");
  const { data: studentProfile } = await mainDbClient.from("student_profiles").select("school_membership_status").eq("id", auth.user.id).maybeSingle();
  if (studentProfile?.school_membership_status === "linked") throw new Error("La classe d’un élève rattaché est gérée par son établissement.");
  const { error } = await mainDbClient.from("student_profiles").upsert({
    id: auth.user.id,
    school_level_id: input.schoolLevelId.trim(),
    declared_school_name: input.declaredSchoolName.trim() || null,
    declared_school_city: input.declaredSchoolCity.trim() || null,
  }, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

export async function activateStudentSchoolCode(code: string) {
  const identityToken = await getValidElimaIdentityAccessToken();
  if (identityToken) {
    const response = await fetch("/api/activate-school", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${identityToken}` }, body: JSON.stringify({ code }) });
    const result = await response.json().catch(() => null) as { ok?: boolean; schoolId?: string; schoolName?: string; studentId?: string; message?: string } | null;
    if (!response.ok || !result?.ok) throw new Error(result?.message ?? "Activation impossible.");
    return { ok: true, school_id: result.schoolId!, school_name: result.schoolName!, student_id: result.studentId! };
  }
  if (!mainDbClient) throw new Error("Service indisponible.");
  const { data, error } = await mainDbClient.rpc("activate_student_school_code", { p_code: code });
  if (error) throw new Error(error.message);
  return data as { ok: boolean; school_id: string; school_name: string; student_id: string };
}
