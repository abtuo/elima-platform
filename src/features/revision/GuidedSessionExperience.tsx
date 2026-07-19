import { useEffect } from "react";
import { ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, Clock3, Lightbulb, NotebookPen, Send } from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { MarkdownContent } from "@/components/revision/MarkdownContent";
import { ProgressBar } from "@/components/revision/RevisionUI";
import type { GuidedOption, LearningExercise, LearningQuestion, LearningSession, ValidationResult } from "@/types/learning";

type Answer = LearningSession["answers"][string];

type Props = {
  exercise: LearningExercise;
  session: LearningSession;
  active: LearningQuestion;
  activeIndex: number;
  answer: Answer;
  busy: boolean;
  error: string;
  solution: string[];
  onPatchAnswer: (patch: Partial<Answer>) => void;
  onValidate: () => void;
  onHint: () => void;
  onRevealSolution: () => void;
  onGo: (index: number) => void;
  onCompleteStep: (value: string) => void;
  onSubmit: () => void;
};

const CLOSED_TYPES = new Set(["single_choice", "multiple_choice", "ordering"]);

export function GuidedSessionExperience(props: Props) {
  const { exercise, session, active, activeIndex, answer, busy, error, solution } = props;
  const metadata = exercise.metadata;
  const step = active.publicMetadata;
  const options = asOptions(step.options);
  const stepType = String(step.stepType || active.questionType);
  const isLast = activeIndex === exercise.questions.length - 1;
  const answered = exercise.questions.filter((question) => session.answers[question.id]?.value).length;

  useEffect(() => {
    if (stepType === "guided_solution" && solution.length === 0) props.onRevealSolution();
  }, [active.id, stepType]); // eslint-disable-line react-hooks/exhaustive-deps

  return <PageContainer className="max-w-6xl">
    <AppHeader title={exercise.title} subtitle={`${exercise.subject} · ${exercise.level} · travail sur papier`} backTo="/student/reviser?mode=devoirs" />
    {error ? <div className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div> : null}
    <div className="mb-4 rounded-2xl bg-accent px-4 py-3 text-white sm:px-5">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs"><span>Étape {activeIndex + 1} sur {exercise.questions.length}</span><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{exercise.estimatedMinutes} min environ</span></div>
      <ProgressBar value={activeIndex + 1} max={exercise.questions.length} />
    </div>

    {stepType !== "statement" ? <details className="card mb-4 overflow-hidden">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-revision sm:px-5">Relire l’énoncé complet</summary>
      <div className="border-t border-gray-100 p-4 sm:p-5"><Statement exercise={exercise} compact /></div>
    </details> : null}

    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <main className="card min-w-0 p-5 sm:p-7">
        {stepType === "statement" ? <Statement exercise={exercise} /> : <>
          <p className="text-xs font-bold uppercase tracking-wide text-revision">{stageLabel(stepType, Boolean(step.isTransfer))}</p>
          <h1 className="mt-2 font-title text-xl font-semibold text-accent sm:text-2xl">{active.title}</h1>
          <div className="mt-4 text-sm leading-7 text-accent"><MarkdownContent content={active.prompt} /></div>
          <StepBody {...props} stepType={stepType} options={options} />
        </>}

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-5">
          <button type="button" disabled={activeIndex === 0} onClick={() => props.onGo(activeIndex - 1)} className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold text-gray-500 disabled:opacity-30"><ChevronLeft className="h-4 w-4" />Précédente</button>
          <StepActions {...props} stepType={stepType} isLast={isLast} />
        </div>
      </main>

      <aside className="space-y-4">
        <section className="card p-5"><h2 className="font-title font-semibold text-accent">Ta session</h2><dl className="mt-3 space-y-2 text-sm"><div className="flex justify-between"><dt className="text-gray-500">Étapes faites</dt><dd className="font-semibold">{answered}/{exercise.questions.length}</dd></div><div className="flex justify-between"><dt className="text-gray-500">Support</dt><dd className="font-semibold">Papier</dd></div></dl></section>
        {stepType === "paper_work" ? <HintPanel answer={answer} max={Number(step.hintCount || 0)} busy={busy} onHint={props.onHint} /> : null}
        {metadata.objective ? <section className="card p-5"><h2 className="font-title font-semibold text-accent">Objectif</h2><p className="mt-2 text-sm leading-6 text-gray-600">{metadata.objective}</p></section> : null}
      </aside>
    </div>
  </PageContainer>;
}

