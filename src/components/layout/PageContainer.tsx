import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
};

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn("mx-auto w-full max-w-5xl px-4 pb-28 pt-5 md:px-6 md:pt-7 lg:px-8 lg:pb-10 lg:pt-8", className)}>
      {children}
    </div>
  );
}
