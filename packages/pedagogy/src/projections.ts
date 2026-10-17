import {
  PedagogicalResourceDocumentSchema,
  PrintableStudentViewSchema,
  PrintableTeacherViewSchema,
  StudentResourceViewSchema,
  TeacherResourceViewSchema,
} from "./schemas.ts";
import type {
  PedagogicalResourceBundle,
  PrintableStudentView,
  PrintableTeacherView,
  StudentResourceView,
  TeacherResourceView,
} from "./types.ts";
import { assertValidPedagogicalBundle } from "./validation.ts";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function projectStudentView(input: unknown): StudentResourceView {
  const bundle = assertValidPedagogicalBundle(input);
  const document = PedagogicalResourceDocumentSchema.parse(clone(bundle.document));
  return StudentResourceViewSchema.parse({ audience: "student", document });
}

export function projectTeacherView(input: unknown): TeacherResourceView {
  const bundle = assertValidPedagogicalBundle(input);
  return TeacherResourceViewSchema.parse({ audience: "teacher", document: clone(bundle.document), secrets: clone(bundle.secrets) });
}

export function projectPrintableStudentView(input: unknown, options: { includeAnswerSpaces?: boolean } = {}): PrintableStudentView {
  const bundle = assertValidPedagogicalBundle(input);
  return PrintableStudentViewSchema.parse({
    audience: "student_print",
    document: clone(bundle.document),
    print: { includeAnswerSpaces: options.includeAnswerSpaces ?? true },
  });
}

export function projectPrintableTeacherView(input: unknown, options: { includeRubrics?: boolean; includeTeacherComments?: boolean } = {}): PrintableTeacherView {
  const bundle = assertValidPedagogicalBundle(input);
  const copy: PedagogicalResourceBundle = clone(bundle);
  const includeRubrics = options.includeRubrics ?? true;
  const includeTeacherComments = options.includeTeacherComments ?? true;
  if (!includeRubrics) copy.secrets.corrections.forEach((correction) => { correction.rubric = []; });
  if (!includeTeacherComments) copy.secrets.corrections.forEach((correction) => { delete correction.teacherComments; });
  return PrintableTeacherViewSchema.parse({
    audience: "teacher_print",
    document: copy.document,
    secrets: copy.secrets,
    print: { includeRubrics, includeTeacherComments },
  });
}
