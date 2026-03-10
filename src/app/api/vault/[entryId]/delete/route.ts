import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ entryId: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const { entryId } = await params;
  const [user, entry] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, companyId: true },
    }),
    prisma.passwordEntry.findUnique({
      where: { id: entryId },
      select: { id: true, title: true, companyId: true, deletedAt: true },
    }),
  ]);

  if (!user || !entry || entry.deletedAt) {
    return NextResponse.redirect(new URL("/vault", request.url));
  }

  if (user.role !== "SUPER_ADMIN" && user.companyId !== entry.companyId) {
    return NextResponse.redirect(new URL("/vault", request.url));
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
        module: "PASSWORD",
        action: "password_entry_deleted",
        entityType: "password_entry",
        entityId: entry.id,
        description: `Credencial removida: ${entry.title}`,
      },
    }),
  ]);

  return NextResponse.redirect(new URL("/vault", request.url));
}
