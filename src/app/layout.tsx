import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const nunito = Nunito({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "SoapSuds — Clinical Documentation for Modern Practices",
  description:
    "SOAP notes, scheduling, client management, and billing for healthcare SMBs.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let theme = "lavender";
  try {
    const session = await auth();
    if (session?.user?.id) {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { theme: true },
      });
      if (user?.theme) theme = user.theme;
    }
  } catch {
    // Not logged in or error — use default
  }

  return (
    <html lang="en" className="h-full" data-theme={theme === "lavender" ? undefined : theme}>
      <body
        className={`${nunito.className} min-h-full bg-cover bg-center bg-no-repeat bg-fixed bg-banner`}
      >
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
