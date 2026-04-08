"use server";

import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import {
  AuditModule,
  FinancialDocumentType,
  FinancialStatementStatus,
  NotificationRecipientType,
  Prisma,
  TimeEntryType,
  UserRole,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/authz";
import {
  buildFinancialSummary,
  calculateExtraCharge,
  financialDocumentLabels,
  formatFinancialPeriodLabel,
  formatCurrency,
  getFinancialCycleBounds,
} from "@/lib/financial";
import {
  notifyFinancialReminder,
  notifyFinancialStatementGenerated,
  sendMail,
} from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { isMissingSchemaError } from "@/lib/prisma-errors";
import { getPlatformRuntimeConfig } from "@/lib/runtime-settings";
import { deleteStorageFile, uploadStorageFile } from "@/lib/storage";

export type FinancialFormState = {
  error?: string;
  success?: string;
};

const FINANCIAL_SCHEMA_ERROR_MESSAGE =
  "O schema do financeiro ainda nao foi aplicado no banco de dados. Rode o deploy do schema e tente novamente.";
const execFileAsync = promisify(execFile);

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

function buildFinancialSchemaErrorState(): FinancialFormState {
  return { error: FINANCIAL_SCHEMA_ERROR_MESSAGE };
}

function getPrismaCliCandidates() {
  const searchRoots = [process.cwd(), path.resolve(process.cwd(), ".."), path.resolve(process.cwd(), "..", "..")];
  const isWindows = process.platform === "win32";
  const candidates: Array<{ command: string; args: string[]; env?: Partial<NodeJS.ProcessEnv> }> = [];

  for (const root of searchRoots) {
    const prismaSchema = path.join(root, "prisma", "schema.prisma");
    const prismaConfig = path.join(root, "prisma.config.ts");
    const schemaArgs = fs.existsSync(prismaSchema) ? ["--schema", prismaSchema] : [];
    const configEnv = fs.existsSync(prismaConfig) ? { PRISMA_CONFIG_FILE: prismaConfig } : {};

    const prismaBin = path.join(root, "node_modules", ".bin", isWindows ? "prisma.cmd" : "prisma");
    if (fs.existsSync(prismaBin)) {
      candidates.push({
        command: prismaBin,
        args: ["db", "push", "--skip-generate", ...schemaArgs],
        env: configEnv,
      });
    }

    const prismaBuild = path.join(root, "node_modules", "prisma", "build", "index.js");
    const prismaWasm = path.join(root, "node_modules", "prisma", "build", "prisma_schema_build_bg.wasm");
    if (fs.existsSync(prismaBuild) && fs.existsSync(prismaWasm)) {
      candidates.push({
        command: process.execPath,
        args: [prismaBuild, "db", "push", "--skip-generate", ...schemaArgs],
        env: configEnv,
      });
    }
  }

  return candidates;
}

async function dedupeVisitEntriesByTimeEntryId() {
  const [timeEntryIdColumn] = await prisma.$queryRaw<Array<{ exists: boolean }>>(Prisma.sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'VisitEntry'
        AND column_name = 'timeEntryId'
    ) AS "exists"
  `);

  if (!timeEntryIdColumn?.exists) {
    return 0;
  }

  const duplicates = await prisma.$queryRaw<Array<{ timeEntryId: string; ids: string[] }>>(Prisma.sql`
    SELECT
      "timeEntryId",
      array_agg(id ORDER BY "createdAt" DESC, id DESC) AS ids
    FROM "VisitEntry"
    WHERE "timeEntryId" IS NOT NULL
    GROUP BY "timeEntryId"
    HAVING COUNT(*) > 1
  `);

  if (duplicates.length === 0) {
    return 0;
  }

  let deletedCount = 0;

  for (const duplicate of duplicates) {
    const [, ...idsToDelete] = duplicate.ids;

    if (idsToDelete.length === 0) {
      continue;
    }

    const result = await prisma.visitEntry.deleteMany({
      where: {
        id: {
          in: idsToDelete,
        },
      },
    });

    deletedCount += result.count;
  }

  return deletedCount;
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

function buildReminderEmailHtml(params: {
  companyName: string;
  periodStart: Date;
  periodEnd: Date;
  summary: ReturnType<typeof buildFinancialSummary>;
  intro: string;
  documentsHtml: string;
}) {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f7fb;padding:24px;color:#102033">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px;border:1px solid #dbe7f3">
        <p style="margin:0 0 8px 0;color:#0e7490;font-size:12px;letter-spacing:0.08em;text-transform:uppercase">SecHub</p>
        <h1 style="margin:0 0 16px 0;font-size:28px;line-height:1.05">Lembrete financeiro</h1>
        <p style="margin:0 0 24px 0;line-height:1.6;color:#475569">${params.intro}</p>
        <div style="padding:20px;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;margin-bottom:24px">
          <p style="margin:0 0 8px 0"><strong>Empresa:</strong> ${params.companyName}</p>
          <p style="margin:0 0 8px 0"><strong>Competencia:</strong> ${formatFinancialPeriodLabel(params.periodStart, params.periodEnd)}</p>
          <p style="margin:0 0 8px 0"><strong>Horas dentro da franquia:</strong> ${params.summary.includedHoursUsed.toFixed(2)}h</p>
          <p style="margin:0 0 8px 0"><strong>Horas extras:</strong> ${params.summary.extraHoursUsed.toFixed(2)}h</p>
          <p style="margin:0 0 8px 0"><strong>Memoria da hora extra:</strong> ${params.summary.extraHourBlocks}x hora cheia a ${formatCurrency(params.summary.extraHourlyRate)}${params.summary.extraHalfHourBlocks ? ` + ${params.summary.extraHalfHourBlocks}x meia hora a ${formatCurrency(params.summary.extraHalfHourRate)}` : ""}</p>
          <p style="margin:0 0 8px 0"><strong>Visitas:</strong> ${params.summary.visitCount} a ${formatCurrency(params.summary.visitRate)}</p>
          <p style="margin:0 0 8px 0"><strong>Valor base:</strong> ${formatCurrency(params.summary.subtotal)}</p>
          <p style="margin:0"><strong>Valor total:</strong> ${formatCurrency(params.summary.total)}</p>
        </div>
        <div style="display:grid;gap:8px">${params.documentsHtml}</div>
      </div>
    </div>
  `;
}

async function resolveReminderRecipients(companyId: string, emails: string[]) {
  if (emails.length > 0) {
    return emails;
  }

  const recipients = await prisma.companyNotificationRecipient.findMany({
    where: {
      companyId,
      type: NotificationRecipientType.BILLING,
      active: true,
    },
    select: {
      email: true,
    },
  });

  return recipients.map((recipient) => recipient.email);
}

export async function saveFinancialProfileAction(
  _prevState: FinancialFormState,
  formData: FormData,
): Promise<FinancialFormState> {
  try {
    const user = await requireFinancialUser();

    if (user.role !== UserRole.SUPER_ADMIN) {
      return { error: "Somente o Admin Total pode editar parametros financeiros." };
    }

    const includedHours = parseNumber(getValue(formData, "includedHours"));
    const hourlyRate = parseNumber(getValue(formData, "hourlyRate"));
    const extraHourlyRate = parseNumber(getValue(formData, "extraHourlyRate"));
    const extraHalfHourRate = parseNumber(getValue(formData, "extraHalfHourRate"));
    const visitRate = parseNumber(getValue(formData, "visitRate"));
    const billingDay = Number(getValue(formData, "billingDay"));
    const contractStartDate = parseDate(getValue(formData, "contractStartDate"));

    if (
      includedHours === null ||
      hourlyRate === null ||
      extraHourlyRate === null ||
      visitRate === null ||
      !billingDay
    ) {
      return { error: "Preencha todos os parametros financeiros." };
    }

    try {
      await prisma.financialProfile.upsert({
        where: {
          companyId: user.companyId,
        },
        update: {
          includedHours,
          hourlyRate,
          extraHourlyRate,
          extraHalfHourRate,
          visitRate,
          billingDay,
          contractStartDate,
        },
        create: {
          companyId: user.companyId,
          includedHours,
          hourlyRate,
          extraHourlyRate,
          extraHalfHourRate,
          visitRate,
          billingDay,
          contractStartDate,
        },
      });
    } catch (error) {
      if (!isMissingSchemaError(error)) {
        throw error;
      }

      await prisma.financialProfile.upsert({
        where: {
          companyId: user.companyId,
        },
        update: {
          includedHours,
          hourlyRate,
          extraHourlyRate,
          extraHalfHourRate,
          visitRate,
          billingDay,
        },
        create: {
          companyId: user.companyId,
          includedHours,
          hourlyRate,
          extraHourlyRate,
          extraHalfHourRate,
          visitRate,
          billingDay,
        },
      });
    }

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
    revalidatePath("/financial/rules");
    return { success: "Perfil financeiro atualizado." };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      console.error("Financial profile save skipped because the schema is out of date.", error);
      return buildFinancialSchemaErrorState();
    }

    throw error;
  }
}

