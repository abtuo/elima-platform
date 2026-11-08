import Link from 'next/link';
import { BookOpen, Download, FileText, ScanLine, TrendingUp } from 'lucide-react';
import { revisionUrl, revisionPlayStoreUrl } from '@/lib/urls';

export function RevisionSection() {
  return <section id="revision" className="space-y-6 rounded-[28px] border border-violet-200 bg-white p-6 shadow-sm md:p-10">
    <div className="max-w-3xl space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Vous êtes élève ?</p>
      <h2 className="text-3xl font-bold text-[var(--accent)]">Elima Révision</h2>
      <p className="text-lg text-slate-600">Révise, comprends tes cours et progresse à ton rythme.</p>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[
      { icon: BookOpen, title: 'QCM', text: 'Entraîne-toi sur les notions de tes cours.' },
      { icon: FileText, title: 'Fiches', text: 'Retrouve les points essentiels à réviser.' },
      { icon: ScanLine, title: 'Scanner de documents', text: 'Transforme tes documents en supports de révision.' },
      { icon: TrendingUp, title: 'Progression personnalisée', text: 'Retrouve ton historique et tes matières.' },
    ].map(({icon: Icon, title, text}) => <div key={title} className="min-w-0 rounded-2xl bg-violet-50 p-4"><Icon aria-hidden className="mb-3 text-violet-700" /><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm text-slate-600">{text}</p></div>)}</div>
    <div className="flex flex-wrap items-center gap-3">
      <Link href={revisionUrl} className="rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white">Essayer sur le web</Link>
      <a
        href={revisionPlayStoreUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-violet-200 bg-white px-5 py-3 text-sm font-semibold text-violet-800 transition hover:border-violet-400 hover:bg-violet-50"
      >
        <Download aria-hidden size={18} />
        Télécharger sur Play Store
      </a>
    </div>
  </section>;
}
