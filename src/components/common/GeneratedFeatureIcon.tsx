import { cn } from "@/lib/utils";

const featureIcons = {
  revision: "/icons/generated/features/feature-revision.png",
  payments: "/icons/generated/features/feature-payments.png",
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
