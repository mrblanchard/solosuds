import NextAuth, { CredentialsSignin } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { createHmac } from "crypto";
// UserRole will be typed inline as string until prisma generate is run

// Coded credential failures. The code reaches the login page (as
// `result.code` or `?code=`) so it can say what went wrong instead of a blanket
// "Invalid email or password". Keep in sync with src/lib/login-errors.ts.
class CaptchaFailed extends CredentialsSignin {
  code = "captcha";
}
class GoogleOnlyAccount extends CredentialsSignin {
  code = "google_account";
}

const prismaAdapter = PrismaAdapter(db);

const adapter = {
  ...prismaAdapter,

  // Self-heal stale Account records: if an Account exists but its user has no
  // organizationId (orphaned from a previous failed OAuth attempt), delete the
  // Account and return null so auth.js falls through to email-based linking.
  async getUserByAccount(providerAccount: { provider: string; providerAccountId: string }) {
    const account = await db.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: providerAccount.provider,
          providerAccountId: providerAccount.providerAccountId,
        },
      },
      include: { user: true },
    });
    if (!account) return null;
    if (!account.user.organizationId) {
      // Orphaned — delete the stale account record and signal "not found"
      await db.account.delete({ where: { id: account.id } });
      return null;
    }
    // Prisma's organizationId is `string | null`; next-auth's User type (see
    // src/types/next-auth.d.ts) declares it `string | undefined` — same "no
    // org yet" meaning, different null-ish value, so just normalize it.
    return { ...account.user, organizationId: account.user.organizationId ?? undefined };
  },

  // Override linkAccount to use upsert so stale/orphaned Account records
  // from previous failed sign-in attempts are corrected automatically.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async linkAccount(account: any) {
    await db.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: account.provider,
          providerAccountId: account.providerAccountId,
        },
      },
      create: account,
      update: { userId: account.userId },
    });
    return account;
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        cfToken: { label: "CF Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        // Match email without case: people type it differently than at sign-up.
        const email = String(credentials.email).trim().toLowerCase();

        // Check for post-registration bypass token (internal:expiry:sig)
        const cfToken = credentials.cfToken as string | undefined;
        if (cfToken?.startsWith("internal:")) {
          const parts = cfToken.split(":");
          if (parts.length !== 3) return null;
          const [, expiry, sig] = parts;
          const secret = (process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET)!;
          const expectedSig = createHmac("sha256", secret)
            .update(`${email}:${expiry}`)
            .digest("hex");
          const valid = sig === expectedSig && Date.now() < parseInt(expiry);
          if (!valid) return null;
          // Token is valid — skip CAPTCHA and proceed to password check
        } else {
          // Normal login flow — verify Turnstile CAPTCHA
          const { verifyTurnstile } = await import("@/lib/turnstile");
          const captchaOk = await verifyTurnstile(cfToken);
          if (!captchaOk) throw new CaptchaFailed();
        }

        const user = await db.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
          include: { accounts: { where: { provider: "google" }, select: { id: true } } },
        });

        if (!user) return null;
        if (!user.hashedPassword) {
          // Signed up with Google and never set a password. Registration
          // already reveals that an email has an account, so saying so here
          // leaks nothing new.
          if (user.accounts.length > 0) throw new GoogleOnlyAccount();
          return null;
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.hashedPassword
        );

        if (!passwordMatch) return null;

        // Same organizationId null/undefined normalization as getUserByAccount above.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { accounts, ...rest } = user;
        return { ...rest, organizationId: user.organizationId ?? undefined };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // For Google sign-in: allow the adapter to create/link the account normally,
      // then check if the user has completed registration (has an org).
      // If not, redirect them to finish signing up with their info pre-filled.
      if (account?.provider === "google" && user.email) {
        const dbUser = await db.user.findFirst({
          where: { email: { equals: user.email, mode: "insensitive" } },
          select: { organizationId: true },
        });
        if (!dbUser?.organizationId) {
          const params = new URLSearchParams({
            fromGoogle: "1",
            email: user.email,
            ...(user.name ? { name: user.name } : {}),
          });
          return `/register?${params.toString()}`;
        }
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      // Only re-query the DB on actual sign-in/sign-up events or explicit updates,
      // NOT on every request. The JWT is cached — this is called during token
      // verification server-side, so an unnecessary DB call here costs ~300ms per page.
      const needsRefresh = !!user || trigger === "signIn" || trigger === "update" || !token.role;
      if (needsRefresh) {
        const id = (user?.id ?? token.sub) as string;
        if (id) {
          const dbUser = await db.user.findUnique({
            where: { id },
            select: {
              role: true,
              organizationId: true,
              organization: { select: { practiceType: true } },
            },
          });
          if (dbUser) {
            token.role = dbUser.role;
            token.organizationId = dbUser.organizationId ?? undefined;
            token.practiceType = dbUser.organization?.practiceType ?? undefined;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        session.user.role = token.role as any;
        session.user.organizationId = token.organizationId as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        session.user.practiceType = token.practiceType as any;
      }
      return session;
    },
  },
});
