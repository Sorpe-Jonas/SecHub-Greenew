import Link from "next/link";
import { FinancialStatementStatus, TimeEntryType, UserRole } from "@prisma/client";

import {
  sendFinancialReminderAction,
} from "@/app/actions/financial-actions";
import { BrandHomeLink } from "@/components/layout/brand-home-link";
import { FinancialGenerateForm } from "@/components/financial/financial-generate-form";
import { FinancialProfileForm } from "@/components/financial/financial-profile-form";
import { FinancialRecipientList } from "@/components/financial/financial-recipient-list";
import { FinancialRecipientForm } from "@/components/financial/financial-recipient-form";
import { FinancialStatementStatusForm } from "@/components/financial/financial-statement-status-form";
import { requireCurrentUser } from "@/lib/authz";
import {
  buildFinancialSummary,
  calculateExtraCharge,
  financialDocumentLabels,
  formatFinancialPeriodLabel,
  formatCurrency,
  getFinancialCycleBounds,
} from "@/lib/financial";
import { prisma } from "@/lib/prisma";
import { isMissingSchemaError } from "@/lib/prisma-errors";

function toDateValue(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export default async function FinancialPage() {
  const user = await requireCurrentUser();

  if (!user.companyId) {
    return null;
  }

  let profile;
  let statements;
  let recipients;

  try {
    [profile, statements, recipients] = await Promise.all([
      prisma.financialProfile.findUnique({
        where: { companyId: user.companyId },
        select: {
          id: true,
          includedHours: true,
          hourlyRate: true,
          extraHourlyRate: true,
          extraHalfHourRate: true,
          visitRate: true,
          billingDay: true,
          contractStartDate: true,
        },
      }),
      prisma.financialStatement.findMany({
        where: {
          companyId: user.companyId,
        },
        include: {
          documents: true,
        },
        orderBy: {
          referenceMonth: "desc",
        },
        take: 12,
      }),
      prisma.companyNotificationRecipient.findMany({
        where: {
          companyId: user.companyId,
          type: "BILLING",
          active: true,
        },
        orderBy: {
          email: "asc",
        },
      }),
    ]);
  } catch (error) {
    if (isMissingSchemaError(error)) {
      console.error("Financial page schema is out of date.", error);

      return (
        <main className="supportShell">
          <section className="supportHeader">
            <div>
              <BrandHomeLink />
              <span className="eyebrow">Financeiro</span>
              <h1>Modulo financeiro em atualizacao</h1>
              <p>
                O banco de dados de producao ainda nao recebeu todas as tabelas ou colunas desta area.
              </p>
            </div>
          </section>

          <section className="supportPanel">
            <div className="panelHeader">
              <div>
                <span className="eyebrow">Acao necessaria</span>
                <h2>Sincronizar o schema do Prisma</h2>
              </div>
            </div>
            <p className="helperText">
              Rode o deploy do schema antes de abrir o Financeiro novamente. O app foi mantido no ar para
              evitar erro 500 enquanto essa sincronizacao pendente nao for aplicada.
            </p>
          </section>
        </main>
      );
    }

    throw error;
  }

  const referenceDate = toDateValue();
  const { start, end } = getFinancialCycleBounds({
    anchorDate: new Date(referenceDate),
    billingDay: profile?.billingDay,
    contractStartDate: profile?.contractStartDate ?? null,
    clampEndToAnchorDate: true,
  });

  let monthEntries: Array<{ durationMinutes: number }> = [];
  let monthVisits: Array<{ amount: unknown }> = [];
  let legacyOnSiteEntries: Array<{ id: string }> = [];

  try {
    [monthEntries, monthVisits, legacyOnSiteEntries] = await Promise.all([
      prisma.timeEntry.findMany({
        where: {
          companyId: user.companyId,
          startedAt: {
            gte: start,
            lt: end,
          },
        },
        select: {
          durationMinutes: true,
        },
      }),
      prisma.visitEntry.findMany({
        where: {
          companyId: user.companyId,
          visitDate: {
            gte: start,
            lt: end,
          },
        },
        select: {
          amount: true,
        },
      }),
      prisma.timeEntry.findMany({
        where: {
          companyId: user.companyId,
          entryType: TimeEntryType.ON_SITE,
          startedAt: {
            gte: start,
            lt: end,
          },
          visitEntry: {
            is: null,
          },
        },
        select: {
          id: true,
        },
      }),
    ]);
  } catch (error) {
    if (isMissingSchemaError(error)) {
      console.error("Financial page metrics are unavailable because the schema is out of date.", error);
      monthEntries = [];
      monthVisits = [];
      legacyOnSiteEntries = [];
    } else {
      throw error;
    }
  }

  const currentHours = monthEntries.reduce((sum, entry) => sum + entry.durationMinutes / 60, 0);
  const currentVisits = monthVisits.length + legacyOnSiteEntries.length;
  const cycleLabel = formatFinancialPeriodLabel(start, end);
  const canEdit = user.role === UserRole.SUPER_ADMIN;
  const isClientView = user.role === UserRole.USER;
  const baseFee = Number(profile?.hourlyRate || 0);
  const includedHours = Number(profile?.includedHours || 0);
  const extraRate = Number(profile?.extraHourlyRate || 0);
  const visitRate = Number(profile?.visitRate || 0);
  const extraHours = Math.max(currentHours - includedHours, 0);
  const projectedTotal =
    baseFee +
    calculateExtraCharge(extraHours, {
      extraHourlyRate: profile?.extraHourlyRate || extraRate,
      extraHalfHourRate: profile?.extraHalfHourRate ?? null,
    }).total +
    currentVisits * visitRate;

  return (
    <main className="supportShell">
      <section className="supportHeader">
        <div>
          <BrandHomeLink />
          <span className="eyebrow">Financeiro</span>
          <h1>{isClientView ? "Documentos financeiros" : "Resumo financeiro da empresa"}</h1>
          <p>
            {isClientView
              ? "Aqui voce acompanha os documentos liberados para sua empresa e os respectivos vencimentos."
              : "Este modulo consolida horas, visitas e documentos para o ciclo de cobranca. O perfil abaixo controla franquia, excedente e valor de visita."}
          </p>
          {isClientView ? null : <p>Periodo atual: {cycleLabel}</p>}
        </div>
      </section>

      {isClientView ? null : (
      <section className="statsGrid">
        <article className="statCard">
          <strong>Horas no periodo</strong>
          <h2>{currentHours.toFixed(2)}h</h2>
          <span>Base dos lancamentos do TimeSheet no ciclo atual.</span>
        </article>
        <article className="statCard">
          <strong>Visitas no periodo</strong>
          <h2>{currentVisits}</h2>
          <span>Quantidade de visitas presenciais registradas no ciclo atual.</span>
        </article>
        <article className="statCard">
          <strong>Projecao atual</strong>
          <h2>{formatCurrency(projectedTotal)}</h2>
          <span>Valor estimado usando o perfil financeiro vigente.</span>
        </article>
      </section>
      )}

      {isClientView ? null : (
      <section className="ticketDetailGrid">
        <section className="supportPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Perfil financeiro</span>
              <h2>Parametros da empresa</h2>
            </div>
          </div>
          <FinancialProfileForm
            canEdit={canEdit}
            profile={
              profile
                ? {
                    includedHours: profile.includedHours.toString(),
                    hourlyRate: profile.hourlyRate.toString(),
                    extraHourlyRate: profile.extraHourlyRate.toString(),
                    extraHalfHourRate: profile.extraHalfHourRate?.toString() || "",
                    visitRate: profile.visitRate.toString(),
                    billingDay: profile.billingDay,
                    contractStartDate: profile.contractStartDate
                      ? profile.contractStartDate.toISOString().slice(0, 10)
                      : "",
                  }
                : null
            }
          />
        </section>

        <section className="supportPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Fechamento</span>
              <h2>Gerar resumo do periodo</h2>
            </div>
          </div>
          <FinancialGenerateForm
            referenceDate={referenceDate}
            canEdit={canEdit}
            includedHours={includedHours}
            extraHours={extraHours}
            currentVisits={currentVisits}
            cycleLabel={cycleLabel}
          />
        </section>
      </section>
      )}

      {isClientView ? null : (
      <section className="ticketDetailGrid">
        <section className="supportPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Cobranca</span>
              <h2>Destinatarios financeiros</h2>
            </div>
          </div>
          <FinancialRecipientList recipients={recipients.map((item) => ({ id: item.id, email: item.email }))} />
        </section>
        <section className="supportPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Novo destinatario</span>
              <h2>Email de cobranca</h2>
            </div>
          </div>
          {canEdit ? <FinancialRecipientForm /> : <p className="helperText">Somente o Admin Total pode editar.</p>}
        </section>
      </section>
      )}

      <section className="supportPanel">
        <div className="panelHeader">
          <div>
            <span className="eyebrow">Historico</span>
            <h2>Ultimos fechamentos</h2>
          </div>
          {isClientView ? null : (
            <div className="quickActionRow">
              <Link className="secondaryButton linkButton" href="/financial/documents">
                Documentos
              </Link>
              <Link className="secondaryButton linkButton" href="/financial/rules">
                Regras de cobranca
              </Link>
            </div>
          )}
        </div>
        <div className="ticketTable">
          {statements.length === 0 ? (
            <p className="helperText">Nenhum fechamento financeiro gerado ainda.</p>
          ) : (
            statements.map((statement) => (
              <div key={statement.id} className="statementCard">
                <div className="ticketRow">
                  <div>
                    <strong>
                      {formatFinancialPeriodLabel(
                        statement.referenceMonth,
                        new Date(statement.referenceMonth.getTime() + 30 * 86400000),
                      )}
                    </strong>
                    <span>
                      {statement.status === FinancialStatementStatus.OPEN ? "Aberto" : statement.status}
                    </span>
                  </div>
                  <div>
                    <strong>{formatCurrency(Number(statement.total))}</strong>
                    <span>{statement.documents.length} documento(s)</span>
                  </div>
                </div>
                <div className="detailList">
                  <div>
                    <strong>Horas usadas na franquia</strong>
                    <span>{Number(statement.includedHoursUsed).toFixed(2)}h</span>
                  </div>
                  <div>
                    <strong>Horas excedentes</strong>
                    <span>{Number(statement.extraHoursUsed).toFixed(2)}h</span>
                  </div>
                  <div>
                    <strong>Visitas</strong>
                    <span>{statement.visitCount}</span>
                  </div>
                  {profile ? (
                    <div>
                      <strong>Hora extra</strong>
                      <span>
                        {(() => {
                          const summary = buildFinancialSummary({
                            includedHoursUsed: Number(statement.includedHoursUsed),
                            extraHoursUsed: Number(statement.extraHoursUsed),
                            visitCount: statement.visitCount,
                            subtotal: Number(statement.subtotal),
                            total: Number(statement.total),
                            profile,
                          });

                          return `${summary.extraHourBlocks}x hora cheia${summary.extraHalfHourBlocks ? ` + ${summary.extraHalfHourBlocks}x meia hora` : ""}`;
                        })()}
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="documentList">
                  {statement.documents.filter((document) => !isClientView || document.isAvailableToClient).length === 0 ? (
                    <p className="helperText">Nenhum documento anexado.</p>
                  ) : null}
                  {statement.documents
                    .filter((document) => !isClientView || document.isAvailableToClient)
                    .map((document) => (
                      <div key={document.id} className="statementCard">
                        <a
                          className="subcardLink"
                          href={document.storagePath}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <strong>{financialDocumentLabels[document.documentType]}</strong>
                          <span>{document.fileName}</span>
                          <span>{document.notes || "Sem observacoes"}</span>
                          <span>
                            {document.dueDate
                              ? `Vencimento: ${document.dueDate.toLocaleDateString("pt-BR")}`
                              : "Sem vencimento"}
                          </span>
                          <span>
                            {document.paidAt
                              ? `Pago em ${document.paidAt.toLocaleDateString("pt-BR")}`
                              : `Lembretes enviados: ${document.reminderSentCount}`}
                          </span>
                          <span>{document.storagePath}</span>
                        </a>
                      </div>
                    ))}
                </div>
                {canEdit ? (
                  <>
                    <FinancialStatementStatusForm
                      statementId={statement.id}
                      status={statement.status}
                    />
                    <form action={sendFinancialReminderAction}>
                      <input type="hidden" name="statementId" value={statement.id} />
                      <button className="secondaryButton" type="submit">
                        Enviar lembrete financeiro
                      </button>
                    </form>
                  </>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
