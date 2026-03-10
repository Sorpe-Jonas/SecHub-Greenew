import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ entryId: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { entryId } = await params;
  const [user, entry] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, companyId: true },
    }),
    prisma.passwordEntry.findUnique({
      where: { id: entryId },
      select: {
        id: true,
        companyId: true,
        title: true,
        encryptedPassword: true,
        deletedAt: true,
      },
    }),
  ]);

  if (!user || !entry || entry.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (user.role !== "SUPER_ADMIN" && user.companyId !== entry.companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.auditLog.create({
    data: {
      companyId: entry.companyId,
      userId: user.id,
      module: "PASSWORD",
      action: "password_entry_copied",
      entityType: "password_entry",
      entityId: entry.id,
      description: `Senha copiada para a credencial ${entry.title}.`,
    },
  });

  return NextResponse.json({
    password: decryptSecret(entry.encryptedPassword),
  });
}
