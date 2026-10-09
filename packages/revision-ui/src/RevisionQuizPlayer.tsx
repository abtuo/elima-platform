import { useRef, useState } from 'react';
import { quizResult, type QuizQuestion } from '@elima/revision-core';
import { QuizProgress, QuizQuestionContent, RevisionResultSummary } from './RevisionViews';

export function RevisionQuizPlayer({ questions, onSave, onExit }: {
  questions: QuizQuestion[];
  onSave: (result: ReturnType<typeof quizResult>) => Promise<unknown>;
  onExit: () => void;
}) {
  const [answers, setAnswers] = useState<number[]>([]);
  const [choice, setChoice] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const question = questions[answers.length];
  async function save(resultAnswers: number[]) {
    if (saving.current) return;
    saving.current = true; setBusy(true); setError('');
    try { await onSave(quizResult(questions, resultAnswers)); setSaved(true); }
    catch { setError('Résultat non enregistré. Réessaie avant de quitter.'); }
    finally { saving.current = false; setBusy(false); }
  }
  if (!questions.length) return <div className="card p-5">Aucune question disponible.<button onClick={onExit}>Retour</button></div>;
  if (saved) return <RevisionResultSummary score={quizResult(questions, answers).correctAnswers} total={questions.length} onComplete={onExit} />;
  return <section className="card space-y-4 p-5">
    <button type="button" disabled={busy} onClick={() => { if (!answers.length && choice === null || window.confirm('Quitter ce quiz sans enregistrer le résultat ?')) onExit(); }}>Quitter le quiz</button>
    <QuizProgress current={answers.length} total={questions.length} />
    {question ? <><QuizQuestionContent question={question} />
      <div className="grid gap-2">{question.options.map((option, index) => <button key={index} type="button" aria-pressed={choice === index} onClick={() => setChoice(index)} className={`rounded-xl border p-3 text-left ${choice === index ? 'border-green-700 bg-green-50' : 'border-gray-200'}`}>{option}</button>)}</div>
      <button type="button" disabled={choice === null || busy} className="rounded-xl bg-primary px-5 py-3 text-white disabled:opacity-50" onClick={() => {
        if (choice === null) return;
        const next = [...answers, choice]; setAnswers(next); setChoice(null);
        if (next.length === questions.length) void save(next);
      }}>Valider</button>
    </> : <button disabled={busy} onClick={() => void save(answers)}>{busy ? 'Enregistrement…' : 'Réessayer l’enregistrement'}</button>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </section>;
}
