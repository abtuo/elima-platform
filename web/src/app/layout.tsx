import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";

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
  title: "Elima | Gestion scolaire pour écoles d'Afrique de l'Ouest",
  description:
    "Elima aide les établissements à piloter élèves, absences, bulletins, communication parents et paiements depuis une seule plateforme.",
  icons: {
    icon: [{ url: "/logo_wo_bg.png", type: "image/png" }],
    shortcut: [{ url: "/logo_wo_bg.png", type: "image/png" }],
    apple: [{ url: "/logo_wo_bg.png", type: "image/png" }],
  },
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
      </body>
    </html>
  );
}
