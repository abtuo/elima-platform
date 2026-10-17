import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import type { PedagogicalSupport, PedagogicalSupportContent } from "@elima/revision-core";
import { PedagogicalSupportPlayer } from "@elima/revision-ui";
import { PageContainer } from "@/components/layout/PageContainer";
import { pedagogicalLearning } from "@/services/pedagogicalLearningService";

export function PedagogicalSupportsPage() {
  const { publicationId } = useParams();
  const [items, setItems] = useState<PedagogicalSupport[]>([]);
  const [content, setContent] = useState<PedagogicalSupportContent | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true); setMessage("");
    const request = publicationId ? pedagogicalLearning.content(publicationId) : pedagogicalLearning.list();
    void request.then((result) => publicationId ? setContent(result as PedagogicalSupportContent) : setItems((result as { items: PedagogicalSupport[] }).items)).catch((reason) => setMessage(reason instanceof Error ? reason.message : "Chargement impossible.")).finally(() => setLoading(false));
  }, [publicationId]);
  return <PageContainer>
    {publicationId ? <Link to="/student/reviser/supports" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800"><ArrowLeft className="h-4 w-4" />Tous les supports</Link> : null}
    {loading ? <p className="rounded-2xl bg-white p-6 text-sm text-slate-500">Chargement des supports…</p> : null}
    {message ? <p role="alert" className="rounded-2xl bg-red-50 p-5 text-sm text-red-800">{message}</p> : null}
    {!publicationId && !loading ? <><header><p className="text-sm font-bold uppercase tracking-wide text-emerald-700">Nouveau dans Révision</p><h1 className="mt-1 text-3xl font-bold text-slate-950">Supports de mes enseignants</h1><p className="mt-2 text-slate-600">Les contenus affectés à ta classe ou directement à ton profil.</p></header><div className="mt-6 grid gap-4 sm:grid-cols-2">{items.map((item) => <Link key={item.publicationId} to={`/student/reviser/supports/${item.publicationId}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><BookOpen className="h-6 w-6 text-emerald-700" /><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{item.activityMode === "evaluation" ? "Évaluation" : "Entraînement"}</span></div><h2 className="mt-4 text-lg font-bold">{item.title}</h2><p className="mt-1 text-sm text-slate-600">{item.subject} · {item.level}</p></Link>)}</div>{!items.length ? <p className="mt-6 rounded-2xl border border-dashed p-8 text-center text-slate-500">Aucun support actif pour le moment.</p> : null}</> : null}
    {content ? <PedagogicalSupportPlayer content={content} onStart={(key) => pedagogicalLearning.start(content.publication.publicationId, key)} onAnswer={(input) => pedagogicalLearning.answer(input)} onSubmit={(id) => pedagogicalLearning.submit(id)} /> : null}
  </PageContainer>;
}
