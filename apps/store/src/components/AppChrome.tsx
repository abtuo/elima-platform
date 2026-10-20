"use client";

import { usePathname } from "next/navigation";
import { StoreFooter } from "./StoreFooter";
import { StoreHeader } from "./StoreHeader";

export function AppChrome({ children, catalogMode }: { children: React.ReactNode; catalogMode: "database" | "demo" }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return <main>{children}</main>;
  return <><StoreHeader catalogMode={catalogMode} /><main>{children}</main><StoreFooter /></>;
}