export async function generateFinancialStatementAction(
  _prevState: FinancialFormState,
  formData: FormData,
): Promise<FinancialFormState> {
  try {
    const user = await requireFinancialUser();

    if (user.role !== UserRole.SUPER_ADMIN) {
      return { error: "Somente o Admin Total pode gerar fechamentos." };
    }

    const referenceDate = parseDate(getValue(formData, "referenceDate"));
    const profile = await prisma.financialProfile.findUnique({
      where: { companyId: user.companyId },
      select: {
      id: true,
      includedHours: true,
      hourlyRate: true,
      extraHourlyRate: true,
      extraHalfHourRate: true,
      visitRate: true,
      billingDay: true,
      contractStartDate: true,
    },
  });

    if (!profile || !referenceDate) {
      return { error: "Perfil financeiro ou data de referencia invalida." };
    }

    const { start, end } = getFinancialCycleBounds({
      anchorDate: referenceDate,
      billingDay: profile.billingDay,
      contractStartDate: profile.contractStartDate ?? null,
    });

    const [timeEntries, visitEntries, legacyOnSiteEntries] = await Promise.all([
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
      prisma.timeEntry.findMany({
        where: {
          companyId: user.companyId,
          entryType: TimeEntryType.ON_SITE,
          startedAt: {
            gte: start,
            lt: end,
          },
          visitEntry: {
            is: null,
          },
        },
        select: {
          id: true,
        },
      }),
    ]);

    const totalHours = timeEntries.reduce((sum, entry) => sum + entry.durationMinutes / 60, 0);
    const includedHours = Number(profile.includedHours);
    const baseFee = Number(profile.hourlyRate);
    const visitRate = Number(profile.visitRate);
    const visitCount = visitEntries.length + legacyOnSiteEntries.length;
    const includedHoursUsed = Math.min(totalHours, includedHours);
    const extraHoursUsed = Math.max(totalHours - includedHours, 0);
    const extraCharge = calculateExtraCharge(extraHoursUsed, profile);
    const visitsTotal = visitCount > 0 ? visitCount * visitRate : 0;
    const total = baseFee + extraCharge.total + visitsTotal;

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
        description: `Fechamento financeiro gerado para ${formatFinancialPeriodLabel(start, end)}.`,
      },
    });

    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: {
        name: true,
      },
    });

    await notifyFinancialStatementGenerated({
      companyName: company?.name,
      referenceMonth: formatFinancialPeriodLabel(start, end),
      total,
      extraHoursUsed,
      visitCount,
    }).catch((error) => {
      console.error("Falha ao enviar notificacao Telegram do fechamento financeiro:", error);
    });

    revalidatePath("/financial");
    revalidatePath("/financial/documents");
    return { success: `Fechamento de ${formatFinancialPeriodLabel(start, end)} gerado/atualizado com sucesso.` };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      console.error("Financial statement generation skipped because the schema is out of date.", error);
      return buildFinancialSchemaErrorState();
    }

    throw error;
  }
}

