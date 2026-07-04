import { PageHeader } from "@/components/ui/PageHeader";

export default function DashboardMessagesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Messagerie" subtitle="Messages de l'etablissement, annonces et echanges avec les familles." />
      <div className="elima-card">
        <p className="text-sm text-slate-600">Cette section centralisera les conversations de l&apos;etablissement.</p>
      </div>
    </div>
  );
}
