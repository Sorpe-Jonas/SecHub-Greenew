"use server";

import {
  AuditModule,
  BlockKey,
  CompanyStatus,
  InvitationStatus,
  UserRole,
  UserStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { signIn } from "@/auth";
import { requireCurrentUser } from "@/lib/authz";
import { sendMail } from "@/lib/notifications";
import { getDefaultBlocksForRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getPlatformRuntimeConfig } from "@/lib/runtime-settings";

export type AdminFormState = {
  error?: string;
};

function getValue(formData: FormData, key: string) {
  return formData.get(key)?.toString().trim() ?? "";
}

function slugifyCompanyName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export async function createCompanyAction(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const user = await requireCurrentUser();

  if (user.role !== UserRole.SUPER_ADMIN) {
    return { error: "Somente o Admin Total pode criar empresas." };
  }

  const name = getValue(formData, "name");
  const slugInput = getValue(formData, "slug");
  const slug = slugInput || slugifyCompanyName(name);

  if (!name || !slug) {
    return { error: "Preencha nome e slug da empresa." };
  }

  const existing = await prisma.company.findUnique({
    where: { slug },
  });

  if (existing) {
    return { error: "Ja existe uma empresa com esse slug." };
  }

  const company = await prisma.company.create({
    data: {
      name,
      slug,
      status: CompanyStatus.ACTIVE,
    },
  });

  await prisma.companyBlockPermission.createMany({
    data: Object.values(BlockKey).map((block) => ({
      companyId: company.id,
      block,
      enabled: true,
    })),
  });

  await prisma.auditLog.create({
    data: {
      companyId: company.id,
      userId: user.id,
      module: AuditModule.COMPANY,
      action: "company_created",
      entityType: "company",
      entityId: company.id,
      description: `Empresa criada: ${company.name}`,
    },
  });

  revalidatePath("/companies");
  return {};
}

export async function inviteUserAction(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const currentUser = await requireCurrentUser();
  const email = getValue(formData, "email").toLowerCase();
  const name = getValue(formData, "name");
  const roleValue = getValue(formData, "role");
  const companyIdInput = getValue(formData, "companyId");
  const role = Object.values(UserRole).find((item) => item === roleValue);

  if (!email || !name || !role) {
    return { error: "Preencha nome, email e role." };
  }

  if (currentUser.role === UserRole.USER) {
    return { error: "Sem permissao para convidar usuarios." };
  }

  if (currentUser.role !== UserRole.SUPER_ADMIN && role === UserRole.SUPER_ADMIN) {
    return { error: "Somente o Admin Total pode convidar outro Admin Total." };
  }

  let companyId = currentUser.companyId;
  if (currentUser.role === UserRole.SUPER_ADMIN && companyIdInput) {
    companyId = companyIdInput;
  }

  if (!companyId) {
    return { error: "Empresa invalida para o convite." };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser && existingUser.status === UserStatus.ACTIVE) {
    return { error: "Ja existe um usuario ativo com este email." };
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  const invitedUser =
    existingUser ??
    (await prisma.user.create({
      data: {
        companyId,
        name,
        email,
        role,
        status: UserStatus.PENDING,
      },
    }));

  await prisma.user.update({
    where: { id: invitedUser.id },
    data: {
      companyId,
      name,
      role,
      status: UserStatus.PENDING,
    },
  });

  await prisma.userBlockPermission.deleteMany({
    where: {
      userId: invitedUser.id,
    },
  });

  await prisma.userBlockPermission.createMany({
    data: getDefaultBlocksForRole(role).map((block) => ({
      userId: invitedUser.id,
      block,
      canView: true,
      canCreate: role !== UserRole.USER,
      canEdit: role !== UserRole.USER,
      canDelete: role === UserRole.SUPER_ADMIN,
    })),
  });

  const invitation = await prisma.userInvitation.create({
    data: {
      companyId,
      email,
      role,
      token,
      status: InvitationStatus.PENDING,
      expiresAt,
      createdById: currentUser.id,
      invitedUserId: invitedUser.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId,
      userId: currentUser.id,
      module: AuditModule.USER,
      action: "user_invited",
      entityType: "user_invitation",
      entityId: invitation.id,
      description: `Convite criado para ${email}`,
    },
  });

  const config = await getPlatformRuntimeConfig();
  const inviteUrl = `${config.appUrl}/invite/${token}`;

  await sendMail({
    to: email,
    subject: "Convite para acessar o SecHub",
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f7fb;padding:24px;color:#102033">
        <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px;border:1px solid #dbe7f3">
          <p style="margin:0 0 8px 0;color:#0e7490;font-size:12px;letter-spacing:0.08em;text-transform:uppercase">SecHub</p>
          <h1 style="margin:0 0 16px 0;font-size:28px;line-height:1.05">Voce foi convidado para a plataforma</h1>
          <p style="margin:0 0 24px 0;line-height:1.6;color:#475569">
            Um administrador criou o seu acesso. Use o link abaixo para definir sua senha e ativar sua conta.
          </p>
          <p style="margin:0 0 24px 0"><a href="${inviteUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;padding:14px 20px;border-radius:14px;text-decoration:none">Aceitar convite</a></p>
          <p style="margin:0;color:#64748b;line-height:1.6">Se o botao nao funcionar, abra este link: ${inviteUrl}</p>
        </div>
      </div>
    `,
  }).catch((error) => {
    console.error("Falha ao enviar convite por email:", error);
  });

  revalidatePath("/users");
  return {};
}

export async function updateUserAccessAction(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const currentUser = await requireCurrentUser();
  const userId = getValue(formData, "userId");
  const roleValue = getValue(formData, "role");
  const role = Object.values(UserRole).find((item) => item === roleValue);

  if (!userId || !role) {
    return { error: "Usuario invalido." };
  }

  if (currentUser.role !== UserRole.SUPER_ADMIN && role === UserRole.SUPER_ADMIN) {
    return { error: "Somente o Admin Total pode promover um usuario para Admin Total." };
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!targetUser) {
    return { error: "Usuario nao encontrado." };
  }

  if (
    currentUser.role !== UserRole.SUPER_ADMIN &&
    (currentUser.role !== UserRole.ADMIN || currentUser.companyId !== targetUser.companyId)
  ) {
    return { error: "Sem permissao para alterar este usuario." };
  }

  const selectedBlocks = Object.values(BlockKey).filter((block) => getValue(formData, `block_${block}`) === "on");

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetUser.id },
      data: {
        role,
      },
    });

    await tx.userBlockPermission.deleteMany({
      where: {
        userId: targetUser.id,
      },
    });

    if (selectedBlocks.length > 0) {
      await tx.userBlockPermission.createMany({
        data: selectedBlocks.map((block) => ({
          userId: targetUser.id,
          block,
          canView: true,
          canCreate: role !== UserRole.USER,
          canEdit: role !== UserRole.USER,
          canDelete: role === UserRole.SUPER_ADMIN,
        })),
      });
    }

    await tx.auditLog.create({
      data: {
        companyId: targetUser.companyId,
        userId: currentUser.id,
        module: AuditModule.PERMISSION,
        action: "user_access_updated",
        entityType: "user",
        entityId: targetUser.id,
        description: `Acessos atualizados para ${targetUser.email}`,
      },
    });
  });

  revalidatePath("/users");
  revalidatePath("/dashboard");
  return {};
}

export async function acceptInvitationAction(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const token = getValue(formData, "token");
  const name = getValue(formData, "name");
  const password = getValue(formData, "password");

  if (!token || !name || password.length < 8) {
    return { error: "Preencha nome e uma senha com pelo menos 8 caracteres." };
  }

  const invitation = await prisma.userInvitation.findUnique({
    where: { token },
    include: {
      invitedUser: true,
    },
  });

  if (!invitation || invitation.status !== InvitationStatus.PENDING || invitation.expiresAt < new Date()) {
    return { error: "Convite invalido ou expirado." };
  }

  const invitedUser = invitation.invitedUser;

  if (!invitedUser) {
    return { error: "Usuario do convite nao encontrado." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: invitedUser.id },
      data: {
        name,
        passwordHash,
        status: UserStatus.ACTIVE,
      },
    });

    await tx.userInvitation.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.ACCEPTED,
      },
    });

    await tx.auditLog.create({
      data: {
        companyId: invitation.companyId,
        userId: invitedUser.id,
        module: AuditModule.USER,
        action: "invitation_accepted",
        entityType: "user_invitation",
        entityId: invitation.id,
        description: `Convite aceito por ${invitedUser.email}`,
      },
    });
  });

  await signIn("credentials", {
    email: invitedUser.email,
    password,
    redirectTo: "/dashboard",
  });

  redirect("/dashboard");
}