export async function addFinancialDocumentAction(
  _prevState: FinancialFormState,
  formData: FormData,
): Promise<FinancialFormState> {
  try {
    const user = await requireFinancialUser();

  const statementId = getValue(formData, "statementId");
  const fileNameInput = getValue(formData, "fileName");
  const storagePathInput = getValue(formData, "storagePath");
  const documentTypeValue = getValue(formData, "documentType");
  const dueDate = parseDate(getValue(formData, "dueDate"));
  const notes = getValue(formData, "notes");
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
      notes: notes || null,
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
    revalidatePath("/financial/documents");
    return { success: "Documento financeiro anexado." };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      console.error("Financial document creation skipped because the schema is out of date.", error);
      return buildFinancialSchemaErrorState();
    }

    throw error;
  }
}

export async function updateFinancialDocumentAction(
  _prevState: FinancialFormState,
  formData: FormData,
): Promise<FinancialFormState> {
  try {
    const user = await requireFinancialUser();

  if (user.role !== UserRole.SUPER_ADMIN) {
    return { error: "Somente o Admin Total pode editar documentos." };
  }

  const documentId = getValue(formData, "documentId");
  const fileNameInput = getValue(formData, "fileName");
  const storagePathInput = getValue(formData, "storagePath");
  const documentTypeValue = getValue(formData, "documentType");
  const dueDate = parseDate(getValue(formData, "dueDate"));
  const notes = getValue(formData, "notes");
  const isAvailableToClient = getValue(formData, "isAvailableToClient") === "on";
  const reminderEnabled = getValue(formData, "reminderEnabled") === "on";
  const uploadedFile = formData.get("file");

  const documentType =
    Object.values(FinancialDocumentType).find((item) => item === documentTypeValue) ?? null;

  if (!documentId || !documentType) {
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

  let fileName = fileNameInput || document.fileName;
  let storagePath = storagePathInput || document.storagePath;

  if (uploadedFile instanceof File && uploadedFile.size > 0) {
    const storedFile = await uploadStorageFile({
      file: uploadedFile,
      folder: "financial",
    });
    fileName = fileNameInput || storedFile.fileName;
    storagePath = storedFile.storagePath;
    await deleteStorageFile(document.storagePath).catch(() => undefined);
  }

  await prisma.financialDocument.update({
    where: { id: document.id },
    data: {
      documentType,
      fileName,
      storagePath,
      notes: notes || null,
      dueDate,
      isAvailableToClient,
      reminderEnabled,
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: document.financialStatement.companyId,
      userId: user.id,
      module: AuditModule.FINANCIAL,
      action: "financial_document_edited",
      entityType: "financial_document",
      entityId: document.id,
      description: `Documento financeiro editado: ${fileName}`,
    },
  });

    revalidatePath("/financial");
    revalidatePath("/financial/documents");
    return { success: "Documento financeiro atualizado." };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      console.error("Financial document update skipped because the schema is out of date.", error);
      return buildFinancialSchemaErrorState();
    }

    throw error;
  }
}

