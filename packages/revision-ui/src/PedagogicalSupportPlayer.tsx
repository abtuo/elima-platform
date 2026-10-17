import type { PedagogicalAttempt, PedagogicalSupportContent } from "@elima/revision-core";
import React, { useMemo, useState } from "react";
import { CheckCircle2, Clock3, Send } from "lucide-react";
import { MarkdownContent } from "./MarkdownContent";
import { PedagogicalRenderer } from "./PedagogicalRenderer";

type AnswerResult = { evaluationStatus?: string; publicFeedback?: { message?: string }; correction?: { explanationMarkdown?: string; solutionSteps?: Array<{ id?: string; title?: string; markdown: string }> } | null };

export function PedagogicalSupportPlayer({ content, onStart, onAnswer, onSubmit }: {
  content: PedagogicalSupportContent;
  onStart(idempotencyKey: string): Promise<PedagogicalAttempt>;
  onAnswer(input: { attemptId: string; questionId: string; answer: string; submissionKey: string }): Promise<AnswerResult>;
  onSubmit(attemptId: string): Promise<PedagogicalAttempt>;
}) {
  const resumable = content.attempts.find((item) => item.status === "in_progress");
  const [attempt, setAttempt] = useState<PedagogicalAttempt | null>(resumable ?? null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, AnswerResult>>({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const questions = useMemo(() => content.view.document.blocks.filter((block) => block.type === "question").map((block) => block.question), [content]);

  async function start() {
    setBusy("start"); setError("");
    try { setAttempt(await onStart(crypto.randomUUID())); } catch (reason) { setError(reason instanceof Error ? reason.message : "Démarrage impossible."); }
    finally { setBusy(""); }
  }

  async function validate(questionId: string) {
    if (!attempt) return;
    setBusy(questionId); setError("");
    try { const result = await onAnswer({ attemptId: attempt.id, questionId, answer: answers[questionId] ?? "", submissionKey: crypto.randomUUID() }); setResults((current) => ({ ...current, [questionId]: result })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Réponse non enregistrée."); }
    finally { setBusy(""); }
  }

  async function submit() {
    if (!attempt) return;
    setBusy("submit");
    try { setAttempt(await onSubmit(attempt.id)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Remise impossible."); }
    finally { setBusy(""); }
  }

  return <div className="space-y-5">
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Support de l’enseignant · version {content.version.versionNumber}</p><p className="mt-1 text-sm text-slate-600">{content.publication.activityMode === "evaluation" ? "Évaluation" : "Entraînement"}</p></div>
        {!attempt ? <button className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50" disabled={busy === "start"} onClick={start}>Commencer</button> : <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">Tentative {attempt.attemptNumber} · {attempt.status === "in_progress" ? "en cours" : "remise"}</span>}
      </div>
      {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
    </section>
    <PedagogicalRenderer view={content.view} />
    {attempt ? <section className="space-y-4" aria-label="Activités interactives">
      <h2 className="text-xl font-bold text-slate-950">Répondre aux activités</h2>
      {questions.map((question, index) => {
        const result = results[question.id];
        const value = answers[question.id] ?? "";
        const setValue = (next: string) => setAnswers((current) => ({ ...current, [question.id]: next }));
        let selectedOptions: string[] = [];
        try { selectedOptions = JSON.parse(value || "[]") as string[]; } catch { selectedOptions = []; }
        return <article key={question.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex justify-between gap-3"><h3 className="font-bold">{index + 1}. {question.title ?? "Question"}</h3><span className="text-xs font-semibold text-slate-500">{question.points} pt</span></div>
          <MarkdownContent content={question.promptMarkdown} className="mt-2" />
          {question.options?.length ? <div className="mt-4 grid gap-2">{question.options.map((option) => <label key={option.id} className="flex gap-3 rounded-xl border p-3"><input type={question.type === "multiple_choice" ? "checkbox" : "radio"} name={question.id} checked={question.type === "multiple_choice" ? selectedOptions.includes(option.id) : value === option.id} onChange={() => {
            if (question.type !== "multiple_choice") return setValue(option.id);
            const selected = new Set(selectedOptions);
            if (selected.has(option.id)) selected.delete(option.id);
            else selected.add(option.id);
            setValue(JSON.stringify([...selected]));
          }} /><MarkdownContent content={option.labelMarkdown} inline /></label>)}</div>
          : question.type === "true_false" ? <div className="mt-4 flex gap-2">{[["true", "Vrai"], ["false", "Faux"]].map(([choice, label]) => <button key={choice} type="button" onClick={() => setValue(choice)} className={`rounded-xl border px-4 py-2 text-sm font-semibold ${value === choice ? "border-emerald-700 bg-emerald-50" : "border-slate-200"}`}>{label}</button>)}</div>
          : <textarea value={value} onChange={(event) => setValue(event.target.value)} rows={question.type === "short_text" || question.type === "numeric" || question.type === "fraction" ? 2 : 5} className="mt-4 w-full rounded-xl border border-slate-300 p-3 text-sm" placeholder={question.type === "step_resolution" ? "Détaille tes étapes et indique ton résultat final." : "Ta réponse"} />}
          <button type="button" disabled={!value.trim() || busy === question.id || attempt.status !== "in_progress"} onClick={() => validate(question.id)} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"><CheckCircle2 className="h-4 w-4" />Valider</button>
          {result ? <div className={`mt-3 rounded-xl p-3 text-sm ${result.evaluationStatus === "pending_review" ? "bg-amber-50 text-amber-900" : result.evaluationStatus === "correct" ? "bg-emerald-50 text-emerald-900" : "bg-slate-100 text-slate-700"}`}><p className="flex items-center gap-2 font-semibold">{result.evaluationStatus === "pending_review" ? <Clock3 className="h-4 w-4" /> : null}{result.publicFeedback?.message}</p>{result.correction?.explanationMarkdown ? <MarkdownContent content={result.correction.explanationMarkdown} className="mt-2" /> : null}</div> : null}
        </article>;
      })}
      {attempt.status === "in_progress" ? <button type="button" onClick={submit} disabled={busy === "submit"} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white"><Send className="h-4 w-4" />Remettre le support</button> : <p className="rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-900">Support remis. Les réponses en attente restent soumises à la validation de l’enseignant.</p>}
    </section> : null}
  </div>;
}
