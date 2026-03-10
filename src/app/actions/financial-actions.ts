"use server";

import {
  AuditModule,
  FinancialDocumentType,
  FinancialStatementStatus,
  NotificationRecipientType,
  UserRole,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireCurrentUser } from "@/lib/authz";
import { sendMail } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { getPlatformRuntimeConfig } from "@/lib/runtime-settings";
import { uploadStorageFile } from "@/lib/storage";

export type FinancialFormState = {
  error?: string;
  success?: string;
};

function getValue(formData: FormData, key: string) {
  return formData.get(key)?.toString().trim() ?? "";
}

function parseNumber(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDate(value: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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

export async function generateFinancialStatementAction(
  _prevState: FinancialFormState,
  formData: FormData,
): Promise<FinancialFormState> {
  const user = await requireFinancialUser();

  if (user.role !== UserRole.SUPER_ADMIN) {
    return { error: "Somente o Admin Total pode gerar fechamentos." };
  }

  const referenceMonth = getValue(formData, "referenceMonth");
  const profile = await prisma.financialProfile.findUnique({
    where: { companyId: user.companyId },
  });

  if (!profile || !referenceMonth) {
    return { error: "Perfil financeiro ou mes de referencia invalido." };
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
  return { success: `Fechamento de ${referenceMonth} gerado/atualizado com sucesso.` };
}

export async function addFinancialDocumentAction(
  _prevState: FinancialFormState,
  formData: FormData,
): Promise<FinancialFormState> {
  const user = await requireFinancialUser();

  const statementId = getValue(formData, "statementId");
  const fileNameInput = getValue(formData, "fileName");
  const storagePathInput = getValue(formData, "storagePath");
  const documentTypeValue = getValue(formData, "documentType");
  const dueDate = parseDate(getValue(formData, "dueDate"));
  const isAvailableToClient = getValue(formData, "isAvailableToClient") === "on";
  const reminderEnabled = getValue(formData, "reminderEnabled") === "on";
  const uploadedFile = formData.get("file");

  const documentType =
    Object.values(FinancialDocumentType).find((item) => item === documentTypeValue) ?? null;

  if (!statementId || !documentType) {
    return { error: "Preencha os dados do documento financeiro." };
  }

  let fileName = fileNameInput;
  let storagePath = storagePathInput;

  if (uploadedFile instanceof File && uploadedFile.size > 0) {
    const storedFile = await uploadStorageFile({
      file: uploadedFile,
      folder: "financial",
    });
    fileName = fileName || storedFile.fileName;
    storagePath = storedFile.storagePath;
  }

  if (!fileName || !storagePath) {
    return { error: "Informe um arquivo ou um caminho/URL para o documento." };
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
      dueDate,
      isAvailableToClient,
      reminderEnabled,
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

export async function addFinancialRecipientAction(
  _prevState: FinancialFormState,
  formData: FormData,
): Promise<FinancialFormState> {
  const user = await requireFinancialUser();
  const email = getValue(formData, "email").toLowerCase();

  if (!email) {
    return { error: "Informe o email financeiro." };
  }

  const existingRecipient = await prisma.companyNotificationRecipient.findFirst({
    where: {
      companyId: user.companyId,
      email,
      type: NotificationRecipientType.BILLING,
    },
    select: {
      id: true,
    },
  });

  if (existingRecipient) {
    await prisma.companyNotificationRecipient.update({
      where: { id: existingRecipient.id },
      data: {
        active: true,
      },
    });
  } else {
    await prisma.companyNotificationRecipient.create({
      data: {
        companyId: user.companyId,
        email,
        type: NotificationRecipientType.BILLING,
        active: true,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      userId: user.id,
      module: AuditModule.FINANCIAL,
      action: "financial_recipient_added",
      entityType: "notification_recipient",
      description: `Destinatario financeiro adicionado: ${email}`,
    },
  });

  revalidatePath("/financial");
  return {};
}

export async function updateFinancialDocumentStatusAction(
  _prevState: FinancialFormState,
  formData: FormData,
): Promise<FinancialFormState> {
  const user = await requireFinancialUser();

  if (user.role !== UserRole.SUPER_ADMIN) {
    return { error: "Somente o Admin Total pode alterar documentos." };
  }

  const documentId = getValue(formData, "documentId");
  const markAsPaid = getValue(formData, "markAsPaid") === "on";
  const reminderEnabled = getValue(formData, "reminderEnabled") === "on";

  if (!documentId) {
    return { error: "Documento invalido." };
  }

  const document = await prisma.financialDocument.findUnique({
    where: { id: documentId },
    include: {
      financialStatement: {
        select: {
          companyId: true,
        },
      },
    },
  });

  if (!document || document.financialStatement.companyId !== user.companyId) {
    return { error: "Documento nao encontrado." };
  }

  await prisma.financialDocument.update({
    where: { id: document.id },
    data: {
      paidAt: markAsPaid ? document.paidAt ?? new Date() : null,
      reminderEnabled,
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: document.financialStatement.companyId,
      userId: user.id,
      module: AuditModule.FINANCIAL,
      action: "financial_document_updated",
      entityType: "financial_document",
      entityId: document.id,
      description: `Documento financeiro atualizado: ${document.fileName}`,
    },
  });

  revalidatePath("/financial");
  return {};
}

export async function sendFinancialReminderAction(formData: FormData) {
  const user = await requireFinancialUser();
  const statementId = getValue(formData, "statementId");

  if (!statementId) {
    return;
  }

  const [statement, recipients, runtime] = await Promise.all([
    prisma.financialStatement.findUnique({
      where: { id: statementId },
      include: {
        company: {
          select: {
            name: true,
          },
        },
        documents: true,
      },
    }),
    prisma.companyNotificationRecipient.findMany({
      where: {
        companyId: user.companyId,
        type: NotificationRecipientType.BILLING,
        active: true,
      },
      select: {
        email: true,
      },
    }),
    getPlatformRuntimeConfig(),
  ]);

  if (!statement || (user.role !== UserRole.SUPER_ADMIN && statement.companyId !== user.companyId)) {
    return;
  }

  if (recipients.length === 0) {
    return;
  }

  const docsHtml =
    statement.documents.length === 0
      ? "<p style=\"margin:0;color:#475569\">Nenhum documento anexado.</p>"
      : statement.documents
          .map((document) => {
            const href = document.storagePath.startsWith("http")
              ? document.storagePath
              : `${runtime.appUrl}${document.storagePath}`;

            const dueDate = document.dueDate
              ? ` · vence em ${document.dueDate.toLocaleDateString("pt-BR")}`
              : "";
            return `<p style="margin:0 0 8px 0"><strong>${document.documentType}</strong>${dueDate}: <a href="${href}">${document.fileName}</a></p>`;
          })
          .join("");

  await Promise.all(
    recipients.map((recipient) =>
      sendMail({
        to: recipient.email,
        subject: `Cobranca ${statement.company.name} - ${statement.referenceMonth.toLocaleDateString("pt-BR", {
          month: "long",
          year: "numeric",
        })}`,
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f7fb;padding:24px;color:#102033">
            <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px;border:1px solid #dbe7f3">
              <p style="margin:0 0 8px 0;color:#0e7490;font-size:12px;letter-spacing:0.08em;text-transform:uppercase">SecHub</p>
              <h1 style="margin:0 0 16px 0;font-size:28px;line-height:1.05">Lembrete financeiro</h1>
              <p style="margin:0 0 24px 0;line-height:1.6;color:#475569">
                Seguem os documentos da cobranca de <strong>${statement.company.name}</strong>.
              </p>
              <p style="margin:0 0 16px 0"><strong>Valor total:</strong> R$ ${Number(statement.total).toFixed(2)}</p>
              ${docsHtml}
            </div>
          </div>
        `,
      }),
    ),
  );

  await prisma.auditLog.create({
    data: {
      companyId: statement.companyId,
      userId: user.id,
      module: AuditModule.FINANCIAL,
      action: "financial_reminder_sent",
      entityType: "financial_statement",
      entityId: statement.id,
      description: "Lembrete financeiro enviado manualmente.",
    },
  });

  revalidatePath("/financial");
}

export async function updateFinancialStatementStatusAction(
  _prevState: FinancialFormState,
  formData: FormData,
): Promise<FinancialFormState> {
  const user = await requireFinancialUser();

  if (user.role !== UserRole.SUPER_ADMIN) {
    return { error: "Somente o Admin Total pode alterar o status." };
  }

  const statementId = getValue(formData, "statementId");
  const statusValue = getValue(formData, "status");
  const status = Object.values(FinancialStatementStatus).find((item) => item === statusValue);

  if (!statementId || !status) {
    return { error: "Status invalido." };
  }

  const statement = await prisma.financialStatement.findUnique({
    where: { id: statementId },
    select: {
      id: true,
      companyId: true,
    },
  });

  if (!statement || statement.companyId !== user.companyId) {
    return { error: "Fechamento nao encontrado." };
  }

  await prisma.financialStatement.update({
    where: { id: statement.id },
    data: {
      status,
    },
  });

  if (status === FinancialStatementStatus.PAID) {
    await prisma.financialDocument.updateMany({
      where: {
        financialStatementId: statement.id,
        paidAt: null,
      },
      data: {
        paidAt: new Date(),
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      companyId: statement.companyId,
      userId: user.id,
      module: AuditModule.FINANCIAL,
      action: "financial_statement_status_updated",
      entityType: "financial_statement",
      entityId: statement.id,
      description: `Status do fechamento atualizado para ${status}.`,
    },
  });

  revalidatePath("/financial");
  return {};
}
