import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { SiteFooter } from "@/components/SiteFooter";

const poppins = Poppins({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://elima.ci"),
  title: { default: "Elima — La plateforme éducative connectée pour les écoles", template: "%s | Elima" },
  description: "Gestion scolaire, communication avec les familles, pilotage et apprentissage : Elima accompagne les écoles et les élèves avec Elima Révision.",
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "fr_CI", siteName: "Elima", url: "https://elima.ci", title: "Elima — La plateforme éducative connectée pour les écoles", description: "Gestion scolaire, communication familles, pilotage et Elima Révision.", images: [{ url: "/logo.png", alt: "Elima" }] },
  icons: { icon: "/logo_wo_bg.png", apple: "/logo_wo_bg.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${poppins.variable} ${inter.variable} antialiased`}>
        {children}
        <div className="mx-auto max-w-6xl px-4 md:px-8"><SiteFooter /></div>
      </body>
    </html>
  );
}
