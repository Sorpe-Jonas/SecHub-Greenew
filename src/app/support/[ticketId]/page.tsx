import { notFound, redirect } from "next/navigation";

import { TicketReplyForm } from "@/components/support/ticket-reply-form";
import { canManageCompanyTickets, requireCurrentUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { ticketCategoryLabels, ticketPriorityLabels, ticketStatusLabels } from "@/lib/tickets";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const user = await requireCurrentUser();
  const { ticketId } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      openedBy: true,
      assignedTo: true,
      messages: {
        include: {
          author: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!ticket) {
    notFound();
  }

  const canView =
    user.role === "SUPER_ADMIN" ||
    (canManageCompanyTickets(user.role) && user.companyId === ticket.companyId) ||
    ticket.openedById === user.id;

  if (!canView) {
    redirect("/support");
  }

  return (
    <main className="supportShell">
      <section className="supportHeader">
        <div>
          <span className="eyebrow">Ticket #{ticket.id.slice(-6).toUpperCase()}</span>
          <h1>{ticket.title}</h1>
          <p>
            {ticketCategoryLabels[ticket.category]} / {ticket.subcategory} ·{" "}
            {ticketPriorityLabels[ticket.priority]} · {ticketStatusLabels[ticket.status]}
          </p>
        </div>
      </section>

      <section className="ticketDetailGrid">
        <article className="supportPanel">
          <h2>Resumo</h2>
          <div className="detailList">
            <div>
              <strong>Solicitante</strong>
              <span>{ticket.openedBy.name || ticket.openedBy.email}</span>
            </div>
            <div>
              <strong>Email</strong>
              <span>{ticket.openedBy.email}</span>
            </div>
            <div>
              <strong>Status</strong>
              <span>{ticketStatusLabels[ticket.status]}</span>
            </div>
            <div>
              <strong>Prioridade</strong>
              <span>{ticketPriorityLabels[ticket.priority]}</span>
            </div>
            <div>
              <strong>Criado em</strong>
              <span>{ticket.createdAt.toLocaleString("pt-BR")}</span>
            </div>
            <div>
              <strong>Responsavel</strong>
              <span>{ticket.assignedTo?.name || ticket.assignedTo?.email || "Nao atribuido"}</span>
            </div>
          </div>
        </article>

        <article className="supportPanel">
          <h2>Conversas</h2>
          <div className="messageList">
            {ticket.messages.map((message) => (
              <div key={message.id} className="messageItem">
                <div className="messageMeta">
                  <strong>{message.author.name || message.author.email}</strong>
                  <span>{message.createdAt.toLocaleString("pt-BR")}</span>
                </div>
                <p>{message.message}</p>
              </div>
            ))}
          </div>
          <TicketReplyForm ticketId={ticket.id} />
        </article>
      </section>
    </main>
  );
}
