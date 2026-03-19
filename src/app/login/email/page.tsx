"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function EmailLoginInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const redirectTo = sp.get("redirect") ?? "/dashboard";

  const [email, setEmail] = useState("admin.yakro@elima.demo");
  const [password, setPassword] = useState("Password123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hint = useMemo(
    () =>
      email.includes("teacher")
        ? "Astuce: les enseignants peuvent aller sur /teacher après connexion."
        : "Astuce: les admins école vont sur /dashboard après connexion.",
    [email],
  );

  async function submit() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/email/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
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

    router.replace(redirectTo);
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-8 md:px-8">
      <section className="elima-card mx-auto w-full max-w-lg space-y-5">
        <h1 className="text-2xl font-bold">Connexion (Supabase)</h1>
        <p className="text-sm text-slate-600">
          Connecte-toi avec un compte créé dans Supabase Auth (email + mot de passe).
        </p>

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
          <p className="text-xs text-slate-500">{hint}</p>
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