function StepBody({ active, answer, busy, solution, onPatchAnswer, stepType, options }: Props & { stepType: string; options: GuidedOption[] }) {
  const step = active.publicMetadata;
  if (stepType === "orientation") return <PaperCallout text="Repère les données utiles avant de commencer tes calculs." />;
  if (stepType === "paper_work") return <PaperCallout text="Effectue le travail dans ton cahier. Elima ne te demande pas de recopier tous tes calculs." />;
  if (stepType === "guided_solution") return <Solution blocks={solution} loading={busy && solution.length === 0} />;
  if (stepType === "self_validation") return <SelfValidation checklist={asStrings(step.checklist)} options={asOptions(step.responseOptions)} value={answer.value} onChange={(value) => onPatchAnswer({ value })} />;
  if (stepType === "self_assessment") return <OptionButtons options={options} value={answer.value} onChange={(value) => onPatchAnswer({ value })} />;
  if (stepType === "ordering") return <><Ordering items={asOptions(step.items)} value={answer.value} onChange={(value) => onPatchAnswer({ value, result: undefined })} />{answer.result ? <DeterministicFeedback result={answer.result} /> : null}</>;
  if (stepType === "multiple_choice") return <><MultipleChoice options={options} value={answer.value} onChange={(value) => onPatchAnswer({ value, result: undefined })} />{answer.result ? <DeterministicFeedback result={answer.result} /> : null}</>;
  if (stepType === "single_choice") return <><OptionButtons options={options} value={answer.value} onChange={(value) => onPatchAnswer({ value, result: undefined })} />{answer.result ? <DeterministicFeedback result={answer.result} /> : null}</>;
  return null;
}

