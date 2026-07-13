import { AppHeader } from "@/components/common/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { ElimaCard } from "@/components/common/ElimaCard";
import { WebLinkButton } from "@/components/common/WebLinkButton";
import { useAuth } from "@/features/auth/AuthProvider";
import { getPlanLabel } from "@/services/gatingService";
import { LogOut } from "lucide-react";

export function ParentProfilePage() {
  const { profile, signOut } = useAuth();

  return (
    <PageContainer>
      <AppHeader title="Profil" />
      <ElimaCard>
        <p className="text-sm text-gray-500">Nom</p>
        <p className="font-title text-lg font-semibold text-accent">{profile.fullName}</p>
        <p className="mt-3 text-sm text-gray-500">École</p>
        <p className="font-semibold text-accent">{profile.schoolName ?? "—"}</p>
        <p className="mt-3 text-sm text-gray-500">Plan</p>
        <p className="font-semibold text-accent">{getPlanLabel(profile.plan)}</p>
      </ElimaCard>
      <div className="mt-5 space-y-3">
        <WebLinkButton path="/parent" label="Paramètres avancés" />
        <button type="button" onClick={() => signOut()} className="tap flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-600">
          <LogOut className="h-4 w-4" /> Se déconnecter
        </button>
      </div>
    </PageContainer>
  );
}
