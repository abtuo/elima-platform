"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function PhonePasswordLoginInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const redirectTo = sp.get("redirect") ?? "/dashboard";

  const [mode, setMode] = useState<"LOGIN" | "SIGNUP">("LOGIN");
  const [phone, setPhone] = useState("+225");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    const endpoint = mode === "LOGIN" ? "/api/auth/password/login" : "/api/auth/password/signup";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as unknown;
      const message =
        body && typeof body === "object" && "message" in body
          ? String((body as { message?: unknown }).message ?? "")
          : "";
      setError(message || "Erreur");
      return;
    }
    router.replace(redirectTo);
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-8 md:px-8">
      <section className="elima-card mx-auto w-full max-w-lg space-y-5">
        <h1 className="text-2xl font-bold">Connexion Parent (téléphone + mot de passe)</h1>
        <p className="text-sm text-slate-600">
          Mode test. Le SMS/WhatsApp OTP sera activé plus tard.
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("LOGIN")}
            className={mode === "LOGIN" ? "rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white" : "rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"}
          >
            Se connecter
          </button>
          <button
            type="button"
            onClick={() => setMode("SIGNUP")}
            className={mode === "SIGNUP" ? "rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white" : "rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"}
          >
            Créer un compte
          </button>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">Téléphone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+2250102030405"
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
            {loading ? "…" : mode === "LOGIN" ? "Se connecter" : "Créer"}
          </button>
        </div>
      </section>
    </main>
  );
}

export default function PhonePasswordLoginPage() {
  return (
    <Suspense>
      <PhonePasswordLoginInner />
    </Suspense>
  );
}
