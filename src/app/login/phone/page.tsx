"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function PhoneLoginInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const redirectTo = sp.get("redirect") ?? "/dashboard";

  const [step, setStep] = useState<"PHONE" | "OTP">("PHONE");
  const [phone, setPhone] = useState("+225");
  const [channel, setChannel] = useState<"whatsapp" | "sms">("whatsapp");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/phone/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, channel }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as unknown;
      const message =
        body && typeof body === "object" && "message" in body
          ? String((body as { message?: unknown }).message ?? "")
          : "";
      setError(message || "Erreur lors de l’envoi du code");
      return;
    }
    setStep("OTP");
  }

  async function verify() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/phone/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, token, type: "sms" }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as unknown;
      const message =
        body && typeof body === "object" && "message" in body
          ? String((body as { message?: unknown }).message ?? "")
          : "";
      setError(message || "Code invalide");
      return;
    }
    router.replace(redirectTo);
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-8 md:px-8">
      <section className="elima-card mx-auto w-full max-w-lg space-y-5">
        <h1 className="text-2xl font-bold">Connexion par téléphone</h1>
        <p className="text-sm text-slate-600">
          Recevez un code par WhatsApp ou SMS, puis saisissez-le pour vous connecter.
        </p>

        {step === "PHONE" ? (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">Numéro (format international)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+2250102030405"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />

            <label className="block text-sm font-medium text-slate-700">Canal</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as "whatsapp" | "sms")}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
            </select>

            {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

            <button
              disabled={loading}
              onClick={send}
              className="w-full rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Envoi…" : "Recevoir le code"}
            </button>

            <p className="text-xs text-slate-500">
              Mode test : configure des numéros OTP de test dans Supabase pour les démos.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Un code a été envoyé à {phone}.</p>
            <label className="block text-sm font-medium text-slate-700">Code (OTP)</label>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="123456"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />

            {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

            <button
              disabled={loading}
              onClick={verify}
              className="w-full rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Vérification…" : "Se connecter"}
            </button>

            <button
              disabled={loading}
              onClick={() => setStep("PHONE")}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Changer de numéro
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

export default function PhoneLoginPage() {
  return (
    <Suspense>
      <PhoneLoginInner />
    </Suspense>
  );
}
