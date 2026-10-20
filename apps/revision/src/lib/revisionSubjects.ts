export {
  REVISION_SUBJECT_OPTIONS, getRevisionSubject, subjectIdFromLabel, type RevisionSubject,
} from "@elima/revision-ui";

import { REVISION_SUBJECT_OPTIONS } from "@elima/revision-ui";
import { subjectsForEducation, type SchoolCycle } from "@elima/revision-core";

export function revisionSubjectsForLevel(level: string) {
  return revisionSubjectsForEducation("secondary", level);
}

export function revisionSubjectsForEducation(cycle: SchoolCycle, level: string) {
  const uiById = new Map(REVISION_SUBJECT_OPTIONS.map((subject) => [subject.id, subject]));
  return subjectsForEducation(cycle, level).map((subject) => ({ ...subject, ...uiById.get(subject.id) }));
}
