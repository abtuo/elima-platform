import { useEffect, useState } from "react";
import { ArrowRight, BookOpenCheck, CircleCheck, CreditCard, GraduationCap, MessageCircle, PackageOpen, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { AppHeader } from "@/components/common/AppHeader";
import { PaymentStatusCard } from "@/components/cards/PaymentStatusCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { StatCard } from "@/components/revision/RevisionUI";
import { useAuth } from "@/features/auth/AuthProvider";
import { getAdminStats, getAdminTrends, getMessages, getPayments } from "@/services/mainDataService";
import type { AdminTrendPoint, MessagePreview, PaymentSummary } from "@/types/school";

export function AdminDashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ students: 0, teachers: 0, absencesToday: 0, pendingPayments: 0 });
  const [messages, setMessages] = useState<MessagePreview[]>([]);
  const [payments, setPayments] = useState<PaymentSummary[]>([]);
  const [trends, setTrends] = useState<AdminTrendPoint[]>([]);

  useEffect(() => {
    Promise.all([getAdminStats(), getMessages(), getPayments()]).then(([nextStats, nextMessages, nextPayments]) => {
      setStats(nextStats);
      setMessages(nextMessages);
      setPayments(nextPayments);
    });
    getAdminTrends().then(setTrends);
  }, []);

  const unreadMessages = messages.filter((item) => !item.read).length;

  return (
    <PageContainer className="max-w-6xl">
      <AppHeader title="Pilotage" subtitle={profile.schoolName ?? "Votre établissement"} />
      <section className="mb-5 overflow-hidden rounded-[2rem] bg-[#163c30] p-6 text-white shadow-[0_22px_55px_rgba(22,60,48,.18)]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold"><CircleCheck className="h-4 w-4 text-secondary" /> Activité de l’établissement</span><h2 className="mt-4 font-title text-2xl font-semibold">L’essentiel pour décider aujourd’hui.</h2><p className="mt-2 text-sm text-white/65">Effectifs, assiduité, encaissements et services scolaires.</p></div>
          <Link to="/admin/eleves" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#163c30]">Ouvrir l’annuaire <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Users} label="Élèves" value={stats.students} />
        <StatCard icon={GraduationCap} label="Professeurs" value={stats.teachers} />
        <StatCard icon={BookOpenCheck} label="Absences du jour" value={stats.absencesToday} />
        <StatCard icon={CreditCard} label="Impayés" value={stats.pendingPayments} />
      </div>

      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link to="/admin/eleves" className="rounded-3xl bg-white p-4 shadow-sm"><Users className="h-5 w-5 text-primary" /><p className="mt-3 font-semibold text-accent">Annuaire</p><p className="mt-1 text-xs text-gray-500">Élèves et professeurs</p></Link>
        <Link to="/admin/paiements" className="rounded-3xl bg-white p-4 shadow-sm"><CreditCard className="h-5 w-5 text-primary" /><p className="mt-3 font-semibold text-accent">Finances</p><p className="mt-1 text-xs text-gray-500">Encaissements et impayés</p></Link>
        <Link to="/admin/fournitures" className="rounded-3xl bg-white p-4 shadow-sm"><PackageOpen className="h-5 w-5 text-primary" /><p className="mt-3 font-semibold text-accent">Fournitures</p><p className="mt-1 text-xs text-gray-500">Listes, commandes et packs</p></Link>
        <Link to="/admin/messages" className="rounded-3xl bg-white p-4 shadow-sm"><MessageCircle className="h-5 w-5 text-primary" /><p className="mt-3 font-semibold text-accent">Communications</p><p className="mt-1 text-xs text-gray-500">{unreadMessages ? `${unreadMessages} message${unreadMessages > 1 ? "s" : ""} non lu${unreadMessages > 1 ? "s" : ""}` : "Échanges de l’école"}</p></Link>
      </section>

      <section className="mt-7 rounded-[2rem] bg-white p-5 shadow-sm"><div className="mb-5"><h2 className="font-title text-lg font-semibold text-accent">Activité sur 7 jours</h2><p className="text-sm text-gray-500">Absences et retards enregistrés quotidiennement</p></div><div className="flex h-44 items-end gap-2 sm:gap-4">{trends.map((point) => { const max = Math.max(1, ...trends.map((item) => item.attendance)); return <div key={point.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-xs font-semibold text-accent">{point.attendance}</span><div className="w-full max-w-10 rounded-t-xl bg-gradient-to-t from-primary to-emerald-300" style={{ height: `${Math.max(8, (point.attendance / max) * 110)}px` }} /><span className="text-[11px] capitalize text-gray-400">{point.label}</span></div>; })}</div></section>

      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-title text-lg font-semibold text-accent">Derniers encaissements</h2><Link to="/admin/paiements" className="text-sm font-semibold text-primary">Voir les finances</Link></div>
        <div className="grid gap-3 md:grid-cols-2">{payments.slice(0, 4).map((payment) => <PaymentStatusCard key={payment.id} payment={payment} />)}</div>
      </section>
    </PageContainer>
  );
}
