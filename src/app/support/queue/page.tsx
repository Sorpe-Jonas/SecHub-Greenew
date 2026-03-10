import Link from "next/link";
import { TicketPriority, TicketStatus, UserRole } from "@prisma/client";

import { BrandHomeLink } from "@/components/layout/brand-home-link";
import { requireCurrentUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import {
  activeTicketStatuses,
  buildTicketExportQuery,
  buildTicketSearchWhereClause,
  getTicketFilters,
  ticketPriorityLabels,
  ticketStatusLabels,
} from "@/lib/tickets";

function percent(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.max(8, Math.round((value / total) * 100));
}

export default async function SupportQueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireCurrentUser();
  const params = await searchParams;
  const filters = getTicketFilters(params);
  const where = buildTicketSearchWhereClause({
    companyId: user.companyId,
    userId: user.id,
    role: user.role,
    filters: params,
  });

  const [tickets, companies] = await Promise.all([
    prisma.ticket.findMany({
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
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 500,
    }),
    user.role === UserRole.SUPER_ADMIN
      ? prisma.company.findMany({
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const exportQuery = buildTicketExportQuery(params);
  const openTickets = tickets.filter((ticket) =>
    activeTicketStatuses.some((status) => status === ticket.status),
  );
  const resolvedTickets = tickets.filter((ticket) =>
    [TicketStatus.RESOLVED, TicketStatus.CLOSED].some((status) => status === ticket.status),
  );
  const criticalTickets = tickets.filter((ticket) => ticket.priority === TicketPriority.CRITICAL);
  const statusCounts = Object.values(TicketStatus).map((status) => ({
    status,
    count: tickets.filter((ticket) => ticket.status === status).length,
  }));
  const openerCounts = Array.from(
    tickets.reduce((map, ticket) => {
      const key = ticket.openedBy.email;
      const current = map.get(key) || {
        label: ticket.openedBy.name || ticket.openedBy.email,
        count: 0,
      };
      current.count += 1;
      map.set(key, current);
      return map;
    }, new Map<string, { label: string; count: number }>()),
  )
    .map(([, value]) => value)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <main className="supportShell">
      <section className="supportHeader">
        <div>
          <BrandHomeLink />
          <span className="eyebrow">Suporte / Fila</span>
          <h1>Fila de tickets e relatorios</h1>
          <p>
            Esta pagina concentra a operacao dos chamados com foco em tickets abertos, filtros,
            exportacao e resumo visual para acompanhamento.
          </p>
        </div>
      </section>

      <section className="supportPanel">
        <div className="panelHeader">
          <div>
            <span className="eyebrow">Acoes</span>
            <h2>Consulta operacional</h2>
          </div>
          <div className="quickActionRow">
            <Link className="secondaryButton linkButton" href="/support">
              Novo ticket
            </Link>
            <Link className="secondaryButton linkButton" href={`/support/export${exportQuery ? `?${exportQuery}` : ""}`}>
              Exportar CSV
            </Link>
          </div>
        </div>

        <form className="quickActionRow" method="get">
          <select className="selectInput" name="status" defaultValue={filters.status}>
            <option value="">Abertos por padrao</option>
            {Object.values(TicketStatus).map((item) => (
              <option key={item} value={item}>
                {ticketStatusLabels[item]}
              </option>
            ))}
          </select>
          <select className="selectInput" name="priority" defaultValue={filters.priority}>
            <option value="">Todas as prioridades</option>
            {Object.values(TicketPriority).map((item) => (
              <option key={item} value={item}>
                {ticketPriorityLabels[item]}
              </option>
            ))}
          </select>
          {user.role === UserRole.SUPER_ADMIN ? (
            <select className="selectInput" name="companyId" defaultValue={filters.companyId}>
              <option value="">Todas as empresas</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          ) : null}
          {user.role === UserRole.USER ? null : (
            <input name="opener" placeholder="Quem abriu" defaultValue={filters.opener} />
          )}
          <input name="q" placeholder="Buscar no ticket" defaultValue={filters.q} />
          <input name="from" type="date" defaultValue={filters.from} />
          <input name="to" type="date" defaultValue={filters.to} />
          <button className="secondaryButton" type="submit">
            Filtrar
          </button>
          <Link className="secondaryButton linkButton" href="/support/queue">
            Limpar
          </Link>
        </form>
        <p className="helperText">
          Sem filtro de status, a tela prioriza automaticamente tickets abertos e em andamento.
        </p>
      </section>

      <section className="statsGrid">
        <article className="statCard">
          <strong>Tickets na tela</strong>
          <h2>{tickets.length}</h2>
          <span>Base atual da consulta filtrada.</span>
        </article>
        <article className="statCard">
          <strong>Abertos</strong>
          <h2>{openTickets.length}</h2>
          <span>OPEN, TRIAGE, IN_PROGRESS e WAITING_USER.</span>
        </article>
        <article className="statCard">
          <strong>Criticos</strong>
          <h2>{criticalTickets.length}</h2>
          <span>Chamados com prioridade CRITICAL.</span>
        </article>
        <article className="statCard">
          <strong>Resolvidos</strong>
          <h2>{resolvedTickets.length}</h2>
          <span>RESOLVED e CLOSED na consulta atual.</span>
        </article>
      </section>

      <section className="ticketDetailGrid">
        <section className="supportPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Resumo</span>
              <h2>Status dos tickets</h2>
            </div>
          </div>
          <div className="chartList">
            {statusCounts.map((item) => (
              <div key={item.status} className="chartRow">
                <div className="chartMeta">
                  <strong>{ticketStatusLabels[item.status]}</strong>
                  <span>{item.count} ticket(s)</span>
                </div>
                <div className="chartBarTrack">
                  <div className="chartBarFill" style={{ width: `${percent(item.count, tickets.length)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="supportPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Quem mais abriu</span>
              <h2>Ranking de solicitantes</h2>
            </div>
          </div>
          <div className="chartList">
            {openerCounts.length === 0 ? (
              <p className="helperText">Nenhum solicitante encontrado nos filtros atuais.</p>
            ) : (
              openerCounts.map((item) => (
                <div key={item.label} className="chartRow">
                  <div className="chartMeta">
                    <strong>{item.label}</strong>
                    <span>{item.count} ticket(s)</span>
                  </div>
                  <div className="chartBarTrack">
                    <div
                      className="chartBarFill chartBarAccent"
                      style={{ width: `${percent(item.count, openerCounts[0]?.count || 0)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </section>

      <section className="supportPanel">
        <div className="panelHeader">
          <div>
            <span className="eyebrow">Fila atual</span>
            <h2>Tickets filtrados</h2>
          </div>
        </div>
        <div className="ticketTable">
          {tickets.length === 0 ? (
            <p className="helperText">Nenhum ticket encontrado com esses filtros.</p>
          ) : (
            tickets.map((ticket) => (
              <Link key={ticket.id} className="ticketRow" href={`/support/${ticket.id}`}>
                <div>
                  <strong>{ticket.title}</strong>
                  <span>
                    {(ticket.openedBy.name || ticket.openedBy.email)} · {ticket.company.name} ·{" "}
                    {ticket.createdAt.toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <div>
                  <strong>{ticketStatusLabels[ticket.status]}</strong>
                  <span>
                    {ticketPriorityLabels[ticket.priority]}
                    {ticket.assignedTo ? ` · ${ticket.assignedTo.name || ticket.assignedTo.email}` : ""}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
