import Link from "next/link";
import { TicketPriority, TicketStatus } from "@prisma/client";

import { BrandHomeLink } from "@/components/layout/brand-home-link";
import { TicketCreateForm } from "@/components/support/ticket-create-form";
import { canManageCompanyTickets, requireCurrentUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import {
  buildTicketWhereClause,
  getTicketCatalogItem,
  ticketCatalog,
  ticketPriorityLabels,
  ticketStatusLabels,
} from "@/lib/tickets";

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireCurrentUser();
  const params = await searchParams;
  const category = typeof params.category === "string" ? params.category : undefined;
  const subcategory = typeof params.subcategory === "string" ? params.subcategory : undefined;
  const status = typeof params.status === "string" ? params.status : "";
  const priority = typeof params.priority === "string" ? params.priority : "";
  const selectedCategory = getTicketCatalogItem(category);

  const tickets = await prisma.ticket.findMany({
    where: {
      ...buildTicketWhereClause({
        companyId: user.companyId,
        userId: user.id,
        role: user.role,
      }),
      ...(status ? { status: status as TicketStatus } : {}),
      ...(priority ? { priority: priority as TicketPriority } : {}),
    },
    include: {
      openedBy: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
  });

  return (
    <main className="supportShell">
      <section className="supportHeader">
        <div>
          <BrandHomeLink />
          <span className="eyebrow">Suporte</span>
          <h1>Chamados e atendimento</h1>
          <p>
            {canManageCompanyTickets(user.role)
              ? "Voce visualiza os chamados da empresa e pode responder conforme o perfil."
              : "Voce visualiza apenas os seus tickets e pode acompanhar a conversa por aqui."}
          </p>
        </div>
      </section>

      {!selectedCategory ? (
        <section className="cardGrid">
          {ticketCatalog.map((item) => (
            <Link
              key={item.category}
              className="portalCard cyan"
              href={`/support?category=${item.category}`}
            >
              <span className="cardLabel">Novo ticket</span>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
              <strong>Escolher categoria</strong>
            </Link>
          ))}
        </section>
      ) : !subcategory ? (
        <section className="supportPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">{selectedCategory.title}</span>
              <h2>Escolha o tipo do chamado</h2>
            </div>
            <Link className="secondaryButton linkButton" href="/support">
              Voltar
            </Link>
          </div>
          <div className="subcardGrid">
            {selectedCategory.subcategories.map((item) => (
              <Link
                key={item}
                className="subcardLink"
                href={`/support?category=${selectedCategory.category}&subcategory=${encodeURIComponent(item)}`}
              >
                <strong>{item}</strong>
                <span>Preencher formulario com essa trilha</span>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="supportPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">
                {selectedCategory.title} / {subcategory}
              </span>
              <h2>Abrir novo ticket</h2>
            </div>
            <Link className="secondaryButton linkButton" href={`/support?category=${selectedCategory.category}`}>
              Voltar
            </Link>
          </div>
          <TicketCreateForm category={selectedCategory.category} subcategory={subcategory} />
        </section>
      )}

      <section className="supportPanel">
        <div className="panelHeader">
          <div>
            <span className="eyebrow">Fila atual</span>
            <h2>Ultimos tickets</h2>
          </div>
          <form className="quickActionRow" method="get">
            <select className="selectInput" name="status" defaultValue={status}>
              <option value="">Todos os status</option>
              {Object.values(TicketStatus).map((item) => (
                <option key={item} value={item}>
                  {ticketStatusLabels[item]}
                </option>
              ))}
            </select>
            <select className="selectInput" name="priority" defaultValue={priority}>
              <option value="">Todas as prioridades</option>
              {Object.values(TicketPriority).map((item) => (
                <option key={item} value={item}>
                  {ticketPriorityLabels[item]}
                </option>
              ))}
            </select>
            <button className="secondaryButton" type="submit">
              Filtrar
            </button>
          </form>
        </div>
        <div className="ticketTable">
          {tickets.length === 0 ? (
            <p className="helperText">Nenhum ticket encontrado para este usuario.</p>
          ) : (
            tickets.map((ticket) => (
              <Link key={ticket.id} className="ticketRow" href={`/support/${ticket.id}`}>
                <div>
                  <strong>{ticket.title}</strong>
                  <span>
                    {ticket.openedBy.name || ticket.openedBy.email} · {ticket.createdAt.toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <div>
                  <strong>{ticketStatusLabels[ticket.status]}</strong>
                  <span>{ticketPriorityLabels[ticket.priority]}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
