import { useEffect, useState } from "react";
import { Building2, GraduationCap, LogOut, Save, SlidersHorizontal, Trash2, Trophy } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AppHeader } from "@/components/common/AppHeader";
import { ElimaCard } from "@/components/common/ElimaCard";
import { EmptyState } from "@/components/common/EmptyState";
import { GeneratedFeatureIcon } from "@/components/common/GeneratedFeatureIcon";
import { LegalLinks } from "@/components/common/LegalLinks";
import { PageContainer } from "@/components/layout/PageContainer";
import { SubjectIcon } from "@/components/revision/SubjectIcon";
import { STUDENT_CLASS_OPTIONS } from "@/constants/studentClasses";
import { REVISION_SUBJECT_OPTIONS } from "@/lib/revisionSubjects";
import { useAuth } from "@/features/auth/AuthProvider";
import { updateStandaloneStudentProfile } from "@/services/studentAccountService";
import { getQuizAttempts, getRevisionProgress } from "@/services/revisionDataService";
import { getSubjectPreferences, saveSubjectPreferences } from "@/services/subjectPreferencesService";
import { deleteCurrentAccount } from "@/services/accountDeletionService";
import type { QuizAttemptSummary, RevisionProgress } from "@/types/revision";
import { useAndroidBack } from "@/hooks/useAndroidBack";
import { SubscriptionSummary } from "@/features/subscription/SubscriptionPage";

