export type RegistrationRole = "school_head" | "school_staff" | "teacher" | "parent" | "student";

export type AccountRegistrationInput = {
  role: Exclude<RegistrationRole, "school_head">;
  firstName: string;
  lastName: string;
  identifier: string;
  password: string;
  schoolCode?: string;
  schoolLevel?: string;
  declaredSchoolName?: string;
  declaredSchoolCity?: string;
};

async function readResponse(response: Response) {
  return await response.json().catch(() => null) as { message?: string; ok?: boolean } | null;
}

export async function registerElimaAccount(input: AccountRegistrationInput) {
  const response = await fetch("/api/elima-signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await readResponse(response);
  if (!response.ok) throw new Error(body?.message ?? "Inscription impossible.");
  return body;
}

export type SchoolRegistrationRequest = {
  firstName: string;
  lastName: string;
  identifier: string;
  schoolName: string;
  schoolCity: string;
  jobTitle?: string;
  studentCount?: string;
};

export async function submitSchoolRegistrationRequest(input: SchoolRegistrationRequest) {
  const response = await fetch("/api/registration-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await readResponse(response);
  if (!response.ok) throw new Error(body?.message ?? "Envoi impossible.");
  return body;
}
