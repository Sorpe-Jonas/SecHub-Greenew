import Link from "next/link";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { deleteFinancialDocumentAction } from "@/app/actions/financial-actions";
import { BrandHomeLink } from "@/components/layout/brand-home-link";
import { FinancialDocumentForm } from "@/components/financial/financial-document-form";
import { FinancialDocumentStatusForm } from "@/components/financial/financial-document-status-form";
import { requireCurrentUser } from "@/lib/authz";
import { financialDocumentLabels } from "@/lib/financial";
import { prisma } from "@/lib/prisma";

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

  const [statements, documents] = await Promise.all([
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

  const canEdit = user.role === UserRole.SUPER_ADMIN;
  const isClientView = user.role === UserRole.USER;

  return (
    <main className="supportShell">
      <section className="supportHeader">
        <div>
          <BrandHomeLink />
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
              label: statement.referenceMonth.toLocaleDateString("pt-BR", {
                month: "long",
                year: "numeric",
              }),
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
                      {document.financialStatement.referenceMonth.toLocaleDateString("pt-BR", {
                        month: "long",
                        year: "numeric",
                      })}{" "}
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
                        label: statement.referenceMonth.toLocaleDateString("pt-BR", {
                          month: "long",
                          year: "numeric",
                        }),
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
    </main>
  );
}
