export type GradeDraft = {
  evaluationId: string;
  studentId: string;
  score: number | null;
  updatedAt: number;
};

const KEY = "elima.teacher.grades.drafts.v1";

type Store = Record<string, GradeDraft>; // key = `${evaluationId}:${studentId}`

function loadStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function saveStore(store: Store) {
  window.localStorage.setItem(KEY, JSON.stringify(store));
}

export function getDraft(evaluationId: string, studentId: string): GradeDraft | null {
  const store = loadStore();
  return store[`${evaluationId}:${studentId}`] ?? null;
}

export async function saveDraft(input: Omit<GradeDraft, "updatedAt">) {
  // Simulate async call (later: POST /api/grades)
  await new Promise((r) => setTimeout(r, 180));

  const store = loadStore();
  const key = `${input.evaluationId}:${input.studentId}`;
  store[key] = { ...input, updatedAt: Date.now() };
  saveStore(store);
}
