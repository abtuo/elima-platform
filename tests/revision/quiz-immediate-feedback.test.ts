import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("un QCM connecté corrige chaque réponse via le serveur avant d'afficher le résultat", async () => {
  const page = await readFile(new URL("../../apps/revision/src/features/revision/QuizPage.tsx", import.meta.url), "utf8");
  const service = await readFile(new URL("../../packages/revision-core/src/revisionDataService.ts", import.meta.url), "utf8");

  assert.match(page, /await checkQuizAnswer\(\{ attemptId, questionId: question\.id, answerId \}\)/);
  assert.match(page, /setAnswerResult\(\{ correct: result\.correct, correctIndex, explanation: result\.explanation \}\)/);
  assert.match(page, /answerResult\.correct \? "Bonne réponse" : "Presque !"/);
  assert.match(service, /quizAttemptRequest\(\{ action: "answer", \.\.\.input \}\)/);
  assert.doesNotMatch(service, /action: "answer"[^\n]+score/);
});
