'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CourseSheet, QuizItem, QuizQuestion, RevisionProgress, QuizAttemptSummary } from '@elima/revision-core';
import { CourseSheetCard, CourseSheetContent, RevisionAccountPanel, RevisionDocumentScanner, RevisionQuizPlayer } from '@elima/revision-ui';
import { createPlatformRevision } from '@/lib/revision-client';
import 'katex/dist/katex.min.css';

type Services = ReturnType<typeof createPlatformRevision>;
type ActiveQuiz = { id: string; subject: string; topic: string; questions: QuizQuestion[]; source: 'catalog' | 'generated' | 'document'; documentId?: string };
type Tab = 'QCM' | 'Fiches' | 'Scanner' | 'Matières et abonnement' | 'Historique';

export function PlatformRevision() {
  const [session, setSession] = useState<{ services: Services; userId: string; level: string } | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setError(''); setSession(null);
    (async () => {
      const response = await fetch('/api/revision/session', { method: 'POST', cache: 'no-store' });
      if (!response.ok) throw new Error('Connexion à Révision indisponible. Reconnectez-vous ou réessayez.');
      const body = await response.json();
      const services = createPlatformRevision();
      const verified = await services.client.auth.getUser();
      if (verified.error || verified.data.user?.id !== body.userId) throw new Error('Session Révision invalide. Reconnectez-vous.');
      const level = await services.data.getStudentRevisionLevel(body.userId);
      if (active) setSession({ services, userId: body.userId, level });
    })().catch(caught => { if (active) setError(caught instanceof Error ? caught.message : 'Révision indisponible.'); });
    return () => { active = false; };
  }, [retry]);
  if (error) return <div className="elima-card"><p role="alert">{error}</p><button onClick={() => setRetry(v => v + 1)}>Réessayer</button></div>;
  if (!session) return <p role="status">Connexion à ton espace Révision…</p>;
  return <RevisionWorkspace {...session} />;
}