export async function deleteFinancialDocumentAction(formData: FormData) {
  try {
    const user = await requireFinancialUser();

  if (user.role !== UserRole.SUPER_ADMIN) {
    return;
  }

  const documentId = getValue(formData, "documentId");
  if (!documentId) {
    return;
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
    return;
  }

  await prisma.financialDocument.delete({
    where: { id: document.id },
  });
  await deleteStorageFile(document.storagePath).catch(() => undefined);

  await prisma.auditLog.create({
    data: {
      companyId: document.financialStatement.companyId,
      userId: user.id,
      module: AuditModule.FINANCIAL,
      action: "financial_document_deleted",
      entityType: "financial_document",
      entityId: document.id,
      description: `Documento financeiro removido: ${document.fileName}`,
    },
  });

    revalidatePath("/financial");
    revalidatePath("/financial/documents");
    redirect("/financial/documents");
  } catch (error) {
    if (isMissingSchemaError(error)) {
      console.error("Financial document deletion skipped because the schema is out of date.", error);
      return;
    }

    throw error;
  }
}

export async function addFinancialRecipientAction(
  _prevState: FinancialFormState,
  formData: FormData,
): Promise<FinancialFormState> {
  try {
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
    revalidatePath("/financial/rules");
    return { success: "Destinatario financeiro salvo." };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      console.error("Financial recipient save skipped because the schema is out of date.", error);
      return buildFinancialSchemaErrorState();
    }

    throw error;
  }
}

export async function updateFinancialDocumentStatusAction(
  _prevState: FinancialFormState,
  formData: FormData,
): Promise<FinancialFormState> {
  try {
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
    revalidatePath("/financial/documents");
    return { success: "Documento atualizado." };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      console.error("Financial document status update skipped because the schema is out of date.", error);
      return buildFinancialSchemaErrorState();
    }

    throw error;
  }
}

