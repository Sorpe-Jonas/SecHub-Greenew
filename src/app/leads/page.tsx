import { LeadStatus, UserRole } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { GoogleConnectPanel } from "@/components/leads/google-connect-panel";
import { LeadMeetingForm } from "@/components/leads/lead-meeting-form";
import { LeadStatusForm } from "@/components/leads/lead-status-form";
import { requireCurrentUser } from "@/lib/authz";
import { leadStatusLabels, leadStatusOrder } from "@/lib/leads";
import { prisma } from "@/lib/prisma";
import { getPlatformRuntimeConfig } from "@/lib/runtime-settings";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; google?: string }>;
}) {
  const currentUser = await requireCurrentUser();

  if (currentUser.role !== UserRole.SUPER_ADMIN) {
    redirect("/dashboard");
  }

  const { status: statusParam, google: googleResult } = await searchParams;
  const activeStatus = Object.values(LeadStatus).find((item) => item === statusParam);

  const [leads, connection, runtime] = await Promise.all([
    prisma.lead.findMany({
      where: activeStatus ? { status: activeStatus } : undefined,
      orderBy: { createdAt: "desc" },
    }),
    prisma.googleCalendarConnection.findUnique({ where: { userId: currentUser.id } }),
    getPlatformRuntimeConfig(),
  ]);

  const googleConfigured = Boolean(runtime.google.clientId && runtime.google.clientSecret);

  return (
    <AppShell
      role={currentUser.role}
      permissions={currentUser.blockPermissions}
      userName={currentUser.name}
      userEmail={currentUser.email}
      companyName={currentUser.company?.name}
    >
      <section className="appPageHeader">
        <div>
          <span className="eyebrow">Leads</span>
          <h1>Capturas e funil de clientes</h1>
          <p>
            Acompanhe os contatos recebidos pelo site, atualize o estado do cliente e agende
            reunioes com convite por e-mail.
          </p>
        </div>
      </section>

      <section className="supportPanel">
        <div className="panelHeader">
          <div>
            <span className="eyebrow">Google Calendar</span>
            <h2>Agendamento de reunioes</h2>
          </div>
        </div>
        <GoogleConnectPanel
          configured={googleConfigured}
          result={googleResult ?? null}
          connection={
            connection
              ? { googleEmail: connection.googleEmail, calendarId: connection.calendarId }
              : null
          }
        />
      </section>

      <section className="supportPanel">
        <div className="panelHeader">
          <div>
            <span className="eyebrow">Funil</span>
            <h2>Leads recebidos</h2>
          </div>
          <div className="quickActionRow">
            <Link className="secondaryButton" href="/leads">
              Todos
            </Link>
            {leadStatusOrder.map((status) => (
              <Link key={status} className="secondaryButton" href={`/leads?status=${status}`}>
                {leadStatusLabels[status]}
              </Link>
            ))}
          </div>
        </div>

        <div className="ticketTable">
          {leads.length === 0 ? (
            <p className="helperText">Nenhum lead recebido no momento.</p>
          ) : (
            leads.map((lead) => (
              <div key={lead.id} className="statementCard">
                <div className="ticketRow">
                  <div>
                    <strong>{lead.name}</strong>
                    <span>{lead.companyName}</span>
                    <span>
                      <a href={`mailto:${lead.email}`}>{lead.email}</a> ·{" "}
                      <a href={`tel:${lead.phone}`}>{lead.phone}</a>
                    </span>
                  </div>
                  <div>
                    <strong>{leadStatusLabels[lead.status]}</strong>
                    <span>{lead.createdAt.toLocaleString("pt-BR")}</span>
                  </div>
                </div>

                <p className="helperText">{lead.description}</p>
                {lead.meetingAt ? (
                  <p className="helperText">
                    Reuniao agendada para {lead.meetingAt.toLocaleString("pt-BR")}.
                  </p>
                ) : null}

                <div className="ticketDetailGrid">
                  <LeadStatusForm leadId={lead.id} status={lead.status} />
                  <LeadMeetingForm leadId={lead.id} meetingHtmlLink={lead.meetingHtmlLink} />
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </AppShell>
  );
}