function RevisionWorkspace({ services, userId, level }: { services: Services; userId: string; level: string }) {
  const [tab, setTab] = useState<Tab>('QCM');
  const [progress, setProgress] = useState<RevisionProgress | null>(null);
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [sheets, setSheets] = useState<CourseSheet[]>([]);
  const [attempts, setAttempts] = useState<QuizAttemptSummary[]>([]);
  const [sheet, setSheet] = useState<CourseSheet | null>(null);
  const [quiz, setQuiz] = useState<ActiveQuiz | null>(null);
  const [subject, setSubject] = useState('Mathématiques');
  const [topic, setTopic] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const loadSubjects = useCallback(() => services.subjects.getSubjectPreferences(userId), [services, userId]);
  const saveSubjects = useCallback((ids: string[]) => services.subjects.saveSubjectPreferences(ids), [services]);
  const reload = useCallback(async () => {
    const [p, q, s, a] = await Promise.all([services.data.getRevisionProgress(userId), services.data.getAvailableQuizzes(), services.data.getCourseSheets(userId), services.data.getQuizAttempts(userId)]);
    setProgress(p); setQuizzes(q); setSheets(s); setAttempts(a);
  }, [services, userId]);
  useEffect(() => { void reload().catch(() => setError('Données momentanément indisponibles.')); }, [reload, tab]);
  async function openQuiz(params: Record<string, string>) {
    setBusy(true); setError('');
    try {
      const questions = await services.data.getQuizQuestions(params.id, userId);
      setQuiz({ id: params.id, subject: params.subject, topic: params.topic, questions, source: params.source === 'document' ? 'document' : params.id.startsWith('generated:') ? 'generated' : 'catalog', documentId: params.documentId });
    } catch { setError('Quiz indisponible. Réessaie.'); }
    finally { setBusy(false); }
  }
  async function generate() {
    if (!topic.trim()) return;
    setBusy(true); setError('');
    try {
      if (tab === 'Fiches') { const created = await services.data.generateRealtimeSheet({ subject, topic, level }, userId); setSheet(created); await reload(); }
      else { const generated = await services.data.generateRealtimeQuiz({ subject, topic, level }, userId); setQuiz({ ...generated, subject, topic, source: 'generated' }); }
    } catch { setError('Génération indisponible ou quota atteint. Consulte ton abonnement puis réessaie.'); }
    finally { setBusy(false); }
  }
  return <div className="platform-revision min-w-0 space-y-4">
    <h1 className="text-2xl font-bold">Elima Révision</h1>
    <p className="text-sm text-slate-600">Ton même espace sur Platform, Mobile et Révision.</p>
    {progress && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[['XP', progress.xp], ['Niveau', progress.level], ['Série', progress.streakDays], ['Quiz terminés', progress.completedQuizCount]].map(([label, value]) => <div key={label} className="elima-card"><p className="text-sm">{label}</p><strong className="text-xl">{value}</strong></div>)}</div>}
    {!quiz && <nav aria-label="Révision" className="flex flex-wrap gap-2">{(['QCM', 'Fiches', 'Scanner', 'Matières et abonnement', 'Historique'] as Tab[]).map(item => <button key={item} onClick={() => { setTab(item); setSheet(null); setError(''); }} aria-pressed={tab === item} className={`rounded-xl border px-3 py-2 text-sm ${tab === item ? 'bg-purple-100 text-purple-900' : 'bg-white'}`}>{item}</button>)}</nav>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {quiz ? <RevisionQuizPlayer key={quiz.id} questions={quiz.questions} onExit={() => { setQuiz(null); void reload().catch(() => setError('Actualisation indisponible.')); }} onSave={result => services.data.recordQuizCompletion({ ...result, userId, quizRef: quiz.id, subject: quiz.subject, topic: quiz.topic, source: quiz.source, sourceDocumentId: quiz.documentId })} /> : <>
      {(tab === 'QCM' || tab === 'Fiches') && <form onSubmit={e => { e.preventDefault(); void generate(); }} className="elima-card flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 text-sm">Matière<input required value={subject} onChange={e => setSubject(e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
        <label className="min-w-0 flex-1 text-sm">Notion à réviser<input required maxLength={200} value={topic} onChange={e => setTopic(e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
        <button disabled={busy} className="rounded-xl bg-purple-700 px-4 py-2 text-white disabled:opacity-50">{busy ? 'Chargement…' : tab === 'Fiches' ? 'Créer une fiche' : 'Créer un QCM'}</button>
      </form>}
      {tab === 'QCM' && <div className="grid gap-3 sm:grid-cols-2">{quizzes.map(q => <button key={q.id} disabled={busy} className="elima-card text-left" onClick={() => void openQuiz({ id: q.id, subject: q.subject, topic: q.topic, source: 'catalog' })}><strong>{q.topic}</strong><p className="text-sm">{q.subject} · {q.questionCount} questions</p></button>)}{!quizzes.length && <p>Aucun QCM disponible pour le moment.</p>}</div>}
      {tab === 'Fiches' && (sheet ? <><button onClick={() => setSheet(null)}>Retour aux fiches</button><CourseSheetContent sheet={sheet} /></> : <div className="grid gap-3">{sheets.map(s => <CourseSheetCard key={s.id} sheet={s} onOpen={setSheet} />)}{!sheets.length && <p>Tes fiches et analyses de documents apparaîtront ici.</p>}</div>)}
      {tab === 'Scanner' && <RevisionDocumentScanner profile={{ id: userId, className: level }} documentsService={services.documents} subjectsService={services.subjects} generateRealtimeQuiz={services.data.generateRealtimeQuiz} onOpenQuiz={params => { void openQuiz(params); }} />}
      {tab === 'Matières et abonnement' && <RevisionAccountPanel loadSubscription={services.subscription} loadSubjects={loadSubjects} saveSubjects={saveSubjects} />}
      {tab === 'Historique' && <div className="space-y-3">{attempts.map(a => <article key={a.id} className="elima-card"><strong>{a.topic || a.subject}</strong><p>{a.score}% · {new Date(a.completedAt).toLocaleDateString('fr-FR')}</p></article>)}{!attempts.length && <p>Termine ton premier quiz pour retrouver ton historique ici.</p>}</div>}
    </>}
  </div>;
}
