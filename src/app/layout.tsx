import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Analytics } from "@vercel/analytics/next";

const nunito = Nunito({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "SoloSuds — Clinical Documentation for Modern Practices",
  description:
    "SOAP notes, scheduling, client management, and billing for healthcare SMBs.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

/** Strict hex validation to prevent CSS injection */
function isValidHex(color: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color);
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let theme = "lavender";
  let primaryColor: string | null = null;
  let faviconUrl: string | null = null;
  let orgId: string | null = null;
  let brandFont: string | null = null;

  try {
    const session = await auth();
    if (session?.user?.id) {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: {
          theme: true,
          organization: {
            select: { id: true, primaryColor: true, faviconUrl: true, brandFont: true },
          },
        },
      });
      if (user?.theme) theme = user.theme;
      if (user?.organization) {
        orgId = user.organization.id;
        if (user.organization.primaryColor && isValidHex(user.organization.primaryColor)) {
          primaryColor = user.organization.primaryColor;
        }
        if (user.organization.faviconUrl) {
          faviconUrl = user.organization.faviconUrl;
        }
        if (user.organization.brandFont) {
          brandFont = user.organization.brandFont.replace(/[^a-zA-Z0-9 ]/g, "");
        }
      }
    }
  } catch {
    // Not logged in or error — use defaults
  }

  // Build CSS override for brand color
  const brandColorStyle = primaryColor
    ? `
:root { --brand-primary: ${primaryColor}; }
[data-brand-color] {
  --color-indigo-50:  color-mix(in srgb, var(--brand-primary)  8%, white);
  --color-indigo-100: color-mix(in srgb, var(--brand-primary) 15%, white);
  --color-indigo-200: color-mix(in srgb, var(--brand-primary) 25%, white);
  --color-indigo-300: color-mix(in srgb, var(--brand-primary) 40%, white);
  --color-indigo-400: color-mix(in srgb, var(--brand-primary) 60%, white);
  --color-indigo-500: color-mix(in srgb, var(--brand-primary) 80%, white);
  --color-indigo-600: var(--brand-primary);
  --color-indigo-700: color-mix(in srgb, var(--brand-primary) 80%, black);
  --color-indigo-800: color-mix(in srgb, var(--brand-primary) 60%, black);
  --color-indigo-900: color-mix(in srgb, var(--brand-primary) 40%, black);
}`
    : null;

  return (
    <html
      lang="en"
      className="h-full"
      data-theme={theme === "lavender" ? undefined : theme}
      {...(primaryColor ? { "data-brand-color": "" } : {})}
    >
      <head>
        {faviconUrl && (
          <link rel="icon" href={faviconUrl} key="brand-favicon" />
        )}
        {brandFont && (
          <link
            rel="stylesheet"
            href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(brandFont)}:wght@400;500;600;700&display=swap`}
            key="brand-font"
          />
        )}
        {brandColorStyle && (
          <style dangerouslySetInnerHTML={{ __html: brandColorStyle }} />
        )}
        {brandFont && (
          <style dangerouslySetInnerHTML={{ __html: `body { font-family: '${brandFont}', system-ui, -apple-system, sans-serif; }` }} />
        )}
      </head>
      <body
        className={`${nunito.className} min-h-full bg-cover bg-center bg-no-repeat bg-fixed bg-banner`}
      >
        <SessionProvider>{children}</SessionProvider>
        <Analytics />
      </body>
    </html>
  );
}
