import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
// UserRole will be typed inline as string until prisma generate is run

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
    return account.user;
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
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.hashedPassword) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.hashedPassword
        );

        if (!passwordMatch) return null;

        return user;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // For Google sign-in: allow the adapter to create/link the account normally,
      // then check if the user has completed registration (has an org).
      // If not, redirect them to finish signing up with their info pre-filled.
      if (account?.provider === "google" && user.email) {
        const dbUser = await db.user.findUnique({
          where: { email: user.email },
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
      if (user || trigger === "signIn" || trigger === "update" || !token.organizationId) {
        const id = (user?.id ?? token.sub) as string;
        if (id) {
          const dbUser = await db.user.findUnique({
            where: { id },
            select: { role: true, organizationId: true },
          });
          if (dbUser) {
            token.role = dbUser.role;
            token.organizationId = dbUser.organizationId;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
        session.user.organizationId = token.organizationId as string;
      }
      return session;
    },
  },
});