export function RevisionStudentProfilePage() {
  const { profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<QuizAttemptSummary[]>([]);
  const [progress, setProgress] = useState<RevisionProgress | null>(null);
  const [schoolName, setSchoolName] = useState(profile.declaredSchoolName ?? "");
  const [schoolCity, setSchoolCity] = useState(profile.declaredSchoolCity ?? "");
  const [level, setLevel] = useState(profile.schoolLevelId ?? profile.className ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [preferencesMessage, setPreferencesMessage] = useState("");
  const [preferencesError, setPreferencesError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  useAndroidBack(() => {
    if (!deleteOpen) return false;
    if (!deleting) { setDeleteOpen(false); setDeletePassword(""); setDeleteConfirmation(""); setDeleteError(""); }
    return true;
  }, 100);

  useEffect(() => {
    Promise.all([getQuizAttempts(profile.id), getRevisionProgress(profile.id), getSubjectPreferences(profile.id)]).then(([nextAttempts, nextProgress, nextSubjectIds]) => {
      setAttempts(nextAttempts);
      setProgress(nextProgress);
      setSubjectIds(nextSubjectIds);
    });
  }, [profile.id]);

  async function saveProfile() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await updateStandaloneStudentProfile({ schoolLevelId: level, declaredSchoolName: schoolName, declaredSchoolCity: schoolCity });
      await refreshProfile();
      setMessage("Profil enregistré.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await signOut();
    navigate("/auth/login", { replace: true });
  }

  async function savePreferences() {
    setSaving(true); setPreferencesMessage(""); setPreferencesError("");
    try { await saveSubjectPreferences(subjectIds); setPreferencesMessage("Matières enregistrées."); }
    catch (caught) { setPreferencesError(caught instanceof Error ? caught.message : "Enregistrement impossible."); }
    finally { setSaving(false); }
  }

  async function deleteAccount(event: React.FormEvent) {
    event.preventDefault();
    setDeleteError(""); setDeleting(true);
    try {
      const result = await deleteCurrentAccount(deletePassword, deleteConfirmation);
      await signOut();
      navigate("/", { replace: true, state: { accountDeleted: true, identityRetained: result.status === "shared_identity" } });
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : "Suppression momentanément indisponible.");
    } finally { setDeleting(false); }
  }

  return (
    <PageContainer>
      <AppHeader title="Mon profil" subtitle="Mon compte et mes révisions" accent="#7C3AED" action={<GeneratedFeatureIcon name="profile" className="h-14 w-14" />} />
      <ElimaCard>
        <div className="flex min-w-0 items-center gap-4">
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt={`Photo de ${profile.fullName}`} className="h-14 w-14 shrink-0 rounded-2xl bg-gray-100 object-cover" /> : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-revision/10 text-xl font-bold text-revision">{profile.fullName.charAt(0)}</span>}
          <div className="min-w-0"><p className="truncate font-title text-lg font-semibold text-accent">{profile.fullName}</p><p className="truncate text-sm text-gray-500">{profile.email}</p><p className="mt-1 flex items-center gap-1 text-xs font-semibold text-revision"><GraduationCap className="h-3.5 w-3.5" />{level || "Niveau non renseigné"}</p></div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2"><Metric value={progress?.completedQuizCount ?? 0} label="Quiz" /><Metric value={`${progress?.averageScore ?? 0}%`} label="Score" /><Metric value={progress?.xp ?? 0} label="XP" /></div>
      </ElimaCard>

      <SubscriptionSummary />
      {!profile.schoolId ? <ElimaCard className="mt-5">
        <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-revision/10 text-revision"><Building2 className="h-5 w-5" /></span><div><h2 className="font-title text-lg font-semibold text-accent">Compte Révision</h2><p className="mt-1 text-xs leading-5 text-gray-500">Ces informations permettent d’adapter les contenus, même sans établissement Elima.</p></div></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><Field label="École (facultatif)" value={schoolName} onChange={setSchoolName} /><Field label="Ville (facultatif)" value={schoolCity} onChange={setSchoolCity} /><label className="block sm:col-span-2"><span className="mb-2 block text-sm font-semibold text-gray-700">Classe / niveau</span><select value={level} onChange={(event) => setLevel(event.target.value)} className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-revision"><option value="">Choisir</option>{STUDENT_CLASS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label></div>
        {message ? <p className="mt-4 rounded-2xl bg-primary/5 px-4 py-3 text-sm text-primary">{message}</p> : null}
        {error ? <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-danger">{error}</p> : null}
        <button type="button" disabled={saving || !level} onClick={saveProfile} className="tap mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-revision px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Enregistrement…" : "Enregistrer mon profil"}</button>
      </ElimaCard> : null}

      <ElimaCard className="mt-5">
        <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-revision/10 text-revision"><SlidersHorizontal className="h-5 w-5" /></span><div><h2 className="font-title text-lg font-semibold text-accent">Préférences</h2><p className="mt-1 text-xs text-gray-500">Modifier mes matières</p></div></div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{REVISION_SUBJECT_OPTIONS.map((item) => { const selected = subjectIds.includes(item.id); return <button key={item.id} type="button" aria-pressed={selected} onClick={() => setSubjectIds((current) => selected ? current.filter((id) => id !== item.id) : [...current, item.id])} className={`rounded-2xl border px-3 py-2.5 text-left text-xs font-semibold ${selected ? "border-revision bg-revision text-white" : "border-gray-200 text-gray-600"}`}>{item.label}</button>; })}</div>
        {preferencesMessage ? <p className="mt-4 rounded-2xl bg-primary/5 px-4 py-3 text-sm text-primary">{preferencesMessage}</p> : null}
        {preferencesError ? <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-danger">{preferencesError}</p> : null}
        <button type="button" disabled={saving || !subjectIds.length} onClick={savePreferences} className="tap mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-revision px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" />Enregistrer mes matières</button>
      </ElimaCard>

      <section className="mt-5 space-y-3"><div className="flex items-center justify-between"><div><h2 className="font-title text-lg font-semibold text-accent">Historique Révision</h2><p className="text-xs text-gray-500">Tes derniers QCM</p></div><Trophy className="h-5 w-5 text-revision" /></div>{attempts.length ? attempts.slice(0, 20).map((attempt) => <ElimaCard key={attempt.id} className="flex items-center gap-3"><SubjectIcon subject={attempt.subject} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-accent">{attempt.topic || attempt.subject}</span><span className="block truncate text-xs text-gray-500">{new Date(attempt.completedAt).toLocaleDateString("fr-FR")}</span></span><span className="font-title text-lg font-bold text-revision">{attempt.score}%</span></ElimaCard>) : <EmptyState icon={Trophy} title="Aucun quiz terminé" description="Tes prochaines performances apparaîtront ici." />}</section>

      <ElimaCard className="mt-5 border border-red-100">
        <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-danger"><Trash2 className="h-5 w-5" /></span><div><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Réglages · Compte</p><h2 className="mt-1 font-title text-lg font-semibold text-accent">Supprimer mon compte</h2><p className="mt-1 text-xs leading-5 text-gray-500">Ton compte et tes données Révision seront définitivement supprimés. Cette action est irréversible.</p></div></div>
        {!deleteOpen ? <button type="button" onClick={() => setDeleteOpen(true)} className="mt-4 w-full rounded-2xl border border-red-200 px-4 py-3 text-sm font-semibold text-danger">Supprimer mon compte</button> : <form onSubmit={deleteAccount} className="mt-5 space-y-3 rounded-2xl bg-red-50 p-4"><p className="text-sm font-semibold text-red-900">Confirmation de sécurité</p><label className="block"><span className="mb-1 block text-xs font-semibold text-red-900">Mot de passe Elima</span><input type="password" autoComplete="current-password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} className="w-full rounded-xl border border-red-200 bg-white px-3 py-2.5 text-sm outline-none" required minLength={8} /></label><label className="block"><span className="mb-1 block text-xs font-semibold text-red-900">Saisis SUPPRIMER</span><input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} className="w-full rounded-xl border border-red-200 bg-white px-3 py-2.5 text-sm outline-none" autoComplete="off" required /></label>{deleteError ? <p role="alert" className="text-sm text-danger">{deleteError}</p> : null}<div className="grid grid-cols-2 gap-2"><button type="button" disabled={deleting} onClick={() => { setDeleteOpen(false); setDeletePassword(""); setDeleteConfirmation(""); setDeleteError(""); }} className="rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-gray-600">Annuler</button><button type="submit" disabled={deleting || deleteConfirmation.trim().toUpperCase() !== "SUPPRIMER" || deletePassword.length < 8} className="rounded-xl bg-danger px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{deleting ? "Suppression…" : "Supprimer définitivement"}</button></div></form>}
        <p className="mt-3 text-center text-xs text-gray-500"><Link to="/legal/account-deletion" className="font-semibold text-primary underline">En savoir plus sur la suppression des données</Link></p>
      </ElimaCard>

      <button type="button" onClick={logout} className="tap mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-600"><LogOut className="h-4 w-4" />Se déconnecter</button>
      <LegalLinks className="mt-5 text-gray-500" />
    </PageContainer>
  );
}

function Metric({ value, label }: { value: string | number; label: string }) {
  return <div className="min-w-0 rounded-2xl bg-gray-50 px-2 py-3 text-center"><p className="truncate font-title text-lg font-bold text-accent">{value}</p><p className="truncate text-[10px] text-gray-500">{label}</p></div>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold text-gray-700">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-revision" /></label>;
}
