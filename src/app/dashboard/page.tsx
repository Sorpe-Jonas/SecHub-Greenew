import Link from "next/link";
import { redirect } from "next/navigation";
import { TicketStatus, TimeEntryType, UserRole } from "@prisma/client";

import { AppShell } from "@/components/layout/app-shell";
import { requireCurrentUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h${remainingMinutes.toString().padStart(2, "0")}min`;
}

function formatCurrency(value: number | string | { toNumber: () => number }) {
  const numeric = typeof value === "object" && value !== null ? value.toNumber() : Number(value);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numeric);
}

const statusLabels: Record<TicketStatus, string> = {
  OPEN: "Abertos",
  TRIAGE: "Triagem",
  IN_PROGRESS: "Em andamento",
  WAITING_USER: "Aguardando",
  RESOLVED: "Resolvidos",
  CLOSED: "Fechados",
  CANCELED: "Cancelados",
};

const statusColors: Record<TicketStatus, string> = {
  OPEN: "var(--cyan)",
  TRIAGE: "var(--amber)",
  IN_PROGRESS: "var(--mint)",
  WAITING_USER: "#a78bfa",
  RESOLVED: "#34d399",
  CLOSED: "#94a3b8",
  CANCELED: "#f87171",
};

export default async function DashboardPage() {
  const user = await requireCurrentUser();

  if (user.role === UserRole.USER) {
    redirect("/support");
  }

  const companyId = user.companyId ?? undefined;

  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [ticketCounts, recentTickets, monthlyHours, visitCount, financialTotal, userCount, openTickets] =
    await Promise.all([
      prisma.ticket.groupBy({
        by: ["status"],
        where: companyId ? { companyId } : undefined,
        _count: { _all: true },
      }),
      prisma.ticket.findMany({
        where: companyId ? { companyId } : undefined,
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, title: true, status: true, priority: true, updatedAt: true },
      }),
      prisma.timeEntry.groupBy({
        by: ["entryType"],
        where: {
          ...(companyId ? { companyId } : {}),
          startedAt: { gte: sixMonthsAgo },
        },
        _sum: { durationMinutes: true },
      }),
      prisma.visitEntry.count({
        where: companyId ? { companyId } : undefined,
      }),
      prisma.financialStatement.aggregate({
        where: companyId ? { companyId } : undefined,
        _sum: { total: true },
      }),
      prisma.user.count({
        where: companyId ? { companyId } : undefined,
      }),
      prisma.ticket.count({
        where: {
          ...(companyId ? { companyId } : {}),
          status: { in: [TicketStatus.OPEN, TicketStatus.TRIAGE, TicketStatus.IN_PROGRESS, TicketStatus.WAITING_USER] },
        },
      }),
    ]);

  const totalTickets = ticketCounts.reduce((sum, item) => sum + item._count._all, 0);
  const maxTicketCount = Math.max(...ticketCounts.map((item) => item._count._all), 1);

  const totalMinutes = monthlyHours.reduce((sum, item) => sum + (item._sum.durationMinutes ?? 0), 0);
  const maxMinutes = Math.max(...monthlyHours.map((item) => item._sum.durationMinutes ?? 0), 1);

  const typeLabels: Record<TimeEntryType, string> = {
    SUPPORT: "Suporte",
    INTERNAL: "Interno",
    ON_SITE: "Visita",
    OTHER: "Outros",
  };

  const typeColors: Record<TimeEntryType, string> = {
    SUPPORT: "var(--cyan)",
    INTERNAL: "var(--amber)",
    ON_SITE: "var(--mint)",
    OTHER: "#a78bfa",
  };

  const isBillingView = true;

  return (
    <AppShell
      role={user.role}
      permissions={user.blockPermissions}
      userName={user.name}
      userEmail={user.email}
      companyName={user.company?.name}
    >
      <div className="dashboardPage">
        <header className="appPageHeader">
          <div>
            <span className="eyebrow">Painel de controle</span>
            <h1>Bem-vindo, {user.name || user.email}.</h1>
            <p>
              Visao geral dos chamados, horas utilizadas e indicadores da operacao
              {user.company ? ` de ${user.company.name}` : ""}.
            </p>
          </div>
        </header>

        <section className="statsGrid">
          <article className="statCard">
            <strong>Chamados abertos</strong>
            <h2>{openTickets}</h2>
            <span>Total em andamento agora</span>
          </article>
          <article className="statCard">
            <strong>Total de chamados</strong>
            <h2>{totalTickets}</h2>
            <span>Historico completo</span>
          </article>
          <article className="statCard">
            <strong>Horas registradas</strong>
            <h2>{formatDuration(totalMinutes)}</h2>
            <span>Ultimos 6 meses</span>
          </article>
          <article className="statCard">
            <strong>Visitas</strong>
            <h2>{visitCount}</h2>
            <span>Atendimentos presenciais</span>
          </article>
          {isBillingView ? (
            <article className="statCard">
              <strong>Faturamento</strong>
              <h2>{formatCurrency(financialTotal._sum.total ?? 0)}</h2>
              <span>Total dos demonstrativos</span>
            </article>
          ) : null}
          <article className="statCard">
            <strong>Usuarios</strong>
            <h2>{userCount}</h2>
            <span>Na plataforma</span>
          </article>
        </section>

        <section className="chartGrid">
          <article className="chartPanel">
            <div className="panelHeader">
              <div>
                <span className="eyebrow">Chamados</span>
                <h2>Por status</h2>
              </div>
            </div>
            <div className="chartList">
              {ticketCounts.length === 0 ? (
                <p className="helperText">Nenhum chamado registrado ainda.</p>
              ) : (
                ticketCounts.map((item) => {
                  const label = statusLabels[item.status] || item.status;
                  const value = item._count._all;
                  const pct = Math.round((value / maxTicketCount) * 100);
                  return (
                    <div className="chartRow" key={item.status}>
                      <div className="chartMeta">
                        <strong>{label}</strong>
                        <span>{value}</span>
                      </div>
                      <div className="chartBarTrack">
                        <div
                          className="chartBarFill"
                          style={{ width: `${pct}%`, background: statusColors[item.status] }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </article>

          <article className="chartPanel">
            <div className="panelHeader">
              <div>
                <span className="eyebrow">Horas</span>
                <h2>Por tipo de atendimento</h2>
              </div>
            </div>
            <div className="chartList">
              {monthlyHours.length === 0 ? (
                <p className="helperText">Nenhum registro de horas nos ultimos 6 meses.</p>
              ) : (
                monthlyHours.map((item) => {
                  const label = typeLabels[item.entryType] || item.entryType;
                  const value = item._sum.durationMinutes ?? 0;
                  const pct = Math.round((value / maxMinutes) * 100);
                  return (
                    <div className="chartRow" key={item.entryType}>
                      <div className="chartMeta">
                        <strong>{label}</strong>
                        <span>{formatDuration(value)}</span>
                      </div>
                      <div className="chartBarTrack">
                        <div
                          className="chartBarFill"
                          style={{ width: `${pct}%`, background: typeColors[item.entryType] }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </article>
        </section>

        <section className="chartPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Atividade recente</span>
              <h2>Ultimos chamados</h2>
            </div>
            <Link className="secondaryButton linkButton" href="/support">
              Ir para suporte
            </Link>
          </div>
          <div className="ticketTable">
            {recentTickets.length === 0 ? (
              <p className="helperText">Nenhum chamado recente.</p>
            ) : (
              recentTickets.map((ticket) => (
                <Link key={ticket.id} className="ticketRow" href={`/support/${ticket.id}`}>
                  <div>
                    <strong>{ticket.title}</strong>
                    <span>
                      {statusLabels[ticket.status]} · {ticket.priority} ·{" "}
                      {ticket.updatedAt.toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <div>
                    <strong>{statusLabels[ticket.status]}</strong>
                    <span>{ticket.priority}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}