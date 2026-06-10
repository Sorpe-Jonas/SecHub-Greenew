import { FinancialStatementStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import {
  buildFinancialSummary,
  financialDocumentLabels,
  formatCurrency,
  formatFinancialPeriodLabel,
  formatDecimalHoursToHMM,
} from "@/lib/financial";
import { notifyFinancialReminder, sendMail } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { getPlatformRuntimeConfig } from "@/lib/runtime-settings";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET || process.env.AUTH_SECRET;

  if (!secret) {
    return false;
  }

  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token") || "";

  return bearerToken === secret || queryToken === secret;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function buildEmailHtml(params: {
  companyName: string;
  periodStart: Date;
  periodEnd: Date;
  intro: string;
  summary: ReturnType<typeof buildFinancialSummary>;
  href: string;
  fileName: string;
  label: string;
  dueDate?: Date | null;
  notes?: string | null;
}) {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f7fb;padding:24px;color:#102033">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px;border:1px solid #dbe7f3">
        <p style="margin:0 0 8px 0;color:#0e7490;font-size:12px;letter-spacing:0.08em;text-transform:uppercase">SecHub</p>
        <h1 style="margin:0 0 16px 0;font-size:28px;line-height:1.05">Lembrete de pagamento</h1>
        <p style="margin:0 0 16px 0;line-height:1.6;color:#475569">${params.intro}</p>
        <div style="padding:20px;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;margin-bottom:24px">
          <p style="margin:0 0 8px 0"><strong>Competencia:</strong> ${formatFinancialPeriodLabel(params.periodStart, params.periodEnd)}</p>
          <p style="margin:0 0 8px 0"><strong>Horas dentro da franquia:</strong> ${formatDecimalHoursToHMM(params.summary.includedHoursUsed)}</p>
          <p style="margin:0 0 8px 0"><strong>Horas extras:</strong> ${formatDecimalHoursToHMM(params.summary.extraHoursUsed)}</p>
          <p style="margin:0 0 8px 0"><strong>Visitas:</strong> ${params.summary.visitCount}</p>
          <p style="margin:0"><strong>Total:</strong> ${formatCurrency(params.summary.total)}</p>
        </div>
        <p style="margin:0 0 12px 0"><strong>${params.label}</strong>: <a href="${params.href}">${params.fileName}</a></p>
        <p style="margin:0 0 12px 0;color:#475569">Vencimento: ${params.dueDate ? params.dueDate.toLocaleDateString("pt-BR") : "Nao informado"}</p>
        ${params.notes ? `<p style="margin:0;color:#475569">${params.notes}</p>` : ""}
      </div>
    </div>
  `;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = startOfToday();
  const runtime = await getPlatformRuntimeConfig();

  const documents = await prisma.financialDocument.findMany({
    where: {
      reminderEnabled: true,
      paidAt: null,
      dueDate: {
        not: null,
      },
      financialStatement: {
        status: {
          in: [FinancialStatementStatus.OPEN, FinancialStatementStatus.BILLED, FinancialStatementStatus.OVERDUE],
        },
      },
    },
    include: {
      financialStatement: {
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          financialProfile: true,
        },
      },
    },
  });

  let remindersSent = 0;

  for (const document of documents) {
    const rules = await prisma.financialReminderRule.findMany({
      where: {
        companyId: document.financialStatement.company.id,
        enabled: true,
        OR: [{ documentType: null }, { documentType: document.documentType }],
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const matchingRule = rules.find((rule) => {
      const startDate = new Date(document.dueDate!);
      startDate.setDate(startDate.getDate() - rule.daysBeforeDue);

      if (today < startDate || today > document.dueDate!) {
        return false;
      }

      if (!document.lastReminderAt) {
        return true;
      }

      const elapsedDays = Math.floor((today.getTime() - document.lastReminderAt.getTime()) / 86400000);
      return elapsedDays >= rule.frequencyDays;
    });

    if (!matchingRule) {
      continue;
    }

    const recipients =
      matchingRule.recipientEmails.length > 0
        ? matchingRule.recipientEmails
        : (
            await prisma.companyNotificationRecipient.findMany({
              where: {
                companyId: document.financialStatement.company.id,
                type: "BILLING",
                active: true,
              },
              select: {
                email: true,
              },
            })
          ).map((recipient) => recipient.email);

    if (recipients.length === 0) {
      continue;
    }

    const href = document.storagePath.startsWith("http")
      ? document.storagePath
      : `${runtime.appUrl}${document.storagePath}`;
    const summary = buildFinancialSummary({
      includedHoursUsed: Number(document.financialStatement.includedHoursUsed),
      extraHoursUsed: Number(document.financialStatement.extraHoursUsed),
      visitCount: document.financialStatement.visitCount,
      subtotal: Number(document.financialStatement.subtotal),
      total: Number(document.financialStatement.total),
      profile: document.financialStatement.financialProfile,
    });

    await Promise.all(
      recipients.map((recipient) =>
        sendMail({
          to: recipient,
          subject:
            matchingRule.emailSubject ||
            `Lembrete de cobranca - ${document.financialStatement.company.name}`,
          html: buildEmailHtml({
            companyName: document.financialStatement.company.name,
            periodStart: document.financialStatement.referenceMonth,
            periodEnd: new Date(document.financialStatement.referenceMonth.getTime() + 30 * 86400000),
            intro:
              matchingRule.emailIntro ||
              `O documento financeiro da empresa <strong>${document.financialStatement.company.name}</strong> esta proximo do vencimento.`,
            summary,
            href,
            fileName: document.fileName,
            label: financialDocumentLabels[document.documentType],
            dueDate: document.dueDate,
            notes: document.notes,
          }),
        }),
      ),
    );

    await prisma.financialDocument.update({
      where: { id: document.id },
      data: {
        lastReminderAt: new Date(),
        reminderSentCount: {
          increment: 1,
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        companyId: document.financialStatement.company.id,
        module: "FINANCIAL",
        action: "financial_reminder_sent_automatically",
        entityType: "financial_document",
        entityId: document.id,
        description: `Lembrete automatico enviado para ${document.fileName}.`,
      },
    });

    await notifyFinancialReminder({
      companyName: document.financialStatement.company.name,
      fileName: document.fileName,
      dueDate: document.dueDate,
      documentUrl: href,
    }).catch((error) => {
      console.error("Falha ao enviar notificacao Telegram do lembrete automatico:", error);
    });

    remindersSent += 1;
  }

  return NextResponse.json({
    remindersSent,
  });
}
