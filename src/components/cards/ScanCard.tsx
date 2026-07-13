import type { ScanRecord } from "@/types/revision";
import { ElimaCard } from "@/components/common/ElimaCard";
import { ScanLine } from "lucide-react";

const statusLabels = {
  received: "Reçu",
  analyzing: "Analyse en cours",
  ready: "Disponible",
  error: "Erreur",
};

export function ScanCard({ scan }: { scan: ScanRecord }) {
  return (
    <ElimaCard>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
          <ScanLine className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-title text-base font-semibold text-accent">{scan.fileName}</h3>
          <p className="text-sm text-gray-500">{scan.subject} · {scan.topic}</p>
          <p className="mt-1 text-xs text-gray-400">{statusLabels[scan.status]} · {scan.createdAt}</p>
        </div>
      </div>
    </ElimaCard>
  );
}
