import { UserRole } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  buildTicketSearchWhereClause,
  ticketPriorityLabels,
  ticketStatusLabels,
} from "@/lib/tickets";

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

export async function GET(request: Request) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const where = buildTicketSearchWhereClause({
    companyId: user.companyId,
    userId: user.id,
    role: user.role,
    filters: params,
  });

  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      openedBy: {
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
      assignedTo: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: user.role === UserRole.USER ? 2000 : 5000,
  });

  const lines = [
    [
      "id",
      "empresa",
      "titulo",
      "categoria",
      "subcategoria",
      "status",
      "prioridade",
      "aberto_por",
      "responsavel",
      "origem",
      "criado_em",
      "fechado_em",
    ].join(","),
    ...tickets.map((ticket) =>
      [
        ticket.id,
        ticket.company.name,
        ticket.title,
        ticket.category,
        ticket.subcategory,
        ticketStatusLabels[ticket.status],
        ticketPriorityLabels[ticket.priority],
        ticket.openedBy.name || ticket.openedBy.email,
        ticket.assignedTo?.name || ticket.assignedTo?.email || "",
        ticket.origin,
        ticket.createdAt.toISOString(),
        ticket.closedAt?.toISOString() || "",
      ]
        .map((value) => escapeCsv(String(value)))
        .join(","),
    ),
  ];

  return new Response(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tickets-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
