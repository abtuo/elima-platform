import type {
  PedagogicalBlock,
  PedagogicalCorrection,
  StudentResourceView,
  TeacherResourceView,
} from "@elima/pedagogy";
import React from "react";
import { MarkdownContent } from "./MarkdownContent";
import { cn } from "./utils";
import { ScientificChart } from "./ScientificChart";
import { ScientificDiagram } from "./ScientificDiagram";

export type PedagogicalRendererProps = {
  view: StudentResourceView | TeacherResourceView;
  className?: string;
  onLocateBlock?: (blockId: string) => void;
};

const toneClasses = {
  info: "border-sky-200 bg-sky-50",
  method: "border-violet-200 bg-violet-50",
  warning: "border-amber-200 bg-amber-50",
  success: "border-emerald-200 bg-emerald-50",
} as const;

function safeImageUri(uri?: string) {
  if (!uri) return null;
  if (uri.startsWith("/") || /^https:\/\//i.test(uri)) return uri;
  return null;
}

function Correction({ correction }: { correction: PedagogicalCorrection }) {
  const answer = correction.answerKey;
  const answerText = answer.kind === "single_choice" ? answer.optionId
    : answer.kind === "multiple_choice" ? answer.optionIds.join(", ")
      : answer.kind === "boolean" ? (answer.value ? "Vrai" : "Faux")
        : answer.kind === "numeric" ? `${answer.value}${answer.unit ? ` ${answer.unit}` : ""}`
          : answer.kind === "fraction" ? `${answer.numerator}/${answer.denominator}`
            : answer.kind === "steps" ? (answer.finalAnswer ?? "Démarche attendue")
              : answer.kind === "text" ? answer.expectedElements.join(" · ")
                : "Analyse scientifique attendue";
  return (
    <aside className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4" aria-label="Corrigé enseignant">
      <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Corrigé enseignant</p>
      <p className="mt-2 text-sm font-semibold text-slate-800">Réponse attendue : {answerText}</p>
      <MarkdownContent content={correction.correctionMarkdown} className="mt-2" />
      {correction.solutionSteps.length ? (
        <ol className="mt-3 space-y-2 border-l-2 border-emerald-200 pl-4">
          {correction.solutionSteps.map((step, index) => (
            <li key={step.id} className="text-sm">
              <span className="font-semibold">{step.title ?? `Étape ${index + 1}`}</span>
              <MarkdownContent content={step.markdown} />
            </li>
          ))}
        </ol>
      ) : null}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {correction.rubric.map((item) => (
          <div key={item.id} className="flex justify-between gap-3 rounded-lg bg-white/80 px-3 py-2 text-sm">
            <span>{item.criterion}</span><strong>{item.points} pt</strong>
          </div>
        ))}
      </div>
      {correction.teacherComments ? <p className="mt-3 text-sm italic text-slate-600">Note : {correction.teacherComments}</p> : null}
    </aside>
  );
}

function Block({ block, correction }: { block: PedagogicalBlock; correction?: PedagogicalCorrection }) {
  switch (block.type) {
    case "heading": {
      const Tag = block.level <= 2 ? "h2" : block.level === 3 ? "h3" : "h4";
      return <Tag className="font-bold text-slate-900">{block.text}</Tag>;
    }
    case "rich_text": return <MarkdownContent content={block.markdown} />;
    case "definition": return <section className="rounded-xl border-l-4 border-[var(--primary,#256f47)] bg-emerald-50 p-4"><p className="font-bold text-emerald-900">{block.term}</p><MarkdownContent content={block.markdown} className="mt-1" /></section>;
    case "callout": return <section className={cn("rounded-xl border p-4", toneClasses[block.tone])}>{block.title ? <p className="font-bold text-slate-900">{block.title}</p> : null}<MarkdownContent content={block.markdown} className="mt-1" /></section>;
    case "formula": return <figure className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-center"><MarkdownContent content={block.display ? `$$${block.latex}$$` : `$${block.latex}$`} />{block.label ? <figcaption className="mt-2 text-xs text-slate-500">{block.label}</figcaption> : null}</figure>;
    case "worked_example": return <section className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4"><h3 className="font-bold text-indigo-950">{block.title}</h3><MarkdownContent content={block.promptMarkdown} className="mt-2" /><ol className="mt-3 space-y-2">{block.steps.map((step, index) => <li key={step.id} className="rounded-lg bg-white/80 p-3"><p className="text-sm font-semibold">{step.title ?? `Étape ${index + 1}`}</p><MarkdownContent content={step.markdown} /></li>)}</ol>{block.conclusionMarkdown ? <MarkdownContent content={block.conclusionMarkdown} className="mt-3 font-medium" /> : null}</section>;
    case "summary": return <section className="rounded-xl bg-slate-900 p-5 text-white"><h3 className="font-bold">{block.title ?? "À retenir"}</h3><ul className="mt-3 space-y-2">{block.items.map((item, index) => <li key={index} className="flex gap-2"><span aria-hidden>•</span><MarkdownContent content={item} className="prose-invert" /></li>)}</ul></section>;
    case "image": {
      const uri = safeImageUri(block.uri);
      return <figure className="rounded-xl border border-slate-200 bg-slate-50 p-3">{uri ? <img src={uri} alt={block.alt} className="mx-auto max-h-[32rem] max-w-full rounded-lg object-contain" /> : <div className="grid min-h-32 place-items-center rounded-lg border border-dashed border-slate-300 px-4 text-center text-sm text-slate-500">Illustration référencée : {block.alt}</div>}<figcaption className="mt-2 text-sm text-slate-600">{block.caption ?? block.alt}</figcaption></figure>;
    }
    case "table": return <figure className="overflow-hidden rounded-xl border border-slate-200"><figcaption className="bg-slate-50 px-4 py-3 font-semibold">{block.title ?? "Tableau"}</figcaption><div className="overflow-x-auto"><table className="w-full min-w-[32rem] border-collapse text-left text-sm"><thead><tr className="border-y border-slate-200 bg-slate-50">{block.columns.map((column) => <th key={column.id} className="px-4 py-2">{column.label}{column.unit ? ` (${column.unit})` : ""}</th>)}</tr></thead><tbody>{block.rows.map((row) => <tr key={row.id} className="border-b border-slate-100">{row.cells.map((cell, index) => <td key={`${row.id}-${index}`} className="px-4 py-2">{cell === null ? "—" : String(cell)}</td>)}</tr>)}</tbody></table></div>{block.caption ? <p className="px-4 py-2 text-xs text-slate-500">{block.caption}</p> : null}</figure>;
    case "chart": return <ScientificChart block={block} className="rounded-xl border border-slate-200 p-4" />;
    case "diagram": return <ScientificDiagram block={block} className="rounded-xl border border-slate-200 bg-slate-50 p-4" />;
    case "question": return <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{block.question.title ?? "Question"}</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{block.question.points} pt</span></div><MarkdownContent content={block.question.promptMarkdown} className="mt-3" />{block.question.options ? <ol className="mt-3 grid gap-2 sm:grid-cols-2">{block.question.options.map((option, index) => <li key={option.id} className="flex gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"><span className="font-bold">{String.fromCharCode(65 + index)}.</span><MarkdownContent content={option.labelMarkdown} inline /></li>)}</ol> : null}{correction ? <Correction correction={correction} /> : null}</section>;
    case "exercise_group": return <section className="rounded-xl border-l-4 border-orange-300 bg-orange-50 p-4"><h3 className="font-bold">{block.title}</h3>{block.introductionMarkdown ? <MarkdownContent content={block.introductionMarkdown} className="mt-2" /> : null}<p className="mt-2 text-xs text-slate-500">Questions : {block.questionIds.join(", ")}</p></section>;
    case "guided_activity": return <section className="rounded-xl border border-cyan-200 bg-cyan-50 p-4"><h3 className="font-bold">{block.title}</h3><ol className="mt-3 space-y-3">{block.steps.map((step, index) => <li key={step.id}><p className="font-semibold">{index + 1}. {step.title}</p><MarkdownContent content={step.instructionMarkdown} /></li>)}</ol></section>;
    case "assessment": return <section className="rounded-xl border-2 border-slate-300 p-4"><div className="flex justify-between gap-3"><h3 className="font-bold">{block.title}</h3><strong>{block.declaredPoints} points · /{block.scale}</strong></div>{block.instructionsMarkdown ? <MarkdownContent content={block.instructionsMarkdown} className="mt-2" /> : null}<p className="mt-2 text-xs text-slate-500">Questions : {block.questionIds.join(", ")}</p></section>;
    case "document_analysis": return <section className="rounded-xl border border-teal-200 bg-teal-50 p-4"><h3 className="font-bold">{block.title}</h3><MarkdownContent content={block.introductionMarkdown} className="mt-2" /><p className="mt-2 text-xs text-slate-500">Documents : {block.documentRefs.join(", ")} · Questions : {block.questionIds.join(", ")}</p></section>;
  }
}

export function PedagogicalRenderer({ view, className, onLocateBlock }: PedagogicalRendererProps) {
  const corrections = new Map(view.audience === "teacher" ? view.secrets.corrections.map((item) => [item.questionId, item]) : []);
  const metadata = view.document.metadata;
  return (
    <article className={cn("mx-auto w-full max-w-4xl rounded-2xl bg-white p-5 text-slate-800 shadow-sm sm:p-8", className)}>
      <header className="border-b border-slate-200 pb-6">
        <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--primary,#256f47)]"><span>{metadata.subject}</span><span>•</span><span>{metadata.level}{metadata.track ? ` · ${metadata.track}` : ""}</span></div>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">{metadata.title}</h1>
        <p className="mt-2 text-slate-600">{metadata.description}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600"><span className="rounded-full bg-slate-100 px-3 py-1">{metadata.chapter}</span><span className="rounded-full bg-slate-100 px-3 py-1">{metadata.estimatedMinutes} min</span></div>
      </header>
      <div className="mt-6 space-y-5">
        {view.document.blocks.map((block) => <div key={block.id} id={`pedagogy-block-${block.id}`} data-pedagogical-block={block.type} onClick={() => onLocateBlock?.(block.id)}><Block block={block} correction={block.type === "question" ? corrections.get(block.question.id) : undefined} /></div>)}
      </div>
    </article>
  );
}

