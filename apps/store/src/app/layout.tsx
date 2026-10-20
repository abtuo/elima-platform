import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { AppChrome } from "@/components/AppChrome";
import { StoreProvider } from "@/components/StoreProvider";
import { getCatalogMode } from "@/lib/catalog-mode";

const heading = Poppins({ variable: "--font-heading", subsets: ["latin"], weight: ["500", "600", "700"] });
const body = Inter({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_STORE_URL || "https://store.elima.ci"),
  title: { default: "Elima Store — Les fournitures scolaires, simplement", template: "%s | Elima Store" },
  description: "Fournitures et kits scolaires pour le primaire et le secondaire.",
  icons: { icon: "/logo_wo_bg.png", apple: "/logo_wo_bg.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body className={`${heading.variable} ${body.variable}`}><StoreProvider><AppChrome catalogMode={getCatalogMode()}>{children}</AppChrome></StoreProvider></body></html>;
}
