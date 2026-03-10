import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import type { AdapterUser } from "next-auth/adapters";
import Auth0 from "next-auth/providers/auth0";
import Credentials from "next-auth/providers/credentials";
import { UserRole, UserStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const auth0Enabled = Boolean(
  process.env.AUTH_AUTH0_ID &&
    process.env.AUTH_AUTH0_SECRET &&
    process.env.AUTH_AUTH0_ISSUER,
);

const providers = [
  ...(auth0Enabled
    ? [
        Auth0({
          clientId: process.env.AUTH_AUTH0_ID,
          clientSecret: process.env.AUTH_AUTH0_SECRET,
          issuer: process.env.AUTH_AUTH0_ISSUER,
        }),
      ]
    : []),
  Credentials({
    name: "Email e senha",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Senha", type: "password" },
    },
    async authorize(credentials) {
      const email = credentials?.email?.toString().trim().toLowerCase();
      const password = credentials?.password?.toString();

      if (!email || !password) {
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user?.passwordHash || user.status !== UserStatus.ACTIVE) {
        return null;
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);

      if (!isValid) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
        companyId: user.companyId,
      };
    },
  }),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/",
  },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }

      return token;
    },
    async signIn({ user }) {
      const adapterUser = user as AdapterUser & { id?: string };

      if (!adapterUser.id) {
        return true;
      }

      await prisma.user.update({
        where: { id: adapterUser.id },
        data: {
          lastLoginAt: new Date(),
          status: UserStatus.ACTIVE,
        },
      });

      return true;
    },
    async session({ session, token }) {
      if (session.user) {
        const userId = token.sub;

        if (!userId) {
          return session;
        }

        const fullUser = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            role: true,
            companyId: true,
          },
        });

        session.user.id = userId;
        session.user.role = fullUser?.role ?? UserRole.USER;
        session.user.companyId = fullUser?.companyId ?? null;
      }

      return session;
    },
  },
});
