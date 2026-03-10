"use server";

import { AuditModule, FinancialDocumentType, FinancialStatementStatus, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireCurrentUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export type FinancialFormState = {
  error?: string;
};

function getValue(formData: FormData, key: string) {
  return formData.get(key)?.toString().trim() ?? "";
}

function parseNumber(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

async function requireFinancialUser() {
  const user = await requireCurrentUser();

  if (user.role === UserRole.USER) {
    throw new Error("Acesso nao autorizado ao modulo financeiro.");
  }

  if (!user.companyId) {
    throw new Error("Usuario sem empresa vinculada.");
  }

  return {
    ...user,
    companyId: user.companyId,
  };
}

function monthBounds(referenceMonth: string) {
  const base = new Date(`${referenceMonth}-01T00:00:00`);
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  return { start, end };
}

export async function saveFinancialProfileAction(
  _prevState: FinancialFormState,
  formData: FormData,
): Promise<FinancialFormState> {
  const user = await requireFinancialUser();

  if (user.role !== UserRole.SUPER_ADMIN) {
    return { error: "Somente o Admin Total pode editar parametros financeiros." };
  }

  const includedHours = parseNumber(getValue(formData, "includedHours"));
  const hourlyRate = parseNumber(getValue(formData, "hourlyRate"));
  const extraHourlyRate = parseNumber(getValue(formData, "extraHourlyRate"));
  const visitRate = parseNumber(getValue(formData, "visitRate"));
  const billingDay = Number(getValue(formData, "billingDay"));

  if (
    includedHours === null ||
    hourlyRate === null ||
    extraHourlyRate === null ||
    visitRate === null ||
    !billingDay
  ) {
    return { error: "Preencha todos os parametros financeiros." };
  }

  await prisma.financialProfile.upsert({
    where: {
      companyId: user.companyId,
    },
    update: {
      includedHours,
      hourlyRate,
      extraHourlyRate,
      visitRate,
      billingDay,
    },
    create: {
      companyId: user.companyId,
      includedHours,
      hourlyRate,
      extraHourlyRate,
      visitRate,
      billingDay,
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      userId: user.id,
      module: AuditModule.FINANCIAL,
      action: "financial_profile_saved",
      entityType: "financial_profile",
      description: "Perfil financeiro salvo ou atualizado.",
    },
  });

  revalidatePath("/financial");
  return {};
}

export async function generateFinancialStatementAction(formData: FormData) {
  const user = await requireFinancialUser();

  if (user.role !== UserRole.SUPER_ADMIN) {
    return;
  }

  const referenceMonth = getValue(formData, "referenceMonth");
  const profile = await prisma.financialProfile.findUnique({
    where: { companyId: user.companyId },
  });

  if (!profile || !referenceMonth) {
    return;
  }

  const { start, end } = monthBounds(referenceMonth);

  const [timeEntries, visitEntries] = await Promise.all([
    prisma.timeEntry.findMany({
      where: {
        companyId: user.companyId,
        startedAt: {
          gte: start,
          lt: end,
        },
      },
      select: {
        durationMinutes: true,
      },
    }),
    prisma.visitEntry.findMany({
      where: {
        companyId: user.companyId,
        visitDate: {
          gte: start,
          lt: end,
        },
      },
      select: {
        amount: true,
      },
    }),
  ]);

  const totalHours = timeEntries.reduce((sum, entry) => sum + entry.durationMinutes / 60, 0);
  const includedHours = Number(profile.includedHours);
  const baseFee = Number(profile.hourlyRate);
  const extraRate = Number(profile.extraHourlyRate);
  const visitRate = Number(profile.visitRate);
  const visitCount = visitEntries.length;
  const includedHoursUsed = Math.min(totalHours, includedHours);
  const extraHoursUsed = Math.max(totalHours - includedHours, 0);
  const visitsTotal = visitCount > 0 ? visitCount * visitRate : 0;
  const total = baseFee + extraHoursUsed * extraRate + visitsTotal;

  const existingStatement = await prisma.financialStatement.findFirst({
    where: {
      companyId: user.companyId,
      referenceMonth: start,
    },
    select: {
      id: true,
    },
  });

  if (existingStatement) {
    await prisma.financialStatement.update({
      where: { id: existingStatement.id },
      data: {
        financialProfileId: profile.id,
        includedHoursUsed,
        extraHoursUsed,
        visitCount,
        subtotal: baseFee,
        total,
        status: FinancialStatementStatus.OPEN,
      },
    });
  } else {
    await prisma.financialStatement.create({
      data: {
        companyId: user.companyId,
        financialProfileId: profile.id,
        referenceMonth: start,
        includedHoursUsed,
        extraHoursUsed,
        visitCount,
        subtotal: baseFee,
        total,
        status: FinancialStatementStatus.OPEN,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      userId: user.id,
      module: AuditModule.FINANCIAL,
      action: "financial_statement_generated",
      entityType: "financial_statement",
      description: `Fechamento financeiro gerado para ${referenceMonth}.`,
    },
  });

  revalidatePath("/financial");
}

export async function addFinancialDocumentAction(
  _prevState: FinancialFormState,
  formData: FormData,
): Promise<FinancialFormState> {
  const user = await requireFinancialUser();

  const statementId = getValue(formData, "statementId");
  const fileName = getValue(formData, "fileName");
  const storagePath = getValue(formData, "storagePath");
  const documentTypeValue = getValue(formData, "documentType");
  const isAvailableToClient = getValue(formData, "isAvailableToClient") === "on";

  const documentType =
    Object.values(FinancialDocumentType).find((item) => item === documentTypeValue) ?? null;

  if (!statementId || !fileName || !storagePath || !documentType) {
    return { error: "Preencha os dados do documento financeiro." };
  }

  const statement = await prisma.financialStatement.findUnique({
    where: { id: statementId },
    select: {
      id: true,
      companyId: true,
    },
  });

  if (!statement || (user.role !== UserRole.SUPER_ADMIN && statement.companyId !== user.companyId)) {
    return { error: "Fechamento financeiro nao encontrado." };
  }

  await prisma.financialDocument.create({
    data: {
      financialStatementId: statement.id,
      documentType,
      fileName,
      storagePath,
      isAvailableToClient,
      uploadedById: user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: statement.companyId,
      userId: user.id,
      module: AuditModule.FINANCIAL,
      action: "financial_document_added",
      entityType: "financial_document",
      entityId: statement.id,
      description: `Documento ${documentType} anexado ao fechamento.`,
    },
  });

  revalidatePath("/financial");
  return {};
}
