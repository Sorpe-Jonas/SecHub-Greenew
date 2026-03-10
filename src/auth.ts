import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import type { AdapterUser } from "next-auth/adapters";
import Auth0 from "next-auth/providers/auth0";
import Credentials from "next-auth/providers/credentials";
import { UserRole, UserStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const authSecret = process.env.AUTH_SECRET || "sechub-dev-secret-change-me";

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

async function getUserIdentityByEmail(email?: string | null) {
  if (!email) {
    return null;
  }

  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      role: true,
      companyId: true,
    },
  });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  secret: authSecret,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/",
  },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const authUser = user as AdapterUser & {
          id?: string;
          role?: UserRole;
          companyId?: string | null;
        };

        if (authUser.id) {
          token.sub = authUser.id;
          token.id = authUser.id;
        }

        if (authUser.role) {
          token.role = authUser.role;
        }

        if ("companyId" in authUser) {
          token.companyId = authUser.companyId ?? null;
        }

        if (user.name) {
          token.name = user.name;
        }

        if (user.email) {
          token.email = user.email;
        }
      }

      if (!token.sub && token.email) {
        const dbUser = await getUserIdentityByEmail(token.email);

        if (dbUser) {
          token.sub = dbUser.id;
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.companyId = dbUser.companyId;
        }
      }

      return token;
    },
    async signIn({ user }) {
      const adapterUser = user as AdapterUser & { id?: string };
      const dbUser =
        (adapterUser.id
          ? await prisma.user.findUnique({
              where: { id: adapterUser.id },
              select: { id: true },
            })
          : null) ?? (await getUserIdentityByEmail(adapterUser.email));

      if (!dbUser?.id) {
        return true;
      }

      await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          lastLoginAt: new Date(),
          status: UserStatus.ACTIVE,
        },
      });

      return true;
    },
    async session({ session, token }) {
      if (session.user) {
        const dbUser = token.sub
          ? await prisma.user.findUnique({
              where: { id: token.sub },
              select: {
                id: true,
                role: true,
                companyId: true,
              },
            })
          : await getUserIdentityByEmail(token.email);

        if (!dbUser) {
          return session;
        }

        session.user.id = dbUser.id;
        session.user.role = dbUser.role ?? UserRole.USER;
        session.user.companyId = dbUser.companyId ?? null;
      }

      return session;
    },
  },
});
