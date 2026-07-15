import { cn } from "@/lib/utils";

const featureIcons = {
  revision: "/icons/generated/features/feature-revision.png",
  payments: "/icons/generated/features/feature-payments.png",
  results: "/icons/generated/features/feature-results.png",
  messages: "/icons/generated/features/feature-messages.png",
  publish: "/icons/generated/features/feature-publish.png",
  supplies: "/icons/generated/features/feature-supplies.png",
  sync: "/icons/generated/features/feature-sync.png",
  adminDashboard: "/icons/generated/features/feature-admin-dashboard.png",
  scanner: "/icons/generated/features/feature-scanner.png",
} as const;

export function GeneratedFeatureIcon({
  name,
  className,
}: {
  name: keyof typeof featureIcons;
  className?: string;
}) {
  return <img src={featureIcons[name]} alt="" aria-hidden="true" className={cn("object-contain", className)} />;
}
