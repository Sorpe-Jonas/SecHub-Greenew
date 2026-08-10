import Link from "next/link";
import { UserRole } from "@prisma/client";

import { deleteFinancialDocumentAction } from "@/app/actions/financial-actions";
import { AppShell } from "@/components/layout/app-shell";
import { FinancialDocumentForm } from "@/components/financial/financial-document-form";
import { FinancialDocumentStatusForm } from "@/components/financial/financial-document-status-form";
import { requireCurrentUser } from "@/lib/authz";
import { financialDocumentLabels, formatFinancialPeriodLabel } from "@/lib/financial";
import { prisma } from "@/lib/prisma";
import { isMissingSchemaError } from "@/lib/prisma-errors";

function toDateValue(date: Date | null) {
  if (!date) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export default async function FinancialDocumentsPage() {
  const user = await requireCurrentUser();

  if (!user.companyId) {
    return null;
  }

  let statements;
  let documents;

  try {
    [statements, documents] = await Promise.all([
      prisma.financialStatement.findMany({
        where: {
          companyId: user.companyId,
        },
        orderBy: {
          referenceMonth: "desc",
        },
        select: {
          id: true,
          referenceMonth: true,
        },
        take: 24,
      }),
      prisma.financialDocument.findMany({
        where: {
          financialStatement: {
            companyId: user.companyId,
          },
          ...(user.role === UserRole.USER ? { isAvailableToClient: true } : {}),
        },
        include: {
          financialStatement: {
            select: {
              referenceMonth: true,
              total: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 200,
      }),
    ]);
  } catch (error) {
    if (isMissingSchemaError(error)) {
      console.error("Financial documents page schema is out of date.", error);

      return (
        <AppShell
          role={user.role}
          permissions={user.blockPermissions}
          userName={user.name}
          userEmail={user.email}
          companyName={user.company?.name}
        >
          <section className="appPageHeader">
            <div>
              <span className="eyebrow">Financeiro / Documentos</span>
              <h1>Documentos temporariamente indisponiveis</h1>
              <p>O banco de dados de producao ainda nao recebeu a estrutura desta area.</p>
            </div>
          </section>
        </AppShell>
      );
    }

    throw error;
  }

  const canEdit = user.role === UserRole.SUPER_ADMIN;
  const isClientView = user.role === UserRole.USER;

  return (
    <AppShell
      role={user.role}
      permissions={user.blockPermissions}
      userName={user.name}
      userEmail={user.email}
      companyName={user.company?.name}
    >
      <section className="appPageHeader">
        <div>
          <span className="eyebrow">Financeiro / Documentos</span>
          <h1>Documentos financeiros</h1>
          <p>
            {isClientView
              ? "Aqui voce consulta boletos, NFE e recibos liberados para sua empresa."
              : "Esta tela concentra upload, historico, edicao e remocao de boletos, NFE e demais documentos."}
          </p>
        </div>
      </section>

      {canEdit ? (
        <section className="supportPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Novo documento</span>
              <h2>Upload de boleto, NFE ou recibo</h2>
            </div>
            <Link className="secondaryButton linkButton" href="/financial">
              Voltar ao resumo
            </Link>
          </div>
          <FinancialDocumentForm
            statementOptions={statements.map((statement) => ({
              id: statement.id,
              label: formatFinancialPeriodLabel(
                statement.referenceMonth,
                new Date(statement.referenceMonth.getTime() + 30 * 86400000),
              ),
            }))}
          />
        </section>
      ) : null}

      <section className="supportPanel">
        <div className="panelHeader">
          <div>
            <span className="eyebrow">Historico</span>
            <h2>Arquivos anexados</h2>
          </div>
        </div>
        <div className="ticketTable">
          {documents.length === 0 ? (
            <p className="helperText">Nenhum documento financeiro encontrado.</p>
          ) : (
            documents.map((document) => (
              <article key={document.id} className="statementCard">
                <div className="ticketRow">
                  <div>
                    <strong>{financialDocumentLabels[document.documentType]}</strong>
                    <span>
                      {formatFinancialPeriodLabel(
                        document.financialStatement.referenceMonth,
                        new Date(document.financialStatement.referenceMonth.getTime() + 30 * 86400000),
                      )}{" "}
                      · {document.fileName}
                    </span>
                  </div>
                  <div>
                    <strong>
                      {document.dueDate ? document.dueDate.toLocaleDateString("pt-BR") : "Sem vencimento"}
                    </strong>
                    <span>{document.paidAt ? "Pago" : "Em aberto"}</span>
                  </div>
                </div>

                <a className="subcardLink" href={document.storagePath} target="_blank" rel="noreferrer">
                  <strong>Abrir anexo</strong>
                  <span>{document.notes || "Sem observacoes"}</span>
                  <span>{document.storagePath}</span>
                </a>

                {canEdit ? (
                  <>
                    <FinancialDocumentForm
                      mode="edit"
                      document={{
                        id: document.id,
                        statementId: document.financialStatementId,
                        documentType: document.documentType,
                        fileName: document.fileName,
                        storagePath: document.storagePath,
                        notes: document.notes,
                        dueDate: toDateValue(document.dueDate),
                        isAvailableToClient: document.isAvailableToClient,
                        reminderEnabled: document.reminderEnabled,
                      }}
                      statementOptions={statements.map((statement) => ({
                        id: statement.id,
                        label: formatFinancialPeriodLabel(
                          statement.referenceMonth,
                          new Date(statement.referenceMonth.getTime() + 30 * 86400000),
                        ),
                      }))}
                    />
                    <FinancialDocumentStatusForm
                      documentId={document.id}
                      isPaid={Boolean(document.paidAt)}
                      reminderEnabled={document.reminderEnabled}
                    />
                    <form action={deleteFinancialDocumentAction}>
                      <input type="hidden" name="documentId" value={document.id} />
                      <button className="dangerButton" type="submit">
                        Deletar documento
                      </button>
                    </form>
                  </>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>
    </AppShell>
  );
}
