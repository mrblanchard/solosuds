import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

const nunito = Nunito({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "SoloSuds — Scheduling Unified Documentation Sync",
  description:
    "SOAP notes, scheduling, client management, and invoicing for SMBs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${nunito.className} min-h-full`} style={{ background: "var(--background)" }}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
