function issue(level, code, path, message) { return { level, code, path, message }; }

function questions(bundle) {
  return bundle.document.blocks.filter((block) => block.type === "question").map((block) => block.question);
}

function simpleLinearExpected(prompt) {
  const plain = prompt.replace(/\$/g, "").replace(/\s/g, "");
  const match = plain.match(/(-?\d+(?:[.,]\d+)?)x([+-]\d+(?:[.,]\d+)?)=(-?\d+(?:[.,]\d+)?)/i);
  if (!match) return null;
  const a = Number(match[1].replace(",", "."));
  const b = Number(match[2].replace(",", "."));
  const c = Number(match[3].replace(",", "."));
  return a === 0 ? null : (c - b) / a;
}

function explicitAmplitudeExpected(prompt) {
  if (!/amplitude/i.test(prompt)) return null;
  const values = [...prompt.matchAll(/([+-]?\d+(?:[.,]\d+)?)\s*(?:\\?text\{)?mV/gi)].map((match) => Number(match[1].replace(",", ".")));
  return values.length >= 2 ? Math.abs(values[1] - values[0]) : null;
}

export function validateDisciplinaryBundle(bundle) {
  const issues = [];
  const corrections = new Map(bundle.secrets.corrections.map((item) => [item.questionId, item]));
  const subject = bundle.document.metadata.subject.toLocaleLowerCase("fr");
  if (/math/.test(subject)) {
    for (const question of questions(bundle)) {
      const correction = corrections.get(question.id);
      if (question.responseContract.kind === "numeric" && correction?.answerKey.kind === "numeric") {
        if ((question.responseContract.unit ?? null) !== (correction.answerKey.unit ?? null)) issues.push(issue("business", "NUMERIC_UNIT_MISMATCH", `questions.${question.id}`, "L’unité attendue diffère entre l’énoncé et le corrigé."));
        const expected = simpleLinearExpected(question.promptMarkdown);
        if (expected !== null && Math.abs(expected - correction.answerKey.value) > Math.max(correction.answerKey.tolerance, 1e-9)) issues.push(issue("business", "LINEAR_EQUATION_CONTRADICTION", `questions.${question.id}`, "La réponse numérique ne vérifie pas l’équation simple détectée."));
      }
    }
  }
  if (/svt|biolog|science de la vie/.test(subject)) {
    for (const question of questions(bundle)) {
      const correction = corrections.get(question.id);
      const expected = explicitAmplitudeExpected(question.promptMarkdown);
      if (expected !== null && correction?.answerKey.kind === "numeric" && Math.abs(expected - correction.answerKey.value) > Math.max(correction.answerKey.tolerance, 1e-9)) issues.push(issue("business", "SCIENTIFIC_AMPLITUDE_CONTRADICTION", `questions.${question.id}`, "La réponse numérique ne correspond pas à l’amplitude explicitement décrite dans l’énoncé."));
    }
    for (const block of bundle.document.blocks) {
      if (["table", "chart", "diagram", "image"].includes(block.type) && !block.caption) issues.push(issue("pedagogical", "SCIENTIFIC_CAPTION_RECOMMENDED", `blocks.${block.id}`, "Une légende scientifique est recommandée."));
      if (["diagram", "image"].includes(block.type) && block.sourceRefIds.length === 0) issues.push(issue("pedagogical", "SCIENTIFIC_SOURCE_UNRESOLVED", `blocks.${block.id}`, "La source du document scientifique reste à vérifier."));
    }
  }
  return issues;
}

