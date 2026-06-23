"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";

type Profile = {
  full_name: string;
  email: string | null;
  phone: string | null;
};

type Term = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
};

export default function DashboardSettingsPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [terms, setTerms] = useState<Term[]>([]);
  const [currentTermId, setCurrentTermId] = useState<string>("");
  const [savingTerm, setSavingTerm] = useState(false);
  const [termStatus, setTermStatus] = useState<string | null>(null);
  const [termError, setTermError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [stampUrl, setStampUrl] = useState<string | null>(null);
  const [uploadingKind, setUploadingKind] = useState<"logo" | "stamp" | null>(null);
  const [brandStatus, setBrandStatus] = useState<string | null>(null);
  const [brandError, setBrandError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadProfile() {
      const res = await fetch("/api/profile");
      if (!res.ok) return;
      const data = (await res.json().catch(() => null)) as { profile?: Profile } | null;
      if (isMounted && data?.profile) {
        setFullName(data.profile.full_name ?? "");
        setEmail(data.profile.email ?? "");
        setPhone(data.profile.phone ?? "");
      }
    }
    async function loadSchoolSettings() {
      const res = await fetch("/api/dashboard/school-settings");
      if (!res.ok) return;
      const data = (await res.json().catch(() => null)) as
        | { school?: { current_term_id?: string | null; logo_url?: string | null; stamp_url?: string | null }; terms?: Term[] }
        | null;
      if (!isMounted || !data) return;
      setTerms(data.terms ?? []);
      setCurrentTermId(data.school?.current_term_id ?? "");
      setLogoUrl(data.school?.logo_url ?? null);
      setStampUrl(data.school?.stamp_url ?? null);
    }
    loadProfile();
    loadSchoolSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  async function submit() {
    setLoading(true);
    setStatus(null);
    setError(null);

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, phone }),
    });

    setLoading(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(body?.message ?? "Mise à jour impossible");
      return;
    }

    setStatus("Vos informations ont été mises à jour.");
  }

  async function saveCurrentTerm() {
    setSavingTerm(true);
    setTermStatus(null);
    setTermError(null);

    const res = await fetch("/api/dashboard/school-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_term_id: currentTermId || null }),
    });

    setSavingTerm(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      setTermError(body?.message ?? "Mise à jour impossible");
      return;
    }

    setTermStatus("Trimestre courant mis à jour.");
  }

  async function uploadBranding(kind: "logo" | "stamp", file: File) {
    setUploadingKind(kind);
    setBrandStatus(null);
    setBrandError(null);
    try {
      const formData = new FormData();
      formData.append("kind", kind);
      formData.append("file", file);
      const res = await fetch("/api/dashboard/school-branding", { method: "POST", body: formData });
      const body = (await res.json().catch(() => null)) as { url?: string; message?: string } | null;
      if (!res.ok || !body?.url) throw new Error(body?.message ?? "Téléversement impossible");
      if (kind === "logo") setLogoUrl(body.url);
      else setStampUrl(body.url);
      // Notify the dashboard layout so the sidebar logo refreshes instantly.
      window.dispatchEvent(new CustomEvent("elima:branding-updated", { detail: { kind, url: body.url } }));
      setBrandStatus(kind === "logo" ? "Logo mis à jour." : "Tampon mis à jour.");
    } catch (e) {
      setBrandError(e instanceof Error ? e.message : "Téléversement impossible");
    } finally {
      setUploadingKind(null);
    }
  }

  const formattedTerms = terms.map((term) => ({
    ...term,
    period: `${new Date(term.start_date).toLocaleDateString("fr-FR")} → ${new Date(
      term.end_date,
    ).toLocaleDateString("fr-FR")}`,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Paramètres" subtitle="Gérez vos informations personnelles." />

      <section className="elima-card space-y-4">
        <h2 className="text-lg font-semibold text-[var(--accent)]">Profil</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">Nom complet</label>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Nom complet"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="email@ecole.ci"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Téléphone</label>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+225 01 23 45 67 89"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>

        {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        {status ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{status}</p> : null}

        <button
          onClick={submit}
          disabled={loading}
          className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Mise à jour…" : "Enregistrer"}
        </button>
      </section>

      <section className="elima-card space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--accent)]">Identité visuelle</h2>
          <p className="text-sm text-slate-600">
            Le logo s’affiche dans l’interface et sur les bulletins. Le tampon est apposé sur les bulletins générés. (PNG ou JPG, max 2 Mo.)
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-800">Logo de l’école</p>
            <div className="mt-3 flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Logo de l’école" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-xs text-slate-400">Aucun</span>
                )}
              </div>
              <label className="cursor-pointer rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                {uploadingKind === "logo" ? "Téléversement…" : "Choisir un logo"}
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  disabled={uploadingKind !== null}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadBranding("logo", f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-800">Tampon / cachet</p>
            <div className="mt-3 flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {stampUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={stampUrl} alt="Tampon de l’école" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-xs text-slate-400">Aucun</span>
                )}
              </div>
              <label className="cursor-pointer rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                {uploadingKind === "stamp" ? "Téléversement…" : "Choisir un tampon"}
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  disabled={uploadingKind !== null}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadBranding("stamp", f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        {brandError ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{brandError}</p> : null}
        {brandStatus ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{brandStatus}</p> : null}
      </section>

      <section className="elima-card space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--accent)]">Année scolaire & trimestres</h2>
          <p className="text-sm text-slate-600">
            Consultez le calendrier des trimestres et choisissez celui qui est en cours.
          </p>
        </div>

        <div className="space-y-2 text-sm text-slate-700">
          {formattedTerms.length === 0 ? (
            <p className="text-slate-500">Aucun trimestre configuré pour cette école.</p>
          ) : (
            formattedTerms.map((term) => (
              <div key={term.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div>
                  <p className="font-semibold text-slate-800">{term.name}</p>
                  <p className="text-xs text-slate-500">{term.period}</p>
                </div>
                {currentTermId === term.id ? (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Trimestre courant
                  </span>
                ) : null}
              </div>
            ))
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-semibold text-slate-600">Trimestre courant</span>
            <select
              value={currentTermId}
              onChange={(event) => setCurrentTermId(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="">Sélectionner un trimestre</option>
              {formattedTerms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name} ({term.period})
                </option>
              ))}
            </select>
          </label>
        </div>

        {termError ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{termError}</p> : null}
        {termStatus ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{termStatus}</p> : null}

        <button
          onClick={saveCurrentTerm}
          disabled={savingTerm || terms.length === 0}
          className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {savingTerm ? "Enregistrement…" : "Enregistrer le trimestre"}
        </button>
      </section>
    </div>
  );
}
