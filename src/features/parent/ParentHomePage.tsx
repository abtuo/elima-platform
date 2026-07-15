import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bell, BookOpen, CalendarClock, CheckCircle2, CreditCard, MessageCircle, TrendingUp } from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { AssignmentCard } from "@/components/cards/AssignmentCard";
import { MessageCard } from "@/components/cards/MessageCard";
import { PaymentStatusCard } from "@/components/cards/PaymentStatusCard";
import { GeneratedFeatureIcon } from "@/components/common/GeneratedFeatureIcon";
import { useAuth } from "@/features/auth/AuthProvider";
import { getAssignments, getChildren, getMessages, getPayments, getRecentGrades, getTimetable } from "@/services/mainDataService";
import type { Assignment, ChildSummary, GradeSummary, MessagePreview, PaymentSummary } from "@/types/school";
import type { TimetableEvent } from "@/types/school";
import { TimetableCard } from "@/components/cards/TimetableCard";

export function ParentHomePage() {
  const { profile } = useAuth();
  const [children, setChildren] = useState<ChildSummary[]>([]);
  const [messages, setMessages] = useState<MessagePreview[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [payments, setPayments] = useState<PaymentSummary[]>([]);
  const [grades, setGrades] = useState<GradeSummary[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [timetable, setTimetable] = useState<TimetableEvent[]>([]);

  useEffect(() => {
    Promise.all([getChildren(profile.id), getMessages(), getAssignments(), getPayments(), getRecentGrades()]).then(([nextChildren, nextMessages, nextAssignments, nextPayments, nextGrades]) => {
      setChildren(nextChildren); setMessages(nextMessages); setAssignments(nextAssignments); setPayments(nextPayments); setGrades(nextGrades);
      setSelectedChild(nextChildren[0]?.id ?? "");
    });
  }, [profile.id]);

  useEffect(() => { getTimetable().then(setTimetable); }, []);

  const child = children.find((item) => item.id === selectedChild) ?? children[0];
  const average = useMemo(() => grades.length ? Math.round((grades.reduce((sum, grade) => sum + (grade.score / grade.maxScore) * 20, 0) / grades.length) * 10) / 10 : 0, [grades]);
  const unread = messages.filter((item) => !item.read).length;
  const pendingPayment = payments.find((item) => item.status !== "paid");

  return (
    <PageContainer className="max-w-6xl">
      <AppHeader title={`Bonjour ${profile.fullName.split(" ")[0]}`} subtitle="Voici l’essentiel de la journée" />

      <section className="relative overflow-hidden rounded-[2rem] bg-[#153f30] p-5 text-white shadow-[0_24px_60px_rgba(21,63,48,.18)] sm:p-7">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/40 blur-3xl" />
        <div className="relative grid gap-6 md:grid-cols-[1.3fr_.7fr] md:items-center">
          <div>
            <p className="text-sm font-medium text-white/65">Suivi de votre enfant</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {children.map((item) => <button key={item.id} onClick={() => setSelectedChild(item.id)} className={`rounded-full px-3.5 py-2 text-sm font-semibold transition ${item.id === child?.id ? "bg-white text-[#153f30]" : "bg-white/10 text-white/75 hover:bg-white/15"}`}>{item.name.split(" ")[0]}</button>)}
            </div>
            <h2 className="mt-6 font-title text-2xl font-semibold">{child?.name ?? "Suivi scolaire"}</h2>
            <p className="mt-1 text-sm text-white/60">{child?.className} · Situation à jour</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur"><TrendingUp className="h-5 w-5 text-secondary" /><p className="mt-3 text-2xl font-bold">{average}/20</p><p className="text-xs text-white/60">Moyenne récente</p></div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur"><CalendarClock className="h-5 w-5 text-secondary" /><p className="mt-3 text-2xl font-bold">{child?.pendingAssignments ?? 0}</p><p className="text-xs text-white/60">Devoirs à venir</p></div>
          </div>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Link to="/parent/enfants" className="group rounded-3xl border border-white bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><GeneratedFeatureIcon name="results" className="h-10 w-10" /><p className="mt-3 font-semibold text-accent">Résultats</p><p className="mt-1 text-xs text-gray-500">Notes et absences</p></Link>
        <Link to="/parent/messages" className="group rounded-3xl border border-white bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><GeneratedFeatureIcon name="messages" className="h-10 w-10" /><p className="mt-3 font-semibold text-accent">Messages</p><p className="mt-1 text-xs text-gray-500">{unread ? `${unread} non lu` : "Tout est à jour"}</p></Link>
        <Link to="/parent/paiements" className="group rounded-3xl border border-white bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><GeneratedFeatureIcon name="payments" className="h-10 w-10" /><p className="mt-3 font-semibold text-accent">Paiements</p><p className="mt-1 text-xs text-gray-500">Reçus et échéances</p></Link>
        <Link to="/parent/enfants" className="group rounded-3xl border border-white bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><BookOpen className="h-5 w-5 text-primary" /><p className="mt-3 font-semibold text-accent">Bulletins</p><p className="mt-1 text-xs text-gray-500">Documents scolaires</p></Link>
        <Link to="/parent/fournitures" className="group rounded-3xl border border-white bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><GeneratedFeatureIcon name="supplies" className="h-10 w-10" /><p className="mt-3 font-semibold text-accent">Fournitures</p><p className="mt-1 text-xs text-gray-500">Listes et commandes</p></Link>
      </div>

      {(unread > 0 || pendingPayment) && <section className="mt-7"><div className="mb-3 flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /><h2 className="font-title text-lg font-semibold text-accent">À retenir</h2></div><div className="grid gap-3 md:grid-cols-2">{unread > 0 && <Link to="/parent/messages" className="flex items-center gap-3 rounded-3xl border border-amber-100 bg-amber-50 p-4"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-amber-600"><MessageCircle className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold text-accent">Nouveau message de l’école</span><span className="block truncate text-sm text-gray-500">{messages.find((item) => !item.read)?.subject}</span></span><ArrowRight className="h-4 w-4 text-gray-400" /></Link>}{pendingPayment && <Link to="/parent/paiements" className="flex items-center gap-3 rounded-3xl border border-red-100 bg-red-50 p-4"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-red-500"><CreditCard className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold text-accent">Échéance à régulariser</span><span className="block truncate text-sm text-gray-500">{pendingPayment.label}</span></span><ArrowRight className="h-4 w-4 text-gray-400" /></Link>}</div></section>}

      <div className="mt-7"><TimetableCard events={timetable} title="Emploi du temps aujourd’hui et demain" /></div>
      <div className="mt-7 grid gap-7 xl:grid-cols-[1.15fr_.85fr]">
        <section><div className="mb-3 flex items-center justify-between"><h2 className="font-title text-lg font-semibold text-accent">Prochains devoirs</h2><Link to="/parent/enfants" className="text-sm font-semibold text-primary">Tout voir</Link></div><div className="space-y-3">{assignments.filter((item) => item.status === "pending").slice(0, 3).map((item) => <AssignmentCard key={item.id} assignment={item} />)}</div></section>
        <div className="space-y-7"><section><div className="mb-3 flex items-center justify-between"><h2 className="font-title text-lg font-semibold text-accent">Dernier message</h2><Link to="/parent/messages" className="text-sm font-semibold text-primary">Messagerie</Link></div>{messages[0] ? <MessageCard message={messages[0]} /> : <div className="rounded-3xl bg-white p-5 text-sm text-gray-500"><CheckCircle2 className="mb-2 h-5 w-5 text-primary" />Aucun nouveau message.</div>}</section><section><h2 className="mb-3 font-title text-lg font-semibold text-accent">Dernier paiement</h2>{payments[0] && <PaymentStatusCard payment={payments[0]} />}</section></div>
      </div>
    </PageContainer>
  );
}
