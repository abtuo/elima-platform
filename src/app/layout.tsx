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
  title: "Elima | la plateforme educative pour l'Afrique",
  description:
    "Plateforme de gestion administrative intelligente pour écoles en Afrique de l'Ouest.",
  icons: {
    icon: [{ url: "/logo_e-lima-with-text_wo_bg.png", type: "image/png" }],
    shortcut: [{ url: "/logo_e-lima-with-text_wo_bg.png", type: "image/png" }],
    apple: [{ url: "/logo_e-lima-with-text_wo_bg.png", type: "image/png" }],
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
