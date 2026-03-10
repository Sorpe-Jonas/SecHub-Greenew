import { FinancialStatementStatus, NotificationRecipientType } from "@prisma/client";
import { NextResponse } from "next/server";

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

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = startOfToday();
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const runtime = await getPlatformRuntimeConfig();

  const documents = await prisma.financialDocument.findMany({
    where: {
      reminderEnabled: true,
      paidAt: null,
      dueDate: {
        gte: today,
        lt: sevenDaysFromNow,
      },
      OR: [
        { lastReminderAt: null },
        { lastReminderAt: { lt: today } },
      ],
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
        },
      },
    },
  });

  let remindersSent = 0;

  for (const document of documents) {
    const recipients = await prisma.companyNotificationRecipient.findMany({
      where: {
        companyId: document.financialStatement.company.id,
        type: NotificationRecipientType.BILLING,
        active: true,
      },
      select: {
        email: true,
      },
    });

    if (recipients.length === 0) {
      continue;
    }

    const href = document.storagePath.startsWith("http")
      ? document.storagePath
      : `${runtime.appUrl}${document.storagePath}`;

    await Promise.all(
      recipients.map((recipient) =>
        sendMail({
          to: recipient.email,
          subject: `Lembrete de cobranca - ${document.financialStatement.company.name}`,
          html: `
            <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f7fb;padding:24px;color:#102033">
              <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px;border:1px solid #dbe7f3">
                <p style="margin:0 0 8px 0;color:#0e7490;font-size:12px;letter-spacing:0.08em;text-transform:uppercase">SecHub</p>
                <h1 style="margin:0 0 16px 0;font-size:28px;line-height:1.05">Lembrete de pagamento</h1>
                <p style="margin:0 0 16px 0;line-height:1.6;color:#475569">
                  O documento <strong>${document.fileName}</strong> vence em
                  <strong> ${document.dueDate?.toLocaleDateString("pt-BR")}</strong>.
                </p>
                <p style="margin:0 0 16px 0"><a href="${href}">${href}</a></p>
              </div>
            </div>
          `,
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
