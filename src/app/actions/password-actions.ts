"use server";

import { AuditModule } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/authz";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { getFaviconUrl, parseTags } from "@/lib/passwords";
import { prisma } from "@/lib/prisma";

export type PasswordFormState = {
  error?: string;
};

function getValue(formData: FormData, key: string) {
  return formData.get(key)?.toString().trim() ?? "";
}

async function ensureDefaultVault(companyId: string) {
  const existing = await prisma.passwordVault.findFirst({
    where: { companyId },
    orderBy: { createdAt: "asc" },
  });

  if (existing) {
    return existing;
  }

  return prisma.passwordVault.create({
    data: {
      companyId,
      name: "Cofre Principal",
      description: "Cofre padrao criado automaticamente para a empresa.",
    },
  });
}

async function trimVersions(passwordEntryId: string) {
  const versions = await prisma.passwordEntryVersion.findMany({
    where: { passwordEntryId },
    orderBy: { versionNumber: "desc" },
    select: { id: true },
  });

  if (versions.length <= 20) {
    return;
  }

  const idsToDelete = versions.slice(20).map((item) => item.id);
  await prisma.passwordEntryVersion.deleteMany({
    where: { id: { in: idsToDelete } },
  });
}

export async function createPasswordEntryAction(
  _prevState: PasswordFormState,
  formData: FormData,
): Promise<PasswordFormState> {
  const user = await requireCurrentUser();

  if (!user.companyId) {
    return { error: "Usuario sem empresa vinculada." };
  }

  const title = getValue(formData, "title");
  const username = getValue(formData, "username");
  const password = getValue(formData, "password");
  const url = getValue(formData, "url");
  const notes = getValue(formData, "notes");
  const tagsInput = getValue(formData, "tags");

  if (!title || !username || !password) {
    return { error: "Preencha titulo, usuario e senha." };
  }

  const vault = await ensureDefaultVault(user.companyId);

  const entry = await prisma.passwordEntry.create({
    data: {
      companyId: user.companyId,
      vaultId: vault.id,
      title,
      username,
      encryptedPassword: encryptSecret(password),
      url: url || null,
      notes: notes || null,
      tags: parseTags(tagsInput),
      faviconUrl: getFaviconUrl(url),
      createdById: user.id,
      updatedById: user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      userId: user.id,
      module: AuditModule.PASSWORD,
      action: "password_entry_created",
      entityType: "password_entry",
      entityId: entry.id,
      description: `Credencial criada: ${title}`,
    },
  });

  revalidatePath("/vault");
  redirect(`/vault/${entry.id}`);
}

export async function updatePasswordEntryAction(
  _prevState: PasswordFormState,
  formData: FormData,
): Promise<PasswordFormState> {
  const user = await requireCurrentUser();
  const entryId = getValue(formData, "entryId");
  const title = getValue(formData, "title");
  const username = getValue(formData, "username");
  const password = getValue(formData, "password");
  const url = getValue(formData, "url");
  const notes = getValue(formData, "notes");
  const tagsInput = getValue(formData, "tags");

  if (!entryId || !title || !username || !password) {
    return { error: "Preencha os campos obrigatorios." };
  }

  const entry = await prisma.passwordEntry.findUnique({
    where: { id: entryId },
  });

  if (!entry) {
    return { error: "Credencial nao encontrada." };
  }

  if (user.role !== "SUPER_ADMIN" && user.companyId !== entry.companyId) {
    return { error: "Sem permissao para editar esta credencial." };
  }

  const lastVersion = await prisma.passwordEntryVersion.findFirst({
    where: { passwordEntryId: entry.id },
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.passwordEntryVersion.create({
      data: {
        passwordEntryId: entry.id,
        versionNumber: (lastVersion?.versionNumber ?? 0) + 1,
        title: entry.title,
        username: entry.username,
        encryptedPassword: entry.encryptedPassword,
        url: entry.url,
        notes: entry.notes,
        snapshotById: user.id,
      },
    });

    await tx.passwordEntry.update({
      where: { id: entry.id },
      data: {
        title,
        username,
        encryptedPassword: encryptSecret(password),
        url: url || null,
        notes: notes || null,
        tags: parseTags(tagsInput),
        faviconUrl: getFaviconUrl(url),
        updatedById: user.id,
      },
    });

    await tx.auditLog.create({
      data: {
        companyId: entry.companyId,
        userId: user.id,
        module: AuditModule.PASSWORD,
        action: "password_entry_updated",
        entityType: "password_entry",
        entityId: entry.id,
        description: `Credencial atualizada: ${title}`,
      },
    });
  });

  await trimVersions(entry.id);
  revalidatePath(`/vault/${entry.id}`);
  revalidatePath("/vault");
  redirect(`/vault/${entry.id}`);
}

