import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ElimaCardProps = {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
};

export function ElimaCard({ children, className, onClick }: ElimaCardProps) {
  const Tag = onClick ? "button" : "article";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn("card tap w-full p-5 text-left", className)}
    >
      {children}
    </Tag>
  );
}
