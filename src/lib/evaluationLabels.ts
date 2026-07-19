import { getRevisionSubject } from "@/lib/revisionSubjects";

export function formatEvaluationTitle(title: string, subject: string) {
  let result = title
    .replace(/[\s·—–,:;()\-]*r[ée]f[ée]rence\s*N\s*[-–—]?\s*1[\s·—–,:;()\-]*/gi, " ")
    .replace(/["“”]/g, " ");

  const subjectId = getRevisionSubject(subject).id;
  const subjectPatterns: Record<string, RegExp> = {
    maths: /math[ée]matique?s?/gi,
    francais: /fran[çc]ais/gi,
    anglais: /anglais/gi,
    espagnol: /espagnol/gi,
    svt: /\bSVT\b/gi,
    "physique-chimie": /physique(?:\s*[-–—]\s*chimie)?|chimie/gi,
    "histoire-geographie": /histoire(?:\s*[-–—]\s*g[ée]ographie)?|g[ée]ographie/gi,
    philosophie: /philosophie/gi,
    ses: /\bSES\b|sciences?\s+[ée]conomiques?(?:\s+et\s+sociales?)?/gi,
    informatique: /informatique|\bNSI\b/gi,
    eps: /\bEPS\b/gi,
    arts: /arts?\s*(?:plastiques?)?/gi,
  };

  result = result.replace(subjectPatterns[subjectId] ?? new RegExp(escapeRegExp(subject), "gi"), " ");
  result = result.replace(/^[\s·—–,:;()\-]+|[\s·—–,:;()\-]+$/g, "").replace(/\s{2,}/g, " ").trim();
  return result || "Évaluation";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
