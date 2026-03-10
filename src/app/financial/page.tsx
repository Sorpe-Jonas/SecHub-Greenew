import { FinancialStatementStatus, UserRole } from "@prisma/client";

import { generateFinancialStatementAction } from "@/app/actions/financial-actions";
import { FinancialDocumentForm } from "@/components/financial/financial-document-form";
import { FinancialProfileForm } from "@/components/financial/financial-profile-form";
import { requireCurrentUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

function toCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function toMonthValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthBounds(referenceMonth: string) {
  const base = new Date(`${referenceMonth}-01T00:00:00`);
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  return { start, end };
}

export default async function FinancialPage() {
  const user = await requireCurrentUser();

  if (user.role === UserRole.USER || !user.companyId) {
    return null;
  }

  const referenceMonth = toMonthValue();
  const { start, end } = monthBounds(referenceMonth);

  const [profile, statements, monthEntries, monthVisits] = await Promise.all([
    prisma.financialProfile.findUnique({
      where: { companyId: user.companyId },
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
  ]);

  const currentHours = monthEntries.reduce((sum, entry) => sum + entry.durationMinutes / 60, 0);
  const currentVisits = monthVisits.length;
  const canEdit = user.role === UserRole.SUPER_ADMIN;
  const baseFee = Number(profile?.hourlyRate || 0);
  const includedHours = Number(profile?.includedHours || 0);
  const extraRate = Number(profile?.extraHourlyRate || 0);
  const visitRate = Number(profile?.visitRate || 0);
  const extraHours = Math.max(currentHours - includedHours, 0);
  const projectedTotal = baseFee + extraHours * extraRate + currentVisits * visitRate;

  return (
    <main className="supportShell">
      <section className="supportHeader">
        <div>
          <span className="eyebrow">Financeiro</span>
          <h1>Resumo financeiro da empresa</h1>
          <p>
            Este modulo consolida horas, visitas e documentos para o ciclo de cobranca. O perfil
            abaixo controla franquia, excedente e valor de visita.
          </p>
        </div>
      </section>

      <section className="statsGrid">
        <article className="statCard">
          <strong>Horas no mes</strong>
          <h2>{currentHours.toFixed(2)}h</h2>
          <span>Base dos lancamentos do TimeSheet no periodo atual.</span>
        </article>
        <article className="statCard">
          <strong>Visitas no mes</strong>
          <h2>{currentVisits}</h2>
          <span>Quantidade de visitas presenciais registradas no periodo.</span>
        </article>
        <article className="statCard">
          <strong>Projecao atual</strong>
          <h2>{toCurrency(projectedTotal)}</h2>
          <span>Valor estimado usando o perfil financeiro vigente.</span>
        </article>
      </section>

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
                    visitRate: profile.visitRate.toString(),
                    billingDay: profile.billingDay,
                  }
                : null
            }
          />
        </section>

        <section className="supportPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Fechamento</span>
              <h2>Gerar resumo mensal</h2>
            </div>
          </div>
          <form className="ticketForm" action={generateFinancialStatementAction}>
            <label>
              Mes de referencia
              <input name="referenceMonth" type="month" defaultValue={referenceMonth} disabled={!canEdit} />
            </label>
            <div className="detailList">
              <div>
                <strong>Franquia</strong>
                <span>{includedHours.toFixed(2)}h</span>
              </div>
              <div>
                <strong>Horas excedentes</strong>
                <span>{extraHours.toFixed(2)}h</span>
              </div>
              <div>
                <strong>Visitas</strong>
                <span>{currentVisits}</span>
              </div>
            </div>
            {canEdit ? (
              <button className="primaryButton" type="submit">
                Gerar fechamento
              </button>
            ) : (
              <p className="helperText">Somente o Admin Total pode gerar fechamentos.</p>
            )}
          </form>
        </section>
      </section>

      <section className="supportPanel">
        <div className="panelHeader">
          <div>
            <span className="eyebrow">Historico</span>
            <h2>Ultimos fechamentos</h2>
          </div>
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
                      {statement.referenceMonth.toLocaleDateString("pt-BR", {
                        month: "long",
                        year: "numeric",
                      })}
                    </strong>
                    <span>
                      {statement.status === FinancialStatementStatus.OPEN ? "Aberto" : statement.status}
                    </span>
                  </div>
                  <div>
                    <strong>{toCurrency(Number(statement.total))}</strong>
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
                </div>
                <div className="documentList">
                  {statement.documents.map((document) => (
                    <div key={document.id} className="subcardLink">
                      <strong>{document.documentType}</strong>
                      <span>{document.fileName}</span>
                      <span>{document.storagePath}</span>
                    </div>
                  ))}
                </div>
                {canEdit ? <FinancialDocumentForm statementId={statement.id} /> : null}
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
