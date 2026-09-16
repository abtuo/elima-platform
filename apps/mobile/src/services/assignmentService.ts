import type { Assignment } from "../types/school";
import { getAssignments } from "./mainDataService";

export { getAssignments };

export async function getStudentAssignments(): Promise<Assignment[]> {
  return getAssignments();
}

export async function getParentChildAssignments(): Promise<Assignment[]> {
  return getAssignments();
}
