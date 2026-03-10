import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";

import { PwaProvider } from "@/components/pwa/pwa-provider";
import "./globals.css";

const headingFont = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
});

const bodyFont = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SecHub",
  description: "Portal central com autenticacao, tickets, cofre de senhas e modulos internos.",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${headingFont.variable} ${bodyFont.variable}`}>
        {children}
        <PwaProvider />
      </body>
    </html>
  );
}
