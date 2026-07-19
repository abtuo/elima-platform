import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, GraduationCap } from "lucide-react";
import { ElimaLogo } from "@/components/common/ElimaLogo";
import { signUpStandaloneStudent } from "@/services/authService";
import { openElimaStudentSignup } from "@/services/elimaIdentityService";
import { STUDENT_CLASS_OPTIONS } from "@/constants/studentClasses";

const levels = STUDENT_CLASS_OPTIONS;

export function StudentRegisterPage() {
  useEffect(() => { openElimaStudentSignup(); }, []);
  return <main className="flex min-h-screen items-center justify-center bg-[#f3f7f4]"><p className="text-sm font-semibold text-primary">Ouverture de l’inscription Elima…</p></main>;
}

function LegacyStudentRegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", level: "", schoolName: "", schoolCity: "" });
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmationEmail, setConfirmationEmail] = useState("");

  function field(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!accepted) return setError("Tu dois accepter les conditions d’utilisation.");
    if (form.password.length < 8) return setError("Le mot de passe doit contenir au moins 8 caractères.");
    setLoading(true);
    try {
      const { data, error: signUpError } = await signUpStandaloneStudent({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        schoolLevelId: form.level,
        declaredSchoolName: form.schoolName,
        declaredSchoolCity: form.schoolCity,
      });
      if (signUpError) throw signUpError;
      if (data.session) navigate("/student/reviser", { replace: true });
      else setConfirmationEmail(form.email.trim().toLowerCase());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Inscription impossible.");
    } finally {
      setLoading(false);
    }
  }

  if (confirmationEmail) {
    return <main className="flex min-h-screen items-center justify-center bg-[#f3f7f4] px-4"><section className="w-full max-w-md rounded-[2rem] bg-white p-8 text-center shadow-xl"><CheckCircle2 className="mx-auto h-12 w-12 text-primary" /><h1 className="mt-5 font-title text-2xl font-semibold text-accent">Vérifie ton adresse email</h1><p className="mt-3 text-sm leading-6 text-gray-500">Nous avons envoyé un lien de confirmation à <strong>{confirmationEmail}</strong>.</p><Link to="/auth/login" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white">Revenir à la connexion <ArrowRight className="h-4 w-4" /></Link></section></main>;
  }

  return (
    <main className="min-h-screen bg-[#f3f7f4] px-4 py-8">
      <section className="mx-auto w-full max-w-xl rounded-[2rem] border border-white bg-white/95 p-6 shadow-[0_24px_80px_rgba(21,55,42,.12)] sm:p-9">
        <div className="flex items-center justify-between"><Link to="/auth/login" className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 text-gray-500" aria-label="Retour"><ArrowLeft className="h-5 w-5" /></Link><ElimaLogo className="w-24" /><span className="w-10" /></div>
        <div className="mt-7 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-revision/10 text-revision"><GraduationCap className="h-6 w-6" /></span><h1 className="mt-4 font-title text-3xl font-semibold text-accent">Créer mon compte élève</h1><p className="mt-2 text-sm leading-6 text-gray-500">Commence à réviser immédiatement. Tu pourras rattacher ton compte à ton école plus tard avec un code.</p></div>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Prénom" value={form.firstName} onChange={(value) => field("firstName", value)} required /><Field label="Nom" value={form.lastName} onChange={(value) => field("lastName", value)} required /></div>
          <Field label="Adresse email" type="email" value={form.email} onChange={(value) => field("email", value)} required />
          <Field label="Mot de passe" type="password" value={form.password} onChange={(value) => field("password", value)} required hint="8 caractères minimum" />
          <label className="block"><span className="mb-2 block text-sm font-semibold text-gray-700">Classe / niveau</span><select value={form.level} onChange={(event) => field("level", event.target.value)} required className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-primary"><option value="">Choisir ma classe</option>{levels.map((level) => <option key={level}>{level}</option>)}</select></label>
          <div className="rounded-2xl bg-gray-50 p-4"><p className="text-sm font-semibold text-accent">Mon école <span className="font-normal text-gray-400">(facultatif)</span></p><div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label="Nom de l’école" value={form.schoolName} onChange={(value) => field("schoolName", value)} /><Field label="Ville" value={form.schoolCity} onChange={(value) => field("schoolCity", value)} /></div></div>
          <label className="flex items-start gap-3 text-xs leading-5 text-gray-500"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-1 h-4 w-4 accent-primary" /><span>J’accepte les conditions d’utilisation et la politique de confidentialité d’Elima.</span></label>
          {error ? <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-danger">{error}</p> : null}
          <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-white disabled:opacity-60">{loading ? "Création…" : <>Créer mon compte <ArrowRight className="h-4 w-4" /></>}</button>
        </form>
      </section>
    </main>
  );
}

function Field({ label, value, onChange, type = "text", required, hint }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; hint?: string }) {
  return <label className="block"><span className="mb-2 flex justify-between text-sm font-semibold text-gray-700"><span>{label}</span>{hint ? <span className="text-xs font-normal text-gray-400">{hint}</span> : null}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-primary" /></label>;
}