export async function deletePasswordEntryAction(formData: FormData) {
  const user = await requireCurrentUser();
  const entryId = getValue(formData, "entryId");

  if (!entryId) {
    return;
  }

  const entry = await prisma.passwordEntry.findUnique({
    where: { id: entryId },
  });

  if (!entry) {
    return;
  }

  if (user.role !== "SUPER_ADMIN" && user.companyId !== entry.companyId) {
    return;
  }

  await prisma.$transaction([
    prisma.passwordEntry.update({
      where: { id: entry.id },
      data: {
        deletedAt: new Date(),
        updatedById: user.id,
      },
    }),
    prisma.auditLog.create({
      data: {
        companyId: entry.companyId,
        userId: user.id,
        module: AuditModule.PASSWORD,
        action: "password_entry_deleted",
        entityType: "password_entry",
        entityId: entry.id,
        description: `Credencial removida: ${entry.title}`,
      },
    }),
  ]);

  revalidatePath("/vault");
  redirect("/vault");
}

export async function rollbackPasswordEntryAction(formData: FormData) {
  const user = await requireCurrentUser();
  const entryId = getValue(formData, "entryId");
  const versionId = getValue(formData, "versionId");

  if (!entryId || !versionId) {
    return;
  }

  const entry = await prisma.passwordEntry.findUnique({
    where: { id: entryId },
  });
  const version = await prisma.passwordEntryVersion.findUnique({
    where: { id: versionId },
  });

  if (!entry || !version) {
    return;
  }

  if (user.role === "USER") {
    return;
  }

  const currentMax = await prisma.passwordEntryVersion.findFirst({
    where: { passwordEntryId: entry.id },
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.passwordEntryVersion.create({
      data: {
        passwordEntryId: entry.id,
        versionNumber: (currentMax?.versionNumber ?? 0) + 1,
        title: entry.title,
        username: entry.username,
        encryptedPassword: entry.encryptedPassword,
        url: entry.url,
        notes: entry.notes,
        snapshotById: user.id,
      },
    });

    await tx.passwordEntry.update({
      where: { id: entry.id },
      data: {
        title: version.title,
        username: version.username,
        encryptedPassword: version.encryptedPassword,
        url: version.url,
        notes: version.notes,
        updatedById: user.id,
      },
    });

    await tx.auditLog.create({
      data: {
        companyId: entry.companyId,
        userId: user.id,
        module: AuditModule.PASSWORD,
        action: "password_entry_restored",
        entityType: "password_entry",
        entityId: entry.id,
        description: `Credencial restaurada para a versao ${version.versionNumber}.`,
      },
    });
  });

  await trimVersions(entry.id);
  revalidatePath(`/vault/${entry.id}`);
  redirect(`/vault/${entry.id}`);
}

export async function getDecryptedPassword(entryId: string) {
  const user = await requireCurrentUser();

  const entry = await prisma.passwordEntry.findUnique({
    where: { id: entryId },
  });

  if (!entry || entry.deletedAt) {
    return null;
  }

  if (user.role !== "SUPER_ADMIN" && user.companyId !== entry.companyId) {
    return null;
  }

  const decrypted = decryptSecret(entry.encryptedPassword);

  await prisma.auditLog.create({
    data: {
      companyId: entry.companyId,
      userId: user.id,
      module: AuditModule.PASSWORD,
      action: "password_entry_viewed",
      entityType: "password_entry",
      entityId: entry.id,
      description: `Senha visualizada para a credencial ${entry.title}.`,
    },
  });

  return decrypted;
}
