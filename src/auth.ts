import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Google is only registered when real credentials are present — otherwise the
// provider would initialize with `undefined` client id/secret and the OAuth
// round-trip silently fails, dropping the user back on their previous session.
const googleId = process.env.AUTH_GOOGLE_ID;
const googleSecret = process.env.AUTH_GOOGLE_SECRET;
export const googleEnabled = !!(googleId && googleSecret);

const providers = [
  ...(googleEnabled
    ? [
        Google({
          clientId: googleId!,
          clientSecret: googleSecret!,
          // Link a Google login to an existing account with the same (verified)
          // email instead of throwing OAuthAccountNotLinked. Google emails are
          // verified, so this is safe and is what "log into the correct account"
          // requires when the user first registered with email/password.
          allowDangerousEmailAccountLinking: true,
        }),
      ]
    : []),
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;

      const user = await prisma.user.findUnique({
        where: { email: credentials.email as string },
      });

      if (!user?.password) return null;

      const valid = await bcrypt.compare(credentials.password as string, user.password);
      if (!valid) return null;

      return { id: user.id, email: user.email, name: user.name, image: user.image, role: user.role };
    },
  }),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  // Trust the deployment host so the OAuth callback + session cookie resolve
  // correctly behind proxies (Vercel) — otherwise the callback can drop the new
  // session and the app "keeps the previous session" after Google login.
  trustHost: true,
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  providers,
  callbacks: {
    // Persist the trailhub_last_user hint + ensure fresh OAuth logins take over.
    async signIn() {
      return true;
    },
    async jwt({ token, user, trigger }) {
      // On a fresh sign-in (OAuth or credentials), always refresh id/role from
      // the signing-in user so the new account replaces any previous session.
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "USER";
      }
      if (trigger === "signIn" && user?.id) {
        token.id = user.id;
      }
      // For OAuth sign-ins the adapter user may not carry role onto the token
      // on every pass — backfill it from the DB so guides/admins keep access.
      if (token.id && !token.role) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        });
        token.role = dbUser?.role ?? "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = (token.role as string) ?? "USER";
      }
      return session;
    },
  },
});
