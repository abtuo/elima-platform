export {
  REVISION_SUBJECT_OPTIONS, getRevisionSubject, subjectIdFromLabel, type RevisionSubject,
} from "@elima/revision-ui";

import { REVISION_SUBJECT_OPTIONS } from "@elima/revision-ui";

export function revisionSubjectsForLevel(level: string) {
  const lowerSecondary = /^(6|5|4|3)/.test(level.trim());
  return lowerSecondary
    ? REVISION_SUBJECT_OPTIONS.filter((subject) => !["philosophie", "ses"].includes(subject.id))
    : REVISION_SUBJECT_OPTIONS;
}
