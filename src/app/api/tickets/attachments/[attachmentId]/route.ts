import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { attachmentId } = await params;
  const [user, attachment] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, companyId: true },
    }),
    prisma.ticketAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        ticket: {
          select: {
            id: true,
            companyId: true,
            openedById: true,
          },
        },
      },
    }),
  ]);

  if (!user || !attachment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canDelete =
    user.role === "SUPER_ADMIN" ||
    (user.role === "ADMIN" && user.companyId === attachment.ticket.companyId) ||
    user.id === attachment.uploadedById;

  if (!canDelete) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.ticketAttachment.delete({
      where: { id: attachment.id },
    }),
    prisma.auditLog.create({
      data: {
        companyId: attachment.ticket.companyId,
        userId: user.id,
        module: "TICKET",
        action: "ticket_attachment_deleted",
        entityType: "ticket",
        entityId: attachment.ticket.id,
        description: `Anexo removido: ${attachment.fileName}`,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
