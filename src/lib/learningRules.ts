import type { LearningExercise } from "@/types/learning";

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
    .filter((item) => item.id !== current.id && isLevelCompatible(item.level, current.level) && item.subject === current.subject)
    .map((item) => ({ item, score: Number(item.chapter === current.chapter) * 4 + item.questions.reduce((sum, question) => sum + question.skills.filter((skill) => errorSkills.includes(skill)).length, 0) * 2 + Number(item.difficulty === current.difficulty) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => item);
}
