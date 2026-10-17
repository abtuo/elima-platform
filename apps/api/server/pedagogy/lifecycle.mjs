export const PEDAGOGICAL_VERSION_STATES = [
  "draft", "in_review", "changes_requested", "validated", "published", "archived",
];

const TRANSITIONS = Object.freeze({
  draft: new Set(["in_review", "archived"]),
  in_review: new Set(["draft", "changes_requested", "validated", "archived"]),
  changes_requested: new Set(["draft", "archived"]),
  validated: new Set(["published", "archived"]),
  published: new Set(["archived"]),
  archived: new Set(),
});

export function canTransitionPedagogicalVersion(from, to) {
  return TRANSITIONS[from]?.has(to) ?? false;
}

export function assertPedagogicalTransition(from, to, createError = (message) => new Error(message)) {
  if (!canTransitionPedagogicalVersion(from, to)) {
    throw createError(`Transition pédagogique interdite : ${from} → ${to}.`);
  }
}

