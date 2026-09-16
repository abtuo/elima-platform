import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  backTo?: string;
  action?: ReactNode;
  accent?: string;
};

export function AppHeader({ title, subtitle, backTo, action, accent }: AppHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {backTo ? (
          <button
            type="button"
            onClick={() => navigate(backTo)}
            className="tap mt-1 flex h-9 w-9 items-center justify-center rounded-2xl bg-white shadow-sm"
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5 text-accent" />
          </button>
        ) : null}
        <div>
          <h1 className={cn("font-title text-2xl font-bold", accent ? "" : "text-accent")} style={accent ? { color: accent } : undefined}>
            {title}
          </h1>
          {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </header>
  );
}
