import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ recipientId: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { recipientId } = await params;
  const [user, recipient] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, companyId: true },
    }),
    prisma.companyNotificationRecipient.findUnique({
      where: { id: recipientId },
    }),
  ]);

  if (!user || !recipient) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (user.role !== "SUPER_ADMIN" || user.companyId !== recipient.companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.companyNotificationRecipient.update({
      where: { id: recipient.id },
      data: { active: false },
    }),
    prisma.auditLog.create({
      data: {
        companyId: recipient.companyId,
        userId: user.id,
        module: "FINANCIAL",
        action: "financial_recipient_disabled",
        entityType: "notification_recipient",
        entityId: recipient.id,
        description: `Destinatario financeiro removido: ${recipient.email}`,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
