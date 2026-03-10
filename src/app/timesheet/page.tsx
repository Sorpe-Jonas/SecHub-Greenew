import Link from "next/link";
import { RunningTimerStatus, UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { RunningTimerCard } from "@/components/timesheet/running-timer-card";
import { TimeEntryForm } from "@/components/timesheet/time-entry-form";
import { requireCurrentUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

function toHours(minutes: number) {
  return (minutes / 60).toFixed(2);
}

export default async function TimesheetPage() {
  const user = await requireCurrentUser();

  if (user.role !== UserRole.SUPER_ADMIN) {
    redirect("/dashboard");
  }

  const [runningTimer, entries, tickets] = await Promise.all([
    prisma.runningTimer.findFirst({
      where: {
        userId: user.id,
        status: RunningTimerStatus.RUNNING,
      },
      orderBy: {
        startedAt: "desc",
      },
      select: {
        id: true,
        startedAt: true,
        ticketId: true,
      },
    }),
    prisma.timeEntry.findMany({
      where: {
        userId: user.id,
      },
      include: {
        ticket: true,
      },
      orderBy: {
        startedAt: "desc",
      },
      take: 20,
    }),
    prisma.ticket.findMany({
      where: user.companyId ? { companyId: user.companyId } : undefined,
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
      select: {
        id: true,
        title: true,
      },
    }),
  ]);

  const totalMinutes = entries.reduce((sum, entry) => sum + entry.durationMinutes, 0);
  const ticketOptions = tickets.map((ticket) => ({
    id: ticket.id,
    title: ticket.title,
  }));

  return (
    <main className="supportShell">
      <section className="supportHeader">
        <div>
          <span className="eyebrow">TimeSheet</span>
          <h1>Horas, atendimento e visitas</h1>
          <p>
            Aqui voce controla o timer de atendimento, registra horas manualmente e consolida a base
            para cobranca futura do modulo financeiro.
          </p>
        </div>
      </section>

      <section className="statsGrid">
        <article className="statCard">
          <strong>Total recente</strong>
          <h2>{toHours(totalMinutes)}h</h2>
          <span>Somatorio dos ultimos 20 lancamentos</span>
        </article>
        <article className="statCard">
          <strong>Timer atual</strong>
          <h2>{runningTimer ? "Ativo" : "Parado"}</h2>
          <span>{runningTimer ? "Existe um atendimento em andamento agora." : "Nenhum atendimento rodando neste momento."}</span>
        </article>
        <article className="statCard">
          <strong>Base PWA</strong>
          <h2>Pronta</h2>
          <span>Notificacao web do timer habilitada no cliente ao iniciar atendimento.</span>
        </article>
      </section>

      <section className="ticketDetailGrid">
        <RunningTimerCard
          runningTimer={
            runningTimer
              ? {
                  id: runningTimer.id,
                  startedAt: runningTimer.startedAt.toISOString(),
                  ticketId: runningTimer.ticketId,
                }
              : null
          }
          ticketOptions={ticketOptions}
        />
        <section className="supportPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Lancamento manual</span>
              <h2>Adicionar horas</h2>
            </div>
          </div>
          <TimeEntryForm mode="create" ticketOptions={ticketOptions} />
        </section>
      </section>

      <section className="supportPanel">
        <div className="panelHeader">
          <div>
            <span className="eyebrow">Historico</span>
            <h2>Ultimos lancamentos</h2>
          </div>
        </div>
        <div className="ticketTable">
          {entries.length === 0 ? (
            <p className="helperText">Nenhum lancamento registrado ainda.</p>
          ) : (
            entries.map((entry) => (
              <Link key={entry.id} className="ticketRow" href={`/timesheet/${entry.id}`}>
                <div>
                  <strong>{entry.description || "Atendimento sem descricao"}</strong>
                  <span>
                    {entry.ticket?.title || "Sem ticket"} · {entry.startedAt.toLocaleString("pt-BR")}
                  </span>
                </div>
                <div>
                  <strong>{toHours(entry.durationMinutes)}h</strong>
                  <span>{entry.isManualEdit ? "Editavel" : "Gerado por timer"}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
