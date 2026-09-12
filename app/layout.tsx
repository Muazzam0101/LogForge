import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { DashboardShell } from "@/components/layout/DashboardShell";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "LogForge · Universal Log Intelligence Platform",
  description:
    "Universal Log Pre-processing Framework (ULPF) for enterprise cybersecurity. Ingest, parse, normalize, and preserve raw logs for next-generation SIEM and security intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased selection:bg-orange-100 selection:text-orange-900">
        <DashboardShell>{children}</DashboardShell>
      </body>
    </html>
  );
}
