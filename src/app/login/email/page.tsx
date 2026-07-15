"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resolveAppMode } from "@/lib/app-mode";

const demoAccounts = [
  { label: "Admin Abidjan", email: "admin.abidjan@seed-elima.invalid", password: "ElimaSeed!2026" },
  { label: "Parent Mariam", email: "parent.mariam@elima.school", password: "ElimaSeed!2026" },
  { label: "Parent Aboubacar", email: "parent.aboubacar@elima.school", password: "ElimaSeed!2026" },
  { label: "Enseignant Serge", email: "enseignant.serge@elima.school", password: "ElimaSeed!2026" },
  { label: "Élève Awa", email: "eleve.awa@elima.school", password: "ElimaSeed!2026" },
  { label: "Élève Yao", email: "eleve.yao@elima.school", password: "ElimaSeed!2026" },
  { label: "Élève Lina", email: "eleve.lina@elima.school", password: "ElimaSeed!2026" },
  { label: "Élève Eli", email: "eleve.eli@elima.school", password: "ElimaSeed!2026" },
];

function EmailLoginInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const redirectTo = sp.get("redirect") ?? "/dashboard";
  const isDemo = resolveAppMode({
    NEXT_PUBLIC_ELIMA_APP_MODE: process.env.NEXT_PUBLIC_ELIMA_APP_MODE,
    NODE_ENV: process.env.NODE_ENV,
  }) === "demo";

  const [email, setEmail] = useState(isDemo ? "admin.abidjan@seed-elima.invalid" : "");
  const [password, setPassword] = useState(isDemo ? "ElimaSeed!2026" : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/email/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, redirect: redirectTo }),
    });

    setLoading(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as unknown;
      const message =
        body && typeof body === "object" && "message" in body
          ? String((body as { message?: unknown }).message ?? "")
          : "";
      setError(message || "Connexion impossible");
      return;
    }

    const body = (await res.json().catch(() => null)) as unknown;
    const apiRedirectTo =
      body && typeof body === "object" && "redirectTo" in body
        ? String((body as { redirectTo?: unknown }).redirectTo ?? "")
        : "";

    router.replace(apiRedirectTo || redirectTo);
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-8 md:px-8">
      <section className="elima-card mx-auto w-full max-w-lg space-y-5">
        <h1 className="text-2xl font-bold">Connexion</h1>
        <p className="text-sm text-slate-600">Saisissez vos identifiants.</p>
        {isDemo ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Comptes de demo</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(account.password);
                  }}
                  className="rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-amber-100"
                >
                  {account.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin.yakro@elima.demo"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />

          <label className="block text-sm font-medium text-slate-700">Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />

          {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          <button
            disabled={loading}
            onClick={submit}
            className="w-full rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </div>
      </section>
    </main>
  );
}

export default function EmailLoginPage() {
  return (
    <Suspense>
      <EmailLoginInner />
    </Suspense>
  );
}
