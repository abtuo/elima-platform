"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, LoaderCircle, School, UserRound } from "lucide-react";

type Child = { id: string; name: string; grade: string; school: string; supplyListAvailable: boolean };
type State = { authenticated: boolean; children: Child[] };

export default function ChildrenPage() {
  const [state, setState] = useState<State | null>(null);
  useEffect(() => { fetch("/api/account/children").then((response) => response.json()).then(setState); }, []);
  if (!state) return <div className="store-shell grid min-h-[55vh] place-items-center"><LoaderCircle className="animate-spin text-[#2e8b57]" /></div>;
  return <div className="store-shell py-10">
    <p className="text-xs font-bold uppercase tracking-[.2em] text-[#2e8b57]">Espace familles</p>
    <h1 className="mt-2 text-4xl font-bold">Mes enfants</h1>
    <p className="mt-3 max-w-2xl leading-7 text-slate-600">Retrouvez les fournitures scolaires de vos enfants au même endroit.</p>
    {!state.authenticated ? <div className="store-card mt-8 max-w-2xl p-8 text-center"><UserRound className="mx-auto text-[#2e8b57]" size={50} /><h2 className="mt-4 text-2xl font-bold">Connectez-vous pour continuer</h2><p className="mt-2 text-slate-500">Accédez à votre espace famille avec votre numéro de téléphone.</p><Link href="/connexion?next=/mes-enfants" className="mt-6 inline-block rounded-xl bg-[#2e8b57] px-5 py-3 font-bold text-white">Se connecter</Link></div>
      : state.children.length === 0 ? <div className="store-card mt-8 max-w-2xl p-8 text-center"><School className="mx-auto text-[#2e8b57]" size={52} /><h2 className="mt-4 text-2xl font-bold">Votre espace famille vous attend</h2><p className="mt-2 leading-7 text-slate-500">Lorsque vos enfants seront reliés à votre compte par leur établissement, leurs listes de fournitures pourront apparaître ici.</p><Link href="/catalogue" className="mt-6 inline-block text-sm font-bold text-[#2e8b57]">Découvrir le catalogue →</Link></div>
      : <div className="mt-8 grid gap-5 md:grid-cols-2">{state.children.map((child) => <article key={child.id} className="store-card p-6"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#edf8f1] text-2xl">🎓</span><h2 className="mt-4 text-xl font-bold">{child.name}</h2><dl className="mt-4 grid gap-2 text-sm"><div className="flex justify-between gap-4"><dt className="text-slate-500">Niveau</dt><dd className="font-semibold">{child.grade}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">Établissement</dt><dd className="text-right font-semibold">{child.school}</dd></div></dl><div className="mt-5 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-500"><BookOpen size={17} className="text-[#2e8b57]" />{child.supplyListAvailable ? "Liste de fournitures disponible" : "La liste de fournitures sera bientôt disponible"}</div></article>)}</div>}
  </div>;
}
