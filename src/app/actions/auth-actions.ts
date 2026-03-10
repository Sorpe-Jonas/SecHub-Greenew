"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/auth";
import { bootstrapPlatform, isBootstrapRequired } from "@/lib/bootstrap";
import { prisma } from "@/lib/prisma";

export type AuthFormState = {
  error?: string;
};

function getValue(formData: FormData, key: string) {
  return formData.get(key)?.toString().trim() ?? "";
}

export async function loginWithPassword(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = getValue(formData, "email").toLowerCase();
  const password = getValue(formData, "password");

  if (!email || !password) {
    return { error: "Informe email e senha." };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Credenciais invalidas." };
    }

    throw error;
  }

  return {};
}

export async function bootstrapPlatformAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const bootstrapRequired = await isBootstrapRequired();

  if (!bootstrapRequired) {
    return { error: "O bootstrap inicial ja foi concluido." };
  }

  const companyName = getValue(formData, "companyName");
  const adminName = getValue(formData, "adminName");
  const adminEmail = getValue(formData, "adminEmail").toLowerCase();
  const password = getValue(formData, "password");

  if (!companyName || !adminName || !adminEmail || !password) {
    return { error: "Preencha empresa, nome, email e senha." };
  }

  if (password.length < 8) {
    return { error: "A senha precisa ter pelo menos 8 caracteres." };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingUser) {
    return { error: "Ja existe uma conta com este email." };
  }

  try {
    await bootstrapPlatform({
      companyName,
      adminName,
      adminEmail,
      password,
    });
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }

    throw error;
  }

  await signIn("credentials", {
    email: adminEmail,
    password,
    redirectTo: "/dashboard",
  });

  return {};
}

export async function loginWithAuth0() {
  await signIn("auth0", {
    redirectTo: "/dashboard",
  });
}
