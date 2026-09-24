import type { LearningExercise } from "./types.ts";

export function normalizeLearningLevel(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").replace(/\s+/g, " ").trim();
}

export function isLevelCompatible(contentLevel: string, profileLevel: string) {
  const content = normalizeLearningLevel(contentLevel);
  const profile = normalizeLearningLevel(profileLevel);
  if (!profile) return true;
  if (profile.includes("terminale") && content.includes("terminale")) {
    if (profile === "terminale") return true;
    if (profile.includes(" c") || content.includes(" c")) return profile.includes(" c") && content.includes(" c");
    if (profile.includes("generale") || content.includes("generale")) return profile.includes("generale") && content.includes("generale");
    return true;
  }
  return content.includes(profile) || profile.includes(content);
}

export function canAccessExamSubjects(config: { isExamLevel: boolean }) {
  return config.isExamLevel;
}

export function recommendExercises(current: LearningExercise, candidates: LearningExercise[], errorSkills: string[], limit = 3) {
  return candidates
    .filter((candidate) => candidate.id !== current.id && isLevelCompatible(candidate.level, current.level) && candidate.subject === current.subject)
    .map((candidate) => ({ candidate, score: Number(candidate.chapter === current.chapter) * 4 + candidate.questions.reduce((score, question) => score + question.skills.filter((skill) => errorSkills.includes(skill)).length, 0) * 2 + Number(candidate.difficulty === current.difficulty) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}