export async function sendFinancialReminderAction(formData: FormData) {
  try {
    const user = await requireFinancialUser();
    const statementId = getValue(formData, "statementId");

  if (!statementId) {
    return;
  }

  const [statement, rule, runtime] = await Promise.all([
    prisma.financialStatement.findUnique({
      where: { id: statementId },
      include: {
        company: {
          select: {
            name: true,
          },
        },
        financialProfile: true,
        documents: true,
      },
    }),
    prisma.financialReminderRule.findFirst({
      where: {
        companyId: user.companyId,
        enabled: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
    getPlatformRuntimeConfig(),
  ]);

  if (!statement || (user.role !== UserRole.SUPER_ADMIN && statement.companyId !== user.companyId)) {
    return;
  }

  const recipients = await resolveReminderRecipients(statement.companyId, rule?.recipientEmails || []);

  if (recipients.length === 0) {
    return;
  }

  const summary = buildFinancialSummary({
    includedHoursUsed: Number(statement.includedHoursUsed),
    extraHoursUsed: Number(statement.extraHoursUsed),
    visitCount: statement.visitCount,
    subtotal: Number(statement.subtotal),
    total: Number(statement.total),
    profile: statement.financialProfile,
  });

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
            const notes = document.notes ? `<br/><span style="color:#475569">${document.notes}</span>` : "";

            return `<p style="margin:0 0 8px 0"><strong>${financialDocumentLabels[document.documentType]}</strong>${dueDate}: <a href="${href}">${document.fileName}</a>${notes}</p>`;
          })
          .join("");

  await Promise.all(
    recipients.map((recipient) =>
      sendMail({
        to: recipient,
        subject:
          rule?.emailSubject ||
          `Cobranca ${statement.company.name} - ${formatFinancialPeriodLabel(
            statement.referenceMonth,
            new Date(statement.referenceMonth.getTime() + 30 * 86400000),
          )}`,
        html: buildReminderEmailHtml({
          companyName: statement.company.name,
          periodStart: statement.referenceMonth,
          periodEnd: new Date(statement.referenceMonth.getTime() + 30 * 86400000),
          summary,
          intro:
            rule?.emailIntro ||
            `Seguem os documentos e o resumo da cobranca de <strong>${statement.company.name}</strong>.`,
          documentsHtml: docsHtml,
        }),
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

  const firstDocument = statement.documents[0];
  if (firstDocument) {
    const href = firstDocument.storagePath.startsWith("http")
      ? firstDocument.storagePath
      : `${runtime.appUrl}${firstDocument.storagePath}`;

    await notifyFinancialReminder({
      companyName: statement.company.name,
      fileName: firstDocument.fileName,
      dueDate: firstDocument.dueDate,
      documentUrl: href,
    }).catch((error) => {
      console.error("Falha ao enviar notificacao Telegram do lembrete financeiro:", error);
    });
  }

    revalidatePath("/financial");
  } catch (error) {
    if (isMissingSchemaError(error)) {
      console.error("Financial reminder send skipped because the schema is out of date.", error);
      return;
    }

    throw error;
  }
}

export async function saveFinancialReminderRuleAction(
  _prevState: FinancialFormState,
  formData: FormData,
): Promise<FinancialFormState> {
  try {
    const user = await requireFinancialUser();

  if (user.role !== UserRole.SUPER_ADMIN) {
    return { error: "Somente o Admin Total pode editar regras de cobranca." };
  }

  const ruleId = getValue(formData, "ruleId");
  const name = getValue(formData, "name");
  const documentTypeValue = getValue(formData, "documentType");
  const daysBeforeDue = Number(getValue(formData, "daysBeforeDue"));
  const frequencyDays = Number(getValue(formData, "frequencyDays"));
  const enabled = getValue(formData, "enabled") === "on";
  const recipientEmails = getValue(formData, "recipientEmails")
    .split(/[,\n;]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const emailSubject = getValue(formData, "emailSubject");
  const emailIntro = getValue(formData, "emailIntro");
  const documentType =
    Object.values(FinancialDocumentType).find((item) => item === documentTypeValue) ?? null;

  if (!name || !daysBeforeDue || !frequencyDays) {
    return { error: "Preencha nome, prazo e frequencia." };
  }

  if (ruleId) {
    await prisma.financialReminderRule.update({
      where: { id: ruleId },
      data: {
        name,
        documentType,
        daysBeforeDue,
        frequencyDays,
        enabled,
        recipientEmails,
        emailSubject: emailSubject || null,
        emailIntro: emailIntro || null,
      },
    });
  } else {
    await prisma.financialReminderRule.create({
      data: {
        companyId: user.companyId,
        name,
        documentType,
        daysBeforeDue,
        frequencyDays,
        enabled,
        recipientEmails,
        emailSubject: emailSubject || null,
        emailIntro: emailIntro || null,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      userId: user.id,
      module: AuditModule.FINANCIAL,
      action: ruleId ? "financial_reminder_rule_updated" : "financial_reminder_rule_created",
      entityType: "financial_reminder_rule",
      entityId: ruleId || null,
      description: `Regra de cobranca salva: ${name}`,
    },
  });

    revalidatePath("/financial/rules");
    return { success: "Regra de cobranca salva." };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      console.error("Financial reminder rule save skipped because the schema is out of date.", error);
      return buildFinancialSchemaErrorState();
    }

    throw error;
  }
}

export async function deleteFinancialReminderRuleAction(formData: FormData) {
  try {
    const user = await requireFinancialUser();

  if (user.role !== UserRole.SUPER_ADMIN) {
    return;
  }

  const ruleId = getValue(formData, "ruleId");
  if (!ruleId) {
    return;
  }

  const rule = await prisma.financialReminderRule.findUnique({
    where: { id: ruleId },
  });

  if (!rule || rule.companyId !== user.companyId) {
    return;
  }

  await prisma.financialReminderRule.delete({
    where: { id: rule.id },
  });

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      userId: user.id,
      module: AuditModule.FINANCIAL,
      action: "financial_reminder_rule_deleted",
      entityType: "financial_reminder_rule",
      entityId: rule.id,
      description: `Regra de cobranca removida: ${rule.name}`,
    },
  });

    revalidatePath("/financial/rules");
  } catch (error) {
    if (isMissingSchemaError(error)) {
      console.error("Financial reminder rule deletion skipped because the schema is out of date.", error);
      return;
    }

    throw error;
  }
}

export async function updateFinancialStatementStatusAction(
  _prevState: FinancialFormState,
  formData: FormData,
): Promise<FinancialFormState> {
  try {
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
    revalidatePath("/financial/documents");
    return { success: "Status do fechamento atualizado." };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      console.error("Financial statement status update skipped because the schema is out of date.", error);
      return buildFinancialSchemaErrorState();
    }

    throw error;
  }
}

export async function syncFinancialSchemaAction(): Promise<FinancialFormState> {
  const user = await requireFinancialUser();

  if (user.role !== UserRole.SUPER_ADMIN) {
    return { error: "Somente o Admin Total pode sincronizar o schema." };
  }

  let lastError: unknown = null;
  let cleanedDuplicates = 0;

  for (const candidate of getPrismaCliCandidates()) {
    try {
      await execFileAsync(candidate.command, candidate.args, {
        cwd: process.cwd(),
        env: {
          ...process.env,
          ...candidate.env,
        },
      });

      revalidatePath("/financial");
      revalidatePath("/financial/documents");
      revalidatePath("/financial/rules");
      return {
        success:
          cleanedDuplicates > 0
            ? `Schema do Prisma sincronizado com sucesso. ${cleanedDuplicates} registro(s) duplicado(s) de visita foram removidos para concluir a operacao.`
            : "Schema do Prisma sincronizado com sucesso.",
      };
    } catch (error) {
      lastError = error;

      const commandError =
        typeof error === "object" && error !== null
          ? (error as { stdout?: string; stderr?: string })
          : null;
      const combinedOutput = `${commandError?.stdout || ""}\n${commandError?.stderr || ""}`;

      if (combinedOutput.includes("--accept-data-loss")) {
        cleanedDuplicates = await dedupeVisitEntriesByTimeEntryId();

        try {
          await execFileAsync(candidate.command, [...candidate.args, "--accept-data-loss"], {
            cwd: process.cwd(),
            env: {
              ...process.env,
              ...candidate.env,
            },
          });

          revalidatePath("/financial");
          revalidatePath("/financial/documents");
          revalidatePath("/financial/rules");
          return {
            success:
              cleanedDuplicates > 0
                ? `Schema do Prisma sincronizado com sucesso. ${cleanedDuplicates} registro(s) duplicado(s) de visita foram removidos automaticamente.`
                : "Schema do Prisma sincronizado com sucesso.",
          };
        } catch (retryError) {
          lastError = retryError;
        }
      }
    }
  }

  console.error("Failed to sync Prisma schema from the financial page.", lastError);

  const commandError =
    typeof lastError === "object" && lastError !== null
      ? (lastError as { stdout?: string; stderr?: string })
      : null;
  const combinedOutput = `${commandError?.stdout || ""}\n${commandError?.stderr || ""}`;

  if (combinedOutput.includes("--accept-data-loss")) {
    return {
      error:
        "A sincronizacao ainda foi bloqueada pelo Prisma mesmo apos a tentativa de limpeza automatica. Verifique manualmente os dados da tabela VisitEntry e tente novamente.",
    };
  }

  return {
    error:
      "Nao foi possivel executar a sincronizacao automatica do schema neste ambiente. Verifique se o Prisma CLI esta disponivel no servidor.",
  };
}
