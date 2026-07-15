const LETTER_ANCHOR = new RegExp(
  String.raw`(?:\b(?:correct|right|best|bonne|juste|valide)\s+(?:answer|response|réponse|reponse|option|choice|choix)|\b(?:answer|response|réponse|reponse|option|choice|choix)\s+(?:correcte?|juste|valide|is|est)|\b(?:which\s+makes|making|so|therefore|thus|hence|donc|ainsi)\s+(?:the\s+)?(?:answer|option|choice|réponse|reponse|choix)?\s*)[^.!?\n]{0,32}\b[A-D]\b|\b[A-D]\b\s+(?:is|est|remains|reste|becomes|devient)\s+(?:correct|right|best|correcte?|juste|valide)`,
  "iu",
);

const CLAUSE_PATTERNS = [
  /[,;:]?\s*(?:so|therefore|thus|hence|which makes|making)\s+(?:the\s+)?(?:correct\s+)?(?:answer|option|choice)?\s*\(?[A-D]\)?\s+(?:is\s+)?(?:correct|right|best)(?:\s+answer)?\s*[.!?]?/giu,
  /[,;:]?\s*(?:donc|ainsi|ce qui fait de)\s+(?:la\s+)?(?:bonne\s+)?(?:réponse|reponse|option|choix)?\s*\(?[A-D]\)?\s+(?:est\s+)?(?:correcte?|juste|valide)?\s*[.!?]?/giu,
];

export function hasAnswerLetterAnchor(text) {
  return LETTER_ANCHOR.test(String(text ?? ""));
}

export function sanitizeExplanationForShuffle(text, fallback = "Le raisonnement ci-dessus permet d'identifier le choix correct.") {
  let value = String(text ?? "").trim();
  if (!value) return fallback;
  for (const pattern of CLAUSE_PATTERNS) value = value.replace(pattern, "");
  const sentences = value.match(/[^.!?\n]+(?:[.!?]+|$)/g) ?? [value];
  value = sentences.filter((sentence) => !hasAnswerLetterAnchor(sentence)).join(" ").replace(/\s+/g, " ").trim();
  return value || fallback;
}

export function sanitizeHintForShuffle(text, fallback) {
  const value = String(text ?? "").trim();
  return !value || hasAnswerLetterAnchor(value) ? fallback : value;
}
