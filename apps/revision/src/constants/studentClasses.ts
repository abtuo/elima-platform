import { REVISION_GRADES, gradesForCycle, type SchoolCycle } from "@elima/revision-core";

export const STUDENT_CLASS_OPTIONS = REVISION_GRADES.map((grade) => grade.label);
export function studentClassesForCycle(cycle: SchoolCycle) { return gradesForCycle(cycle).map((grade) => grade.label); }
