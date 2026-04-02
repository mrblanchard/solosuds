import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
// UserRole will be typed inline as string until prisma generate is run

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
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
      // Credentials sign-in is handled by authorize() above
      if (account?.provider === "credentials") return true;

      // For OAuth: PrismaAdapter creates the user BEFORE this callback fires.
      // Detect a brand-new account by checking if it was created within the last
      // 5 seconds. If so, the user never registered manually — delete the
      // auto-created record and send them to the registration page.
      if (user.id) {
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: { createdAt: true },
        });
        if (dbUser) {
          const ageMs = Date.now() - new Date(dbUser.createdAt).getTime();
          if (ageMs < 5000) {
            // Brand-new account created by the OAuth flow — remove it and gate them
            await db.user.delete({ where: { id: user.id } });
            return "/register?error=no-account";
          }
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
