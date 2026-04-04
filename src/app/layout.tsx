import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

const nunito = Nunito({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "SoapSuds — Clinical Documentation for Modern Practices",
  description:
    "SOAP notes, scheduling, client management, and billing for healthcare SMBs.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
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
