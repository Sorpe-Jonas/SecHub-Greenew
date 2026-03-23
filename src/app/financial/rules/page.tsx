import Link from "next/link";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { deleteFinancialReminderRuleAction } from "@/app/actions/financial-actions";
import { BrandHomeLink } from "@/components/layout/brand-home-link";
import { FinancialReminderRuleForm } from "@/components/financial/financial-reminder-rule-form";
import { FinancialRecipientList } from "@/components/financial/financial-recipient-list";
import { FinancialRecipientForm } from "@/components/financial/financial-recipient-form";
import { requireCurrentUser } from "@/lib/authz";
import { financialDocumentLabels } from "@/lib/financial";
import { prisma } from "@/lib/prisma";
import { isMissingSchemaError } from "@/lib/prisma-errors";

export default async function FinancialRulesPage() {
  const user = await requireCurrentUser();

  if (user.role !== UserRole.SUPER_ADMIN) {
    redirect("/financial");
  }

  if (!user.companyId) {
    return null;
  }

  let rules;
  let recipients;

  try {
    [rules, recipients] = await Promise.all([
      prisma.financialReminderRule.findMany({
        where: {
          companyId: user.companyId,
        },
        orderBy: {
          createdAt: "asc",
        },
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
      console.error("Financial rules page schema is out of date.", error);

      return (
        <main className="supportShell">
          <section className="supportHeader">
            <div>
              <BrandHomeLink />
              <span className="eyebrow">Financeiro / Regras</span>
              <h1>Regras temporariamente indisponiveis</h1>
              <p>O banco de dados de producao ainda nao recebeu a estrutura desta area.</p>
            </div>
          </section>
        </main>
      );
    }

    throw error;
  }

  return (
    <main className="supportShell">
      <section className="supportHeader">
        <div>
          <BrandHomeLink />
          <span className="eyebrow">Financeiro / Regras</span>
          <h1>Regras de cobranca</h1>
          <p>
            Defina quando os lembretes comecam, a frequencia, o tipo de documento e os destinatarios
            usados no envio.
          </p>
        </div>
      </section>

      <section className="ticketDetailGrid">
        <section className="supportPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Destinatarios</span>
              <h2>Emails da cobranca</h2>
            </div>
          </div>
          <FinancialRecipientList recipients={recipients.map((item) => ({ id: item.id, email: item.email }))} />
          <div style={{ marginTop: "1rem" }}>
            <FinancialRecipientForm />
          </div>
        </section>

        <section className="supportPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Nova regra</span>
              <h2>Criar regra de lembrete</h2>
            </div>
            <Link className="secondaryButton linkButton" href="/financial">
              Voltar ao resumo
            </Link>
          </div>
          <FinancialReminderRuleForm />
        </section>
      </section>

      <section className="supportPanel">
        <div className="panelHeader">
          <div>
            <span className="eyebrow">Configuradas</span>
            <h2>Regras existentes</h2>
          </div>
        </div>
        <div className="ticketTable">
          {rules.length === 0 ? (
            <p className="helperText">Nenhuma regra configurada ainda.</p>
          ) : (
            rules.map((rule) => (
              <article key={rule.id} className="statementCard">
                <div className="ticketRow">
                  <div>
                    <strong>{rule.name}</strong>
                    <span>
                      {rule.documentType ? financialDocumentLabels[rule.documentType] : "Todos os tipos"} ·{" "}
                      {rule.enabled ? "Ativa" : "Inativa"}
                    </span>
                  </div>
                  <div>
                    <strong>{rule.daysBeforeDue} dia(s)</strong>
                    <span>Frequencia: {rule.frequencyDays} dia(s)</span>
                  </div>
                </div>
                <FinancialReminderRuleForm
                  rule={{
                    id: rule.id,
                    name: rule.name,
                    documentType: rule.documentType,
                    daysBeforeDue: rule.daysBeforeDue,
                    frequencyDays: rule.frequencyDays,
                    enabled: rule.enabled,
                    recipientEmails: rule.recipientEmails,
                    emailSubject: rule.emailSubject,
                    emailIntro: rule.emailIntro,
                  }}
                />
                <form action={deleteFinancialReminderRuleAction}>
                  <input type="hidden" name="ruleId" value={rule.id} />
                  <button className="dangerButton" type="submit">
                    Deletar regra
                  </button>
                </form>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