function StepActions(props: Props & { stepType: string; isLast: boolean }) {
  const { stepType, answer, activeIndex, active, busy } = props;
  if (stepType === "statement" || stepType === "orientation" || stepType === "paper_work") return <button type="button" onClick={() => props.onCompleteStep("completed")} className="inline-flex items-center gap-1.5 rounded-xl bg-revision px-4 py-2.5 text-sm font-semibold text-white">{String(active.publicMetadata.actionLabel || (stepType === "paper_work" ? "J’ai terminé sur papier" : "Continuer"))}<ChevronRight className="h-4 w-4" /></button>;
  if (stepType === "guided_solution") return <button type="button" disabled={!props.solution.length} onClick={() => props.onCompleteStep("reviewed")} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">J’ai compris la correction<ChevronRight className="h-4 w-4" /></button>;
  if (stepType === "self_validation" || stepType === "self_assessment") return <button type="button" disabled={!answer.value} onClick={() => props.onCompleteStep(answer.value)} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Continuer<ChevronRight className="h-4 w-4" /></button>;
  if (CLOSED_TYPES.has(stepType)) return <div className="flex gap-2">{!answer.result || answer.result.status !== "correct" ? <button type="button" disabled={busy || !answer.value} onClick={props.onValidate} className="rounded-xl bg-revision px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{busy ? "Vérification…" : "Vérifier"}</button> : props.isLast ? <button type="button" disabled={busy} onClick={props.onSubmit} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"><Send className="h-4 w-4" />Terminer</button> : <button type="button" onClick={() => props.onGo(activeIndex + 1)} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white">Étape suivante<ChevronRight className="h-4 w-4" /></button>}</div>;
  return null;
}

function Statement({ exercise, compact = false }: { exercise: LearningExercise; compact?: boolean }) {
  const statement = exercise.metadata.statement || {};
  return <div>
    {!compact ? <><p className="text-xs font-bold uppercase tracking-wide text-revision">Énoncé complet · à lire avant le guidage</p><h1 className="mt-2 font-title text-2xl font-semibold text-accent">{exercise.title}</h1>{exercise.metadata.materials?.length ? <div className="mt-3 flex flex-wrap gap-2">{exercise.metadata.materials.map((item) => <span key={item} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">{item}</span>)}</div> : null}</> : null}
    {statement.introduction ? <p className="mt-4 text-sm font-semibold leading-7 text-accent">{statement.introduction}</p> : null}
    <div className="mt-3 text-sm leading-7 text-gray-700"><MarkdownContent content={statement.context || exercise.description} /></div>
    <StatementDisplay display={statement.display} />
    {statement.main_questions?.length ? <section className="mt-5 rounded-2xl bg-revision/[.06] p-4 sm:p-5"><h2 className="font-semibold text-accent">Questions à résoudre sur papier</h2><ol className="mt-3 space-y-2 text-sm leading-6 text-accent">{statement.main_questions.map((question, index) => <li key={question} className="flex gap-2"><span className="font-bold text-revision">{index + 1}.</span><span>{question}</span></li>)}</ol></section> : null}
    {statement.paper_instructions?.length ? <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"><NotebookPen className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div><p className="font-semibold text-amber-900">Prépare ton cahier</p><ul className="mt-1 list-inside list-disc text-sm leading-6 text-amber-900">{statement.paper_instructions.map((item) => <li key={item}>{item}</li>)}</ul></div></div> : null}
  </div>;
}

function StatementDisplay({ display }: { display?: Record<string, unknown> }) {
  if (!display || display.type === "text_problem") return null;
  const headers = asStrings(display.headers);
  const rows = Array.isArray(display.rows) ? display.rows : display.type === "structured_data" && Array.isArray(display.data) ? display.data.map((item) => Object.values(item as object)) : [];
  if (rows.length) {
    const derivedHeaders = headers.length ? headers : display.type === "structured_data" ? Object.keys((display.data as object[])[0] || {}) : [];
    return <div className="mt-4 overflow-x-auto rounded-2xl border border-gray-200"><table className="w-full min-w-[420px] text-left text-sm"><thead className="bg-accent text-white"><tr>{derivedHeaders.map((header) => <th key={header} className="px-4 py-3 font-semibold">{humanize(header)}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-t border-gray-100">{(row as unknown[]).map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3">{String(cell)}</td>)}</tr>)}</tbody></table></div>;
  }
  return <div className="mt-4 rounded-2xl border border-revision/15 bg-revision/[.04] p-4 text-center text-sm text-accent"><strong>{visualTitle(String(display.type))}</strong><p className="mt-2 text-gray-600">{visualDescription(display)}</p></div>;
}

function OptionButtons({ options, value, onChange }: { options: GuidedOption[]; value: string; onChange: (value: string) => void }) {
  return <div className="mt-5 grid gap-2 sm:grid-cols-2">{options.map((option) => <button key={option.id} type="button" onClick={() => onChange(option.id)} className={`rounded-2xl border p-4 text-left text-sm font-semibold transition ${value === option.id ? "border-revision bg-revision text-white" : "border-gray-200 bg-white text-accent hover:border-revision/40"}`}><span className="mr-2 opacity-70">{option.id.length === 1 ? `${option.id.toUpperCase()}.` : ""}</span>{option.label}</button>)}</div>;
}

function MultipleChoice({ options, value, onChange }: { options: GuidedOption[]; value: string; onChange: (value: string) => void }) {
  const selected = parseArray(value);
  return <div className="mt-5 space-y-2">{options.map((option) => { const active = selected.includes(option.id); return <button key={option.id} type="button" onClick={() => onChange(JSON.stringify(active ? selected.filter((id) => id !== option.id) : [...selected, option.id]))} className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left text-sm font-semibold ${active ? "border-revision bg-revision/10 text-revision" : "border-gray-200"}`}><span className={`flex h-5 w-5 items-center justify-center rounded border ${active ? "border-revision bg-revision text-white" : "border-gray-300"}`}>{active ? <Check className="h-3.5 w-3.5" /> : null}</span>{option.label}</button>; })}</div>;
}

function Ordering({ items, value, onChange }: { items: GuidedOption[]; value: string; onChange: (value: string) => void }) {
  const ids = parseArray(value).length ? parseArray(value) : items.map((item) => item.id);
  useEffect(() => { if (!value && ids.length) onChange(JSON.stringify(ids)); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const move = (index: number, delta: number) => { const next = [...ids]; const target = index + delta; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; onChange(JSON.stringify(next)); };
  return <div className="mt-5 space-y-2">{ids.map((id, index) => { const item = items.find((candidate) => candidate.id === id); return <div key={id} className="flex items-center gap-3 rounded-2xl border border-gray-200 p-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-revision text-xs font-bold text-white">{index + 1}</span><span className="min-w-0 flex-1 text-sm font-semibold text-accent">{item?.label}</span><button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Monter" className="rounded-lg p-2 text-gray-500 disabled:opacity-20"><ArrowUp className="h-4 w-4" /></button><button type="button" onClick={() => move(index, 1)} disabled={index === ids.length - 1} aria-label="Descendre" className="rounded-lg p-2 text-gray-500 disabled:opacity-20"><ArrowDown className="h-4 w-4" /></button></div>; })}</div>;
}

function SelfValidation({ checklist, options, value, onChange }: { checklist: string[]; options: GuidedOption[]; value: string; onChange: (value: string) => void }) {
  return <><ul className="mt-5 space-y-2">{checklist.map((item) => <li key={item} className="flex items-start gap-2 rounded-xl bg-gray-50 p-3 text-sm text-accent"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{item}</li>)}</ul><p className="mt-5 text-sm font-semibold text-accent">Compare avec ta production :</p><OptionButtons options={options} value={value} onChange={onChange} /></>;
}

function HintPanel({ answer, max, busy, onHint }: { answer: Answer; max: number; busy: boolean; onHint: () => void }) {
  return <section className="card p-5"><h2 className="flex items-center gap-2 font-title font-semibold text-accent"><Lightbulb className="h-5 w-5 text-secondary" />Indices progressifs</h2><div className="mt-3 space-y-2">{answer.hints.map((hint, index) => <div key={`${index}-${hint}`} className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-900"><strong>Indice {index + 1}.</strong> {hint}</div>)}</div>{answer.hints.length < max ? <button type="button" disabled={busy} onClick={onHint} className="mt-3 w-full rounded-xl border border-secondary/30 bg-secondary/10 px-3 py-2.5 text-sm font-semibold text-amber-800">Afficher l’indice {answer.hints.length + 1}</button> : null}</section>;
}

function Solution({ blocks, loading }: { blocks: string[]; loading: boolean }) {
  if (loading) return <div className="mt-5 animate-pulse rounded-2xl bg-gray-50 p-5 text-sm text-gray-500">Préparation de la correction…</div>;
  return <div className="mt-5 space-y-3">{blocks.map((block, index) => <div key={`${index}-${block}`} className="rounded-2xl border border-primary/15 bg-primary/5 p-4"><div className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{index + 1}</span><SolutionValue value={block} /></div></div>)}</div>;
}

function SolutionValue({ value }: { value: string }) {
  try { return <StructuredSolution value={JSON.parse(value)} />; } catch { return <div className="min-w-0 text-sm leading-6 text-accent"><MarkdownContent content={value} /></div>; }
}

function StructuredSolution({ value }: { value: unknown }) {
  if (Array.isArray(value)) return <div className="min-w-0 space-y-2 text-sm text-accent">{value.map((row, index) => <div key={index} className="flex flex-wrap items-center gap-2">{(Array.isArray(row) ? row : [row]).map((cell, cellIndex) => <span key={cellIndex} className="rounded-lg bg-white px-2.5 py-1.5 shadow-sm">{String(cell)}</span>)}</div>)}</div>;
  if (!value || typeof value !== "object") return <span className="text-sm text-accent">{String(value)}</span>;
  const data = value as Record<string, unknown>;
  const headers = asStrings(data.headers);
  const rows = Array.isArray(data.rows) ? data.rows as unknown[][] : [];
  if (headers.length && rows.length) return <div className="min-w-0 overflow-x-auto rounded-xl border border-primary/15 bg-white"><table className="w-full min-w-[320px] text-sm"><thead className="bg-primary/10"><tr>{headers.map((header) => <th key={header} className="px-3 py-2 text-left">{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-t border-gray-100">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-2">{String(cell)}</td>)}</tr>)}</tbody></table></div>;
  if (Array.isArray(data.labels) && Array.isArray(data.values)) { const labels = data.labels.map(String); const values = data.values.map(Number); const max = Math.max(...values, 1); return <div className="min-w-0 space-y-2">{labels.map((label, index) => <div key={label} className="grid grid-cols-[70px_1fr_24px] items-center gap-2 text-xs"><span>{label}</span><span className="h-3 overflow-hidden rounded-full bg-white"><span className="block h-full rounded-full bg-revision" style={{ width: `${values[index] / max * 100}%` }} /></span><strong>{values[index]}</strong></div>)}</div>; }
  if (Number.isFinite(Number(data.parts)) && Number.isFinite(Number(data.selected))) { const parts = Number(data.parts); const selected = Number(data.selected); return <div><div className="flex gap-1">{Array.from({ length: parts }, (_, index) => <span key={index} className={`h-9 w-12 rounded-md border ${index < selected ? "border-revision bg-revision" : "border-gray-300 bg-white"}`} />)}</div><p className="mt-2 text-xs text-gray-600">{selected} parts sur {parts}</p></div>; }
  return <dl className="min-w-0 space-y-1 text-sm text-accent">{Object.entries(data).map(([key, item]) => <div key={key} className="flex flex-wrap gap-2"><dt className="font-semibold">{humanize(key)} :</dt><dd>{typeof item === "object" ? JSON.stringify(item) : String(item)}</dd></div>)}</dl>;
}

function DeterministicFeedback({ result }: { result: ValidationResult }) {
  const correct = result.status === "correct";
  return <div className={`mt-4 rounded-2xl border p-4 ${correct ? "border-primary/20 bg-primary/5" : "border-amber-200 bg-amber-50"}`}><p className={`font-semibold ${correct ? "text-primary" : "text-amber-900"}`}>{correct ? "Réponse validée" : "Essaie encore"}</p><p className="mt-1 text-sm leading-6 text-gray-700">{result.message}</p></div>;
}

function PaperCallout({ text }: { text: string }) { return <div className="mt-5 flex items-start gap-3 rounded-2xl border border-revision/15 bg-revision/[.04] p-4"><NotebookPen className="mt-0.5 h-5 w-5 shrink-0 text-revision" /><p className="text-sm leading-6 text-accent">{text}</p></div>; }
function asOptions(value: unknown) { return Array.isArray(value) ? value.filter((item): item is GuidedOption => Boolean(item && typeof item === "object" && "id" in item && "label" in item)) : []; }
function asStrings(value: unknown) { return Array.isArray(value) ? value.map(String) : []; }
function parseArray(value: string) { try { const parsed = JSON.parse(value || "[]"); return Array.isArray(parsed) ? parsed.map(String) : []; } catch { return []; } }
function humanize(value: string) { return value.replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase()); }
function stageLabel(type: string, transfer: boolean) { if (transfer) return "Transfert · une dernière question"; if (type === "paper_work") return "À toi · sur papier"; if (type === "guided_solution") return "Correction guidée"; if (type === "self_assessment") return "Auto-évaluation"; if (type === "self_validation") return "Auto-validation"; return "Comprendre la méthode"; }
function visualTitle(type: string) { return ({ fraction_bar: "Bande de fractions", route: "Parcours", timeline: "Frise horaire", rectangle: "Cour rectangulaire", geometry_start: "Figure de départ" } as Record<string, string>)[type] || "Données de l’exercice"; }
function visualDescription(display: Record<string, unknown>) { if (display.type === "fraction_bar") return `${display.selected_parts} parts sur ${display.total_parts}`; if (display.type === "route") return ((display.segments as Array<Record<string, unknown>> | undefined) || []).map((item) => `${item.label} : ${item.length}`).join(" · "); if (display.type === "timeline") return `Départ ${display.start} · durée ${display.duration}`; if (display.type === "rectangle") return `Longueur ${display.length} · largeur ${display.width}`; if (display.type === "geometry_start") return "Une droite d et un point A situé hors de la droite."; return "Observe les informations avant de répondre."; }
