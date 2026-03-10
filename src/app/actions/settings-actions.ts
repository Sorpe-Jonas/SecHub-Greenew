"use server";

import { AuditModule, Prisma, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireCurrentUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export type SettingsFormState = {
  error?: string;
};

function getValue(formData: FormData, key: string) {
  return formData.get(key)?.toString().trim() ?? "";
}

async function requireSettingsUser() {
  const user = await requireCurrentUser();

  if (user.role !== UserRole.SUPER_ADMIN) {
    throw new Error("Somente o Admin Total pode editar configuracoes globais.");
  }

  return user;
}

async function saveGlobalSetting(key: string, value: Prisma.InputJsonValue, updatedById: string) {
  await prisma.globalSetting.upsert({
    where: { key },
    update: {
      value,
      updatedById,
    },
    create: {
      key,
      value,
      updatedById,
    },
  });
}

export async function saveSessionSettingsAction(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const user = await requireSettingsUser();
  const timeoutMinutes = Number(getValue(formData, "timeoutMinutes"));

  if (!timeoutMinutes || timeoutMinutes < 5) {
    return { error: "Informe um tempo de sessao valido, minimo de 5 minutos." };
  }

  await saveGlobalSetting("session_timeout_minutes", timeoutMinutes, user.id);

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      userId: user.id,
      module: AuditModule.SETTINGS,
      action: "session_settings_saved",
      entityType: "global_setting",
      entityId: "session_timeout_minutes",
      description: `Tempo de sessao atualizado para ${timeoutMinutes} minuto(s).`,
    },
  });

  revalidatePath("/settings");
  return {};
}

export async function saveAuth0SettingsAction(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const user = await requireSettingsUser();
  const enabled = getValue(formData, "enabled") === "on";
  const issuer = getValue(formData, "issuer");
  const clientId = getValue(formData, "clientId");
  const clientSecretHint = getValue(formData, "clientSecretHint");

  await saveGlobalSetting(
    "auth0_settings",
    {
      enabled,
      issuer,
      clientId,
      clientSecretHint,
      note: "Os segredos reais continuam sendo lidos do ambiente.",
    },
    user.id,
  );

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      userId: user.id,
      module: AuditModule.SETTINGS,
      action: "auth0_settings_saved",
      entityType: "global_setting",
      entityId: "auth0_settings",
      description: "Configuracoes visuais do Auth0 atualizadas.",
    },
  });

  revalidatePath("/settings");
  return {};
}

export async function saveSmtpSettingsAction(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const user = await requireSettingsUser();
  const enabled = getValue(formData, "enabled") === "on";
  const host = getValue(formData, "host");
  const port = getValue(formData, "port");
  const from = getValue(formData, "from");
  const userName = getValue(formData, "userName");

  await saveGlobalSetting(
    "smtp_settings",
    {
      enabled,
      host,
      port,
      from,
      userName,
      note: "As credenciais reais continuam sendo lidas do ambiente.",
    },
    user.id,
  );

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      userId: user.id,
      module: AuditModule.SETTINGS,
      action: "smtp_settings_saved",
      entityType: "global_setting",
      entityId: "smtp_settings",
      description: "Configuracoes visuais de SMTP atualizadas.",
    },
  });

  revalidatePath("/settings");
  return {};
}

export async function saveTelegramSettingsAction(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const user = await requireSettingsUser();
  const enabled = getValue(formData, "enabled") === "on";
  const chatId = getValue(formData, "chatId");
  const botTokenHint = getValue(formData, "botTokenHint");

  await saveGlobalSetting(
    "telegram_settings",
    {
      enabled,
      chatId,
      botTokenHint,
      note: "O token real continua sendo lido do ambiente.",
    },
    user.id,
  );

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      userId: user.id,
      module: AuditModule.SETTINGS,
      action: "telegram_settings_saved",
      entityType: "global_setting",
      entityId: "telegram_settings",
      description: "Configuracoes visuais do Telegram atualizadas.",
    },
  });

  revalidatePath("/settings");
  return {};
}
