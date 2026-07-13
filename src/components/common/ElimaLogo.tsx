import { cn } from "@/lib/utils";

export function ElimaLogo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return <img src="/brand/elima-logo.png" alt="Elima" className={cn("object-contain", compact ? "h-12 w-12 object-top" : "h-auto w-32", className)} />;
}
