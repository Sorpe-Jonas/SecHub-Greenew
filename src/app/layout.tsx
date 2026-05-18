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
  title: "SecHub - Serviços de TI",
  description: "Empresa de TI especializada em suporte remoto, manutenção de servidores, gerenciamento de ativos e atendimento de chamados com SLA.",
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
