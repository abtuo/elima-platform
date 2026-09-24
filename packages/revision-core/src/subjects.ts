const SUBJECT_IDS: Array<[string, string[]]> = [
  ["maths", ["math", "algèbre", "geometr"]],
  ["francais", ["français", "francais", "littérature"]],
  ["anglais", ["anglais", "english"]],
  ["espagnol", ["espagnol", "spanish"]],
  ["svt", ["svt", "biologie", "sciences de la vie"]],
  ["physique-chimie", ["physique", "chimie"]],
  ["histoire-geographie", ["histoire", "géographie", "geographie"]],
  ["philosophie", ["philosophie"]],
  ["ses", ["économie", "economie", "ses"]],
  ["informatique", ["informatique", "numérique", "numerique"]],
  ["eps", ["eps", "sport"]],
  ["arts", ["art"]],
];

export function normalizeSubjectLabel(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function subjectIdFromLabel(subject: string) {
  const normalized = normalizeSubjectLabel(subject);
  return SUBJECT_IDS.find(([, aliases]) => aliases.some((alias) => normalized.includes(normalizeSubjectLabel(alias))))?.[0] ?? "autre";
}
