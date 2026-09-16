import { ExternalLink } from "lucide-react";
import { openWebPath } from "@/services/webLinkService";

type WebLinkButtonProps = {
  path: string;
  label?: string;
  className?: string;
};

export function WebLinkButton({ path, label = "Continuer", className }: WebLinkButtonProps) {
  return (
    <button
      type="button"
      onClick={() => openWebPath(path)}
      className={`tap inline-flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary ${className ?? ""}`}
    >
      <ExternalLink className="h-4 w-4" />
      {label}
    </button>
  );
}
