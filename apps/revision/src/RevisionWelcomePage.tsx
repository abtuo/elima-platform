import { ArrowRight, BookOpenCheck, Brain, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { ElimaLogo } from "@/components/common/ElimaLogo";

export function RevisionWelcomePage() {
  return (
    <main className="relative flex min-h-[100dvh] items-center overflow-hidden bg-[#123c2d] px-4 py-10 text-white sm:px-6">
      <div className="absolute inset-0 opacity-20" aria-hidden="true"><img src="/elima-ecole-connectee.png" alt="" className="h-full w-full object-cover" /></div>
      <section className="relative mx-auto w-full max-w-3xl text-center">
        <span className="inline-flex rounded-[1.75rem] bg-white px-6 py-3 shadow-xl"><ElimaLogo className="w-32" /></span>
        <p className="mt-8 text-sm font-semibold uppercase tracking-[.2em] text-secondary">Elima Révision</p>
        <h1 className="mt-4 font-title text-4xl font-semibold leading-tight sm:text-5xl">Révise, progresse et prépare tes examens.</h1>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/75 sm:text-base">Des QCM, des parcours guidés et des fiches adaptés à ton niveau, accessibles avec ton compte élève.</p>
        <div className="mx-auto mt-8 grid max-w-xl gap-3 sm:grid-cols-3"><Feature icon={Brain} label="QCM" /><Feature icon={Sparkles} label="Parcours" /><Feature icon={BookOpenCheck} label="Fiches" /></div>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link to="/auth/login" className="tap inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-revision">Se connecter <ArrowRight className="h-4 w-4" /></Link><Link to="/auth/inscription" className="tap inline-flex items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-semibold">Créer mon compte élève</Link></div>
      </section>
    </main>
  );
}

function Feature({ icon: Icon, label }: { icon: typeof Brain; label: string }) {
  return <span className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold"><Icon className="h-4 w-4 text-secondary" />{label}</span>;
}
