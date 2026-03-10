import { UserRole } from "@prisma/client";

import { auth } from "@/auth";
import { buildAuditWhereClause } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

export async function GET(request: Request) {
  const session = await auth();
  const user = session?.user;

  if (!user || user.role === UserRole.USER) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());

  const logs = await prisma.auditLog.findMany({
    where: buildAuditWhereClause({
      companyId: user.companyId,
      role: user.role,
      params,
    }),
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      company: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5000,
  });

  const lines = [
    [
      "createdAt",
      "module",
      "action",
      "entityType",
      "entityId",
      "user",
      "company",
      "description",
      "ipAddress",
      "userAgent",
    ].join(","),
    ...logs.map((log) =>
      [
        log.createdAt.toISOString(),
        log.module,
        log.action,
        log.entityType,
        log.entityId || "",
        log.user?.name || log.user?.email || "Sistema",
        log.company?.name || "Global",
        log.description || "",
        log.ipAddress || "",
        log.userAgent || "",
      ]
        .map((value) => escapeCsv(String(value)))
        .join(","),
    ),
  ];

  return new Response(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
