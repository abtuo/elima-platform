"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function TeacherCodeLoginPage() {
  const router = useRouter();
  const [matricule, setMatricule] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/teacher-code/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matricule: matricule.trim().toUpperCase(),
        code: code.trim().toUpperCase(),
      }),
    });
    setLoading(false);

    const body = (await res.json().catch(() => null)) as { message?: string; redirectTo?: string } | null;
    if (!res.ok) {
      setError(body?.message ?? "Connexion impossible.");
      return;
    }
    router.replace(body?.redirectTo ?? "/teacher");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-8 md:px-8">
      <section className="elima-card mx-auto w-full max-w-lg space-y-5">
        <h1 className="text-2xl font-bold">Connexion enseignant</h1>
        <p className="text-sm text-slate-600">Entrez votre matricule et le code reçu de l&apos;établissement.</p>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">Matricule (5 caractères)</label>
          <input
            value={matricule}
            onChange={(e) => setMatricule(e.target.value)}
            maxLength={5}
            placeholder="AB12C"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm uppercase"
          />

          <label className="block text-sm font-medium text-slate-700">Code provisoire</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={5}
            placeholder="Q7K2L"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm uppercase"
          />

          {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          <button
            disabled={loading}
            onClick={submit}
            className="w-full rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
          <p className="text-center text-sm text-slate-600">
            Vous avez un compte email ?{" "}
            <Link href="/login/email" className="font-semibold text-[var(--primary)]">
              Connexion classique
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
